/**
 * HUB ES+ - Camada de dados conectada ao banco (via API /api/db)
 * Mantém a MESMA interface do MockDB (getAll, getById, create, update, delete, reset)
 * para não quebrar os módulos existentes.
 *
 * Funcionamento: carrega todas as tabelas do banco ao iniciar (cache em memória),
 * leituras são síncronas a partir do cache e escritas são enviadas ao banco.
 *
 * IMPORTANTE: aguarde `await window.MockDB.ready` antes de renderizar os módulos.
 *
 * Config opcional (window.CONFIG):
 *   API_BASE  -> padrão '/api/db'
 *   TOKEN_KEY -> chave do localStorage onde está o JWT (padrão 'token')
 */
class RemoteDatabase {
  constructor() {
    this.base = window.CONFIG?.API_BASE || '/api/db';
    this.tokenKey = window.CONFIG?.TOKEN_KEY || 'token';
    this.cache = {};
    this.ready = this.load();
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    const t = localStorage.getItem(this.tokenKey);
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  }

  async request(path, options = {}) {
    const res = await fetch(this.base + path, { ...options, headers: this.headers() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    return res.json();
  }

  async load() {
    try {
      this.cache = await this.request('/all');
    } catch (e) {
      console.error('[DB] Falha ao carregar dados:', e);
      window.dispatchEvent(new CustomEvent('db:error', { detail: e }));
    }
    return this.cache;
  }

  async reload(table) {
    try { this.cache[table] = await this.request('/' + table); } catch (e) { console.error(e); }
  }

  // Em caso de falha na escrita, recarrega a tabela do banco e avisa a UI
  fail(table, e) {
    console.error(`[DB] Erro em "${table}":`, e);
    this.reload(table).finally(() =>
      window.dispatchEvent(new CustomEvent('db:error', { detail: { table, error: e } })));
  }

  getTable(table) { return this.cache[table] || []; }
  getAll(table) { return this.getTable(table); }

  getById(table, id) {
    return this.getTable(table).find(r => Number(r.id) === Number(id)) || null;
  }

  // Versões síncronas (otimistas) - compatíveis com o código atual
  create(table, data) {
    const records = this.getTable(table);
    const tempId = records.length ? Math.max(...records.map(r => Number(r.id) || 0)) + 1 : 1;
    const record = { ...data, id: tempId };
    this.cache[table] = [record, ...records];

    this.request('/' + table, { method: 'POST', body: JSON.stringify(data) })
      .then(saved => {
        const i = this.cache[table].findIndex(r => r.id === tempId);
        if (i !== -1) this.cache[table][i] = saved; // troca pelo id real do banco
        window.dispatchEvent(new CustomEvent('db:synced', { detail: { table } }));
      })
      .catch(e => this.fail(table, e));
    return record;
  }

  update(table, id, data) {
    const records = this.getTable(table);
    const i = records.findIndex(r => Number(r.id) === Number(id));
    if (i === -1) return null;
    records[i] = { ...records[i], ...data, id: Number(id) };
    this.request(`/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      .catch(e => this.fail(table, e));
    return records[i];
  }

  delete(table, id) {
    const records = this.getTable(table);
    const filtered = records.filter(r => Number(r.id) !== Number(id));
    const deleted = filtered.length !== records.length;
    if (deleted) {
      this.cache[table] = filtered;
      this.request(`/${table}/${id}`, { method: 'DELETE' }).catch(e => this.fail(table, e));
    }
    return deleted;
  }

  // Não apaga mais nada no banco; apenas recarrega os dados reais
  async reset() { return this.load(); }

  // Versões assíncronas (recomendadas para código novo: esperam o banco confirmar)
  async createAsync(table, data) {
    const saved = await this.request('/' + table, { method: 'POST', body: JSON.stringify(data) });
    this.cache[table] = [saved, ...this.getTable(table)];
    return saved;
  }
  async updateAsync(table, id, data) {
    const saved = await this.request(`/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    this.cache[table] = this.getTable(table).map(r => (Number(r.id) === Number(id) ? saved : r));
    return saved;
  }
}

window.MockDB = new RemoteDatabase(); // mesmo nome para não quebrar os módulos