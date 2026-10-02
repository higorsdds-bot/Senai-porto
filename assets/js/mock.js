/**
 * HUB ES+ - Mock Database & In-Memory / LocalStorage Persistence
 * Simula a persistência e operações de banco de dados relacional
 * mantendo estritamente as tabelas e campos exigidos pelo backend.
 */

const INITIAL_MOCK_DATA = {
  // Tabela: setores (id, nome)
  setores: [
    { id: 1, nome: 'Administração Geral' },
    { id: 2, nome: 'Tecnologia da Informação & Inovação' },
    { id: 3, nome: 'Operações e Logística' },
    { id: 4, nome: 'Comunicação e Eventos' },
    { id: 5, nome: 'Financeiro e Compras' },
    { id: 6, nome: 'Manutenção Predial' }
  ],

  // Tabela: usuarios (id, nome, email, setor_id)
  usuarios: [
    { id: 1, nome: 'Ana Beatriz Souza', email: 'ana.souza@hubesplus.es.gov.br', setor_id: 1 },
    { id: 2, nome: 'Carlos Eduardo Lima', email: 'carlos.lima@hubesplus.es.gov.br', setor_id: 2 },
    { id: 3, nome: 'Mariana Duarte Mendes', email: 'mariana.mendes@hubesplus.es.gov.br', setor_id: 4 },
    { id: 4, nome: 'Rodrigo Santoro Silva', email: 'rodrigo.silva@hubesplus.es.gov.br', setor_id: 3 },
    { id: 5, nome: 'Fernanda Martins', email: 'fernanda.martins@hubesplus.es.gov.br', setor_id: 5 },
    { id: 6, nome: 'Jorge Nascimento', email: 'jorge.nascimento@hubesplus.es.gov.br', setor_id: 6 }
  ],

  // Tabela: compras (id, solicitante_id, setor_id, produto, status)
  // status: 'pendente' | 'aprovado' | 'entregue' | 'cancelado'
  compras: [
    { id: 101, solicitante_id: 2, setor_id: 2, produto: 'Switch Cisco 24 Portas Gigabit L3', status: 'pendente' },
    { id: 102, solicitante_id: 1, setor_id: 1, produto: 'Papel A4 Chamex Caixa com 10 resmas', status: 'aprovado' },
    { id: 103, solicitante_id: 4, setor_id: 3, produto: 'Projetor Laser 4K para Auditório Principal', status: 'entregue' },
    { id: 104, solicitante_id: 3, setor_id: 4, produto: 'Microfone sem fio Shure Duplo UHF', status: 'aprovado' },
    { id: 105, solicitante_id: 6, setor_id: 6, produto: 'Kit de Ferramentas Elétricas e Multímetro Digital', status: 'pendente' },
    { id: 106, solicitante_id: 5, setor_id: 5, produto: 'Licenças Microsoft 365 Business Standard (20 unid)', status: 'entregue' }
  ],

  // Tabela: equipamentos (id, nome, patrimonio, responsavel_id)
  equipamentos: [
    { id: 201, nome: 'Notebook Dell Latitude 5430 i7 16GB', patrimonio: 'HUB-PAT-00912', responsavel_id: 2 },
    { id: 202, nome: 'Projetor Epson PowerLite Laser 5000 Lumens', patrimonio: 'HUB-PAT-00431', responsavel_id: 3 },
    { id: 203, nome: 'Servidor Rack Dell PowerEdge R640', patrimonio: 'HUB-PAT-00104', responsavel_id: 2 },
    { id: 204, nome: 'Impressora Multifuncional Ricoh Corporativa', patrimonio: 'HUB-PAT-00588', responsavel_id: 1 },
    { id: 205, nome: 'Monitor Ultrawide LG 34" Curvo', patrimonio: 'HUB-PAT-00723', responsavel_id: 4 },
    { id: 206, nome: 'Câmera Canon 4K para Transmissão de Eventos', patrimonio: 'HUB-PAT-00810', responsavel_id: 3 }
  ],

  // Tabela: documentos (id, titulo, setor_id, arquivo)
  documentos: [
    { id: 301, titulo: 'Regimento Interno e Normas de Convivência HUB ES+ 2026', setor_id: 1, arquivo: 'regimento_interno_2026.pdf' },
    { id: 302, titulo: 'Manual de Segurança da Informação e Política de Acessos', setor_id: 2, arquivo: 'politica_seguranca_ti.pdf' },
    { id: 303, titulo: 'Procedimento Operacional Padrão - Manutenção e Limpeza', setor_id: 6, arquivo: 'pop_limpeza_manutencao.pdf' },
    { id: 304, titulo: 'Guia de Diretrizes para Realização de Eventos e Workshops', setor_id: 4, arquivo: 'guia_eventos_auditorio.pdf' },
    { id: 305, titulo: 'Termo de Cessão e Uso de Equipamentos Tecnológicos', setor_id: 5, arquivo: 'termo_cessao_equipamentos.pdf' },
    { id: 306, titulo: 'Relatório Semestral de Indicadores e Metas FAPES/HUB', setor_id: 1, arquivo: 'relatorio_metas_semestre_1.pdf' }
  ],

  // Tabela: ocorrencias (id, usuario_id, local, status)
  // status: 'aberto' | 'em_andamento' | 'resolvido'
  ocorrencias: [
    { id: 401, usuario_id: 3, local: 'Auditório Master - Bloco B', status: 'aberto' },
    { id: 402, usuario_id: 1, local: 'Sala de Reuniões 02 - Térreo', status: 'em_andamento' },
    { id: 403, usuario_id: 4, local: 'Espaço Coworking - 1º Andar', status: 'resolvido' },
    { id: 404, usuario_id: 2, local: 'Rack Central TI - Sala de Servidores', status: 'em_andamento' },
    { id: 405, usuario_id: 5, local: 'Copa / Refeitório Administrativo', status: 'aberto' }
  ],

  // Tabela: limpeza (id, responsavel_id, local, status)
  // status: 'pendente' | 'em_execucao' | 'concluido'
  limpeza: [
    { id: 501, responsavel_id: 6, local: 'Auditório Principal e Foyer de Entrada', status: 'concluido' },
    { id: 502, responsavel_id: 6, local: 'Salas de Inovação 01 a 04', status: 'em_execucao' },
    { id: 503, responsavel_id: 4, local: 'Sanitários Bloco A (Feminino/Masculino)', status: 'pendente' },
    { id: 504, responsavel_id: 6, local: 'Área de Convivência e Café Externo', status: 'pendente' },
    { id: 505, responsavel_id: 4, local: 'Recepção Principal e Catracas de Acesso', status: 'concluido' }
  ],

  // Tabela: eventos (id, responsavel_id, local, data, status)
  // status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado'
  eventos: [
    { id: 601, responsavel_id: 3, local: 'Auditório Principal - HUB ES+', data: '2026-10-05T09:00', status: 'agendado' },
    { id: 602, responsavel_id: 2, local: 'Laboratório Maker / Tech Lab', data: '2026-10-06T14:30', status: 'agendado' },
    { id: 603, responsavel_id: 1, local: 'Sala Multiuso 01', data: '2026-10-07T10:00', status: 'agendado' },
    { id: 604, responsavel_id: 3, local: 'Foyer e Deck Gastronômico', data: '2026-10-09T18:00', status: 'agendado' },
    { id: 605, responsavel_id: 4, local: 'Espaço Arena Startup', data: '2026-10-02T14:00', status: 'concluido' }
  ],

  // Tabela complementar para Controle de Insumos (Módulo 3)
  insumos: [
    { id: 701, nome: 'Resma de Papel A4 Report 75g', quantidade: 4, estoque_minimo: 10, unidade: 'cx', setor_id: 1 },
    { id: 702, nome: 'Toner HP LaserJet CF258A Preto', quantidade: 2, estoque_minimo: 3, unidade: 'unid', setor_id: 2 },
    { id: 703, nome: 'Café Superior em Grãos 1kg', quantidade: 18, estoque_minimo: 8, unidade: 'pct', setor_id: 3 },
    { id: 704, nome: 'Álcool 70% Líquido Hospitalar 1L', quantidade: 25, estoque_minimo: 12, unidade: 'frasco', setor_id: 6 },
    { id: 705, nome: 'Crachás RFID de Proximidade em PVC', quantidade: 8, estoque_minimo: 30, unidade: 'unid', setor_id: 2 },
    { id: 706, nome: 'Canetas Marcadoras para Quadro Branco', quantidade: 42, estoque_minimo: 20, unidade: 'unid', setor_id: 4 }
  ],

  // Tabela complementar para Central de Comunicação (Módulo 7)
  comunicados: [
    { id: 801, titulo: 'Aviso de Manutenção Preventiva na Rede Elétrica', mensagem: 'Neste sábado das 07h às 12h haverá desligamento programado para vistoria dos geradores no Bloco B.', data: '2026-10-02', autor_id: 6, prioridade: 'alta' },
    { id: 802, titulo: 'Inscrições Abertas para o Programa de Aceleração HUB ES+ 2026', mensagem: 'Startups residentes e membros da comunidade já podem submeter propostas até dia 20.', data: '2026-10-01', autor_id: 3, prioridade: 'media' },
    { id: 803, titulo: 'Novo Protocolo para Reserva de Salas de Reunião e Auditórios', mensagem: 'Favor solicitar reservas com no mínimo 48 horas de antecedência pelo módulo de eventos da plataforma.', data: '2026-09-28', autor_id: 1, prioridade: 'normal' }
  ]
};

