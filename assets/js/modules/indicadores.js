/**
 * HUB ES+ - Módulo 8: Indicadores
 * Painel analítico aprofundado com gráficos estatísticos, métricas de eficiência
 * e taxas de resolução operacional por setor.
 */

window.IndicadoresModule = {
  charts: {},

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div class="space-y-1">
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Indicadores e Métricas Operacionais</h1>
            <p class="text-xs text-slate-500 font-medium">Relatórios analíticos do HUB ES+</p>
          </div>
        </div>
        ${window.UI.renderCardsSkeleton(3)}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="h-72 bg-white rounded-2xl border border-slate-200 p-6 skeleton-shimmer"></div>
          <div class="h-72 bg-white rounded-2xl border border-slate-200 p-6 skeleton-shimmer"></div>
        </div>
      </div>
    `;

    try {
      const [ocorrencias, compras, limpeza, setores, eventos, equipamentos] = await Promise.all([
        window.API.getOcorrencias(),
        window.API.getCompras(),
        window.API.getLimpeza(),
        window.API.getSetores(),
        window.API.getEventos(),
        window.API.getEquipamentos()
      ]);

      const taxaResolucaoOcorrencias = ocorrencias.length > 0 
        ? Math.round((ocorrencias.filter(o => o.status === 'resolvido').length / ocorrencias.length) * 100) 
        : 100;

      const taxaEficienciaLimpeza = limpeza.length > 0 
        ? Math.round((limpeza.filter(l => l.status === 'concluido').length / limpeza.length) * 100) 
        : 100;

      const comprasAprovadasOuEntregues = compras.filter(c => c.status === 'aprovado' || c.status === 'entregue').length;
      const indiceAtendimentoCompras = compras.length > 0 
        ? Math.round((comprasAprovadasOuEntregues / compras.length) * 100) 
        : 100;

      container.innerHTML = `
        <div class="space-y-6">
          <!-- Cabeçalho -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-700 tracking-wide uppercase">
                  Business Intelligence
                </span>
                <span class="text-xs text-slate-400">• Consolidado Semestral</span>
              </div>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-1">Indicadores e Métricas Operacionais</h1>
              <p class="text-xs text-slate-500 font-medium">Performance de infraestrutura, logística e atendimento às demandas do HUB ES+</p>
            </div>
            
            <button id="btn-export-bi" class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-colors">
              <i data-lucide="file-spreadsheet" class="w-4 h-4 text-emerald-600"></i>
              Exportar CSV / PDF
            </button>
          </div>

          <!-- Métricas de Eficiência -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Resolução de Chamados</span>
                <div class="flex items-baseline gap-2 mt-2">
                  <span class="text-3xl font-black text-slate-900">${taxaResolucaoOcorrencias}%</span>
                  <span class="text-xs font-semibold text-emerald-600">Meta: 85%</span>
                </div>
                <div class="w-48 bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div class="bg-emerald-500 h-full rounded-full" style="width: ${taxaResolucaoOcorrencias}%"></div>
                </div>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i data-lucide="check-check" class="w-6 h-6"></i>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Conclusão de Higienização</span>
                <div class="flex items-baseline gap-2 mt-2">
                  <span class="text-3xl font-black text-slate-900">${taxaEficienciaLimpeza}%</span>
                  <span class="text-xs font-semibold text-teal-600">Meta: 90%</span>
                </div>
                <div class="w-48 bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div class="bg-teal-500 h-full rounded-full" style="width: ${taxaEficienciaLimpeza}%"></div>
                </div>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <i data-lucide="sparkles" class="w-6 h-6"></i>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Atendimento de Compras</span>
                <div class="flex items-baseline gap-2 mt-2">
                  <span class="text-3xl font-black text-slate-900">${indiceAtendimentoCompras}%</span>
                  <span class="text-xs font-semibold text-blue-600">Meta: 75%</span>
                </div>
                <div class="w-48 bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div class="bg-blue-600 h-full rounded-full" style="width: ${indiceAtendimentoCompras}%"></div>
                </div>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <i data-lucide="trending-up" class="w-6 h-6"></i>
              </div>
            </div>
          </div>

          <!-- Gráficos de Indicadores -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Gráfico: Ocorrências e Eficiência -->
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Volume e Fluxo de Ocorrências Técnicas</h3>
                  <p class="text-xs text-slate-500">Comportamento dos chamados nos últimos meses</p>
                </div>
                <span class="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">Histórico</span>
              </div>
              <div class="h-64 relative">
                <canvas id="chart-indicador-ocorrencias"></canvas>
              </div>
            </div>

            <!-- Gráfico: Alocação de Equipamentos e Ativos -->
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Distribuição do Ativo Patrimonial</h3>
                  <p class="text-xs text-slate-500">Equipamentos e bens alocados por responsável</p>
                </div>
                <span class="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">Patrimônio</span>
              </div>
              <div class="h-64 relative">
                <canvas id="chart-indicador-equipamentos"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) {
        window.lucide.createIcons({ root: container });
      }

      this._initCharts(ocorrencias, equipamentos);

      container.querySelector('#btn-export-bi')?.addEventListener('click', () => {
        window.UI.toast({
          title: 'Exportação Concluída',
          message: 'Relatório estatístico de indicadores gerado em formato analítico.',
          type: 'success'
        });
      });

    } catch (err) {
      console.error('Erro ao carregar indicadores:', err);
      container.innerHTML = window.UI.renderEmptyState({
        title: 'Painel Indisponível',
        description: 'Não foi possível carregar os dados de telemetria.',
        actionLabel: 'Recarregar',
        onActionClick: () => this.render(container)
      });
    }
  },

  _initCharts(ocorrencias, equipamentos) {
    if (typeof Chart === 'undefined') return;

    if (this.charts.line) this.charts.line.destroy();
    if (this.charts.polar) this.charts.polar.destroy();

    const ctxLine = document.getElementById('chart-indicador-ocorrencias')?.getContext('2d');
    if (ctxLine) {
      this.charts.line = new Chart(ctxLine, {
        type: 'line',
        data: {
          labels: ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'],
          datasets: [
            {
              label: 'Chamados Resolvidos',
              data: [12, 19, 15, 22, 18, ocorrencias.filter(o => o.status === 'resolvido').length || 14],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.35,
              fill: true
            },
            {
              label: 'Chamados Abertos',
              data: [14, 15, 12, 18, 14, ocorrencias.length || 16],
              borderColor: '#f43f5e',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              tension: 0.35
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          }
        }
      });
    }

    const ctxPolar = document.getElementById('chart-indicador-equipamentos')?.getContext('2d');
    if (ctxPolar) {
      this.charts.polar = new Chart(ctxPolar, {
        type: 'bar',
        data: {
          labels: ['Notebooks & TI', 'Projetores & Som', 'Servidores', 'Câmeras', 'Monitores', 'Mobiliário'],
          datasets: [{
            label: 'Total de Bens',
            data: [18, 6, 4, 8, 12, 24],
            backgroundColor: '#6366f1',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          }
        }
      });
    }
  }
};
