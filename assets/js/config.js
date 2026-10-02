/**
 * HUB ES+ - Configuração da Aplicação e Conexão de API
 * Centraliza as URLs base e parâmetros de conexão para todos os módulos.
 */
const CONFIG = {
  // URL base da API REST backend
  // Pode ser alterado para a porta real do backend ex: 'http://localhost:3000/api/v1' ou 'https://api.hubes.es.gov.br/api/v1'
  API_BASE_URL: '/api/v1',

  // Ativa o uso de dados mock caso o backend ainda não esteja respondendo ou em desenvolvimento local
  // Se definido como false, tentará fazer requisições HTTP reais para API_BASE_URL
  USE_MOCK: true,

  // Tempo de delay simulado para requisições Mock (para demonstrar skeletons e estados de loading)
  MOCK_DELAY_MS: 300,

  // Nome da chave no localStorage para persistência de dados no modo Mock
  STORAGE_KEY_PREFIX: 'hub_es_plus_db_',

  // Mapeamento dos endpoints REST correspondentes às tabelas do banco de dados
  ENDPOINTS: {
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

  // Identidade institucional HUB ES+
  APP_NAME: 'HUB ES+',
  APP_SUBTITLE: 'Plataforma Integrada de Gestão Administrativa',
  VERSION: '1.0.0'
};

// Congela o objeto para prevenir alterações acidentais em tempo de execução
Object.freeze(CONFIG);
window.CONFIG = CONFIG;
