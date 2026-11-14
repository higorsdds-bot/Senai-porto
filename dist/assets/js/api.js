/**
 * HUB ES+ - Camada de Serviço de API REST
 * Inclui autenticação JWT automática e suporte a upload de arquivos (FormData).
 */

class ApiService {
  constructor() {
    this.baseUrl = window.CONFIG?.API_BASE_URL || '/api/v1';
    this._cache = new Map();
  }

  /**
   * Limpa chaves do cache em memória (ou todas se pattern for omitido).
   */
  clearCache(pattern = null) {
    if (!pattern) {
      this._cache.clear();
      return;
    }
    for (const key of this._cache.keys()) {
      if (key.includes(pattern)) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Executa requisição GET com cache em memória (TTL em milissegundos).
   */
  async cachedGet(endpoint, ttlMs = 25000) {
    const cached = this._cache.get(endpoint);
    if (cached && (Date.now() - cached.time < ttlMs)) {
      return cached.data;
    }
    const data = await this.request(endpoint, { method: 'GET' });
    this._cache.set(endpoint, { time: Date.now(), data });
    return data;
  }

  getToken() {
    const key = window.CONFIG?.STORAGE_TOKEN || 'hub_es_plus_token';
    let token = null;
    try {
      if (typeof sessionStorage !== 'undefined') {
        token = sessionStorage.getItem(key);
      }
      if (!token && typeof localStorage !== 'undefined') {
        token = localStorage.getItem(key);
        // Sincroniza imediatamente com sessionStorage para manter abas protegidas
        if (token && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(key, token);
        }
      }
      if (!token && window.Auth?.token) {
        token = window.Auth.token;
      }
    } catch (_) {}
    return token;
  }

  /**
   * Resolve a URL completa de um upload/arquivo estático considerando o host da API.
   * Suporta caminhos relativos (/uploads/...) mesmo quando o frontend roda em porta diferente.
   */
  resolveAssetUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    let cleanUrl = url.startsWith('/') ? url : `/${url}`;
    if (cleanUrl.startsWith('/api/') && cleanUrl.includes('/foto')) {
      const token = this.getToken();
      if (token && !cleanUrl.includes('token=')) {
        cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
      }
    }
    if (this.baseUrl && this.baseUrl.startsWith('http')) {
      try {
        const parsed = new URL(this.baseUrl);
        return `${parsed.origin}${cleanUrl}`;
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.location && window.location.port === '5500') {
      return `http://localhost:3001${cleanUrl}`;
    }
    return cleanUrl;
  }

  /**
   * Executa requisição HTTP com Bearer token.
   * Se body for FormData, NÃO define Content-Type (o browser define o boundary).
   */
  async request(endpoint, options = {}) {
    const token = this.getToken();

    const headers = { 'Accept': 'application/json', ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (response.status === 401) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody.message || 'Sessão expirada. Faça login novamente.';

      // Qualquer 401 em endpoint autenticado indica sessão inválida ou ausente
      if (!window.Auth?.isVisitante()) {
        window.Auth?.forcarLogout();
      }
      throw new Error(msg);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      let msg = errorBody.message || `Erro HTTP ${response.status}`;
      if (errorBody.errors && typeof errorBody.errors === 'object') {
        const details = Object.values(errorBody.errors).join(' ');
        if (details && !msg.includes(details)) {
          msg = `${msg}: ${details}`;
        }
      }
      const err = new Error(msg);
      err.status = response.status;
      err.errors = errorBody.errors || null;
      throw err;
    }

    const json = await response.json();
    // Desembrulha { success, data } para os módulos receberem sempre o dado direto (array/objeto).
    return (json && typeof json === 'object' && !Array.isArray(json) && 'data' in json)
      ? json.data
      : json;
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
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(CONFIG.STORAGE_TOKEN);
        sessionStorage.removeItem(CONFIG.STORAGE_USUARIO);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CONFIG.STORAGE_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_USUARIO);
      }
    }
  }

  async me() {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/me`, { method: 'GET' });
  }

  async alterarMinhaSenha(dados) {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/alterar-senha`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async atualizarMeuPerfil(dados) {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/perfil`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async solicitarCadastro(dados) {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/solicitar-cadastro`, {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async verificarTokenAtivacao(token) {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/verificar-token-ativacao?token=${encodeURIComponent(token)}`, {
      method: 'GET'
    });
  }

  async ativarConta(dados) {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/ativar-conta`, {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async esqueciSenha(dados) {
    return this.request(`${CONFIG.ENDPOINTS.AUTH}/esqueci-senha`, {
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
  // USUÁRIOS
  // =========================================================================
  async getUsuarios() {
    return this.cachedGet(CONFIG.ENDPOINTS.USUARIOS, 20000);
  }

  async getUsuarioById(id) {
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/${id}`, { method: 'GET' });
  }

  async getUsuario(id) {
    return this.getUsuarioById(id);
  }

  async createUsuario(data) {
    this.clearCache('usuarios');
    return this.request(CONFIG.ENDPOINTS.USUARIOS, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateUsuario(id, data) {
    this.clearCache('usuarios');
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateUsuarioStatus(id, status) {
    this.clearCache('usuarios');
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteUsuario(id) {
    this.clearCache('usuarios');
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/${id}`, {
      method: 'DELETE'
    });
  }

  async preCadastrarUsuario(data) {
    this.clearCache('usuarios');
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/pre-cadastro`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getPreCadastros() {
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/pre-cadastros`, { method: 'GET' });
  }

  async updatePreCadastro(id, data) {
    this.clearCache('usuarios');
    return this.request(`${CONFIG.ENDPOINTS.USUARIOS}/pre-cadastro/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getPermissoesDisponiveis() {
    return this.cachedGet(`${CONFIG.ENDPOINTS.USUARIOS}/permissoes-disponiveis`, 60000);
  }

  // =========================================================================
  // SETORES
  // =========================================================================
  async getSetores() {
    return this.cachedGet(CONFIG.ENDPOINTS.SETORES, 30000);
  }

  // =========================================================================
  // COMPRAS
  // =========================================================================
  async getCompras() {
    return this.request(CONFIG.ENDPOINTS.COMPRAS, { method: 'GET' });
  }

  async createCompra(data) {
    return this.request(CONFIG.ENDPOINTS.COMPRAS, { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCompra(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
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
    return this.request(`${CONFIG.ENDPOINTS.COMPRAS}/${id}`, { method: 'DELETE' });
  }

  // =========================================================================
  // EQUIPAMENTOS
  // =========================================================================
  async getEquipamentos() {
    return this.request(CONFIG.ENDPOINTS.EQUIPAMENTOS, { method: 'GET' });
  }

  async createEquipamento(data) {
    const isFormData = (typeof FormData !== 'undefined') && (data instanceof FormData);
    return this.request(CONFIG.ENDPOINTS.EQUIPAMENTOS, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async updateEquipamento(id, data) {
    const isFormData = (typeof FormData !== 'undefined') && (data instanceof FormData);
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async deleteEquipamento(id) {
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}`, { method: 'DELETE' });
  }

  async getEquipamentoHistorico(id) {
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}/historico`, { method: 'GET' });
  }

  async movimentarEquipamento(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}/movimentar`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async baixarEquipamento(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.EQUIPAMENTOS}/${id}/baixa`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // =========================================================================
  // DOCUMENTOS (com suporte a upload FormData e download real)
  // =========================================================================
  async getDocumentos(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.setor_id) params.set('setor_id', filtros.setor_id);
    if (filtros.q) params.set('q', filtros.q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}${qs}`, { method: 'GET' });
  }

  async getDocumentoById(id) {
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}`, { method: 'GET' });
  }

  async createDocumento(data) {
    const isFormData = data instanceof FormData;
    return this.request(CONFIG.ENDPOINTS.DOCUMENTOS, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async updateDocumento(id, data) {
    const isFormData = data instanceof FormData;
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async alterarStatusDocumento(id, status) {
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteDocumento(id) {
    return this.request(`${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}`, { method: 'DELETE' });
  }

  async downloadDocumento(id, nomePadrao = 'documento.pdf') {
    const token = this.getToken();
    const endpoint = `${this.baseUrl}${CONFIG.ENDPOINTS.DOCUMENTOS}/${id}/download`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Falha ao baixar documento.');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = nomePadrao;
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].trim());
      } catch (_) {
        filename = match[1].trim();
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    return true;
  }

  // =========================================================================
  // OCORRÊNCIAS (com suporte a foto)
  // =========================================================================
  async getOcorrencias(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.q) params.set('q', filtros.q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}${qs}`, { method: 'GET' });
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
    });
  }

  async updateOcorrencia(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteOcorrencia(id) {
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}`, { method: 'DELETE' });
  }

  async assumirOcorrencia(id) {
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}/assumir`, {
      method: 'PATCH'
    });
  }

  async escalonarOcorrencia(id, data = {}) {
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}/escalonar`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async updateOcorrenciaStatus(id, data = {}) {
    return this.request(`${CONFIG.ENDPOINTS.OCORRENCIAS}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // =========================================================================
  // EVENTOS
  // =========================================================================
  async getEventos() {
    return this.request(CONFIG.ENDPOINTS.EVENTOS, { method: 'GET' });
  }

  async createEvento(data) {
    return this.request(CONFIG.ENDPOINTS.EVENTOS, { method: 'POST', body: JSON.stringify(data) });
  }

  async updateEvento(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.EVENTOS}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteEvento(id) {
    return this.request(`${CONFIG.ENDPOINTS.EVENTOS}/${id}`, { method: 'DELETE' });
  }

  // =========================================================================
  // INSUMOS
  // =========================================================================
  async getInsumos() {
    return this.request(CONFIG.ENDPOINTS.INSUMOS, { method: 'GET' });
  }

  async getHistoricoInsumos(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.insumo_id) params.set('insumo_id', filtros.insumo_id);
    if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio);
    if (filtros.data_fim) params.set('data_fim', filtros.data_fim);
    if (filtros.q) params.set('q', filtros.q);
    if (filtros.limit) params.set('limit', filtros.limit);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/historico${qs}`, { method: 'GET' });
  }

  async movimentarInsumo(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}/movimentar`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createInsumo(data) {
    return this.request(CONFIG.ENDPOINTS.INSUMOS, { method: 'POST', body: JSON.stringify(data) });
  }

  async updateInsumo(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteInsumo(id) {
    return this.request(`${CONFIG.ENDPOINTS.INSUMOS}/${id}`, { method: 'DELETE' });
  }

  // =========================================================================
  // COMUNICADOS
  // =========================================================================
  async getComunicados() {
    return this.request(CONFIG.ENDPOINTS.COMUNICADOS, { method: 'GET' });
  }

  async getComunicado(id) {
    return this.request(`${CONFIG.ENDPOINTS.COMUNICADOS}/${id}`, { method: 'GET' });
  }

  async createComunicado(data) {
    return this.request(CONFIG.ENDPOINTS.COMUNICADOS, { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteComunicado(id) {
    return this.request(`${CONFIG.ENDPOINTS.COMUNICADOS}/${id}`, { method: 'DELETE' });
  }

  // =========================================================================
  // ADVERTÊNCIAS DISCIPLINARES
  // =========================================================================
  async getAdvertencias(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.gravidade) params.set('gravidade', filtros.gravidade);
    if (filtros.colaborador_id) params.set('colaborador_id', filtros.colaborador_id);
    if (filtros.q) params.set('q', filtros.q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`${CONFIG.ENDPOINTS.ADVERTENCIAS || '/advertencias'}${qs}`, { method: 'GET' });
  }

  async getAdvertencia(id) {
    return this.request(`${CONFIG.ENDPOINTS.ADVERTENCIAS || '/advertencias'}/${id}`, { method: 'GET' });
  }

  async createAdvertencia(data) {
    return this.request(CONFIG.ENDPOINTS.ADVERTENCIAS || '/advertencias', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async aceitarAdvertencia(id, motivo_decisao) {
    return this.request(`${CONFIG.ENDPOINTS.ADVERTENCIAS || '/advertencias'}/${id}/aceitar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_decisao })
    });
  }

  async aprovarAdvertencia(id, motivo_decisao) {
    return this.aceitarAdvertencia(id, motivo_decisao);
  }

  async rejeitarAdvertencia(id, motivo_decisao) {
    return this.request(`${CONFIG.ENDPOINTS.ADVERTENCIAS || '/advertencias'}/${id}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_decisao })
    });
  }

  async revogarAdvertencia(id, motivo_decisao) {
    return this.request(`${CONFIG.ENDPOINTS.ADVERTENCIAS || '/advertencias'}/${id}/revogar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_decisao })
    });
  }

  // =========================================================================
  // LIMPEZA
  // =========================================================================
  async getLimpeza() {
    return this.request(CONFIG.ENDPOINTS.LIMPEZA, { method: 'GET' });
  }

  async createLimpeza(data) {
    return this.request(CONFIG.ENDPOINTS.LIMPEZA, { method: 'POST', body: JSON.stringify(data) });
  }

  async updateLimpeza(id, data) {
    return this.request(`${CONFIG.ENDPOINTS.LIMPEZA}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async updateLimpezaStatus(id, status) {
    return this.request(`${CONFIG.ENDPOINTS.LIMPEZA}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteLimpeza(id) {
    return this.request(`${CONFIG.ENDPOINTS.LIMPEZA}/${id}`, { method: 'DELETE' });
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

  async updateAuditoriaSolicitacao(id, dados = {}) {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/solicitacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async rejeitarSolicitacaoCadastro(id, dados = {}) {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/solicitacoes/${id}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async reenviarLinkAtivacao(id) {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/usuarios/${id}/reenviar-ativacao`, {
      method: 'POST'
    });
  }

  async testarEmail(destinatario = '') {
    return this.request(`${CONFIG.ENDPOINTS.AUDITORIA}/testar-email`, {
      method: 'POST',
      body: JSON.stringify({ destinatario })
    });
  }

  // =========================================================================
  // ROTAS PÚBLICAS (Visitante — sem autenticação)
  // =========================================================================
  async getPublicComunicados() {
    return this.request('/publico/comunicados', { method: 'GET' });
  }

  async getPublicComunicado(id) {
    return this.request(`/publico/comunicados/${id}`, { method: 'GET' });
  }

  async getPublicEventos() {
    return this.request('/publico/eventos', { method: 'GET' });
  }

  // =========================================================================
  // DASHBOARD & INDICADORES
  // =========================================================================
  async getDashboardStats() {
    return this.cachedGet(`${CONFIG.ENDPOINTS.DASHBOARD || '/dashboard'}/stats`, 15000);
  }

  async getIndicadores(periodoDias = 30) {
    return this.cachedGet(`${CONFIG.ENDPOINTS.DASHBOARD || '/dashboard'}/indicadores?periodo_dias=${periodoDias}`, 25000);
  }
}

window.API = new ApiService();
