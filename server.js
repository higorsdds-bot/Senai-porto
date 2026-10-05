/**
 * HUB ES+ / SECULT - API Backend
 * Servidor Express principal.
 * Uso: node server.js  ou  npm start
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getPool, testConnection } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: Postman, curl, app mobile)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS bloqueado para origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── MIDDLEWARES BÁSICOS ──────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ─── SERVIR ARQUIVOS ESTÁTICOS ────────────────────────────────────────────────
// Frontend SPA
app.use(express.static(path.join(__dirname, '.')));
// Uploads de documentos e imagens de equipamentos
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ─── ROTAS DA API ─────────────────────────────────────────────────────────────
const authRouter = require('./src/routes/auth');
const usuariosRouter = require('./src/routes/usuarios');
const setoresRouter = require('./src/routes/setores');
const limpezaRouter = require('./src/routes/limpeza');
const comprasRouter = require('./src/routes/compras');
const equipamentosRouter = require('./src/routes/equipamentos');
const documentosRouter = require('./src/routes/documentos');
const ocorrenciasRouter = require('./src/routes/ocorrencias');
const eventosRouter = require('./src/routes/eventos');
const insumosRouter = require('./src/routes/insumos');
const comunicadosRouter = require('./src/routes/comunicados');
const dashboardRouter = require('./src/routes/dashboard');
const auditoriaRouter = require('./src/routes/auditoria');

const BASE = '/api/v1';
app.use(`${BASE}/auth`, authRouter);
app.use(`${BASE}/usuarios`, usuariosRouter);
app.use(`${BASE}/setores`, setoresRouter);
app.use(`${BASE}/limpeza`, limpezaRouter);
app.use(`${BASE}/compras`, comprasRouter);
app.use(`${BASE}/equipamentos`, equipamentosRouter);
app.use(`${BASE}/documentos`, documentosRouter);
app.use(`${BASE}/ocorrencias`, ocorrenciasRouter);
app.use(`${BASE}/eventos`, eventosRouter);
app.use(`${BASE}/insumos`, insumosRouter);
app.use(`${BASE}/comunicados`, comunicadosRouter);
app.use(`${BASE}/dashboard`, dashboardRouter);
app.use(`${BASE}/auditoria`, auditoriaRouter);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const ok = await testConnection();
  return res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    database: ok ? 'connected' : 'error',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ─── ROTA CATCH-ALL (SPA) ────────────────────────────────────────────────────
// Devolve o index.html para qualquer rota não capturada (necessário para hash routing)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint não encontrado.' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});
// ─── ERROR HANDLER GLOBAL ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message || err);

  // Erro de CORS
  if (err.message && err.message.startsWith('CORS bloqueado')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Erro de multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Arquivo muito grande. Tamanho máximo permitido: 20MB.' });
  }

  // Erro genérico
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : err.message || 'Erro desconhecido.'
  });
});

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('\n🚀 HUB ES+ - API Backend');
    console.log('─'.repeat(50));
    console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] Banco: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);

    // Inicializar pool de conexões
    console.log('[SERVER] Inicializando pool de conexões MySQL...');
    getPool();
    // Testar conexão
    const dbOk = await testConnection();
    if (!dbOk) {
      console.warn('[SERVER] ⚠️  Não foi possível conectar ao banco de dados.');
      console.warn('[SERVER] ⚠️  Verifique se o IP está autorizado no TiDB Cloud e se as credenciais estão corretas.');
      console.warn('[SERVER] ⚠️  A API iniciará mesmo assim, mas as rotas retornarão erro até a conexão ser estabelecida.');
    }

    app.listen(PORT, () => {
      console.log('─'.repeat(50));
      console.log(`✅ Servidor rodando em: http://localhost:${PORT}`);
      console.log(`📋 Health check em:    http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth endpoint em:   http://localhost:${PORT}/api/v1/auth/login`);
      console.log(`📁 Frontend em:        http://localhost:${PORT}/`);
      console.log('─'.repeat(50) + '\n');
    });
  } catch (err) {
    console.error('[SERVER] Falha crítica ao iniciar:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
