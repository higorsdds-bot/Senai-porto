/**
 * HUB ES+ / SECULT - Script de Build para Cloudflare Pages
 * Prepara o diretório 'dist/' contendo todos os assets estáticos do frontend,
 * regras de proxy reverso (_redirects) e headers de segurança (_headers).
 *
 * Uso: node scripts/build-pages.js
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('[BUILD-PAGES] Iniciando preparação do bundle para Cloudflare Pages...');

// 1. Limpar e recriar diretório dist/
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Função utilitária para cópia recursiva
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

// 3. Copiar arquivos principais
const arquivosParaCopiar = [
  'index.html',
  'manifest.json',
  'sw.js',
  'MANUAL_HIERARQUIA_E_PERMISSOES_HUB_ES.pdf'
];

for (const arq of arquivosParaCopiar) {
  const src = path.join(rootDir, arq);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, arq));
    console.log(`[BUILD-PAGES] ✅ Copiado: ${arq}`);
  }
}

// 4. Copiar pasta assets/
const assetsSrc = path.join(rootDir, 'assets');
const assetsDest = path.join(distDir, 'assets');
if (fs.existsSync(assetsSrc)) {
  copyRecursiveSync(assetsSrc, assetsDest);
  console.log('[BUILD-PAGES] ✅ Pasta assets/ copiada com sucesso.');
}

// 5. Gerar arquivo _redirects para proxy reverso da API no Cloudflare Edge
const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || 'https://senai-porto.onrender.com';
const redirectsContent = `# Cloudflare Pages - Regras de Roteamento e Reverse Proxy no Edge
# Proxy transparente de rotas de API para o backend Node.js
/api/* ${backendUrl}/api/:splat 200
/uploads/* ${backendUrl}/uploads/:splat 200

# Fallback SPA para navegação do frontend
/* /index.html 200
`;

fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent, 'utf8');
console.log('[BUILD-PAGES] ✅ Arquivo _redirects configurado.');

// 6. Gerar arquivo _headers para segurança e cache
const headersContent = `/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: public, max-age=0, must-revalidate
`;

fs.writeFileSync(path.join(distDir, '_headers'), headersContent, 'utf8');
console.log('[BUILD-PAGES] ✅ Arquivo _headers configurado.');

console.log('[BUILD-PAGES] 🚀 Build concluído com sucesso em: ' + distDir);
