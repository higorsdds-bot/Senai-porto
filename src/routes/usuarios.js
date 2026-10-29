/**
 * HUB ES+ - Rotas de Usuários
 * GET    /api/v1/usuarios
 * GET    /api/v1/usuarios/:id
 * POST   /api/v1/usuarios
 * PUT    /api/v1/usuarios/:id
 * PATCH  /api/v1/usuarios/:id/status
 * DELETE /api/v1/usuarios/:id  (soft delete)
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { authMiddleware, clearUserAuthCache } = require('../middleware/auth');
const { requirePermission, requireAnyPermission, clearUserPermCache } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');
const {
  notificarNovoCadastroAdmin,
  buscarEmailsAdministradoresGerais,
  enviarEmailCredenciaisCriacaoDireta
} = require('../services/email');

// Perfis válidos na hierarquia do HUB ES+
const PERFIS_VALIDOS = [
  'ADMIN', 'ADMIN_GERAL', 'ADMINISTRADOR',
  'GESTOR_RH', 'GESTOR_INFRA', 'GESTOR_OPERADOR', 'GESTOR',
  'TECNICO_N1', 'TECNICO_N2', 'TECNICO_N3',
  'ANALISTA_RH', 'RH',
  'OPERADOR', 'ADMINISTRACAO', 'LIMPEZA'
];

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// ─── POST /api/v1/usuarios/pre-cadastro ──────────────────────────────────────
// Utilizado pelo setor Administrativo para pré-cadastrar colaboradores.
// Não permite definir setor nem perfil; o usuário entra com status 'PENDENTE'
// para que o Administrador Geral defina o setor e a função na etapa de aprovação.
router.post('/pre-cadastro', requireAnyPermission('usuarios.pre_cadastrar', 'usuarios.criar'), async (req, res) => {
  const { nome, email, senha } = req.body;
  const erros = {};

  if (!nome || String(nome).trim().length < 3) erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) erros.email = 'E-mail informado é inválido.';
  if (!senha || String(senha).length < 8) erros.senha = 'A senha precisa ter pelo menos 8 caracteres.';

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }

  try {
    const pool = getPool();
    const cleanEmail = String(email).toLowerCase().trim();

    const [existing] = await pool.query(
      `SELECT id, status FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanEmail]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'PENDENTE') {
        return res.status(409).json({
          success: false,
          message: 'Já existe um pré-cadastro pendente para este e-mail aguardando aprovação do Administrador Geral.'
        });
      }
      if (existing[0].status === 'AGUARDANDO_ATIVACAO') {
        return res.status(409).json({
          success: false,
          message: 'Este colaborador já foi aprovado e aguarda ativação pelo e-mail.'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Este e-mail já está cadastrado no sistema.'
      });
    }

    const senhaHash = await bcrypt.hash(String(senha), 12);
    // Inserção com setor_id NULL e status PENDENTE (sem poder escolher setor ou função)
    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
       VALUES (?, ?, ?, 'OPERADOR', NULL, 'PENDENTE')`,
      [String(nome).trim(), cleanEmail, senhaHash]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'PRE_CADASTRO_USUARIO',
      entidade: 'usuarios',
      entidade_id: result.insertId,
      descricao: `Pré-cadastro realizado pela Administração (${req.usuario.nome}) para "${String(nome).trim()}" (${cleanEmail}). Aguardando definição de setor e função pelo Administrador Geral.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    // Notifica o Administrador Geral por e-mail sobre a nova solicitação de pré-cadastro
    buscarEmailsAdministradoresGerais(pool)
      .then(adminEmails => {
        return notificarNovoCadastroAdmin({
          adminEmails,
          usuarioNome: String(nome).trim(),
          usuarioEmail: cleanEmail,
          solicitacaoId: result.insertId,
          origem: `Pré-cadastro pelo setor Administrativo (${req.usuario.nome})`
        });
      })
      .catch(err => console.error('[USUARIOS] Erro ao notificar administrador sobre pré-cadastro:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Colaborador pré-cadastrado com sucesso! A notificação foi encaminhada ao Administrador Geral para análise e liberação.',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('[USUARIOS] PRE-CADASTRO:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao registrar pré-cadastro.' });
  }
});

// ─── GET /api/v1/usuarios/pre-cadastros ──────────────────────────────────────
router.get('/pre-cadastros', requireAnyPermission('usuarios.pre_cadastrar', 'usuarios.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, u.created_at,
              s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC
       LIMIT 50`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[USUARIOS] GET pre-cadastros:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar pré-cadastros.' });
  }
});

// ─── PUT /api/v1/usuarios/pre-cadastro/:id ───────────────────────────────────
// Permite editar a solicitação de pré-cadastro enquanto o status for PENDENTE
router.put('/pre-cadastro/:id', requireAnyPermission('usuarios.pre_cadastrar', 'usuarios.editar'), async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha } = req.body;
  const pool = getPool();

  try {
    const [existing] = await pool.query(
      `SELECT id, nome, email, status FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Solicitação de colaborador não encontrada.' });
    }

    const isAdmin = ['ADMIN', 'ADMINISTRADOR'].includes(String(req.usuario.perfil).toUpperCase());
    if (!isAdmin && existing[0].status !== 'PENDENTE') {
      return res.status(403).json({
        success: false,
        message: 'Apenas solicitações com status PENDENTE podem ser alteradas.'
      });
    }

    const erros = {};
    if (!nome || String(nome).trim().length < 3) erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) erros.email = 'E-mail informado é inválido.';
    if (senha && String(senha).length < 8) erros.senha = 'A senha provisória precisa ter no mínimo 8 caracteres.';

    if (Object.keys(erros).length > 0) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const [duplicados] = await pool.query(
      `SELECT id FROM usuarios WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
      [cleanEmail, id]
    );

    if (duplicados.length > 0) {
      return res.status(409).json({ success: false, message: 'Já existe outro usuário registrado com este e-mail.' });
    }

    let sql = 'UPDATE usuarios SET nome = ?, email = ?, updated_at = NOW()';
    const params = [String(nome).trim(), cleanEmail];

    if (senha && String(senha).trim().length >= 8) {
      const senhaHash = await bcrypt.hash(String(senha), 12);
      sql += ', senha = ?';
      params.push(senhaHash);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await pool.query(sql, params);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'EDITAR_PRE_CADASTRO',
      entidade: 'usuarios',
      entidade_id: parseInt(id, 10),
      descricao: `Solicitação de cadastro #${id} ("${String(nome).trim()}") alterada por ${req.usuario.nome}.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: 'Solicitação de colaborador atualizada com sucesso!'
    });
  } catch (err) {
    console.error('[USUARIOS] PUT pre-cadastro/:id:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar solicitação de cadastro.' });
  }
});

// ─── GET /api/v1/usuarios ────────────────────────────────────────────────────
router.get('/', requirePermission('usuarios.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { perfil, setor_id, status, q } = req.query;

    let conditions = ['u.deleted_at IS NULL'];
    let params = [];

    if (perfil) { conditions.push('u.perfil = ?'); params.push(perfil); }
    if (setor_id) { conditions.push('u.setor_id = ?'); params.push(setor_id); }
    if (status) { conditions.push('u.status = ?'); params.push(status); }
    if (q) {
      conditions.push('(u.nome LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const where = conditions.join(' AND ');
    const ONLINE_THRESHOLD = 5; // minutos

    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status,
              u.ultimo_acesso, u.ultimo_heartbeat, u.created_at,
              s.nome AS setor_nome,
              CASE WHEN u.ultimo_heartbeat >= NOW() - INTERVAL ${ONLINE_THRESHOLD} MINUTE
                   THEN 1 ELSE 0 END AS online
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE ${where}
       ORDER BY u.nome ASC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[USUARIOS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários.' });
  }
});

// ─── GET /api/v1/usuarios/permissoes-disponiveis ─────────────────────────────
router.get('/permissoes-disponiveis', requirePermission('usuarios.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, chave, nome, descricao FROM permissoes ORDER BY chave ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[USUARIOS] GET permissoes-disponiveis:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar permissões disponíveis.' });
  }
});

// ─── GET /api/v1/usuarios/:id ────────────────────────────────────────────────
router.get('/:id', requirePermission('usuarios.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status,
              u.ultimo_acesso, u.ultimo_heartbeat, u.created_at,
              s.nome AS setor_nome,
              CASE WHEN u.ultimo_heartbeat >= NOW() - INTERVAL 5 MINUTE
                   THEN 1 ELSE 0 END AS online
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const usuario = rows[0];

    // Busca permissões customizadas adicionais atribuídas ao usuário
    try {
      const [extras] = await pool.query(
        `SELECT p.chave
         FROM usuario_permissoes up
         JOIN permissoes p ON p.id = up.permissao_id
         WHERE up.usuario_id = ? AND up.concedida = 1`,
        [req.params.id]
      );
      usuario.permissoes_adicionais = extras.map(e => e.chave);
    } catch (_) {
      usuario.permissoes_adicionais = [];
    }

    return res.json({ success: true, data: usuario });
  } catch (err) {
    console.error('[USUARIOS] GET/:id:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao buscar usuário.' });
  }
});

// ─── POST /api/v1/usuarios ───────────────────────────────────────────────────
router.post('/', requirePermission('usuarios.criar'), async (req, res) => {
  const { nome, email, senha, perfil, setor_id, status, permissoes_adicionais } = req.body;
  const erros = {};

  if (!nome || nome.trim().length < 3) erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'Email inválido.';
  if (!senha || senha.length < 8) erros.senha = 'Senha precisa ter pelo menos 8 caracteres.';
  if (!perfil || !PERFIS_VALIDOS.includes(perfil)) erros.perfil = 'Perfil inválido.';

  // Regra de Governança: Somente Admin Geral pode criar contas ADMIN
  const requesterPerfil = String(req.usuario.perfil || '').toUpperCase();
  if (['ADMIN', 'ADMIN_GERAL'].includes(perfil) && !['ADMIN', 'ADMIN_GERAL'].includes(requesterPerfil)) {
    return res.status(403).json({
      success: false,
      message: 'Apenas o Administrador Geral possui autorização para criar usuários com perfil de Administrador Geral.'
    });
  }

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }

  try {
    const pool = getPool();

    // Verificar email duplicado
    const [existing] = await pool.query(
      `SELECT id FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Email já cadastrado.',
        errors: { email: 'Este email já está em uso.' }
      });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        email.toLowerCase().trim(),
        senhaHash,
        perfil,
        setor_id || null,
        status || 'ATIVO'
      ]
    );

    const novoId = result.insertId;

    // Conceder permissões granulares adicionais
    if (Array.isArray(permissoes_adicionais) && permissoes_adicionais.length > 0) {
      for (const chave of permissoes_adicionais) {
        await pool.query(
          `INSERT INTO usuario_permissoes (usuario_id, permissao_id, concedida)
           SELECT ?, id, 1 FROM permissoes WHERE chave = ?
           ON DUPLICATE KEY UPDATE concedida = 1`,
          [novoId, chave]
        ).catch(() => {});
      }
    }

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'CRIAR_USUARIO',
      entidade: 'usuarios',
      entidade_id: novoId,
      descricao: `Usuário "${nome.trim()}" (${email}) criado com perfil ${perfil}.${Array.isArray(permissoes_adicionais) && permissoes_adicionais.length ? ` Permissões extras: ${permissoes_adicionais.join(', ')}` : ''}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    // Busca nome do setor para inclusão no e-mail de boas-vindas
    let setorNome = null;
    if (setor_id) {
      try {
        const [setorRows] = await pool.query('SELECT nome FROM setores WHERE id = ? LIMIT 1', [setor_id]);
        if (setorRows.length) setorNome = setorRows[0].nome;
      } catch (_) {}
    }

    // Dispara envio de e-mail com as credenciais provisórias de acesso
    let emailStatus = null;
    try {
      emailStatus = await enviarEmailCredenciaisCriacaoDireta({
        usuarioNome: nome.trim(),
        usuarioEmail: email.toLowerCase().trim(),
        senhaProvisoria: senha,
        perfil,
        setorNome,
        criadoPorNome: req.usuario?.nome || 'Administrador Geral'
      });
    } catch (mailErr) {
      console.error('[USUARIOS] Erro ao enviar e-mail de boas-vindas com credenciais:', mailErr.message);
      emailStatus = { success: false, error: mailErr.message };
    }

    const emailEnviado = Boolean(emailStatus && emailStatus.success);

    return res.status(201).json({
      success: true,
      message: emailEnviado
        ? `Usuário criado com sucesso! E-mail com as credenciais institucionais enviado para ${email}.`
        : `Usuário criado com sucesso. O e-mail automático com a senha provisória foi gerado (Provedor: ${emailStatus?.error || 'Simulação/Console'}).`,
      data: {
        id: novoId,
        emailEnviado,
        emailProvedor: emailStatus?.provedor || null
      }
    });
  } catch (err) {
    console.error('[USUARIOS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao criar usuário.' });
  }
});

// ─── PUT /api/v1/usuarios/:id ────────────────────────────────────────────────
router.put('/:id', requirePermission('usuarios.editar'), async (req, res) => {
  const { nome, email, perfil, setor_id, status, senha, permissoes_adicionais } = req.body;
  const id = req.params.id;
  const erros = {};

  if (!nome || nome.trim().length < 3) erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'Email inválido.';
  if (!perfil || !PERFIS_VALIDOS.includes(perfil)) erros.perfil = 'Perfil inválido.';

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: erros });
  }

  try {
    const pool = getPool();

    // Regra de Governança: Protege o perfil ADMIN Geral contra alterações não autorizadas
    const [targetRows] = await pool.query(
      `SELECT id, perfil FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!targetRows.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const targetUser = targetRows[0];
    const requesterPerfil = String(req.usuario.perfil || '').toUpperCase();
    const isTargetAdmin = ['ADMIN', 'ADMIN_GERAL'].includes(String(targetUser.perfil).toUpperCase());
    const isRequesterAdmin = ['ADMIN', 'ADMIN_GERAL'].includes(requesterPerfil);

    if (isTargetAdmin && !isRequesterAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: Apenas o Administrador Geral pode alterar ou rebaixar contas com perfil ADMIN.'
      });
    }

    if (['ADMIN', 'ADMIN_GERAL'].includes(perfil) && !isRequesterAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: Apenas o Administrador Geral pode promover um colaborador para o perfil ADMIN.'
      });
    }

    const [existing] = await pool.query(
      `SELECT id FROM usuarios WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase().trim(), id]
    );
    if (existing.length > 0) {
      return res.status(422).json({
        success: false, message: 'Email já em uso.', errors: { email: 'Email já está em uso.' }
      });
    }

    let query = `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, setor_id = ?, status = ?, updated_at = NOW()`;
    let params = [nome.trim(), email.toLowerCase().trim(), perfil, setor_id || null, status || 'ATIVO'];

    if (senha && senha.length >= 8) {
      const senhaHash = await bcrypt.hash(senha, 12);
      query += `, senha = ?`;
      params.push(senhaHash);
    }

    query += ` WHERE id = ? AND deleted_at IS NULL`;
    params.push(id);

    await pool.query(query, params);

    // Atualiza permissões granulares adicionais
    if (permissoes_adicionais !== undefined) {
      await pool.query(`DELETE FROM usuario_permissoes WHERE usuario_id = ?`, [id]).catch(() => {});
      if (Array.isArray(permissoes_adicionais) && permissoes_adicionais.length > 0) {
        for (const chave of permissoes_adicionais) {
          await pool.query(
            `INSERT INTO usuario_permissoes (usuario_id, permissao_id, concedida)
             SELECT ?, id, 1 FROM permissoes WHERE chave = ?
             ON DUPLICATE KEY UPDATE concedida = 1`,
            [id, chave]
          ).catch(() => {});
        }
      }
    }

    // Invalida caches em memória para efeito instantâneo
    clearUserAuthCache(id);
    clearUserPermCache(id);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'EDITAR_USUARIO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Usuário #${id} atualizado para perfil ${perfil}.${Array.isArray(permissoes_adicionais) ? ` Permissões extras: ${permissoes_adicionais.join(', ') || 'Nenhuma'}` : ''}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Usuário atualizado com sucesso.' });
  } catch (err) {
    console.error('[USUARIOS] PUT:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
  }
});

// ─── PATCH /api/v1/usuarios/:id/status ───────────────────────────────────────
router.patch('/:id/status', requirePermission('usuarios.bloquear'), async (req, res) => {
  const { status } = req.body;
  const id = req.params.id;

  if (!['ATIVO', 'INATIVO', 'BLOQUEADO', 'PENDENTE'].includes(status)) {
    return res.status(422).json({
      success: false, message: 'Status inválido. Use ATIVO, INATIVO, BLOQUEADO ou PENDENTE.'
    });
  }

  // Não pode bloquear a si mesmo
  if (parseInt(id) === req.usuario.id && status !== 'ATIVO') {
    return res.status(422).json({ success: false, message: 'Você não pode alterar o seu próprio status.' });
  }

  try {
    const pool = getPool();

    // Governança: Apenas ADMIN pode alterar status de outro ADMIN
    const [target] = await pool.query(`SELECT perfil FROM usuarios WHERE id = ? LIMIT 1`, [id]);
    if (target.length && ['ADMIN', 'ADMIN_GERAL'].includes(String(target[0].perfil).toUpperCase())) {
      if (!['ADMIN', 'ADMIN_GERAL'].includes(String(req.usuario.perfil).toUpperCase())) {
        return res.status(403).json({
          success: false,
          message: 'Apenas o Administrador Geral pode alterar o status de outro Administrador.'
        });
      }
    }

    await pool.query(
      `UPDATE usuarios SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [status, id]
    );

    clearUserAuthCache(id);
    clearUserPermCache(id);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'ALTERAR_STATUS_USUARIO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Status do usuário #${id} alterado para ${status}.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: `Status alterado para ${status}.` });
  } catch (err) {
    console.error('[USUARIOS] PATCH status:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao alterar status.' });
  }
});

// ─── DELETE /api/v1/usuarios/:id (soft delete) ───────────────────────────────
router.delete('/:id', requirePermission('usuarios.editar'), async (req, res) => {
  const id = req.params.id;

  // Não pode deletar a si mesmo
  if (parseInt(id) === req.usuario.id) {
    return res.status(422).json({ success: false, message: 'Você não pode deletar sua própria conta.' });
  }

  try {
    const pool = getPool();
    // Governança: Apenas ADMIN pode deletar outro ADMIN
    const [target] = await pool.query(`SELECT perfil FROM usuarios WHERE id = ? LIMIT 1`, [id]);
    if (target.length && ['ADMIN', 'ADMIN_GERAL'].includes(String(target[0].perfil).toUpperCase())) {
      if (!['ADMIN', 'ADMIN_GERAL'].includes(String(req.usuario.perfil).toUpperCase())) {
        return res.status(403).json({
          success: false,
          message: 'Apenas o Administrador Geral pode remover outro Administrador.'
        });
      }
    }

    await pool.query(
      `UPDATE usuarios SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    clearUserAuthCache(id);
    clearUserPermCache(id);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'DELETAR_USUARIO',
      entidade: 'usuarios',
      entidade_id: parseInt(id),
      descricao: `Usuário #${id} removido (soft delete).`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Usuário removido.' });
  } catch (err) {
    console.error('[USUARIOS] DELETE:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao remover usuário.' });
  }
});

module.exports = router;
