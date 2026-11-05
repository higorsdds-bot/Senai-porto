/**
 * HUB ES+ - Script de Auditoria Automatizada de Tipografia, Proporções e Alto Contraste
 */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'https://main.hub-es-secult.pages.dev';

const BROWSER_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

class CDPClient {
  constructor(port = 9333) {
    this.port = port;
    this.cp = null;
    this.ws = null;
    this.reqId = 1;
    this.callbacks = new Map();
  }

  async start() {
    const profileDir = path.join(os.tmpdir(), `cdp-audit-${Date.now()}`);
    this.cp = spawn(BROWSER_PATH, [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      '--disable-gpu',
      '--disable-extensions',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=${profileDir}`,
      'about:blank'
    ]);

    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json`);
        if (res.ok) {
          const tabs = await res.json();
          const pageTab = tabs.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
          if (pageTab) {
            this.ws = new WebSocket(pageTab.webSocketDebuggerUrl);
            await new Promise((resolve, reject) => {
              this.ws.onopen = resolve;
              this.ws.onerror = reject;
            });
            this.ws.onmessage = (evt) => {
              const msg = JSON.parse(evt.data);
              if (msg.id && this.callbacks.has(msg.id)) {
                this.callbacks.get(msg.id)(msg);
                this.callbacks.delete(msg.id);
              }
            };
            await this.send('Page.enable');
            await this.send('DOM.enable');
            await this.send('Runtime.enable');
            return;
          }
        }
      } catch (_) { }
      await new Promise(r => setTimeout(r, 250));
    }
    throw new Error('Não foi possível conectar ao Chrome via CDP');
  }

  send(method, params = {}) {
    const id = this.reqId++;
    return new Promise((resolve) => {
      this.callbacks.set(id, (msg) => resolve(msg.result));
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async close() {
    try { this.ws?.close(); } catch (_) { }
    try { this.cp?.kill(); } catch (_) { }
  }
}

async function runAudit() {
  console.log('🔍 INICIANDO AUDITORIA PROFUNDA DE TIPOGRAFIA, PROPORÇÕES E CONTRASTE');
  console.log(`🎯 URL: ${TARGET_URL}\n`);

  const cdp = new CDPClient(9333);
  await cdp.start();

  try {
    await cdp.send('Page.navigate', { url: TARGET_URL });
    await cdp.sleep(3000);

    // 1. Inspeciona o Header inicial (borda)
    const headerBorderInfo = await cdp.eval(`(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const s = window.getComputedStyle(header);
      return {
        className: header.className,
        borderBottomColor: s.borderBottomColor,
        borderBottomWidth: s.borderBottomWidth,
        borderBottomStyle: s.borderBottomStyle,
        backgroundColor: s.backgroundColor
      };
    })()`);
    console.log('📌 [HEADER INSPECTION]:', JSON.stringify(headerBorderInfo, null, 2));

    // 2. Faz Login como Admin Geral
    await cdp.eval(`(() => {
      window.Auth?.renderizarTelaLogin?.();
    })()`);
    await cdp.sleep(500);

    await cdp.eval(`(() => {
      const email = document.querySelector("#login-email");
      const senha = document.querySelector("#login-senha");
      if (email) email.value = "admin@secult.es.gov.br";
      if (senha) senha.value = "Admin@Secult2026!";
      document.querySelector("#form-login")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    })()`);
    await cdp.sleep(2500);

    // Fecha modal pós-login se aberto
    await cdp.eval(`(() => {
      const modal = document.querySelector("#modal-acessibilidade-pos-login");
      if (modal) modal.remove();
      window.location.hash = "#dashboard";
      window.App?.handleRoute?.();
    })()`);
    await cdp.sleep(2000);

    // 3. AUDITORIA DE TIPOGRAFIA E PROPORÇÃO NO DASHBOARD
    console.log('\n📊 [AUDITORIA 1]: Discrepâncias de Tipografia no Dashboard (Normal, Médio, Grande)...');

    for (const tamanho of ['normal', 'medio', 'grande']) {
      await cdp.eval(`window.Acessibilidade?.setTamanhoFonte?.('${tamanho}')`);
      await cdp.sleep(500);

      const auditoriaTipografia = await cdp.eval(`(() => {
        try {
          const root = document.querySelector('#main-content');
          if (!root) return [{ cardClass: 'ERRO: Sem main-content', samples: [] }];

          const cells = Array.from(root.querySelectorAll('.telemetry-cell, .bento-surface, [class*="card"]'));
          const discrepancias = [];

          cells.forEach((cell, idx) => {
            const textNodes = Array.from(cell.querySelectorAll('*'))
              .filter(el => el.children.length === 0 && (el.innerText || el.textContent || '').trim().length > 0);

            if (textNodes.length === 0) return;

            const sizes = textNodes.map(el => {
              const s = window.getComputedStyle(el);
              const txt = (el.innerText || el.textContent || '').trim();
              return {
                text: txt.slice(0, 30),
                fontSize: parseFloat(s.fontSize) || 16,
                fontWeight: s.fontWeight,
                tagName: el.tagName,
                classes: el.className
              };
            });

            const fontSizes = sizes.map(s => s.fontSize).filter(f => f > 0);
            if (fontSizes.length === 0) return;

            const minFont = Math.min(...fontSizes);
            const maxFont = Math.max(...fontSizes);

            const isOverflowX = cell.scrollWidth > cell.clientWidth + 2;
            const isOverflowY = cell.scrollHeight > cell.clientHeight + 2;

            const temFonteMinuscula = fontSizes.some(f => f < 11.5);
            const saltoExcessivo = maxFont / minFont > 2.2;

            if (isOverflowX || isOverflowY || temFonteMinuscula || saltoExcessivo) {
              discrepancias.push({
                cardIndex: idx,
                cardClass: cell.className.slice(0, 50),
                minFontSize: minFont,
                maxFontSize: maxFont,
                ratio: (maxFont / minFont).toFixed(1),
                overflow: isOverflowX ? 'X' : (isOverflowY ? 'Y' : 'NENHUM'),
                samples: sizes.slice(0, 5)
              });
            }
          });

          return discrepancias;
        } catch (err) {
          return [{ cardClass: 'ERRO JS: ' + err.message, samples: [] }];
        }
      })()`);

      console.log(`\n--- Modo de Fonte: ${tamanho.toUpperCase()} (Total discrepâncias/desproporções: ${auditoriaTipografia.length}) ---`);
      auditoriaTipografia.forEach((d, i) => {
        console.log(` [${i + 1}] Card: ${d.cardClass}`);
        console.log(`     Min Font: ${d.minFontSize}px | Max Font: ${d.maxFontSize}px | Razão: ${d.ratio}x | Overflow: ${d.overflow}`);
        console.log(`     Amostras:`, d.samples.map(s => `"${s.text}" (${s.fontSize}px, ${s.fontWeight})`).join(' | '));
      });
    }

    // 4. AUDITORIA DE ALTO CONTRASTE (Modo Claro e Modo Escuro)
    console.log('\n🎨 [AUDITORIA 2]: Cobertura de Alto Contraste (O que não está pegando)...');

    for (const tema of ['claro', 'escuro']) {
      await cdp.eval(`
        window.Tema?.aplicarTema('${tema}');
        window.Acessibilidade?.setAltoContraste(true);
      `);
      await cdp.sleep(600);

      const auditoriaContraste = await cdp.eval(`(() => {
        const root = document.querySelector('#main-content') || document.body;
        const falhas = [];

        // Verifica todos os elementos de texto visíveis
        const allText = Array.from(root.querySelectorAll('*')).filter(el => {
          if (el.children.length > 0) return false;
          const t = el.innerText?.trim();
          if (!t) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        allText.forEach(el => {
          const s = window.getComputedStyle(el);
          const color = s.color;
          const bg = s.backgroundColor;

          // No alto contraste escuro, textos cinzas/apagados (como rgb(148, 163, 184) = slate-400)
          // ou cinza escuro no fundo branco quebram o padrão de contraste máximo
          const matchColor = color.match(/\\d+/g);
          if (matchColor) {
            const [r, g, b] = matchColor.map(Number);
            const isDark = document.documentElement.classList.contains('dark');

            if (isDark) {
              // No escuro com alto contraste, esperamos texto predominantemente branco (> 230)
              // ou amarelo (> 220, > 220, < 100)
              const ehBranco = r > 230 && g > 230 && b > 230;
              const ehAmarelo = r > 200 && g > 200 && b < 120;
              if (!ehBranco && !ehAmarelo) {
                falhas.push({
                  tag: el.tagName,
                  classes: el.className,
                  text: el.innerText.slice(0, 25),
                  color: color,
                  parent: el.parentElement?.className?.slice(0, 40)
                });
              }
            } else {
              // No claro com alto contraste, esperamos texto preto (< 30) ou azul forte (< 50, < 80, > 150)
              const ehPreto = r < 35 && g < 35 && b < 35;
              const ehAzulForte = r < 50 && g < 100 && b > 140;
              if (!ehPreto && !ehAzulForte) {
                falhas.push({
                  tag: el.tagName,
                  classes: el.className,
                  text: el.innerText.slice(0, 25),
                  color: color,
                  parent: el.parentElement?.className?.slice(0, 40)
                });
              }
            }
          }
        });

        // Agrupa falhas por classe para não gerar log gigante
        const falhasPorClasse = {};
        falhas.forEach(f => {
          const key = f.classes || f.tag;
          if (!falhasPorClasse[key]) falhasPorClasse[key] = { count: 0, sample: f };
          falhasPorClasse[key].count++;
        });

        return {
          totalFalhas: falhas.length,
          detalhes: Object.entries(falhasPorClasse).slice(0, 10).map(([k, v]) => ({
            selector: k,
            count: v.count,
            color: v.sample.color,
            textSample: v.sample.text
          }))
        };
      })()`);

      console.log(`\n--- Alto Contraste no Modo: ${tema.toUpperCase()} ---`);
      console.log(`Total de elementos com cor fora do padrão de alto contraste: ${auditoriaContraste.totalFalhas}`);
      console.log('Principais seletores com cores intermediárias (cinzas/apagados):');
      console.table(auditoriaContraste.detalhes);
    }

  } catch (err) {
    console.error('Erro na auditoria:', err);
  } finally {
    await cdp.close();
  }
}

runAudit();
