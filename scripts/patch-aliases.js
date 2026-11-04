const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'src', 'middleware', 'permissions.js'),
  path.join(__dirname, '..', 'functions', 'api', '[[catchall]].js'),
  path.join(__dirname, '..', 'assets', 'js', 'auth.js')
];

const newAliases = `  const aliases = {
    ADMINGERAL: 'ADMIN',
    ADMIN_GERAL: 'ADMIN',
    GESTORRH: 'GESTOR_RH',
    GESTOR_DE_RH: 'GESTOR_RH',
    ANALISTARH: 'ANALISTA_RH',
    ANALISTA_DE_RH: 'ANALISTA_RH',
    GESTORINFRA: 'GESTOR_INFRA',
    GESTOR_DE_INFRA: 'GESTOR_INFRA',
    GESTOR_INFRAESTRUTURA: 'GESTOR_INFRA',
    TECNICON1: 'TECNICO_N1',
    TECNICON2: 'TECNICO_N2',
    TECNICON3: 'TECNICO_N3',
    GESTOROPERADOR: 'GESTOR_OPERADOR',
    GESTOR_DE_OPERADOR: 'GESTOR_OPERADOR',
    GESTOR_DE_OPERADORES: 'GESTOR_OPERADOR'
  };`;

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    const startIdx = content.indexOf('const aliases = {');
    if (startIdx !== -1) {
      const endIdx = content.indexOf('};', startIdx) + 2;
      content = content.slice(0, startIdx) + newAliases.trim() + content.slice(endIdx);
      fs.writeFileSync(f, content, 'utf8');
      console.log('✅ Aliases atualizados em:', path.relative(path.join(__dirname, '..'), f));
    }
  }
}

