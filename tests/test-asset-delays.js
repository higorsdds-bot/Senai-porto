const TARGET_URL = process.env.TARGET_URL || 'https://main.hub-es-secult.pages.dev';

async function testPageAssets() {
  console.log('================================================================');
  console.log(`🌐 TESTE DE TEMPO DE CARREGAMENTO E ASSETS: ${TARGET_URL}`);
  console.log('================================================================\n');

  const t0 = performance.now();
  const res = await fetch(TARGET_URL);
  const ttfb = performance.now() - t0;
  const html = await res.text();
  const htmlTime = performance.now() - t0;

  console.log(`📄 Documento HTML Inicial:`);
  console.log(`   • Status: ${res.status}`);
  console.log(`   • TTFB (Time to First Byte): ${Math.round(ttfb)}ms`);
  console.log(`   • Tempo Total de Download: ${Math.round(htmlTime)}ms`);
  console.log(`   • Tamanho HTML: ${(html.length / 1024).toFixed(1)} KB\n`);

  // Extrair tags de scripts e links css
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;

  const assetUrls = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    assetUrls.push({ tipo: 'script', url: match[1] });
  }
  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1].endsWith('.css') || match[1].includes('fonts') || match[1].includes('tailwind')) {
      assetUrls.push({ tipo: 'style', url: match[1] });
    }
  }

  console.log(`📦 Medindo tempo de resposta de ${assetUrls.length} assets críticos...\n`);

  const resultados = [];
  for (const item of assetUrls) {
    const fullUrl = item.url.startsWith('http') ? item.url : `${TARGET_URL.replace(/\/$/, '')}/${item.url.replace(/^\//, '')}`;
    const start = performance.now();
    try {
      const aRes = await fetch(fullUrl);
      const buf = await aRes.arrayBuffer();
      const dur = Math.round(performance.now() - start);
      const kb = (buf.byteLength / 1024).toFixed(1);
      resultados.push({
        Asset: item.url.length > 45 ? '...' + item.url.slice(-42) : item.url,
        Tipo: item.tipo,
        'Latência (ms)': dur,
        'Tamanho (KB)': kb,
        Status: aRes.status,
        Avaliação: dur < 300 ? '⚡ Ótimo' : dur < 700 ? '✅ Aceitável' : '⚠️ Lento'
      });
    } catch (err) {
      resultados.push({
        Asset: item.url,
        Tipo: item.tipo,
        'Latência (ms)': -1,
        'Tamanho (KB)': '0',
        Status: 'ERR',
        Avaliação: '❌ Falha'
      });
    }
  }

  console.table(resultados);

  const tempos = resultados.filter(r => r['Latência (ms)'] > 0).map(r => r['Latência (ms)']);
  const media = Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length);
  const max = Math.max(...tempos);
  const totalKB = resultados.reduce((a, b) => a + parseFloat(b['Tamanho (KB)'] || 0), 0).toFixed(1);

  console.log('\n================================================================');
  console.log(`📊 RESUMO DE ASSETS FRONTEND:`);
  console.log(`   • Latência Média dos Assets: ${media}ms`);
  console.log(`   • Maior Latência de Asset: ${max}ms`);
  console.log(`   • Peso Total dos Assets: ${totalKB} KB`);
  console.log('================================================================\n');
}

testPageAssets();
