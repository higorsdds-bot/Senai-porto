const fs = require('fs');
const path = require('path');

// 1. Patch src/routes/ocorrencias.js
const ocPath = path.join(__dirname, '..', 'src', 'routes', 'ocorrencias.js');
let oc = fs.readFileSync(ocPath, 'utf8');

if (!oc.includes('/:id/foto')) {
  oc = oc.replace(
    'return res.json({ success: true, data: rows });',
    `const data = rows.map(r => {
      let foto_url = r.foto_url;
      if (foto_url && foto_url.startsWith('data:')) {
        foto_url = \`/api/v1/ocorrencias/\${r.id}/foto\`;
      }
      return { ...r, foto_url };
    });
    return res.json({ success: true, data });`
  );

  const ocFotoRoute = `
// ─── GET /api/v1/ocorrencias/:id/foto ───────────────────────────────────────
router.get('/:id/foto', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT foto_url FROM ocorrencias WHERE id = ? AND deleted_at IS NULL LIMIT 1', [req.params.id]);
    if (!rows.length || !rows[0].foto_url) return res.status(404).send('Foto não encontrada.');
    const foto = rows[0].foto_url;
    if (foto.startsWith('http://') || foto.startsWith('https://')) return res.redirect(foto);
    const match = foto.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).send('Formato inválido.');
    const mime = match[1];
    const buf = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(buf);
  } catch (err) {
    return res.status(500).send('Erro ao carregar foto.');
  }
});
`;

  oc = oc.replace('// ─── GET /api/v1/ocorrencias/:id', `${ocFotoRoute}\n// ─── GET /api/v1/ocorrencias/:id`);
  fs.writeFileSync(ocPath, oc, 'utf8');
  console.log('✅ Patched src/routes/ocorrencias.js');
}

// 2. Patch src/routes/equipamentos.js
const eqPath = path.join(__dirname, '..', 'src', 'routes', 'equipamentos.js');
let eq = fs.readFileSync(eqPath, 'utf8');

if (!eq.includes('/:id/foto')) {
  eq = eq.replace(
    'return res.json({ success: true, data: rows });',
    `const data = rows.map(r => {
      let imagem_url = r.imagem_url;
      if (imagem_url && imagem_url.startsWith('data:')) {
        imagem_url = \`/api/v1/equipamentos/\${r.id}/foto\`;
      }
      return { ...r, imagem_url };
    });
    return res.json({ success: true, data });`
  );

  const eqFotoRoute = `
// ─── GET /api/v1/equipamentos/:id/foto ──────────────────────────────────────
router.get('/:id/foto', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT imagem_url FROM equipamentos WHERE id = ? AND deleted_at IS NULL LIMIT 1', [req.params.id]);
    if (!rows.length || !rows[0].imagem_url) return res.status(404).send('Imagem não encontrada.');
    const img = rows[0].imagem_url;
    if (img.startsWith('http://') || img.startsWith('https://')) return res.redirect(img);
    const match = img.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).send('Formato inválido.');
    const mime = match[1];
    const buf = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(buf);
  } catch (err) {
    return res.status(500).send('Erro ao carregar imagem.');
  }
});
`;

  eq = eq.replace('// ─── GET /api/v1/equipamentos/:id', `${eqFotoRoute}\n// ─── GET /api/v1/equipamentos/:id`);
  fs.writeFileSync(eqPath, eq, 'utf8');
  console.log('✅ Patched src/routes/equipamentos.js');
}

