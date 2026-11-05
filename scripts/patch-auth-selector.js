const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '..', 'assets', 'js', 'auth.js');
let auth = fs.readFileSync(authPath, 'utf8');

const htmlSelector = `            <!-- SELETOR DE LOGIN RÁPIDO POR CARGO (15 PERFIS CORPORATIVOS) -->
            <div class="pt-1 pb-1">
              <label class="block text-[11px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Login Rápido por Cargo</span>
                <span class="text-[10px] text-blue-600 font-semibold uppercase">15 Cargos</span>
              </label>
              <select id="seletor-cargos-teste" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30">
                <option value="">Selecione um cargo para preencher...</option>
                <option value="admin@secult.es.gov.br" data-pass="Admin@Secult2026!">1. Administrador Geral (ADMIN)</option>
                <option value="administrador@secult.es.gov.br" data-pass="Teste@2026!">2. Administrador Institucional (ADMINISTRADOR)</option>
                <option value="administracao@secult.es.gov.br" data-pass="Teste@2026!">3. Administração e Pedidos (ADMINISTRACAO)</option>
                <option value="gestor@secult.es.gov.br" data-pass="Teste@2026!">4. Gestor Geral (GESTOR)</option>
                <option value="gestor.rh@secult.es.gov.br" data-pass="Teste@2026!">5. Gestor de RH (GESTOR_RH)</option>
                <option value="analista.rh@secult.es.gov.br" data-pass="Teste@2026!">6. Analista de RH (ANALISTA_RH)</option>
                <option value="rh@secult.es.gov.br" data-pass="Teste@2026!">7. Assistente de RH (RH)</option>
                <option value="gestor.infra@secult.es.gov.br" data-pass="Teste@2026!">8. Gestor de Infra & TI (GESTOR_INFRA)</option>
                <option value="tecnico.n3@secult.es.gov.br" data-pass="Teste@2026!">9. Técnico N3 Servidores (TECNICO_N3)</option>
                <option value="tecnico.n2@secult.es.gov.br" data-pass="Teste@2026!">10. Técnico N2 Hardware/Redes (TECNICO_N2)</option>
                <option value="tecnico.n1@secult.es.gov.br" data-pass="Teste@2026!">11. Técnico N1 Helpdesk (TECNICO_N1)</option>
                <option value="tecnico@secult.es.gov.br" data-pass="Teste@2026!">12. Técnico de Suporte (TECNICO)</option>
                <option value="gestor.operador@secult.es.gov.br" data-pass="Teste@2026!">13. Gestor de Operadores (GESTOR_OPERADOR)</option>
                <option value="operador@secult.es.gov.br" data-pass="Teste@2026!">14. Operador Operacional (OPERADOR)</option>
                <option value="limpeza@secult.es.gov.br" data-pass="Teste@2026!">15. Colaborador de Limpeza (LIMPEZA)</option>
              </select>
            </div>
`;

if (!auth.includes('id="seletor-cargos-teste"')) {
  auth = auth.replace(
    '<button type="submit" id="btn-login"',
    `${htmlSelector}\n            <button type="submit" id="btn-login"`
  );

  const jsListener = `
            const seletorCargos = tela.querySelector('#seletor-cargos-teste');
            if (seletorCargos) {
              seletorCargos.addEventListener('change', (e) => {
                const opt = e.target.selectedOptions?.[0];
                if (opt && opt.value) {
                  tela.querySelector('#login-email').value = opt.value;
                  tela.querySelector('#login-senha').value = opt.getAttribute('data-pass') || 'Teste@2026!';
                }
              });
            }
`;

  auth = auth.replace(
    'formLogin.addEventListener(\'submit\', async (e) => {',
    `${jsListener}\n            formLogin.addEventListener('submit', async (e) => {`
  );

  fs.writeFileSync(authPath, auth, 'utf8');
  console.log('✅ Added seletor-cargos-teste to assets/js/auth.js');
}

