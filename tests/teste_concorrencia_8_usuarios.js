/**
 * TESTE DE CONCORRÊNCIA E ESTRESSE DE SISTEMA COM 8 USUÁRIOS SIMULTÂNEOS
 * HUB ES+ • SECULT ES / SENAI ES
 *
 * Simula 8 colaboradores com perfis distintos acessando, clicando e navegando
 * por todos os módulos do sistema em paralelo no ambiente de produção.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://hub-es-secult.pages.dev/api/v1';

const USUARIOS = [
  { id: 1, email: 'admin@secult.es.gov.br', senha: 'Admin@Secult2026!', nome: 'Administrador Geral', perfil: 'ADMIN' },
  { id: 2, email: 'gestor.infra@secult.es.gov.br', senha: 'Teste@2026!', nome: 'Gestor de Infra & TI', perfil: 'GESTOR_INFRA' },
  { id: 3, email: 'gestor.operador@secult.es.gov.br', senha: 'Teste@2026!', nome: 'Gestor Operacional', perfil: 'GESTOR_OPERADOR' },
  { id: 4, email: 'gestor.rh@secult.es.gov.br', senha: 'Teste@2026!', nome: 'Gestor de Recursos Humanos', perfil: 'GESTOR_RH' },
  { id: 5, email: 'tecnico.n3@secult.es.gov.br', senha: 'Teste@2026!', nome: 'Técnico Suporte N3', perfil: 'TECNICO_N3' },
  { id: 6, email: 'tecnico.n2@secult.es.gov.br', senha: 'Teste@2026!', nome: 'Técnico Suporte N2', perfil: 'TECNICO_N2' },
  { id: 7, email: 'operador@secult.es.gov.br', senha: 'Teste@2026!', nome: 'Operador de Atendimento', perfil: 'OPERADOR' },
  { id: 8, email: 'limpeza@secult.es.gov.br', senha: 'Teste@2026!', nome: 'Equipe de Limpeza & Conservação', perfil: 'LIMPEZA' }
];

const estatisticas = {
  totalRequisicoes: 0,
  sucessos: 0,
  falhas: 0,
  tempos: [],
  falhasDetalhadas: [],
  rotasTestadas: new Set()
};

async function requisitar(url, options = {}, contexto = {}) {
  const inicio = Date.now();
  estatisticas.totalRequisicoes++;
  estatisticas.rotasTestadas.add(options.method ? `${options.method} ${url.replace(BASE_URL, '')}` : `GET ${url.replace(BASE_URL, '')}`);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const duracao = Date.now() - inicio;
    estatisticas.tempos.push(duracao);

    let corpo = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      corpo = await res.json().catch(() => null);
    } else {
      corpo = await res.text().catch(() => null);
    }

    if (res.ok) {
      estatisticas.sucessos++;
      return { ok: true, status: res.status, duracao, data: corpo };
    } else {
      estatisticas.falhas++;
      estatisticas.falhasDetalhadas.push({
        status: res.status,
        url: url.replace(BASE_URL, ''),
        method: options.method || 'GET',
        usuario: contexto.usuario || 'Anônimo',
        perfil: contexto.perfil || '-',
        duracao,
        mensagem: corpo?.message || (typeof corpo === 'string' ? corpo.slice(0, 150) : 'Erro desconhecido')
      });
      return { ok: false, status: res.status, duracao, error: corpo };
    }
  } catch (err) {
    const duracao = Date.now() - inicio;
    estatisticas.tempos.push(duracao);
    estatisticas.falhas++;
    estatisticas.falhasDetalhadas.push({
      status: 'NETWORK_ERROR',
      url: url.replace(BASE_URL, ''),
      method: options.method || 'GET',
      usuario: contexto.usuario || 'Anônimo',
      perfil: contexto.perfil || '-',
      duracao,
      mensagem: err.message
    });
    return { ok: false, status: 0, duracao, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// CENÁRIO COMPLETO DE CLIQUE E DEMANDA POR USUÁRIO
// -----------------------------------------------------------------------------
async function simularUsuario(u, indice) {
  const ctx = { usuario: u.nome, perfil: u.perfil };
  const tag = `[User ${indice + 1}: ${u.perfil}]`;
  console.log(`${tag} Iniciando sessão para ${u.email}...`);

  // 1. Login
  const loginRes = await requisitar(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: u.email, senha: u.senha })
  }, ctx);

  if (!loginRes.ok || !loginRes.data?.data?.token) {
    console.error(`${tag} Falha no login:`, loginRes.error);
    return;
  }

  const token = loginRes.data.data.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  console.log(`${tag} Login bem-sucedido (${loginRes.duracao}ms). Iniciando bateria de navegação e cliques...`);

  const CICLOS = 3; // Simula o usuário navegando e clicando em 3 sessões consecutivas de uso
  for (let ciclo = 1; ciclo <= CICLOS; ciclo++) {
    // 2. Navegação Básica Inicial (Todos os usuários clicam)
    await Promise.all([
      requisitar(`${BASE_URL}/auth/me`, { headers: authHeaders }, ctx),
      requisitar(`${BASE_URL}/dashboard/stats`, { headers: authHeaders }, ctx),
      requisitar(`${BASE_URL}/setores`, { headers: authHeaders }, ctx),
      requisitar(`${BASE_URL}/publico/comunicados`, {}, ctx),
      requisitar(`${BASE_URL}/publico/eventos`, {}, ctx)
    ]);

    // 3. Simulação de Cliques e Filtros Específicos por Perfil
    if (u.perfil === 'ADMIN') {
      // Admin clica em tudo: Auditoria, Gestão de Usuários, Solicitações, Compras, Ocorrências, Equipamentos, Limpeza
      await Promise.all([
        requisitar(`${BASE_URL}/usuarios`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/auditoria/solicitacoes-pendentes`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/auditoria/usuarios-online`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/auditoria?limite=30`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/compras`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/ocorrencias`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/equipamentos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/insumos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/limpeza`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/documentos`, { headers: authHeaders }, ctx)
      ]);

      // Admin faz busca rápida por filtro
      await Promise.all([
        requisitar(`${BASE_URL}/usuarios?q=admin`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/ocorrencias?status=aberta`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/compras?status=pendente`, { headers: authHeaders }, ctx)
      ]);
    } else if (u.perfil === 'GESTOR_INFRA') {
      // Gestor de Infra navega em Ocorrências, Equipamentos, Insumos e cria um chamado
      await Promise.all([
        requisitar(`${BASE_URL}/ocorrencias`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/equipamentos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/insumos`, { headers: authHeaders }, ctx)
      ]);

      // Cria ocorrência teste
      const novaOcorr = await requisitar(`${BASE_URL}/ocorrencias`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          local: 'Sala Técnica de Servidores 01',
          descricao: `[Teste Carga] Checagem de Conexão Switch #${Date.now().toString().slice(-4)} (Ciclo ${ciclo})`,
          tipo: 'ti',
          prioridade: 'media'
        })
      }, ctx);

      // Se criou, busca detalhes
      if (novaOcorr.ok && novaOcorr.data?.data?.id) {
        await requisitar(`${BASE_URL}/ocorrencias/${novaOcorr.data.data.id}`, { headers: authHeaders }, ctx);
      }
    } else if (u.perfil === 'GESTOR_OPERADOR') {
      // Gestor Operacional navega em Limpeza, Insumos e Compras
      await Promise.all([
        requisitar(`${BASE_URL}/limpeza`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/insumos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/compras`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/comunicados`, { headers: authHeaders }, ctx)
      ]);

      // Registra vistoria/registro de limpeza
      await requisitar(`${BASE_URL}/limpeza`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          local: 'Lab Criativo 01',
          descricao: `Vistoria e higienização periódica concorrente (Ciclo ${ciclo}).`,
          status: 'pendente'
        })
      }, ctx);
    } else if (u.perfil === 'GESTOR_RH') {
      // Gestor de RH navega em Documentos, Comunicados, Eventos e Usuários
      await Promise.all([
        requisitar(`${BASE_URL}/documentos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/comunicados`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/eventos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/usuarios`, { headers: authHeaders }, ctx)
      ]);

      // Cria um comunicado teste
      const novoCom = await requisitar(`${BASE_URL}/comunicados`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          titulo: `[Aviso RH] Manutenção Programada #${Date.now().toString().slice(-4)} (Ciclo ${ciclo})`,
          mensagem: 'Comunicado concorrente de teste emitido pelo RH.',
          prioridade: 'normal',
          destinatario_perfil: 'TODOS'
        })
      }, ctx);

      if (novoCom.ok && novoCom.data?.data?.id) {
        await requisitar(`${BASE_URL}/comunicados/${novoCom.data.data.id}`, { headers: authHeaders }, ctx);
      }
    } else if (u.perfil === 'TECNICO_N3' || u.perfil === 'TECNICO_N2') {
      // Técnicos navegam em Chamados, Equipamentos e Insumos
      await Promise.all([
        requisitar(`${BASE_URL}/ocorrencias?status=aberta`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/ocorrencias?prioridade=alta`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/equipamentos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/insumos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/documentos`, { headers: authHeaders }, ctx)
      ]);
    } else if (u.perfil === 'OPERADOR') {
      // Operador navega em Comunicação, Eventos, Ocorrências e Limpeza
      await Promise.all([
        requisitar(`${BASE_URL}/comunicados`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/eventos`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/ocorrencias`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/limpeza`, { headers: authHeaders }, ctx)
      ]);

      // Abre um chamado operacional rápido
      await requisitar(`${BASE_URL}/ocorrencias`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          local: 'Recepção Principal HUB ES+',
          descricao: `Dúvida Operacional Atendimento #${Date.now().toString().slice(-4)} (Ciclo ${ciclo})`,
          tipo: 'outro',
          prioridade: 'baixa'
        })
      }, ctx);
    } else if (u.perfil === 'LIMPEZA') {
      // Equipe de Limpeza consulta suas tarefas e faz pedido de suprimento/compras
      await Promise.all([
        requisitar(`${BASE_URL}/limpeza`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/compras`, { headers: authHeaders }, ctx),
        requisitar(`${BASE_URL}/comunicados`, { headers: authHeaders }, ctx)
      ]);

      // Solicita insumo de limpeza
      await requisitar(`${BASE_URL}/compras`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          produto: `Detergente Neutro 5L #${Date.now().toString().slice(-4)} (Ciclo ${ciclo})`,
          quantidade: 4,
          justificativa: 'Reposição de material para sanitização diária dos laboratórios.'
        })
      }, ctx);
    }

    // 4. Heartbeat por ciclo
    await requisitar(`${BASE_URL}/auth/heartbeat`, {
      method: 'POST',
      headers: authHeaders
    }, ctx);
  }

  console.log(`${tag} Finalizou ciclo com sucesso.`);
}

// -----------------------------------------------------------------------------
// EXECUÇÃO PRINCIPAL
// -----------------------------------------------------------------------------
async function executarBateriaConcorrente() {
  console.log('======================================================================');
  console.log(' INICIANDO BATERIA DE ESTRESSE & CONCORRÊNCIA COM 8 USUÁRIOS');
  console.log(` Alvo: ${BASE_URL}`);
  console.log('======================================================================\n');

  const tempoInicioGeral = Date.now();

  // Executa todos os 8 usuários exatamente em paralelo
  console.log('🚀 Disparando 8 sessões simultâneas...\n');
  await Promise.all(USUARIOS.map((u, i) => simularUsuario(u, i)));

  const duracaoGeral = Date.now() - tempoInicioGeral;

  // Cálculo de Métricas
  const total = estatisticas.totalRequisicoes;
  const sucessos = estatisticas.sucessos;
  const falhas = estatisticas.falhas;
  const taxaSucesso = total > 0 ? ((sucessos / total) * 100).toFixed(2) : 0;

  const temposOrdenados = [...estatisticas.tempos].sort((a, b) => a - b);
  const minTempo = temposOrdenados[0] || 0;
  const maxTempo = temposOrdenados[temposOrdenados.length - 1] || 0;
  const medTempo = total > 0 ? (estatisticas.tempos.reduce((a, b) => a + b, 0) / total).toFixed(0) : 0;
  const p95Tempo = temposOrdenados[Math.floor(temposOrdenados.length * 0.95)] || 0;

  console.log('\n======================================================================');
  console.log(' RESULTADOS DA BATERIA DE CARGA & CONCORRÊNCIA');
  console.log('======================================================================');
  console.log(`⏱  Tempo total da execução: ${(duracaoGeral / 1000).toFixed(2)}s`);
  console.log(`👥 Usuários concorrentes: 8 perfis simultâneos`);
  console.log(`🔄 Total de requisições disparadas: ${total}`);
  console.log(`🌐 Rotas/endpoints distintos testados: ${estatisticas.rotasTestadas.size}`);
  console.log(`✅ Requisições bem-sucedidas: ${sucessos} (${taxaSucesso}%)`);
  console.log(`❌ Requisições com falha: ${falhas}`);
  console.log(`📊 Latência Mínima: ${minTempo}ms | Média: ${medTempo}ms | P95: ${p95Tempo}ms | Máxima: ${maxTempo}ms\n`);

  if (falhas > 0) {
    console.log('⚠️  DETALHES DAS FALHAS ENCONTRADAS:');
    estatisticas.falhasDetalhadas.forEach((f, idx) => {
      console.log(` [${idx + 1}] HTTP ${f.status} em ${f.method} ${f.url} (${f.duracao}ms)`);
      console.log(`     Usuário: ${f.usuario} (${f.perfil})`);
      console.log(`     Mensagem: ${f.mensagem}`);
    });
    console.log('\n');
  } else {
    console.log('🎉 NENHUMA FALHA DETECTADA! O sistema suportou perfeitamente 8 usuários simultâneos executando requisições e ações concorrentes.\n');
  }
}

executarBateriaConcorrente().catch(console.error);
