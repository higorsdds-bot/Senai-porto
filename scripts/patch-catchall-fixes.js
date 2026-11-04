const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'functions', 'api', '[[catchall]].js');
let code = fs.readFileSync(targetPath, 'utf8');

// 1. Adicionar checagem de permissão compras.criar no POST /compras
const oldComprasPost = "if (route === '/compras' && method === 'POST') {";
const newComprasPost = `if (route === '/compras' && method === 'POST') {
      if (!hasPerm(auth, 'compras.criar')) {
        return jsonResponse({ success: false, message: 'Sem permissão para solicitar compras.' }, 403);
      }`;

if (code.includes(oldComprasPost)) {
  code = code.replace(oldComprasPost, newComprasPost);
  console.log('✅ Checagem RBAC compras.criar adicionada em POST /compras.');
}

// 2. Fallback de rota não encontrada deve retornar 404
const oldFallback = `    return jsonResponse({
      success: true,
      data: [],
      message: \`Endpoint \${method} \${route} processado.\`
    });`;

const newFallback = `    return jsonResponse({
      success: false,
      message: \`Recurso ou rota '\${method} \${route}' não encontrada.\`
    }, 404);`;

if (code.includes(oldFallback)) {
  code = code.replace(oldFallback, newFallback);
  console.log('✅ Fallback de rotas atualizado para HTTP 404.');
} else {
  // Tenta substituição com CRLF se necessário
  const oldFallbackCrlf = oldFallback.replace(/\n/g, '\r\n');
  if (code.includes(oldFallbackCrlf)) {
    code = code.replace(oldFallbackCrlf, newFallback.replace(/\n/g, '\r\n'));
    console.log('✅ Fallback de rotas atualizado para HTTP 404 (CRLF).');
  }
}

fs.writeFileSync(targetPath, code, 'utf8');
console.log('🚀 functions/api/[[catchall]].js atualizado.');