class MockDatabase {
  constructor() {
    this.prefix = window.CONFIG?.STORAGE_KEY_PREFIX || 'hub_es_plus_db_';
    this.init();
  }

  init() {
    Object.keys(INITIAL_MOCK_DATA).forEach(table => {
      const key = this.prefix + table;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(INITIAL_MOCK_DATA[table]));
      }
    });
  }

  getTable(table) {
    const key = this.prefix + table;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (INITIAL_MOCK_DATA[table] || []);
  }

  saveTable(table, data) {
    const key = this.prefix + table;
    localStorage.setItem(key, JSON.stringify(data));
  }

  reset() {
    Object.keys(INITIAL_MOCK_DATA).forEach(table => {
      const key = this.prefix + table;
      localStorage.setItem(key, JSON.stringify(INITIAL_MOCK_DATA[table]));
    });
  }

  getAll(table) {
    return this.getTable(table);
  }

  getById(table, id) {
    const records = this.getTable(table);
    return records.find(item => Number(item.id) === Number(id)) || null;
  }

  create(table, data) {
    const records = this.getTable(table);
    const newId = records.length > 0 ? Math.max(...records.map(r => Number(r.id) || 0)) + 1 : 1;
    const newRecord = { ...data, id: newId };
    records.unshift(newRecord);
    this.saveTable(table, records);
    return newRecord;
  }

  update(table, id, data) {
    const records = this.getTable(table);
    const index = records.findIndex(item => Number(item.id) === Number(id));
    if (index === -1) return null;
    records[index] = { ...records[index], ...data, id: Number(id) };
    this.saveTable(table, records);
    return records[index];
  }

  delete(table, id) {
    const records = this.getTable(table);
    const filtered = records.filter(item => Number(item.id) !== Number(id));
    const deleted = records.length !== filtered.length;
    if (deleted) {
      this.saveTable(table, filtered);
    }
    return deleted;
  }
}

window.MockDB = new MockDatabase();
