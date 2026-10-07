/**
 * HUB ES+ - Camada de Serviço de API REST
 * Inclui autenticação JWT automática e suporte a upload de arquivos (FormData).
 */

class ApiService {
  constructor() {
    this.baseUrl = window.CONFIG?.API_BASE_URL || '/api/v1';
    this.useMock = window.CONFIG?.USE_MOCK ?? false;
    this.delayMs = window.CONFIG?.MOCK_DELAY_MS || 300;
  }

  getToken() {
    return localStorage.getItem(window.CONFIG.STORAGE_TOKEN) || null;
  }

  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executa requisição HTTP com Bearer token.
   * Se body for FormData, NÃO define Content-Type (o browser define o boundary).
   */
  async request(endpoint, options = {}, mockHandler = null) {
    const token = this.getToken();

    const headers = { 'Accept': 'application/json', ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      if (response.status === 401) {
        // Sessão expirada/inválida: limpa e volta pro login
        window.Auth?.forcarLogout();
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || 'Sessão expirada. Faça login novamente.');
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const err = new Error(errorBody.message || `Erro HTTP ${response.status}`);
        err.status = response.status;
        err.errors = errorBody.errors || null;
        throw err;
      }
      const json = await response.json();
      // A API real devolve { success, data }; o mock devolve o dado puro.
      // Desembrulha para os módulos receberem sempre o dado direto (array/objeto).
      return (json && typeof json === 'object' && !Array.isArray(json) && 'data' in json)
        ? json.data
        : json;
    } catch (error) {
      if (mockHandler && !error.status) {
        console.warn(`[API FALLBACK] Mock para ${endpoint}`);
        await this._sleep(150);
        return await mockHandler();
      }
      throw error;
    }
  }

  // =========================================================================
  // AUTENTICAÇÃO
  // =========================================================================
  async login(email, senha) {
    const data = await this.request(`${CONFIG.ENDPOINTS.AUTH}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });
    // request() já desembrulhou -> data = { token, usuario, permissoes }
    // Reembala porque o auth.js espera res.success e res.data.token
    return { success: true, data };
  }

  async logout() {
    try {
      await this.request(`${CONFIG.ENDPOINTS.AUTH}/logout`, { method: 'POST' });
    } finally {
      localStorage.removeItem(CONFIG.STORAGE_TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_USUARIO);
    }
  }

  async me() {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/me`, { method: 'GET' });
  }

  async solicitarCadastro(dados) {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/solicitar-cadastro`, {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async heartbeat() {
    try {
      return await this.request(`${CONFIG.ENDPOINTS.AUTH}/heartbeat`, { method: 'POST' });
    } catch (_) {
      // Falha silenciosa de heartbeat
      return null;
    }
  }

  // =========================================================================
  // USUÁRIOS / SETORES
  // =========================================================================
  async getUsuarios() {
    return this.request(CONFIG.ENDPOINTS.USUARIOS, { method: 'GET' }, () => window.MockDB.getAll('usuarios'));
  }

  async getSetores() {
    return this.request(CONFIG.ENDPOINTS.SETORES, { method: 'GET' }, () => window.MockDB.getAll('setores'));
  }

  // =========================================================================
  // COMPRAS
  // =========================================================================
  async getCompras() {
    return this.request(CONFIG.ENDPOINTS.COMPRAS, { method: 'GET' }, () => window.MockDB.getAll('compras'));
  }

  async createCompra(data) {
    return this.request(CONFIG.ENDPOINTS.COMPRAS, { method: 'POST', body: JSON.stringify(data) },
      () => window.MockDB.create('compras', data));
  }

  async updateCompra(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}`, { method: 'PUT', body: JSON.stringify(data) },
      () => window.MockDB.update('compras', id, data));
  }

  async updateStatusCompra(id, status) {
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async registrarEntradaCompra(id) {
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}/entrada`, { method: 'PATCH' });
  }

  async deleteCompra(id) {
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('compras', id));
  }

  // =========================================================================
  // EQUIPAMENTOS
  // =========================================================================
  async getEquipamentos() {
    return this.request(CONFIG.ENDPOINTS.EQUIPAMENTOS, { method: 'GET' }, () => window.MockDB.getAll('equipamentos'));
  }

  async createEquipamento(data) {
    return this.request(CONFIG.ENDPOINTS.EQUIPAMENTOS, { method: 'POST', body: JSON.stringify(data) },
      () => window.MockDB.create('equipamentos', data));
  }

  async updateEquipamento(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}`, { method: 'PUT', body: JSON.stringify(data) },
      () => window.MockDB.update('equipamentos', id, data));
  }

  async deleteEquipamento(id) {
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('equipamentos', id));
  }

  // =========================================================================
  // DOCUMENTOS
  // =========================================================================
  async getDocumentos() {
    return this.request(CONFIG.ENDPOINTS.DOCUMENTOS, { method: 'GET' }, () => window.MockDB.getAll('documentos'));
  }

  async createDocumento(data) {
    return this.request(CONFIG.ENDPOINTS.DOCUMENTOS, { method: 'POST', body: JSON.stringify(data) },
      () => window.MockDB.create('documentos', data));
  }

  async deleteDocumento(id) {
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('documentos', id));
  }

  // =========================================================================
  // OCORRÊNCIAS (com suporte a foto)
  // =========================================================================
  async getOcorrencias(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.q) params.set('q', filtros.q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}${qs}`, { method: 'GET' },
      () => window.MockDB.getAll('ocorrencias'));
  }

  /**
   * Cria ocorrência aceitando JSON simples OU FormData (com foto).
   * @param {Object|FormData} data
   */
  async createOcorrencia(data) {
    const isForm = data instanceof FormData;
    return this.request(CONFIG.ENDPOINTS.OCORRENCIAS, {
      method: 'POST',
      body: isForm ? data : JSON.stringify(data)
    }, () => window.MockDB.create('ocorrencias', isForm ? Object.fromEntries(data) : data));
  }

  async updateOcorrencia(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}`, { method: 'PUT', body: JSON.stringify(data) },
      () => window.MockDB.update('ocorrencias', id, data));
  }

  async deleteOcorrencia(id) {
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('ocorrencias', id));
  }

  // =========================================================================
  // EVENTOS
  // =========================================================================
  async getEventos() {
    return this.request(CONFIG.ENDPOINTS.EVENTOS, { method: 'GET' }, () => window.MockDB.getAll('eventos'));
  }

  async createEvento(data) {
    return this.request(CONFIG.ENDPOINTS.EVENTOS, { method: 'POST', body: JSON.stringify(data) },
      () => window.MockDB.create('eventos', data));
  }

  async deleteEvento(id) {
    return this.request(`${CONFIG.ENDPOINTS.EVENTOS}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('eventos', id));
  }

  // =========================================================================
  // INSUMOS
  // =========================================================================
  async getInsumos() {
    return this.request(CONFIG.ENDPOINTS.INSUMOS, { method: 'GET' }, () => window.MockDB.getAll('insumos'));
  }

  async movimentarInsumo(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}/movimentar`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createInsumo(data) {
    return this.request(CONFIG.ENDPOINTS.INSUMOS, { method: 'POST', body: JSON.stringify(data) },
      () => window.MockDB.create('insumos', data));
  }

  async updateInsumo(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}`, { method: 'PUT', body: JSON.stringify(data) },
      () => window.MockDB.update('insumos', id, data));
  }

  async deleteInsumo(id) {
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('insumos', id));
  }

  // =========================================================================
  // COMUNICADOS
  // =========================================================================
  async getComunicados() {
    return this.request(CONFIG.ENDPOINTS.COMUNICADOS, { method: 'GET' }, () => window.MockDB.getAll('comunicados'));
  }

  async createComunicado(data) {
    return this.request(CONFIG.ENDPOINTS.COMUNICADOS, { method: 'POST', body: JSON.stringify(data) },
      () => window.MockDB.create('comunicados', data));
  }

  async deleteComunicado(id) {
    return this.request(`${CONFIG.ENDPOINTS.COMUNICADOS}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('comunicados', id));
  }


  // =========================================================================
  // LIMPEZA
  // =========================================================================
  async getLimpeza() {
    return this.request(CONFIG.ENDPOINTS.LIMPEZA, { method: 'GET' }, () => window.MockDB.getAll('limpeza'));
  }

  async createLimpeza(data) {
    return this.request(CONFIG.ENDPOINTS.LIMPEZA, { method: 'POST', body: JSON.stringify(data) },
      () => window.MockDB.create('limpeza', data));
  }

  async updateLimpeza(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.LIMPEZA}/${id}`, { method: 'PUT', body: JSON.stringify(data) },
      () => window.MockDB.update('limpeza', id, data));
  }

  async deleteLimpeza(id) {
    return this.request(`${CONFIG.ENDPOINTS.LIMPEZA}/${id}`, { method: 'DELETE' },
      () => window.MockDB.delete('limpeza', id));
  }

  // =========================================================================
  // AUDITORIA (Restrito a ADMIN)
  // =========================================================================
  async getAuditoriaLogs(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.usuario_id) params.set('usuario_id', filtros.usuario_id);
    if (filtros.acao) params.set('acao', filtros.acao);
    if (filtros.entidade) params.set('entidade', filtros.entidade);
    if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio);
    if (filtros.data_fim) params.set('data_fim', filtros.data_fim);
    if (filtros.q) params.set('q', filtros.q);
    if (filtros.page) params.set('page', filtros.page);
    if (filtros.limit) params.set('limit', filtros.limit);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}${qs}`, { method: 'GET' });
  }

  async getAuditoriaUsuariosOnline() {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/usuarios-online`, { method: 'GET' });
  }

  async getAuditoriaUsuarios(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.perfil) params.set('perfil', filtros.perfil);
    if (filtros.q) params.set('q', filtros.q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/usuarios${qs}`, { method: 'GET' });
  }

  async getAuditoriaHistoricoUsuario(usuarioId) {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/usuarios/${usuarioId}/historico`, { method: 'GET' });
  }

  async getAuditoriaSolicitacoes() {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/solicitacoes-pendentes`, { method: 'GET' });
  }

  async aprovarSolicitacaoCadastro(id, dados = {}) {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/solicitacoes/${id}/aprovar`, {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async rejeitarSolicitacaoCadastro(id, dados = {}) {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/solicitacoes/${id}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

}




window.API = new ApiService();