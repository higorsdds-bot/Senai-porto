/**
 * HUB ES+ — Alternância de tema (claro/escuro)
 * - Usa o botão #btn-tema presente no HTML (header), com ícones Lucide (lua/sol)
 * - Persiste a escolha no localStorage
 * - Respeita a preferência do sistema na primeira visita
 * - Se o botão não existir no HTML, injeta um flutuante como fallback
 */
(function () {
    const CHAVE = 'hub_es_tema';

    function aplicarTema(tema) {
        document.documentElement.classList.toggle('dark', tema === 'escuro');
        localStorage.setItem(CHAVE, tema);
        if (window.lucide) lucide.createIcons(); // re-renderiza lua/sol após troca
    }

    function temaInicial() {
        const salvo = localStorage.getItem(CHAVE);
        if (salvo) return salvo;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    }

    // Aplica imediatamente (evita "flash" do tema errado ao carregar)
    aplicarTema(temaInicial());

    function alternar() {
        const atual = document.documentElement.classList.contains('dark') ? 'escuro' : 'claro';
        aplicarTema(atual === 'escuro' ? 'claro' : 'escuro');
    }

    document.addEventListener('DOMContentLoaded', () => {
        let btn = document.getElementById('btn-tema');

        // Fallback: se o botão não estiver no HTML, cria um flutuante
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-tema';
            btn.type = 'button';
            btn.title = 'Alternar tema claro/escuro';
            btn.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;';
            btn.innerHTML = '<i data-lucide="moon" class="w-5 h-5 icone-lua"></i><i data-lucide="sun" class="w-5 h-5 icone-sol hidden"></i>';
            document.body.appendChild(btn);
        }

        btn.addEventListener('click', alternar);
        if (window.lucide) lucide.createIcons();
    });
})();