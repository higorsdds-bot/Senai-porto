/**
 * HUB ES+ - Rotas de Auditoria e Governança
 * Acesso ESTRITAMENTE restrito a usuários com permissão ADMIN consultada diretamente do banco de dados.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { authMiddleware, clearUserAuthCache } = require('../middleware/auth');
const { hasPermission, clearUserPermCache } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');
const {
  gerarTokenAtivacao,
  enviarEmailAtivacaoConta,
  enviarEmailRejeicaoCadastro,
  ACTIVATION_TOKEN_EXPIRES_HOURS
} = require('../services/email');

const PERFIS_PERMITIDOS = [
  'ADMIN', 'ADMIN_GERAL', 'ADMINISTRADOR',
  'GESTOR_RH', 'GESTOR_INFRA', 'GESTOR_OPERADOR', 'GESTOR',
  'TECNICO_N1', 'TECNICO_N2', 'TECNICO_N3',
  'ANALISTA_RH', 'RH',
  'OPERADOR', 'ADMINISTRACAO', 'LIMPEZA'
];

// Exige autenticação básica
router.use(authMiddleware);

/**
 * Middleware estrito: consulta o perfil do usuário DIRETAMENTE no banco de dados.
 * Garante que usuários com perfil ADMIN/ADMINISTRADOR ou com permissão geral de auditoria acessem.
 */
async function requireAdminDirect(req, res, next) {
  try {
    const usuario = req.usuario;
    if (!usuario || usuario.status !== 'ATIVO') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Usuário inexistente ou inativo.'
      });
    }

    const perfilNorm = String(usuario.perfil || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    const isAdmin = ['ADMIN', 'ADMINISTRADOR'].includes(perfilNorm);
    const podeAuditoria = isAdmin || await hasPermission(usuario, 'auditoria.visualizar');

    if (!podeAuditoria) {
      return res.status(403).json({
        success: false,
        message: 'Acesso restrito. Este módulo requer perfil de Administrador ou permissão de auditoria.'
      });
    }

    req.adminUsuario = usuario;
    next();
  } catch (err) {
    console.error('[AUDITORIA] Erro na validação de permissão de admin:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao validar privilégios de administrador.'
    });
  }
}

// Aplica a validação estrita em todas as rotas de auditoria
router.use(requireAdminDirect);

