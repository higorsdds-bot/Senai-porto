/**
 * HUB ES+ — Alternância de tema (claro/escuro)
 * - Controlado exclusivamente pelo menu dropdown do usuário
 * - Persiste a escolha no localStorage ('hub_es_tema')
 * - Respeita a preferência do sistema na primeira visita
 * - Expõe window.Tema com a API global
 */
(function () {
    const CHAVE = 'hub_es_tema';

    function getTemaAtual() {
        return document.documentElement.classList.contains('dark') ? 'escuro' : 'claro';
    }

    function sincronizarUI() {
        const tema = getTemaAtual();
        const labelStatus = document.getElementById('label-tema-status');
        if (labelStatus) {
            labelStatus.textContent = tema === 'escuro' ? 'Ativado' : 'Desativado';
        }
        if (window.lucide) {
            try { lucide.createIcons(); } catch (_) {}
        }
    }

    function aplicarTema(tema) {
        document.documentElement.classList.toggle('dark', tema === 'escuro');
        try { localStorage.setItem(CHAVE, tema); } catch (_) {}
        sincronizarUI();
    }

    function temaInicial() {
        try {
            const salvo = localStorage.getItem(CHAVE);
            if (salvo) return salvo;
        } catch (_) {}
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'escuro' : 'claro';
    }

    // Aplica imediatamente para evitar "flash" de tema
    aplicarTema(temaInicial());

    function alternar() {
        const atual = getTemaAtual();
        aplicarTema(atual === 'escuro' ? 'claro' : 'escuro');
    }

    window.Tema = {
        alternar,
        aplicarTema,
        getTemaAtual,
        sincronizarUI
    };

    document.addEventListener('DOMContentLoaded', () => {
        sincronizarUI();
    });
})();