/**
 * HUB ES+ - Rotas de Dashboard e Indicadores
 * Agrega KPIs de todos os módulos em uma única chamada.
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authMiddleware);

// GET /api/v1/dashboard
router.get('/', requirePermission('dashboard.visualizar'), async (req, res) => {
  try {
    const pool = getPool();

    const [
      [limpeza],
      [compras],
      [equipamentos],
      [documentos],
      [ocorrencias],
      [eventos],
      [insumos],
      [usuarios],
      [auditoria]
    ] = await Promise.all([
      // Limpeza
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'pendente') AS pendentes,
          SUM(status = 'em_execucao') AS em_execucao,
          SUM(status = 'concluido') AS concluidas
        FROM limpeza WHERE deleted_at IS NULL`),
      // Compras
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'pendente') AS pendentes,
          SUM(status = 'aprovado') AS aprovadas,
          SUM(status = 'entregue') AS entregues,
          SUM(status = 'cancelado') AS canceladas,
          SUM(valor_estimado) AS valor_total
        FROM compras WHERE deleted_at IS NULL`),
      // Equipamentos
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(estado = 'bom') AS em_bom_estado,
          SUM(estado = 'manutencao') AS em_manutencao,
          SUM(estado = 'descartado') AS descartados
        FROM equipamentos WHERE deleted_at IS NULL`),
      // Documentos
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'ativo') AS ativos,
          SUM(status = 'arquivado') AS arquivados
        FROM documentos WHERE deleted_at IS NULL`),
      // Ocorrências
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'aberto') AS abertas,
          SUM(status = 'em_andamento') AS em_andamento,
          SUM(status = 'resolvido') AS resolvidas
        FROM ocorrencias WHERE deleted_at IS NULL`),
      // Eventos (próximos 30 dias)
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'agendado') AS agendados,
          SUM(status = 'em_andamento') AS em_andamento,
          SUM(status = 'concluido') AS concluidos,
          SUM(status = 'cancelado') AS cancelados,
          SUM(data BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY) AND status = 'agendado') AS proximos_7_dias
        FROM eventos WHERE deleted_at IS NULL`),
      // Insumos
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(quantidade <= estoque_minimo) AS baixo_estoque
        FROM insumos WHERE deleted_at IS NULL`),
      // Usuários
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'ATIVO') AS ativos,
          SUM(status = 'INATIVO') AS inativos,
          SUM(status = 'BLOQUEADO') AS bloqueados,
          SUM(ultimo_heartbeat >= NOW() - INTERVAL 5 MINUTE) AS online_agora
        FROM usuarios WHERE deleted_at IS NULL`),
      // Auditoria: últimas 5 ações
      pool.query(`
        SELECT a.id, a.acao, a.entidade, a.entidade_id, a.descricao, a.created_at,
               u.nome AS usuario_nome
        FROM auditoria a
        LEFT JOIN usuarios u ON u.id = a.usuario_id
        ORDER BY a.created_at DESC LIMIT 5`)
    ]);

    return res.json({
      success: true,
      data: {
        limpeza: limpeza[0],
        compras: compras[0],
        equipamentos: equipamentos[0],
        documentos: documentos[0],
        ocorrencias: ocorrencias[0],
        eventos: eventos[0],
        insumos: insumos[0],
        usuarios: usuarios[0],
        ultimas_acoes: auditoria
      }
    });
  } catch (err) {
    console.error('[DASHBOARD] GET:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao carregar dados do dashboard.' });
  }
});

// GET /api/v1/dashboard/indicadores (mais detalhado)
router.get('/indicadores', requirePermission('indicadores.visualizar'), async (req, res) => {
  try {
    const pool = getPool();
    const { periodo_dias = 30 } = req.query;
    const diasNum = Math.min(Math.max(parseInt(periodo_dias) || 30, 1), 365);

    const [comprasGrafico, limpezaGrafico, ocorrenciasGrafico] = await Promise.all([
      pool.query(`
        SELECT DATE(created_at) AS data, status, COUNT(*) AS total
        FROM compras
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND deleted_at IS NULL
        GROUP BY DATE(created_at), status
        ORDER BY data ASC`, [diasNum]),
      pool.query(`
        SELECT DATE(created_at) AS data, status, COUNT(*) AS total
        FROM limpeza
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND deleted_at IS NULL
        GROUP BY DATE(created_at), status
        ORDER BY data ASC`, [diasNum]),
      pool.query(`
        SELECT DATE(created_at) AS data, status, COUNT(*) AS total
        FROM ocorrencias
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND deleted_at IS NULL
        GROUP BY DATE(created_at), status
        ORDER BY data ASC`, [diasNum])
    ]);

    return res.json({
      success: true,
      data: {
        periodo_dias: diasNum,
        compras_por_dia: comprasGrafico,
        limpeza_por_dia: limpezaGrafico,
        ocorrencias_por_dia: ocorrenciasGrafico
      }
    });
  } catch (err) {
    console.error('[INDICADORES]:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao carregar indicadores.' });
  }
});

module.exports = router;
