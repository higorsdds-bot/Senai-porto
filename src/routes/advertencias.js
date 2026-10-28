/**
 * HUB ES+ / SECULT - Rotas de Advertências Disciplinares
 * Acesso restrito a ADMIN (Administrador Geral) e ADMINISTRADOR (Administração).
 * Administrador pode solicitar aplicação (PENDENTE de homologação).
 * Administrador Geral pode aplicar diretamente, homologar (aprovar), rejeitar ou revogar.
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { registrarAuditoria, getClientIp } = require('../middleware/auditoria');

router.use(authMiddleware);

// Middleware adicional de segurança estrita: apenas ADMIN, ADMINISTRADOR ou GESTOR
function checkAdminOuGestor(req, res, next) {
  const perfil = req.usuario && req.usuario.perfil ? String(req.usuario.perfil).toUpperCase().trim() : '';
  if (!['ADMIN', 'ADMIN_GERAL', 'ADMINISTRADOR', 'ADMINISTRACAO', 'GESTOR'].includes(perfil)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito ao Administrador Geral, Administradores e Gestores.'
    });
  }
  next();
}

router.use(checkAdminOuGestor);

// GET /api/v1/advertencias - Listar advertências com filtros
router.get('/', requirePermission('advertencias.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { status, gravidade, colaborador_id, q } = req.query;

    let conds = ['a.deleted_at IS NULL'];
    let params = [];

    if (status && status !== 'TODOS') {
      conds.push('a.status = ?');
      params.push(status.toUpperCase());
    }

    if (gravidade && gravidade !== 'TODOS') {
      conds.push('a.gravidade = ?');
      params.push(gravidade.toUpperCase());
    }

    if (colaborador_id) {
      conds.push('a.colaborador_id = ?');
      params.push(colaborador_id);
    }

    if (q) {
      conds.push('(u.nome LIKE ? OR a.motivo LIKE ? OR a.descricao LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.colaborador_id, a.solicitante_id, a.homologador_id,
              a.motivo, a.descricao, a.gravidade, a.status, a.data_ocorrencia,
              a.motivo_decisao, a.data_decisao, a.created_at, a.updated_at,
              u.nome AS colaborador_nome, u.email AS colaborador_email, u.perfil AS colaborador_perfil,
              s.nome AS solicitante_nome, s.perfil AS solicitante_perfil,
              h.nome AS homologador_nome
       FROM advertencias a
       INNER JOIN usuarios u ON u.id = a.colaborador_id
       INNER JOIN usuarios s ON s.id = a.solicitante_id
       LEFT JOIN usuarios h ON h.id = a.homologador_id
       WHERE ${conds.join(' AND ')}
       ORDER BY a.created_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[ADVERTENCIAS] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao listar advertências disciplinares.' });
  }
});

// GET /api/v1/advertencias/:id - Obter detalhes
router.get('/:id', requirePermission('advertencias.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.id, a.colaborador_id, a.solicitante_id, a.homologador_id,
              a.motivo, a.descricao, a.gravidade, a.status, a.data_ocorrencia,
              a.motivo_decisao, a.data_decisao, a.created_at, a.updated_at,
              u.nome AS colaborador_nome, u.email AS colaborador_email, u.perfil AS colaborador_perfil,
              s.nome AS solicitante_nome,
              h.nome AS homologador_nome
       FROM advertencias a
       INNER JOIN usuarios u ON u.id = a.colaborador_id
       INNER JOIN usuarios s ON s.id = a.solicitante_id
       LEFT JOIN usuarios h ON h.id = a.homologador_id
       WHERE a.id = ? AND a.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Registro de advertência não encontrado.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar detalhes da advertência.' });
  }
});

// POST /api/v1/advertencias - Solicitar ou registrar advertência
// Regra: É o Administrador Geral que tem a competência de aceitar a advertência.
// Toda advertência entra como PENDENTE de aceite, a menos que o próprio Admin Geral marque aceite imediato.
router.post('/', requirePermission('advertencias.solicitar'), async (req, res) => {
  const { colaborador_id, motivo, descricao, gravidade, data_ocorrencia, aceitar_imediatamente } = req.body;
  const perfilUsuario = String(req.usuario.perfil || '').toUpperCase().trim();
  const ehAdminGeral = perfilUsuario === 'ADMIN' || perfilUsuario === 'ADMIN_GERAL';

  const erros = {};
  if (!colaborador_id) erros.colaborador_id = 'Colaborador é obrigatório.';
  if (!motivo || motivo.trim().length < 3) erros.motivo = 'Motivo deve conter ao menos 3 caracteres.';
  if (!descricao || descricao.trim().length < 5) erros.descricao = 'Descrição detalhada é obrigatória (mínimo 5 caracteres).';
  if (!data_ocorrencia) erros.data_ocorrencia = 'Data da ocorrência é obrigatória.';

  const gravidadesValidas = ['LEVE', 'MEDIA', 'GRAVE'];
  const gravidadeNorm = String(gravidade || 'LEVE').toUpperCase();
  if (!gravidadesValidas.includes(gravidadeNorm)) {
    erros.gravidade = `Gravidade deve ser: ${gravidadesValidas.join(', ')}`;
  }

  if (Object.keys(erros).length > 0) {
    return res.status(422).json({ success: false, message: Object.values(erros).join(' '), errors: erros });
  }

  try {
    const pool = getPool();

    // Validar se o colaborador existe e não está excluído
    const [cols] = await pool.query('SELECT id, nome FROM usuarios WHERE id = ? AND deleted_at IS NULL LIMIT 1', [colaborador_id]);
    if (!cols.length) {
      return res.status(404).json({ success: false, message: 'Colaborador não encontrado.' });
    }
    const nomeColaborador = cols[0].nome;

    // Regra de Negócio:
    // O Administrador Geral é quem tem a atribuição de aceitar a advertência.
    // Qualquer registro entra como PENDENTE para análise e aceite do Admin Geral.
    // Se o próprio Admin Geral estiver cadastrando e marcou aceitar_imediatamente, homologa no ato.
    const deveAceitarJa = ehAdminGeral && (aceitar_imediatamente === true || aceitar_imediatamente === '1' || aceitar_imediatamente === 'true');
    const statusInicial = deveAceitarJa ? 'APLICADA' : 'PENDENTE';
    const homologadorId = deveAceitarJa ? req.usuario.id : null;
    const dataDecisao = deveAceitarJa ? new Date() : null;
    const motivoDecisao = deveAceitarJa ? 'Aceita e aplicada diretamente pelo Administrador Geral.' : null;

    const [result] = await pool.query(
      `INSERT INTO advertencias 
        (colaborador_id, solicitante_id, homologador_id, motivo, descricao, gravidade, status, data_ocorrencia, motivo_decisao, data_decisao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        colaborador_id,
        req.usuario.id,
        homologadorId,
        motivo.trim(),
        descricao.trim(),
        gravidadeNorm,
        statusInicial,
        data_ocorrencia,
        motivoDecisao,
        dataDecisao
      ]
    );

    const acaoAuditoria = deveAceitarJa ? 'APLICAR_ADVERTENCIA' : 'SOLICITAR_ADVERTENCIA';
    const descAuditoria = deveAceitarJa
      ? `Advertência [${gravidadeNorm}] aplicada e aceita diretamente pelo Admin Geral ao colaborador ${nomeColaborador} (#${colaborador_id}). Motivo: ${motivo.trim()}`
      : `Advertência [${gravidadeNorm}] registrada para o colaborador ${nomeColaborador} (#${colaborador_id}). Enviada para a fila de aceite do Administrador Geral.`;

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: acaoAuditoria,
      entidade: 'advertencias',
      entidade_id: result.insertId,
      descricao: descAuditoria,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: deveAceitarJa
        ? 'Advertência aplicada com sucesso pelo Administrador Geral.'
        : 'Advertência registrada com sucesso. Aguardando análise e aceite do Administrador Geral.',
      data: { id: result.insertId, status: statusInicial }
    });
  } catch (err) {
    console.error('[ADVERTENCIAS] POST:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao registrar advertência disciplinar.' });
  }
});

// POST /api/v1/advertencias/:id/aceitar e /aprovar - Aceitar advertência pendente (Exclusivo Administrador Geral)
const aceitarAdvertenciaHandler = async (req, res) => {
  const perfil = String(req.usuario.perfil || '').toUpperCase().trim();
  if (!['ADMIN', 'ADMIN_GERAL'].includes(perfil)) {
    return res.status(403).json({
      success: false,
      message: 'Apenas o Administrador Geral possui competência para aceitar e homologar advertências disciplinares.'
    });
  }

  const { motivo_decisao } = req.body;

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT a.*, u.nome AS colaborador_nome FROM advertencias a INNER JOIN usuarios u ON u.id = a.colaborador_id WHERE a.id = ? AND a.deleted_at IS NULL LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Advertência não encontrada.' });
    }

    const advertencia = rows[0];
    if (advertencia.status !== 'PENDENTE') {
      return res.status(400).json({ success: false, message: `Não é possível aceitar uma advertência com status ${advertencia.status}.` });
    }

    const parecerFinal = motivo_decisao && motivo_decisao.trim()
      ? motivo_decisao.trim()
      : 'Aceita e homologada formalmente pelo Administrador Geral.';

    await pool.query(
      `UPDATE advertencias 
       SET status = 'APLICADA', homologador_id = ?, motivo_decisao = ?, data_decisao = NOW()
       WHERE id = ?`,
      [req.usuario.id, parecerFinal, req.params.id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'ACEITAR_ADVERTENCIA',
      entidade: 'advertencias',
      entidade_id: parseInt(req.params.id, 10),
      descricao: `Advertência #${req.params.id} do colaborador ${advertencia.colaborador_nome} foi aceita e homologada pelo Administrador Geral. Parecer: ${parecerFinal}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Advertência aceita e homologada com sucesso pelo Administrador Geral.' });
  } catch (err) {
    console.error('[ADVERTENCIAS] ACEITAR:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao aceitar advertência disciplinar.' });
  }
};

router.post('/:id/aceitar', aceitarAdvertenciaHandler);
router.post('/:id/aprovar', aceitarAdvertenciaHandler);

// POST /api/v1/advertencias/:id/rejeitar - Rejeitar solicitação de advertência (Admin Geral)
router.post('/:id/rejeitar', async (req, res) => {
  const perfil = String(req.usuario?.perfil || '').toUpperCase().trim();
  if (!['ADMIN', 'ADMIN_GERAL'].includes(perfil)) {
    return res.status(403).json({ success: false, message: 'Apenas o Administrador Geral pode rejeitar solicitações de advertência.' });
  }

  const { motivo_decisao } = req.body;
  if (!motivo_decisao || motivo_decisao.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Informe a justificativa da rejeição.' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT a.*, u.nome AS colaborador_nome FROM advertencias a INNER JOIN usuarios u ON u.id = a.colaborador_id WHERE a.id = ? AND a.deleted_at IS NULL LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Advertência não encontrada.' });
    }

    const advertencia = rows[0];
    if (advertencia.status !== 'PENDENTE') {
      return res.status(400).json({ success: false, message: `Não é possível rejeitar uma advertência com status ${advertencia.status}.` });
    }

    await pool.query(
      `UPDATE advertencias 
       SET status = 'REJEITADA', homologador_id = ?, motivo_decisao = ?, data_decisao = NOW()
       WHERE id = ?`,
      [req.usuario.id, motivo_decisao.trim(), req.params.id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'REJEITAR_ADVERTENCIA',
      entidade: 'advertencias',
      entidade_id: parseInt(req.params.id, 10),
      descricao: `Solicitação de advertência #${req.params.id} do colaborador ${advertencia.colaborador_nome} foi rejeitada pelo Admin Geral. Motivo: ${motivo_decisao.trim()}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Solicitação de advertência rejeitada com sucesso.' });
  } catch (err) {
    console.error('[ADVERTENCIAS] REJEITAR:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao rejeitar solicitação.' });
  }
});

// POST /api/v1/advertencias/:id/revogar - Revogar advertência aplicada (Admin Geral)
router.post('/:id/revogar', async (req, res) => {
  const perfil = String(req.usuario?.perfil || '').toUpperCase().trim();
  if (!['ADMIN', 'ADMIN_GERAL'].includes(perfil)) {
    return res.status(403).json({ success: false, message: 'Apenas o Administrador Geral pode revogar advertências.' });
  }

  const { motivo_decisao } = req.body;
  if (!motivo_decisao || motivo_decisao.trim().length < 3) {
    return res.status(422).json({ success: false, message: 'Informe a justificativa da revogação.' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT a.*, u.nome AS colaborador_nome FROM advertencias a INNER JOIN usuarios u ON u.id = a.colaborador_id WHERE a.id = ? AND a.deleted_at IS NULL LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Advertência não encontrada.' });
    }

    const advertencia = rows[0];
    if (advertencia.status !== 'APLICADA') {
      return res.status(400).json({ success: false, message: `Apenas advertências com status APLICADA podem ser revogadas.` });
    }

    await pool.query(
      `UPDATE advertencias 
       SET status = 'REVOGADA', homologador_id = ?, motivo_decisao = ?, data_decisao = NOW()
       WHERE id = ?`,
      [req.usuario.id, motivo_decisao.trim(), req.params.id]
    );

    await registrarAuditoria({
      usuario_id: req.usuario.id,
      acao: 'REVOGAR_ADVERTENCIA',
      entidade: 'advertencias',
      entidade_id: parseInt(req.params.id, 10),
      descricao: `Advertência #${req.params.id} do colaborador ${advertencia.colaborador_nome} foi revogada pelo Admin Geral. Motivo: ${motivo_decisao.trim()}`,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Advertência revogada com sucesso.' });
  } catch (err) {
    console.error('[ADVERTENCIAS] REVOGAR:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao revogar advertência.' });
  }
});

module.exports = router;