// ─── GET /api/v1/auditoria/usuarios-online ───────────────────────────────────
// Lista usuários conectados em tempo real (último heartbeat nos últimos 5 minutos)
router.get('/usuarios-online', async (req, res) => {
  try {
    const pool = getPool();
    const ONLINE_THRESHOLD = 5; // minutos

    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.ultimo_acesso, u.ultimo_heartbeat,
              s.nome AS setor_nome,
              TIMESTAMPDIFF(SECOND, u.ultimo_heartbeat, NOW()) AS segundos_desde_heartbeat
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.deleted_at IS NULL
         AND u.status = 'ATIVO'
         AND u.ultimo_heartbeat >= NOW() - INTERVAL ${ONLINE_THRESHOLD} MINUTE
       ORDER BY u.ultimo_heartbeat DESC`
    );

    return res.json({
      success: true,
      data: rows,
      total_online: rows.length
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao buscar usuários online:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao buscar usuários online.' });
  }
});

// ─── GET /api/v1/auditoria/usuarios ──────────────────────────────────────────
// Listagem geral de todos os usuários cadastrados e contagem de ações de auditoria
router.get('/usuarios', async (req, res) => {
  try {
    const pool = getPool();
    const { status, perfil, q } = req.query;

    let conds = ['u.deleted_at IS NULL'];
    let params = [];

    if (status) { conds.push('u.status = ?'); params.push(status); }
    if (perfil) { conds.push('u.perfil = ?'); params.push(perfil); }
    if (q) {
      conds.push('(u.nome LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const where = conds.join(' AND ');

    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.status, u.created_at,
              u.ultimo_acesso, u.ultimo_heartbeat,
              s.nome AS setor_nome,
              CASE WHEN u.ultimo_heartbeat >= NOW() - INTERVAL 5 MINUTE THEN 1 ELSE 0 END AS online,
              (SELECT COUNT(*) FROM auditoria a WHERE a.usuario_id = u.id) AS total_acoes,
              (SELECT a.created_at FROM auditoria a WHERE a.usuario_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS ultima_acao_data
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE ${where}
       ORDER BY u.created_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao listar usuários:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários.' });
  }
});

// ─── GET /api/v1/auditoria/usuarios/:id/historico ────────────────────────────
// Histórico e registro de ações realizadas por um usuário específico
router.get('/usuarios/:id/historico', async (req, res) => {
  try {
    const pool = getPool();
    const usuarioId = req.params.id;

    // Confere se o usuário existe
    const [userRows] = await pool.query(
      `SELECT id, nome, email, perfil, status, created_at, ultimo_acesso
       FROM usuarios WHERE id = ? LIMIT 1`,
      [usuarioId]
    );

    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const [acoes] = await pool.query(
      `SELECT id, acao, entidade, entidade_id, descricao, ip, user_agent, created_at
       FROM auditoria
       WHERE usuario_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [usuarioId]
    );

    return res.json({
      success: true,
      data: {
        usuario: userRows[0],
        acoes
      }
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao buscar histórico do usuário:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao buscar histórico do usuário.' });
  }
});

// ─── GET /api/v1/auditoria/solicitacoes-pendentes ─────────────────────────────
// Lista cadastros com status PENDENTE aguardando aprovação
router.get('/solicitacoes-pendentes', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.created_at,
              s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.status = 'PENDENTE' AND u.deleted_at IS NULL
       ORDER BY u.created_at ASC`
    );

    return res.json({ success: true, data: rows, total_pendentes: rows.length });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao listar solicitações pendentes:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao carregar solicitações.' });
  }
});

// ─── POST /api/v1/auditoria/solicitacoes/:id/aprovar ─────────────────────────
// Aprova solicitação de cadastro liberando o acesso e permitindo digitar/editar todos os dados
router.post('/solicitacoes/:id/aprovar', async (req, res) => {
  const { perfil, setor_id, nome, email, senha, permissoes_adicionais } = req.body;
  const id = req.params.id;

  try {
    const pool = getPool();
    const [user] = await pool.query(
      `SELECT id, nome, email, status FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const perfilFinal = perfil && PERFIS_PERMITIDOS.includes(perfil) ? perfil : 'OPERADOR';

    const setorFinal = (setor_id !== undefined && setor_id !== null && setor_id !== '')
      ? Number(setor_id)
      : (setor_id === null ? null : user[0].setor_id);

    const nomeFinal = (nome && String(nome).trim().length >= 3)
      ? String(nome).trim()
      : user[0].nome;

    let emailFinal = user[0].email;
    if (email && String(email).trim().toLowerCase() !== user[0].email.toLowerCase()) {
      const cleanEmail = String(email).trim().toLowerCase();
      const [duplicados] = await pool.query(
        `SELECT id FROM usuarios WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
        [cleanEmail, id]
      );
      if (duplicados.length > 0) {
        return res.status(409).json({ success: false, message: 'Já existe outro usuário registrado com este e-mail.' });
      }
      emailFinal = cleanEmail;
    }

    let sql = `UPDATE usuarios SET status = 'AGUARDANDO_ATIVACAO', perfil = ?, setor_id = ?, nome = ?, email = ?, updated_at = NOW()`;
    const params = [perfilFinal, setorFinal, nomeFinal, emailFinal];

    if (senha && String(senha).trim().length >= 8) {
      const senhaHash = await bcrypt.hash(String(senha).trim(), 12);
      sql += `, senha = ?`;
      params.push(senhaHash);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    await pool.query(sql, params);

    // Grava permissões granulares adicionais
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

    clearUserAuthCache(id);
    clearUserPermCache(id);

    // Gera token de alta entropia de uso único e validade limitada
    const { token, tokenHash } = gerarTokenAtivacao();

    // Invalida tokens anteriores não utilizados
    await pool.query(
      `UPDATE tokens_ativacao SET expira_em = NOW() WHERE usuario_id = ? AND usado_em IS NULL`,
      [id]
    );

    // Insere o hash do novo token com validade configurada
    await pool.query(
      `INSERT INTO tokens_ativacao (usuario_id, token_hash, expira_em, ip_criacao)
       VALUES (?, ?, NOW() + INTERVAL ? HOUR, ?)`,
      [id, tokenHash, ACTIVATION_TOKEN_EXPIRES_HOURS, getClientIp(req)]
    );

    // Busca nome do setor para incluir no e-mail
    let setorNome = null;
    if (setorFinal) {
      const [setores] = await pool.query(`SELECT nome FROM setores WHERE id = ? LIMIT 1`, [setorFinal]);
      if (setores.length > 0) setorNome = setores[0].nome;
    }

    // Registra na auditoria SEM armazenar tokens ou senhas
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'APROVAR_CADASTRO',
      entidade: 'usuarios',
      entidade_id: parseInt(id, 10),
      descricao: `Cadastro do usuário "${nomeFinal}" (${emailFinal}) foi APROVADO com perfil ${perfilFinal}${setorNome ? ` e setor ${setorNome}` : ''}. Link seguro de ativação enviado por e-mail (Validade: ${ACTIVATION_TOKEN_EXPIRES_HOURS}h).`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const linkAtivacao = `${appUrl}/#ativar-conta?token=${encodeURIComponent(token)}`;

    // Envia o e-mail com link seguro ao novo usuário (sem senhas em texto)
    let emailStatus = null;
    try {
      emailStatus = await enviarEmailAtivacaoConta({
        usuarioNome: nomeFinal,
        usuarioEmail: emailFinal,
        token,
        perfil: perfilFinal,
        setorNome
      });
    } catch (err) {
      emailStatus = { success: false, error: err.message };
    }

    const emailEnviado = Boolean(emailStatus && emailStatus.success);

    return res.json({
      success: true,
      message: emailEnviado
        ? `Acesso do usuário "${nomeFinal}" aprovado com sucesso! Um e-mail com o link de ativação foi enviado para ${emailFinal}.`
        : `Acesso aprovado! Atenção: falha no envio do e-mail (${emailStatus?.provedor || 'serviço'}): ${emailStatus?.error || 'verifique configurações'}. Link de ativação disponível abaixo.`,
      emailEnviado,
      emailProvedor: emailStatus?.provedor || null,
      emailErro: emailStatus?.error || null,
      linkAtivacao
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao aprovar cadastro:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao aprovar solicitação.' });
  }
});

// ─── PUT /api/v1/auditoria/solicitacoes/:id ──────────────────────────────────
// Permite ao Administrador digitar e alterar todos os dados da solicitação pendente sem liberar imediatamente
router.put('/solicitacoes/:id', async (req, res) => {
  const { perfil, setor_id, nome, email, senha, permissoes_adicionais } = req.body;
  const id = req.params.id;

  try {
    const pool = getPool();
    const [user] = await pool.query(
      `SELECT id, nome, email, perfil, setor_id, status FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ success: false, message: 'Solicitação não encontrada.' });
    }

    const perfilFinal = perfil && PERFIS_PERMITIDOS.includes(perfil) ? perfil : user[0].perfil;

    const setorFinal = (setor_id !== undefined && setor_id !== null && setor_id !== '')
      ? Number(setor_id)
      : (setor_id === null ? null : user[0].setor_id);

    const nomeFinal = (nome && String(nome).trim().length >= 3)
      ? String(nome).trim()
      : user[0].nome;

    let emailFinal = user[0].email;
    if (email && String(email).trim().toLowerCase() !== user[0].email.toLowerCase()) {
      const cleanEmail = String(email).trim().toLowerCase();
      const [duplicados] = await pool.query(
        `SELECT id FROM usuarios WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
        [cleanEmail, id]
      );
      if (duplicados.length > 0) {
        return res.status(409).json({ success: false, message: 'Já existe outro usuário registrado com este e-mail.' });
      }
      emailFinal = cleanEmail;
    }

    let sql = `UPDATE usuarios SET perfil = ?, setor_id = ?, nome = ?, email = ?, updated_at = NOW()`;
    const params = [perfilFinal, setorFinal, nomeFinal, emailFinal];

    if (senha && String(senha).trim().length >= 8) {
      const senhaHash = await bcrypt.hash(String(senha).trim(), 12);
      sql += `, senha = ?`;
      params.push(senhaHash);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    await pool.query(sql, params);

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

    clearUserAuthCache(id);
    clearUserPermCache(id);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'EDITAR_SOLICITACAO_CADASTRO',
      entidade: 'usuarios',
      entidade_id: parseInt(id, 10),
      descricao: `Solicitação pendente #${id} ("${nomeFinal}") editada pelo Administrador (${req.usuario.nome}).`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      message: `Dados da solicitação de "${nomeFinal}" atualizados com sucesso!`
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao editar solicitação pendente:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao editar dados da solicitação.' });
  }
});

// ─── POST /api/v1/auditoria/solicitacoes/:id/rejeitar ────────────────────────
// Rejeita solicitação de cadastro
router.post('/solicitacoes/:id/rejeitar', async (req, res) => {
  const { motivo } = req.body;
  const id = req.params.id;

  try {
    const pool = getPool();
    const [user] = await pool.query(
      `SELECT id, nome, email, status FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!user.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    await pool.query(
      `UPDATE usuarios
       SET status = 'REJEITADO',
           deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    // Invalida quaisquer tokens de ativação que pudessem estar abertos
    await pool.query(
      `UPDATE tokens_ativacao SET expira_em = NOW() WHERE usuario_id = ? AND usado_em IS NULL`,
      [id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'REJEITAR_CADASTRO',
      entidade: 'usuarios',
      entidade_id: parseInt(id, 10),
      descricao: `Solicitação do usuário "${user[0].nome}" (${user[0].email}) foi REJEITADA.${motivo ? ` Motivo: ${motivo}` : ''}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    // Notifica o solicitante por e-mail com o motivo quando informado
    enviarEmailRejeicaoCadastro({
      usuarioNome: user[0].nome,
      usuarioEmail: user[0].email,
      motivo: motivo ? String(motivo).trim() : null
    }).catch(err => {
      console.error('[AUDITORIA] Erro ao enviar e-mail de rejeição:', err.message);
    });

    return res.json({
      success: true,
      message: `Solicitação do usuário "${user[0].nome}" foi rejeitada e a notificação foi enviada por e-mail.`
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao rejeitar cadastro:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao rejeitar solicitação.' });
  }
});

// ─── POST /api/v1/auditoria/usuarios/:id/reenviar-ativacao ────────────────────
// Permite ao Administrador Geral reenviar o link seguro de ativação por e-mail
router.post('/usuarios/:id/reenviar-ativacao', async (req, res) => {
  const id = req.params.id;

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const user = rows[0];

    if (user.status === 'ATIVO') {
      return res.status(400).json({
        success: false,
        message: 'Esta conta já foi ativada e está em uso.'
      });
    }

    if (user.status === 'REJEITADO' || user.status === 'INATIVO' || user.status === 'BLOQUEADO') {
      return res.status(400).json({
        success: false,
        message: 'Esta conta está inativa ou rejeitada. Altere o status antes de reenviar o link.'
      });
    }

    // Gera novo token
    const { token, tokenHash } = gerarTokenAtivacao();

    // Invalida tokens anteriores
    await pool.query(
      `UPDATE tokens_ativacao SET expira_em = NOW() WHERE usuario_id = ? AND usado_em IS NULL`,
      [id]
    );

    // Salva novo token
    await pool.query(
      `INSERT INTO tokens_ativacao (usuario_id, token_hash, expira_em, ip_criacao)
       VALUES (?, ?, NOW() + INTERVAL ? HOUR, ?)`,
      [id, tokenHash, ACTIVATION_TOKEN_EXPIRES_HOURS, getClientIp(req)]
    );

    // Garante que o status seja AGUARDANDO_ATIVACAO
    await pool.query(`UPDATE usuarios SET status = 'AGUARDANDO_ATIVACAO', updated_at = NOW() WHERE id = ?`, [id]);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'REENVIAR_LINK_ATIVACAO',
      entidade: 'usuarios',
      entidade_id: parseInt(id, 10),
      descricao: `Reenvio de link de ativação para "${user.nome}" (${user.email}) pelo Administrador Geral.`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const linkAtivacao = `${appUrl}/#ativar-conta?token=${encodeURIComponent(token)}`;

    let emailStatus = null;
    try {
      emailStatus = await enviarEmailAtivacaoConta({
        usuarioNome: user.nome,
        usuarioEmail: user.email,
        token,
        perfil: user.perfil,
        setorNome: user.setor_nome
      });
    } catch (err) {
      emailStatus = { success: false, error: err.message };
    }

    const emailEnviado = Boolean(emailStatus && emailStatus.success);

    return res.json({
      success: true,
      message: emailEnviado
        ? `Novo link de ativação enviado com sucesso para ${user.email}.`
        : `Token gerado, porém o disparo de e-mail falhou (${emailStatus?.error || 'Erro no provedor'}). Link disponível para cópia.`,
      emailEnviado,
      emailProvedor: emailStatus?.provedor || null,
      emailErro: emailStatus?.error || null,
      linkAtivacao
    });
  } catch (err) {
    console.error('[AUDITORIA] Erro ao reenviar ativação:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao reenviar link de ativação.' });
  }
});

// ─── GET /api/v1/auditoria ────────────────────────────────────────────────────
// Listagem geral de logs de auditoria do sistema
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { usuario_id, acao, entidade, data_inicio, data_fim, q } = req.query;
    let page = Math.max(parseInt(req.query.page) || 1, 1);
    let limit = Math.min(parseInt(req.query.limit) || 50, 200);
    let offset = (page - 1) * limit;

    let conds = ['1=1'];
    let params = [];
    if (usuario_id) { conds.push('a.usuario_id = ?'); params.push(usuario_id); }
    if (acao) { conds.push('a.acao LIKE ?'); params.push(`%${acao}%`); }
    if (entidade) { conds.push('a.entidade = ?'); params.push(entidade); }
    if (data_inicio) { conds.push('DATE(a.created_at) >= ?'); params.push(data_inicio); }
    if (data_fim) { conds.push('DATE(a.created_at) <= ?'); params.push(data_fim); }
    if (q) { conds.push('(a.descricao LIKE ? OR a.acao LIKE ? OR u.nome LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

    const where = conds.join(' AND ');

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id WHERE ${where}`, params);
    const [rows] = await pool.query(
      `SELECT a.id, a.acao, a.entidade, a.entidade_id, a.descricao, a.ip, a.created_at,
              a.usuario_id, u.nome AS usuario_nome, u.email AS usuario_email
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[AUDITORIA] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao carregar auditoria.' });
  }
});

// ─── POST /api/v1/auditoria/testar-email ─────────────────────────────────────
// Diagnóstico operacional de e-mail (permite ao Admin verificar o status e o provedor)
router.post('/testar-email', async (req, res) => {
  const { destinatario } = req.body;
  const emailDestino = (destinatario || req.usuario.email || '').trim();

  if (!emailDestino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino)) {
    return res.status(422).json({
      success: false,
      message: 'Informe um endereço de e-mail de destino válido para o teste.'
    });
  }

  const { getProvedorEmail, parseRemetente, enviarEmail } = require('../services/email');
  const provedor = getProvedorEmail();
  const remetente = parseRemetente();

  const agora = new Date().toLocaleString('pt-BR');
  const resultado = await enviarEmail({
    para: emailDestino,
    assunto: `[HUB ES+] Teste de Diagnóstico de E-mail (${agora})`,
    texto: `Olá! Este é um e-mail de teste operacional do HUB ES+ disparado em ${agora}.\nProvedor ativo: ${provedor}\nRemetente: ${remetente.name} <${remetente.email}>\nDestinatário: ${emailDestino}\n\nSe você recebeu este e-mail, as configurações estão 100% corretas.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 520px; margin: 0 auto;">
        <div style="background: #2563eb; color: #fff; padding: 6px 14px; border-radius: 8px; display: inline-block; font-weight: 800; font-size: 11px; text-transform: uppercase;">HUB ES+ • Diagnóstico</div>
        <h2 style="color: #0f172a; margin-top: 14px; font-size: 18px;">Teste de Conexão de E-mail Bem-Sucedido!</h2>
        <p style="color: #334155; font-size: 13px;">O serviço de e-mails da plataforma integrada HUB ES+ está <strong>ativo e operando perfeitamente</strong>.</p>
        <div style="background: #ffffff; padding: 14px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 12px; color: #475569; line-height: 1.8;">
          <div><strong>Provedor Ativo:</strong> ${provedor}</div>
          <div><strong>Remetente:</strong> ${remetente.name} &lt;${remetente.email}&gt;</div>
          <div><strong>Destinatário:</strong> ${emailDestino}</div>
          <div><strong>Horário do Disparo:</strong> ${agora}</div>
        </div>
      </div>
    `
  });

  if (resultado.success) {
    return res.json({
      success: true,
      message: resultado.simulated
        ? `Modo Simulação: o e-mail foi exibido no console do servidor. Configure BREVO_API_KEY no Render para envio real.`
        : `E-mail de teste enviado com sucesso via ${provedor}! ID da mensagem: ${resultado.messageId || 'N/A'}. Verifique a caixa de entrada, pasta de SPAM/Lixo Eletrônico ou aba Promoções em ${emailDestino}.`,
      provedor,
      remetente: `${remetente.name} <${remetente.email}>`,
      destinatario: emailDestino,
      messageId: resultado.messageId || null
    });
  } else {
    return res.status(500).json({
      success: false,
      message: `Falha no envio via ${provedor}: ${resultado.error || resultado.message || 'Erro de conexão.'}`,
      provedor,
      remetente: `${remetente.name} <${remetente.email}>`,
      destinatario: emailDestino,
      dica: provedor === 'BREVO_API'
        ? 'Dica Brevo: Certifique-se de que o remetente está confirmado em Senders & IPs > Senders, e verifique se a conta já ativou o envio transacional no painel da Brevo.'
        : provedor === 'SMTP'
        ? 'Dica: hospedagens como o plano Free do Render bloqueiam conexões nas portas SMTP (25/465/587). Configure a variável BREVO_API_KEY no painel do Render para envio via HTTPS.'
        : undefined
    });
  }
});

module.exports = router;
