/**
 * HUB ES+ - Camada de Serviço de API REST (api.js)
 * Centraliza todas as chamadas HTTP para o backend.
 * Suporta modo mock e fallback automático caso a API ainda não esteja disponível.
 */

class ApiService {
  constructor() {
    this.baseUrl = window.CONFIG?.API_BASE_URL || '/api/v1';
    this.useMock = window.CONFIG?.USE_MOCK ?? true;
    this.delayMs = window.CONFIG?.MOCK_DELAY_MS || 300;
  }

  /**
   * Helper para simular latência de rede no modo mock
   */
  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executa requisição HTTP ou desvia para MockDB
   */
  async request(endpoint, options = {}, mockHandler = null) {
    if (this.useMock && mockHandler) {
      await this._sleep(this.delayMs);
      try {
        return await mockHandler();
      } catch (err) {
        console.error(`[MOCK ERROR] Falha no endpoint ${endpoint}:`, err);
        throw new Error('Falha ao processar operação local simulada.');
      }
    }

    // Chamada HTTP real para a API REST
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Erro HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`[API WARNING] Falha na requisição para ${url}. Tentando fallback mock se disponível...`, error);
      // Fallback gracioso para mock se a API física não responder
      if (mockHandler) {
        console.info(`[API FALLBACK] Usando dados mock para ${endpoint}`);
        await this._sleep(150);
        return await mockHandler();
      }
      throw error;
    }
  }

  // =========================================================================
  // TABELA: usuarios (id, nome, email, setor_id)
  // =========================================================================
  async getUsuarios() {
    // TODO: conectar endpoint GET /usuarios
    return this.request(CONFIG.ENDPOINTS.USUARIOS, { method: 'GET' }, () => {
      return window.MockDB.getAll('usuarios');
    });
  }

  async getUsuarioById(id) {
    // TODO: conectar endpoint GET /usuarios/:id
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/${id}`, { method: 'GET' }, () => {
      return window.MockDB.getById('usuarios', id);
    });
  }

  async createUsuario(data) {
    // TODO: conectar endpoint POST /usuarios
    return this.request(CONFIG.ENDPOINTS.USUARIOS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('usuarios', data);
    });
  }

  // =========================================================================
  // TABELA: setores (id, nome)
  // =========================================================================
  async getSetores() {
    // TODO: conectar endpoint GET /setores
    return this.request(CONFIG.ENDPOINTS.SETORES, { method: 'GET' }, () => {
      return window.MockDB.getAll('setores');
    });
  }

  async getSetorById(id) {
    // TODO: conectar endpoint GET /setores/:id
    return this.request(`${CONFIG.ENDPOINTS.SETORES}/${id}`, { method: 'GET' }, () => {
      return window.MockDB.getById('setores', id);
    });
  }

  // =========================================================================
  // TABELA: compras (id, solicitante_id, setor_id, produto, status)
  // =========================================================================
  async getCompras() {
    // TODO: conectar endpoint GET /compras
    return this.request(CONFIG.ENDPOINTS.COMPRAS, { method: 'GET' }, () => {
      return window.MockDB.getAll('compras');
    });
  }

  async getCompraById(id) {
    // TODO: conectar endpoint GET /compras/:id
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}`, { method: 'GET' }, () => {
      return window.MockDB.getById('compras', id);
    });
  }

  async createCompra(data) {
    // TODO: conectar endpoint POST /compras
    return this.request(CONFIG.ENDPOINTS.COMPRAS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('compras', data);
    });
  }

  async updateCompra(id, data) {
    // TODO: conectar endpoint PUT /compras/:id
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.update('compras', id, data);
    });
  }

  async deleteCompra(id) {
    // TODO: conectar endpoint DELETE /compras/:id
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('compras', id);
    });
  }

  // =========================================================================
  // TABELA: equipamentos (id, nome, patrimonio, responsavel_id)
  // =========================================================================
  async getEquipamentos() {
    // TODO: conectar endpoint GET /equipamentos
    return this.request(CONFIG.ENDPOINTS.EQUIPAMENTOS, { method: 'GET' }, () => {
      return window.MockDB.getAll('equipamentos');
    });
  }

  async createEquipamento(data) {
    // TODO: conectar endpoint POST /equipamentos
    return this.request(CONFIG.ENDPOINTS.EQUIPAMENTOS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('equipamentos', data);
    });
  }

  async updateEquipamento(id, data) {
    // TODO: conectar endpoint PUT /equipamentos/:id
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.update('equipamentos', id, data);
    });
  }

  async deleteEquipamento(id) {
    // TODO: conectar endpoint DELETE /equipamentos/:id
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('equipamentos', id);
    });
  }

  // =========================================================================
  // TABELA: documentos (id, titulo, setor_id, arquivo)
  // =========================================================================
  async getDocumentos() {
    // TODO: conectar endpoint GET /documentos
    return this.request(CONFIG.ENDPOINTS.DOCUMENTOS, { method: 'GET' }, () => {
      return window.MockDB.getAll('documentos');
    });
  }

  async createDocumento(data) {
    // TODO: conectar endpoint POST /documentos
    return this.request(CONFIG.ENDPOINTS.DOCUMENTOS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('documentos', data);
    });
  }

  async updateDocumento(id, data) {
    // TODO: conectar endpoint PUT /documentos/:id
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.update('documentos', id, data);
    });
  }

  async deleteDocumento(id) {
    // TODO: conectar endpoint DELETE /documentos/:id
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('documentos', id);
    });
  }

  // =========================================================================
  // TABELA: ocorrencias (id, usuario_id, local, status)
  // =========================================================================
  async getOcorrencias() {
    // TODO: conectar endpoint GET /ocorrencias
    return this.request(CONFIG.ENDPOINTS.OCORRENCIAS, { method: 'GET' }, () => {
      return window.MockDB.getAll('ocorrencias');
    });
  }

  async createOcorrencia(data) {
    // TODO: conectar endpoint POST /ocorrencias
    return this.request(CONFIG.ENDPOINTS.OCORRENCIAS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('ocorrencias', data);
    });
  }

  async updateOcorrencia(id, data) {
    // TODO: conectar endpoint PUT /ocorrencias/:id
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.update('ocorrencias', id, data);
    });
  }

  async deleteOcorrencia(id) {
    // TODO: conectar endpoint DELETE /ocorrencias/:id
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('ocorrencias', id);
    });
  }

  // =========================================================================
  // TABELA: limpeza (id, responsavel_id, local, status)
  // =========================================================================
  async getLimpeza() {
    // TODO: conectar endpoint GET /limpeza
    return this.request(CONFIG.ENDPOINTS.LIMPEZA, { method: 'GET' }, () => {
      return window.MockDB.getAll('limpeza');
    });
  }

  async createLimpeza(data) {
    // TODO: conectar endpoint POST /limpeza
    return this.request(CONFIG.ENDPOINTS.LIMPEZA, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('limpeza', data);
    });
  }

  async updateLimpeza(id, data) {
    // TODO: conectar endpoint PUT /limpeza/:id
    return this.request(`${CONFIG.ENDPOINTS.LIMPEZA}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.update('limpeza', id, data);
    });
  }

  async deleteLimpeza(id) {
    // TODO: conectar endpoint DELETE /limpeza/:id
    return this.request(`${CONFIG.ENDPOINTS.LIMPEZA}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('limpeza', id);
    });
  }

  // =========================================================================
  // TABELA: eventos (id, responsavel_id, local, data, status)
  // =========================================================================
  async getEventos() {
    // TODO: conectar endpoint GET /eventos
    return this.request(CONFIG.ENDPOINTS.EVENTOS, { method: 'GET' }, () => {
      return window.MockDB.getAll('eventos');
    });
  }

  async createEvento(data) {
    // TODO: conectar endpoint POST /eventos
    return this.request(CONFIG.ENDPOINTS.EVENTOS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('eventos', data);
    });
  }

  async updateEvento(id, data) {
    // TODO: conectar endpoint PUT /eventos/:id
    return this.request(`${CONFIG.ENDPOINTS.EVENTOS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.update('eventos', id, data);
    });
  }

  async deleteEvento(id) {
    // TODO: conectar endpoint DELETE /eventos/:id
    return this.request(`${CONFIG.ENDPOINTS.EVENTOS}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('eventos', id);
    });
  }

  // =========================================================================
  // TABELA COMPLEMENTAR: insumos (id, nome, quantidade, estoque_minimo, unidade, setor_id)
  // =========================================================================
  async getInsumos() {
    // TODO: conectar endpoint GET /insumos
    return this.request(CONFIG.ENDPOINTS.INSUMOS, { method: 'GET' }, () => {
      return window.MockDB.getAll('insumos');
    });
  }

  async createInsumo(data) {
    // TODO: conectar endpoint POST /insumos
    return this.request(CONFIG.ENDPOINTS.INSUMOS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('insumos', data);
    });
  }

  async updateInsumo(id, data) {
    // TODO: conectar endpoint PUT /insumos/:id
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.update('insumos', id, data);
    });
  }

  async deleteInsumo(id) {
    // TODO: conectar endpoint DELETE /insumos/:id
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('insumos', id);
    });
  }

  // =========================================================================
  // TABELA COMPLEMENTAR: comunicados (id, titulo, mensagem, autor_id, data, prioridade)
  // =========================================================================
  async getComunicados() {
    // TODO: conectar endpoint GET /comunicados
    return this.request(CONFIG.ENDPOINTS.COMUNICADOS, { method: 'GET' }, () => {
      return window.MockDB.getAll('comunicados');
    });
  }

  async createComunicado(data) {
    // TODO: conectar endpoint POST /comunicados
    return this.request(CONFIG.ENDPOINTS.COMUNICADOS, {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      return window.MockDB.create('comunicados', data);
    });
  }

  async deleteComunicado(id) {
    // TODO: conectar endpoint DELETE /comunicados/:id
    return this.request(`${CONFIG.ENDPOINTS.COMUNICADOS}/${id}`, { method: 'DELETE' }, () => {
      return window.MockDB.delete('comunicados', id);
    });
  }
}

window.API = new ApiService();
