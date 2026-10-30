const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const HASH_ADMIN = bcrypt.hashSync('Admin@Secult2026!', 10);
const HASH_TESTE = bcrypt.hashSync('Teste@2026!', 10);

console.log('Admin Hash:', HASH_ADMIN);
console.log('Teste Hash:', HASH_TESTE);

const users = [
  { nome: 'Administrador do Sistema', email: 'admin@secult.es.gov.br', senha: HASH_ADMIN, perfil: 'ADMIN' },
  { nome: 'Higor Silva', email: 'higor@secult.es.gov.br', senha: HASH_ADMIN, perfil: 'ADMIN' },
  { nome: 'Andre', email: 'andre@secult123.com', senha: HASH_ADMIN, perfil: 'ADMIN' },
  { nome: 'Administrador Executivo', email: 'administrador@secult.es.gov.br', senha: HASH_TESTE, perfil: 'ADMINISTRADOR' },
  { nome: 'Operador Administrativo', email: 'administracao@secult.es.gov.br', senha: HASH_TESTE, perfil: 'ADMINISTRACAO' },
  { nome: 'Gestor Geral', email: 'gestor@secult.es.gov.br', senha: HASH_TESTE, perfil: 'GESTOR' },
  { nome: 'Gestor de RH', email: 'gestor.rh@secult.es.gov.br', senha: HASH_TESTE, perfil: 'GESTOR_RH' },
  { nome: 'Gestor de Infra & TI', email: 'gestor.infra@secult.es.gov.br', senha: HASH_TESTE, perfil: 'GESTOR_INFRA' },
  { nome: 'Gestor Operacional', email: 'gestor.operador@secult.es.gov.br', senha: HASH_TESTE, perfil: 'GESTOR_OPERADOR' },
  { nome: 'Analista de RH', email: 'analista.rh@secult.es.gov.br', senha: HASH_TESTE, perfil: 'ANALISTA_RH' },
  { nome: 'Assistente de RH', email: 'rh@secult.es.gov.br', senha: HASH_TESTE, perfil: 'RH' },
  { nome: 'Técnico Suporte N3', email: 'tecnico.n3@secult.es.gov.br', senha: HASH_TESTE, perfil: 'TECNICO_N3' },
  { nome: 'Técnico Suporte N2', email: 'tecnico.n2@secult.es.gov.br', senha: HASH_TESTE, perfil: 'TECNICO_N2' },
  { nome: 'Técnico Suporte N1', email: 'tecnico.n1@secult.es.gov.br', senha: HASH_TESTE, perfil: 'TECNICO_N1' },
  { nome: 'Técnico Operacional', email: 'tecnico@secult.es.gov.br', senha: HASH_TESTE, perfil: 'TECNICO' },
  { nome: 'Operador de Atendimento', email: 'operador@secult.es.gov.br', senha: HASH_TESTE, perfil: 'OPERADOR' },
  { nome: 'Equipe de Limpeza', email: 'limpeza@secult.es.gov.br', senha: HASH_TESTE, perfil: 'LIMPEZA' }
];

let sql = '-- Upsert all seed users with correct bcrypt hashes\n';
for (const u of users) {
  sql += `INSERT INTO usuarios (nome, email, senha, perfil, setor_id, status)
VALUES ('${u.nome.replace(/'/g, "''")}', '${u.email}', '${u.senha}', '${u.perfil}', 1, 'ATIVO')
ON CONFLICT(email) DO UPDATE SET
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil,
  status = 'ATIVO',
  deleted_at = NULL;\n\n`;
}

const sqlPath = path.join(__dirname, '../src/database/seed_users.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log('Wrote SQL to', sqlPath);
