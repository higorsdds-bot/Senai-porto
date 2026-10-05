/**
 * HUB ES+ - Configuração da Aplicação e Conexão de API
 */
const CONFIG = {
  // URL base da API REST backend (mesmo servidor)
  API_BASE_URL: '/api/v1',

  // Banco já está na nuvem (TiDB Cloud) - modo mock DESLIGADO
  USE_MOCK: false,

  MOCK_DELAY_MS: 300,
  STORAGE_KEY_PREFIX: 'hub_es_plus_db_',

  // Chaves de sessão
  STORAGE_TOKEN: 'hub_es_plus_token',
  STORAGE_USUARIO: 'hub_es_plus_usuario',

  ENDPOINTS: {
    AUTH: '/auth',
    USUARIOS: '/usuarios',
    SETORES: '/setores',
    COMPRAS: '/compras',
    EQUIPAMENTOS: '/equipamentos',
    DOCUMENTOS: '/documentos',
    OCORRENCIAS: '/ocorrencias',
    LIMPEZA: '/limpeza',
    EVENTOS: '/eventos',
    INSUMOS: '/insumos',
    COMUNICADOS: '/comunicados'
  },

  APP_NAME: 'HUB ES+',
  APP_SUBTITLE: 'Plataforma Integrada de Gestão Administrativa',
  VERSION: '1.0.0'
};

Object.freeze(CONFIG);
window.CONFIG = CONFIG;