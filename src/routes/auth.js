/**
 * HUB ES+ - Rotas de Autenticação
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * GET  /api/v1/auth/me
 * POST /api/v1/auth/heartbeat
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { getPermissoesDoUsuario, getModulosDoUsuario } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');
const {
  notificarNovoCadastroAdmin,
  buscarEmailsAdministradoresGerais,
  gerarHashToken
} = require('../services/email');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Rate limiting simples (em memória) para o endpoint de login
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > attempts.resetAt) {
    attempts.count = 0;
    attempts.resetAt = now + 15 * 60 * 1000;
  }
  attempts.count++;
  loginAttempts.set(ip, attempts);
  return attempts.count <= 10; // Máximo 10 tentativas em 15min
}

// Rate limiting para solicitação de cadastro (anti-flood/spam)
const cadastroAttempts = new Map();
function checkCadastroRateLimit(ip) {
  const now = Date.now();
  const attempts = cadastroAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > attempts.resetAt) {
    attempts.count = 0;
    attempts.resetAt = now + 15 * 60 * 1000;
  }
  attempts.count++;
  cadastroAttempts.set(ip, attempts);
  return attempts.count <= 5; // Máximo 5 solicitações por IP em 15 min
}

// Rate limiting para tentativas de verificação e ativação de token
const ativacaoAttempts = new Map();
function checkAtivacaoRateLimit(ip) {
  const now = Date.now();
  const attempts = ativacaoAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > attempts.resetAt) {
    attempts.count = 0;
    attempts.resetAt = now + 15 * 60 * 1000;
  }
  attempts.count++;
  ativacaoAttempts.set(ip, attempts);
  return attempts.count <= 10; // Máximo 10 tentativas por IP em 15 min
}

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  // Rate limit
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Aguarde 15 minutos.'
    });
  }

  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(422).json({
      success: false,
      message: 'Email e senha são obrigatórios.',
      errors: { email: !email ? 'Campo obrigatório' : null, senha: !senha ? 'Campo obrigatório' : null }
    });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.nome, u.email, u.senha, u.perfil, u.setor_id, u.status,
              s.nome AS setor_nome
       FROM usuarios u
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE u.email = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      await registrarAuditoria({
        acao: 'LOGIN_FALHOU',
        descricao: `Tentativa com email inexistente: ${email}`,
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    const usuario = rows[0];

    // Verifica status antes de checar senha (não revela qual o problema)
    if (usuario.status === 'INATIVO') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta inativa.',
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Conta inativa. Contate o administrador.' });
    }

    if (usuario.status === 'PENDENTE') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta pendente de aprovação.',
        ip, user_agent: userAgent
      });
      return res.status(403).json({
        success: false,
        message: 'Sua solicitação de cadastro está pendente de aprovação por um administrador.'
      });
    }

    if (usuario.status === 'BLOQUEADO') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta bloqueada.',
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Conta bloqueada. Contate o administrador.' });
    }

    if (usuario.status === 'AGUARDANDO_ATIVACAO') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta aguardando ativação via link de e-mail.',
        ip, user_agent: userAgent
      });
      return res.status(403).json({
        success: false,
        message: 'Sua solicitação foi aprovada, mas sua conta ainda não foi ativada. Acesse o link exclusivo enviado ao seu e-mail para definir sua senha e concluir a ativação.'
      });
    }

    if (usuario.status === 'REJEITADO') {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Tentativa de login com conta rejeitada.',
        ip, user_agent: userAgent
      });
      return res.status(403).json({
        success: false,
        message: 'Esta solicitação de cadastro foi rejeitada pelo Administrador Geral. O acesso não é permitido.'
      });
    }

    // Verificar senha com bcrypt
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      await registrarAuditoria({
        usuario_id: usuario.id,
        acao: 'LOGIN_FALHOU',
        descricao: 'Senha incorreta.',
        ip, user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Atualizar último acesso
    await pool.query(
      `UPDATE usuarios SET ultimo_acesso = NOW(), ultimo_heartbeat = NOW() WHERE id = ?`,
      [usuario.id]
    );

    // Buscar permissões
    const permissoes = await getPermissoesDoUsuario({ perfil: usuario.perfil });
    const modulos = await getModulosDoUsuario({ perfil: usuario.perfil });

    // Registrar auditoria
    await registrarAuditoria({
      usuario_id: usuario.id,
      acao: 'LOGIN',
      descricao: 'Login realizado com sucesso.',
      ip, user_agent: userAgent
    });

    // NUNCA retornar o campo senha
    return res.json({
      success: true,
      data: {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          setor_id: usuario.setor_id,
          setor_nome: usuario.setor_nome
        },
        permissoes,
        modulos
      }
    });
  } catch (err) {
    console.error('[AUTH] Erro no login:', err.message);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
});

// ─── POST /api/v1/auth/logout ────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  await registrarAuditoria({
    usuario_id: req.usuario.id,
    acao: 'LOGOUT',
    descricao: 'Logout realizado.',
    ip, user_agent: userAgent
  });

  return res.json({ success: true, message: 'Logout realizado com sucesso.' });
});

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const permissoes = await getPermissoesDoUsuario(req.usuario);
  const modulos = await getModulosDoUsuario(req.usuario);
  return res.json({
    success: true,
    data: {
      usuario: {
        id: req.usuario.id,
        nome: req.usuario.nome,
        email: req.usuario.email,
        perfil: req.usuario.perfil,
        setor_id: req.usuario.setor_id,
        setor_nome: req.usuario.setor_nome
      },
      permissoes,
      modulos
    }
  });
});

// ─── POST /api/v1/auth/heartbeat ─────────────────────────────────────────────
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE usuarios SET ultimo_heartbeat = NOW() WHERE id = ?`,
      [req.usuario.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao registrar heartbeat.' });
  }
});

// ─── PUT /api/v1/auth/alterar-senha ─────────────────────────────────────────
// Permite ao usuário logado alterar sua própria senha a qualquer momento
router.put('/alterar-senha', authMiddleware, async (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  if (!senha_atual) {
    return res.status(422).json({ success: false, message: 'Informe a senha atual.' });
  }
  if (!nova_senha || String(nova_senha).length < 8) {
    return res.status(422).json({ success: false, message: 'A nova senha precisa ter no mínimo 8 caracteres.' });
  }
  if (senha_atual === nova_senha) {
    return res.status(422).json({ success: false, message: 'A nova senha deve ser diferente da senha atual.' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, senha FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [req.usuario.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const senhaCorreta = await bcrypt.compare(String(senha_atual), rows[0].senha);
    if (!senhaCorreta) {
      await registrarAuditoria({
        usuario_id: req.usuario.id,
        acao: 'ALTERAR_SENHA_FALHOU',
        entidade: 'usuarios',
        entidade_id: req.usuario.id,
        descricao: 'Tentativa de alteração de senha com senha atual incorreta.',
        ip,
        user_agent: userAgent
      });
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }

    const novoHash = await bcrypt.hash(String(nova_senha), 12);
    await pool.query(
      `UPDATE usuarios SET senha = ?, updated_at = NOW() WHERE id = ?`,
      [novoHash, req.usuario.id]
    );

    const { clearUserAuthCache } = require('../middleware/auth');
    clearUserAuthCache(req.usuario.id);

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'ALTERAR_SENHA',
      entidade: 'usuarios',
      entidade_id: req.usuario.id,
      descricao: 'Senha alterada com sucesso pelo próprio usuário.',
      ip,
      user_agent: userAgent
    });

    return res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('[AUTH] Erro ao alterar senha:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao alterar senha.' });
  }
});

// ─── POST /api/v1/auth/solicitar-cadastro ─────────────────────────────────────
router.post('/solicitar-cadastro', async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  // Rate limiting anti-flood
  if (!checkCadastroRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Muitas solicitações enviadas deste dispositivo. Por favor, aguarde 15 minutos.'
    });
  }

  const { nome, email, setor_id } = req.body;

  const erros = {};
  if (!nome || String(nome).trim().length < 3) {
    erros.nome = 'Nome precisa ter pelo menos 3 caracteres.';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    erros.email = 'E-mail informado é inválido.';
  }

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({
      success: false,
      message: 'Dados inválidos.',
      errors: erros
    });
  }

  try {
    const pool = getPool();
    const cleanEmail = String(email).toLowerCase().trim();

    // Evitar cadastros duplicados e tratar solicitações repetidas de acordo com o status
    const [existing] = await pool.query(
      `SELECT id, status FROM usuarios WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanEmail]
    );

    if (existing.length > 0) {
      const st = existing[0].status;
      if (st === 'PENDENTE') {
        return res.status(409).json({
          success: false,
          message: 'Já existe uma solicitação de cadastro pendente com este e-mail. Aguarde a aprovação do Administrador Geral.'
        });
      }
      if (st === 'AGUARDANDO_ATIVACAO') {
        return res.status(409).json({
          success: false,
          message: 'Seu cadastro já foi aprovado! Verifique a mensagem com o link de ativação enviada para sua caixa de entrada.'
        });
      }
      if (st === 'REJEITADO') {
        return res.status(409).json({
          success: false,
          message: 'Uma solicitação anterior para este e-mail foi rejeitada. Entre em contato com a equipe de gestão do HUB ES+.'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Este e-mail já está cadastrado no sistema.'
      });
    }

    // Como a senha definitiva será definida pelo próprio usuário via link seguro de ativação,
    // geramos um hash seguro temporário para preencher a coluna obrigatória do banco.
    const senhaPlaceholder = crypto.randomBytes(32).toString('hex');
    const senhaHash = await bcrypt.hash(senhaPlaceholder, 12);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
       VALUES (?, ?, ?, 'OPERADOR', ?, 'PENDENTE')`,
      [String(nome).trim(), cleanEmail, senhaHash, setor_id || null]
    );

    // Registra na auditoria sem armazenar senhas ou dados sensíveis
    await registrarAuditoria({
      usuario_id: null,
      acao: 'SOLICITACAO_CADASTRO',
      entidade: 'usuarios',
      entidade_id: result.insertId,
      descricao: `Novo pedido de cadastro para "${String(nome).trim()}" (${cleanEmail}). Status: PENDENTE.`,
      ip,
      user_agent: userAgent
    });

    // 1. Notifica por e-mail o Administrador Geral sobre novo cadastro aguardando análise
    buscarEmailsAdministradoresGerais(pool)
      .then(adminEmails => {
        return notificarNovoCadastroAdmin({
          adminEmails,
          usuarioNome: String(nome).trim(),
          usuarioEmail: cleanEmail,
          solicitacaoId: result.insertId,
          origem: 'Tela de Login (Auto-solicitação)'
        });
      })
      .catch(err => {
        console.error('[AUTH] Erro ao notificar administrador sobre cadastro:', err.message);
      });

    return res.status(201).json({
      success: true,
      message: 'Solicitação de cadastro enviada com sucesso! O Administrador Geral foi notificado e você receberá um e-mail com o link de ativação assim que for aprovado.',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('[AUTH] Erro ao solicitar cadastro:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao processar solicitação de cadastro.' });
  }
});

// Alias /registro para conveniência
router.post('/registro', (req, res) => res.redirect(307, '/api/v1/auth/solicitar-cadastro'));

// ─── GET /api/v1/auth/verificar-token-ativacao ─────────────────────────────────
// Valida se o link de ativação é legítimo, está dentro da validade e ainda não foi usado
router.get('/verificar-token-ativacao', async (req, res) => {
  const ip = getClientIp(req);

  if (!checkAtivacaoRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Muitas consultas de ativação. Aguarde 15 minutos.'
    });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string' || token.trim().length < 16) {
    return res.status(400).json({
      success: false,
      message: 'Link de ativação inválido ou incompleto.'
    });
  }

  try {
    const pool = getPool();
    const tokenHash = gerarHashToken(token);

    const [rows] = await pool.query(
      `SELECT t.id AS token_id, t.usuario_id, t.expira_em, t.usado_em,
              u.nome, u.email, u.perfil, u.status,
              s.nome AS setor_nome
       FROM tokens_ativacao t
       JOIN usuarios u ON u.id = t.usuario_id
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE t.token_hash = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Link de ativação não encontrado ou inexistente.'
      });
    }

    const item = rows[0];

    // Verifica se já foi utilizado (regra de uso único)
    if (item.usado_em) {
      return res.status(400).json({
        success: false,
        message: 'Este link de ativação já foi utilizado anteriormente. Se já definiu sua senha, faça login com seu e-mail.'
      });
    }

    // Verifica se já expirou (regra de validade limitada)
    if (new Date(item.expira_em) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Este link de ativação expirou. Contate o Administrador Geral para solicitar o reenvio.'
      });
    }

    // Verifica status da conta
    if (item.status === 'ATIVO') {
      return res.status(400).json({
        success: false,
        message: 'Esta conta já se encontra ativa. Você pode acessar o sistema diretamente pelo login.'
      });
    }

    if (item.status === 'REJEITADO' || item.status === 'BLOQUEADO' || item.status === 'INATIVO') {
      return res.status(403).json({
        success: false,
        message: 'Esta conta não está autorizada para ativação.'
      });
    }

    return res.json({
      success: true,
      data: {
        nome: item.nome,
        email: item.email,
        perfil: item.perfil,
        setor_nome: item.setor_nome || 'Geral'
      }
    });
  } catch (err) {
    console.error('[AUTH] Erro ao verificar token de ativação:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao validar link de ativação.' });
  }
});

// ─── POST /api/v1/auth/ativar-conta ──────────────────────────────────────────
// Conclui a ativação da conta, definindo a própria senha do usuário com link de uso único
router.post('/ativar-conta', async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  if (!checkAtivacaoRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Muitas tentativas de ativação. Aguarde 15 minutos.'
    });
  }

  const { token, senha, confirmacao_senha } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token de ativação é obrigatório.' });
  }

  if (!senha || String(senha).length < 8) {
    return res.status(422).json({
      success: false,
      message: 'A senha de acesso deve possuir no mínimo 8 caracteres.'
    });
  }

  if (senha !== confirmacao_senha) {
    return res.status(422).json({
      success: false,
      message: 'A confirmação de senha não coincide com a senha digitada.'
    });
  }

  try {
    const pool = getPool();
    const tokenHash = gerarHashToken(token);

    const [rows] = await pool.query(
      `SELECT t.id AS token_id, t.usuario_id, t.expira_em, t.usado_em,
              u.nome, u.email, u.perfil, u.status
       FROM tokens_ativacao t
       JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.token_hash = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Link de ativação inválido.' });
    }

    const item = rows[0];

    // Regra estrita: link de uso único
    if (item.usado_em) {
      return res.status(400).json({
        success: false,
        message: 'Este link de ativação já foi utilizado e não pode ser reutilizado.'
      });
    }

    // Regra estrita: validade limitada
    if (new Date(item.expira_em) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Este link de ativação expirou. Solicite uma nova análise à administração.'
      });
    }

    if (item.status === 'REJEITADO' || item.status === 'BLOQUEADO' || item.status === 'INATIVO') {
      return res.status(403).json({
        success: false,
        message: 'Esta conta está inativa ou rejeitada e não pode ser ativada.'
      });
    }

    // Hashear a senha definitiva definida pelo próprio usuário
    const senhaHash = await bcrypt.hash(String(senha), 12);

    // Atualiza status para ATIVO e salva a senha escolhida
    await pool.query(
      `UPDATE usuarios
       SET senha = ?,
           status = 'ATIVO',
           updated_at = NOW()
       WHERE id = ?`,
      [senhaHash, item.usuario_id]
    );

    // Marca o token como utilizado e registra IP da ativação (invalida reuso)
    await pool.query(
      `UPDATE tokens_ativacao
       SET usado_em = NOW(),
           ip_ativacao = ?
       WHERE id = ?`,
      [ip, item.token_id]
    );

    // Invalida quaisquer outros tokens pendentes que possam existir para o mesmo usuário
    await pool.query(
      `UPDATE tokens_ativacao
       SET expira_em = NOW()
       WHERE usuario_id = ? AND id != ? AND usado_em IS NULL`,
      [item.usuario_id, item.token_id]
    );

    // Registra na auditoria SEM registrar senhas ou tokens sensíveis
    await registrarAuditoria({
      usuario_id: item.usuario_id,
      acao: 'ATIVACAO_CONTA',
      entidade: 'usuarios',
      entidade_id: item.usuario_id,
      descricao: `Conta ativada com sucesso pelo usuário "${item.nome}" (${item.email}) e senha definitiva definida via link seguro.`,
      ip,
      user_agent: userAgent
    });

    return res.json({
      success: true,
      message: 'Sua conta foi ativada com sucesso! Você já pode entrar no sistema com seu e-mail e nova senha.'
    });
  } catch (err) {
    console.error('[AUTH] Erro ao ativar conta:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao ativar conta. Tente novamente mais tarde.' });
  }
});

// Alias /registro para conveniência
router.post('/registro', (req, res) => res.redirect(307, '/api/v1/auth/solicitar-cadastro'));

module.exports = router;
