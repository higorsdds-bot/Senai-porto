const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'functions', 'api', '[[catchall]].js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add parseDataUrl after arrayBufferToBase64
const parseDataUrlCode = `
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { mime, bytes };
  } catch {
    return null;
  }
}
`;

if (!content.includes('function parseDataUrl(')) {
  content = content.replace(
    /async function arrayBufferToBase64\([\s\S]*?return btoa\(binary\);\r?\n}/,
    (match) => `${match}\n${parseDataUrlCode}`
  );
  console.log('✅ Added parseDataUrl');
}

// 2. Add public photo streaming routes before autenticarRequest
const photoStreamingRoutes = `
    // ─── Streaming de Fotos / Imagens Binárias com Cache HTTP de 24h ─────────────
    const matchOcorrenciaFoto = route.match(/^\\/ocorrencias\\/(\\d+)\\/foto$/);
    if (matchOcorrenciaFoto && method === 'GET') {
      const id = matchOcorrenciaFoto[1];
      const row = await d1First(db, 'SELECT foto_url FROM ocorrencias WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
      if (!row || !row.foto_url) {
        return new Response('Foto não encontrada.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      if (row.foto_url.startsWith('http://') || row.foto_url.startsWith('https://')) {
        return Response.redirect(row.foto_url, 302);
      }
      const parsed = parseDataUrl(row.foto_url);
      if (!parsed) {
        return new Response('Formato inválido.', { status: 400 });
      }
      return new Response(parsed.bytes, {
        headers: {
          'Content-Type': parsed.mime,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const matchEquipamentoFoto = route.match(/^\\/equipamentos\\/(\\d+)\\/foto$/);
    if (matchEquipamentoFoto && method === 'GET') {
      const id = matchEquipamentoFoto[1];
      const row = await d1First(db, 'SELECT imagem_url FROM equipamentos WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
      if (!row || !row.imagem_url) {
        return new Response('Imagem não encontrada.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      if (row.imagem_url.startsWith('http://') || row.imagem_url.startsWith('https://')) {
        return Response.redirect(row.imagem_url, 302);
      }
      const parsed = parseDataUrl(row.imagem_url);
      if (!parsed) {
        return new Response('Formato inválido.', { status: 400 });
      }
      return new Response(parsed.bytes, {
        headers: {
          'Content-Type': parsed.mime,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
`;

const authMarker = 'const auth = await autenticarRequest(request, db, jwtSecret);';
if (!content.includes('matchOcorrenciaFoto') && content.includes(authMarker)) {
  content = content.replace(authMarker, `${photoStreamingRoutes}\n    ${authMarker}`);
  console.log('✅ Added photo streaming routes before auth');
}

// 3. Optimize GET /ocorrencias to return photo URLs instead of bloated Base64 in JSON
const getOcorrenciasTarget = `return jsonResponse({ success: true, data: rows });`;
const getOcorrenciasReplacement = `const data = rows.map(r => {
        let foto_url = r.foto_url;
        if (foto_url && foto_url.startsWith('data:')) {
          foto_url = \`/api/v1/ocorrencias/\${r.id}/foto\`;
        }
        return { ...r, foto_url };
      });
      return jsonResponse({ success: true, data });`;

// Replace specifically inside GET /ocorrencias
if (content.includes("if (route === '/ocorrencias' && method === 'GET')")) {
  const getOcIdx = content.indexOf("if (route === '/ocorrencias' && method === 'GET')");
  const returnIdx = content.indexOf(getOcorrenciasTarget, getOcIdx);
  if (returnIdx !== -1 && returnIdx - getOcIdx < 2000) {
    content = content.slice(0, returnIdx) + getOcorrenciasReplacement + content.slice(returnIdx + getOcorrenciasTarget.length);
    console.log('✅ Optimized GET /ocorrencias to stream photo URLs');
  }
}

// 4. Optimize GET /ocorrencias/:id
const getOcIdTarget = `return jsonResponse({ success: true, data: row });`;
if (content.includes("const matchOcorrenciaId = route.match(/^\/ocorrencias\/(\\d+)$/);")) {
  const getOcIdIdx = content.indexOf("const matchOcorrenciaId = route.match(/^\/ocorrencias\/(\\d+)$/);");
  const returnIdx = content.indexOf(getOcIdTarget, getOcIdIdx);
  if (returnIdx !== -1 && returnIdx - getOcIdIdx < 1500) {
    const replacement = `let foto_url = row.foto_url;
      if (foto_url && foto_url.startsWith('data:')) {
        foto_url = \`/api/v1/ocorrencias/\${row.id}/foto\`;
      }
      return jsonResponse({ success: true, data: { ...row, foto_url } });`;
    content = content.slice(0, returnIdx) + replacement + content.slice(returnIdx + getOcIdTarget.length);
    console.log('✅ Optimized GET /ocorrencias/:id to stream photo URL');
  }
}

// 5. Optimize GET /equipamentos to return photo URLs instead of bloated Base64 in JSON
const getEquipTarget = `return jsonResponse({ success: true, data: rows });`;
const getEquipReplacement = `const data = rows.map(r => {
        let imagem_url = r.imagem_url;
        if (imagem_url && imagem_url.startsWith('data:')) {
          imagem_url = \`/api/v1/equipamentos/\${r.id}/foto\`;
        }
        return { ...r, imagem_url };
      });
      return jsonResponse({ success: true, data });`;

if (content.includes("if (route === '/equipamentos' && method === 'GET')")) {
  const getEqIdx = content.indexOf("if (route === '/equipamentos' && method === 'GET')");
  const returnIdx = content.indexOf(getEquipTarget, getEqIdx);
  if (returnIdx !== -1 && returnIdx - getEqIdx < 2000) {
    content = content.slice(0, returnIdx) + getEquipReplacement + content.slice(returnIdx + getEquipTarget.length);
    console.log('✅ Optimized GET /equipamentos to stream photo URLs');
  }
}

// 6. Optimize GET /equipamentos/:id
const getEqIdTarget = `return jsonResponse({ success: true, data: row });`;
if (content.includes("const matchEqId = route.match(/^\/equipamentos\/(\\d+)$/);")) {
  const getEqIdIdx = content.indexOf("const matchEqId = route.match(/^\/equipamentos\/(\\d+)$/);");
  const returnIdx = content.indexOf(getEqIdTarget, getEqIdIdx);
  if (returnIdx !== -1 && returnIdx - getEqIdIdx < 1500) {
    const replacement = `let imagem_url = row.imagem_url;
      if (imagem_url && imagem_url.startsWith('data:')) {
        imagem_url = \`/api/v1/equipamentos/\${row.id}/foto\`;
      }
      return jsonResponse({ success: true, data: { ...row, imagem_url } });`;
    content = content.slice(0, returnIdx) + replacement + content.slice(returnIdx + getEqIdTarget.length);
    console.log('✅ Optimized GET /equipamentos/:id to stream photo URL');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('🚀 Successfully updated functions/api/[[catchall]].js');

