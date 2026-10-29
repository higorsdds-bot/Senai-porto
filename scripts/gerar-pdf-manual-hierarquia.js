/**
 * Script para geração do Manual Completo de Hierarquia e Permissões do HUB ES+
 * Gera o arquivo: MANUAL_HIERARQUIA_E_PERMISSOES_HUB_ES.pdf
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '..', 'MANUAL_HIERARQUIA_E_PERMISSOES_HUB_ES.pdf');
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Cores da paleta institucional HUB ES+
const PRIMARY = '#1e3a8a';     // Azul Marinho Secult/Hub
const SECONDARY = '#0284c7';   // Azul Claro / Destaque
const DARK = '#0f172a';        // Slate Escuro para texto
const MUTED = '#475569';       // Slate Médio
const BG_BOX = '#f8fafc';      // Slate 50
const BORDER_BOX = '#cbd5e1';  // Slate 300
const ACCENT_GREEN = '#059669';// Verde Sucesso
const ACCENT_AMBER = '#d97706';// Âmbar Alerta

function drawHeader(title) {
  doc.rect(50, 40, 495, 30).fill(PRIMARY);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
     .text(title.toUpperCase(), 60, 50, { width: 475, align: 'left' });
  doc.y = 85;
}

function drawSectionTitle(number, title) {
  doc.moveDown(0.8);
  const y = doc.y;
  doc.rect(50, y, 4, 18).fill(SECONDARY);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(PRIMARY)
     .text(`${number}. ${title}`, 62, y + 2);
  doc.moveDown(0.5);
}

function drawSubSectionTitle(title) {
  doc.moveDown(0.4);
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor(DARK)
     .text(title, { indent: 10 });
  doc.moveDown(0.2);
}

function drawParagraph(text, options = {}) {
  doc.fontSize(9.5).font('Helvetica').fillColor(DARK)
     .text(text, {
       align: 'justify',
       lineGap: 2.5,
       indent: options.indent || 0,
       ...options
     });
  doc.moveDown(0.4);
}

function drawBullet(boldText, normalText) {
  const y = doc.y;
  doc.circle(60, y + 5, 2.5).fill(SECONDARY);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
     .text(boldText + ': ', 70, y, { continued: true });
  doc.font('Helvetica').fillColor(MUTED)
     .text(normalText, { lineGap: 2 });
  doc.moveDown(0.25);
}

function drawCallout(title, text, color = SECONDARY) {
  doc.moveDown(0.3);
  const startY = doc.y;
  const padding = 10;
  const boxWidth = 495;

  // Medir altura do texto para o box
  doc.fontSize(9).font('Helvetica');
  const textHeight = doc.heightOfString(text, { width: boxWidth - 30 });
  const totalHeight = textHeight + 28;

  doc.rect(50, startY, boxWidth, totalHeight).fillAndStroke('#f1f5f9', '#cbd5e1');
  doc.rect(50, startY, 4, totalHeight).fill(color);

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(color)
     .text(title, 65, startY + 8);
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
     .text(text, 65, startY + 22, { width: boxWidth - 30, lineGap: 2 });

  doc.y = startY + totalHeight + 10;
}

// ============================================================================
// PÁGINA 1: CAPA INSTITUCIONAL
// ============================================================================
doc.rect(50, 50, 495, 742).stroke(PRIMARY);
doc.rect(55, 55, 485, 732).stroke(SECONDARY);

doc.y = 130;
doc.fontSize(12).font('Helvetica-Bold').fillColor(SECONDARY)
   .text('GOVERNO DO ESTADO DO ESPÍRITO SANTO', { align: 'center', characterSpacing: 1.5 });
doc.fontSize(10).font('Helvetica').fillColor(MUTED)
   .text('SECULT - SECRETARIA DA CULTURA • SENAI PORTO', { align: 'center', characterSpacing: 1 });
doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY)
   .text('HUB ES+ DE CRIATIVIDADE E INOVAÇÃO', { align: 'center', characterSpacing: 2 });

doc.moveDown(4);
doc.rect(90, doc.y, 415, 3).fill(SECONDARY);
doc.moveDown(1.5);

doc.fontSize(22).font('Helvetica-Bold').fillColor(PRIMARY)
   .text('MANUAL DE GOVERNANÇA,', { align: 'center' });
doc.fontSize(20).font('Helvetica-Bold').fillColor(PRIMARY)
   .text('HIERARQUIA ORGANIZACIONAL', { align: 'center' });
doc.fontSize(18).font('Helvetica-Bold').fillColor(SECONDARY)
   .text('E FLUXO DE PERMISSÕES', { align: 'center' });

doc.moveDown(1.2);
doc.fontSize(10.5).font('Helvetica').fillColor(MUTED)
   .text('Estrutura de Perfis, Cadeia de Supervisão Setorial, Suporte Técnico N1/N2/N3,', { align: 'center' });
doc.text('Integração de Equipamentos e Gestão Granular de Permissões', { align: 'center' });

doc.moveDown(2);
doc.rect(90, doc.y, 415, 3).fill(SECONDARY);

doc.y = 600;
doc.fontSize(9.5).font('Helvetica-Bold').fillColor(DARK)
   .text('AUTORIDADE EMISSORA:', { align: 'center' });
doc.fontSize(9).font('Helvetica').fillColor(MUTED)
   .text('Administração Geral & Coordenação de Tecnologia do HUB ES+', { align: 'center' });

doc.moveDown(1);
doc.fontSize(9.5).font('Helvetica-Bold').fillColor(DARK)
   .text('VERSÃO DO SISTEMA:', { align: 'center' });
doc.fontSize(9).font('Helvetica').fillColor(MUTED)
   .text('Versão 2.4.0 — Homologada para Produção', { align: 'center' });

doc.moveDown(1);
doc.fontSize(9).font('Helvetica-Bold').fillColor(SECONDARY)
   .text('VITÓRIA - ES | ANO 2026', { align: 'center' });

// ============================================================================
// PÁGINA 2: INTRODUÇÃO & ÁRVORE DE SUPERVISÃO
// ============================================================================
doc.addPage();
drawHeader('Manual de Governança & Hierarquia — HUB ES+');

drawSectionTitle('1', 'Introdução & Objetivos da Nova Arquitetura');
drawParagraph('O Sistema Integrado de Gestão do HUB ES+ foi atualizado para uma arquitetura hierárquica robusta de governança institucional. Essa atualização estabelece uma cadeia de comando clara entre os diferentes setores, garante auditoria integral e proporciona flexibilidade para atribuir privilégios específicos sem comprometer a segurança dos dados.');

drawParagraph('Historicamente, perfis estáticos forçavam usuários a possuir acesso total ou restrição excessiva. A nova arquitetura combina:');
drawBullet('Perfis Estruturados com Escopo Definido', 'Cada função possui suas páginas e competências padrão.');
drawBullet('Supervisão Piramidal Rígida', 'O Super Administrador (Admin) supervisiona o Administrador Institucional e todos os Gestores.');
drawBullet('Concessão Granular de Permissões', 'Permite que um usuário de determinado setor (como RH) receba acesso a páginas específicas de outros setores (como Documentos ou Compras) sem precisar ter seu perfil promovido a Administrador.');
drawBullet('Suporte Técnico em 3 Níveis (N1, N2, N3)', 'Tratamento especializado para chamados técnicos com parecer obrigatório e vínculo com patrimônio de equipamentos.');

drawSectionTitle('2', 'Árvore Hierárquica e Níveis de Autoridade');

drawParagraph('A estrutura do HUB ES+ está organizada em cinco níveis hierárquicos bem delineados:');

drawSubSectionTitle('Nível 1 — Super Administrador Geral (ADMIN)');
drawBullet('Escopo de Autoridade', 'Supervisão máxima institucional e técnica sobre todos os módulos.');
drawBullet('Competências Exclusivas', 'Apenas o Super Admin pode criar, aprovar, editar ou rebaixar usuários com perfil ADMINISTRADOR ou ADMIN. Possui visualização irrestrita da trilha de auditoria completa e logs do banco de dados.');

drawSubSectionTitle('Nível 2 — Administrador Institucional (ADMINISTRADOR)');
drawBullet('Escopo de Autoridade', 'Gestão administrativa global das operações do HUB ES+.');
drawBullet('Competências', 'Supervisiona os Gestores Setoriais (RH, Infra, Operador), gerencia setores, homologa contas e autoriza compras.');
drawBullet('Restrição de Governança', 'Não possui permissão para editar, alterar permissões ou inativar contas com perfil ADMIN.');

drawSubSectionTitle('Nível 3 — Gestores Setoriais');
drawBullet('Gestor de Recursos Humanos (GESTOR_RH)', 'Supervisiona o setor de RH, gerencia a admissão e os acessos de analistas de RH e operadores, com competência para conceder acesso documental a seus colaboradores.');
drawBullet('Gestor de Infraestrutura & Redes (GESTOR_INFRA)', 'Comanda os Técnicos N1, N2 e N3, o inventário patrimonial de equipamentos e o fluxo de resolução e escalonamento de ocorrências.');
drawBullet('Gestor Operacional (GESTOR_OPERADOR)', 'Comanda a equipe de operadores, gerencia a agenda cultural do prédio, escalas de trabalho e fluxo de comunicados.');
drawBullet('Gestor Geral (GESTOR)', 'Gestão operacional transversal e autorização de pedidos de compras.');

drawCallout(
  'Princípio da Não-Degradação de Governança',
  'Nenhum usuário de nível inferior possui privilégios para promover a si mesmo ou a outros colaboradores para níveis superiores ao seu próprio cargo. Essa regra é aplicada estritamente no backend da aplicação em src/routes/usuarios.js.',
  PRIMARY
);

// ============================================================================
// PÁGINA 3: EQUIPE TÉCNICA, OPERACIONAL E MATRIZ DE PERFIS
// ============================================================================
doc.addPage();
drawHeader('Manual de Governança & Hierarquia — HUB ES+');

drawSubSectionTitle('Nível 4 — Equipe Técnica e Especialistas');
drawBullet('Técnico N3 — Avançado / Servidores (TECNICO_N3)', 'Atuação em infraestrutura crítica, servidores locais e em nuvem, switches core, banco de dados e problemas de alta complexidade.');
drawBullet('Técnico N2 — Hardware / Redes (TECNICO_N2)', 'Manutenção de bancada, montagem de computadores, cabeamento estruturado, testes de equipamentos em manutenção e suporte intermediário.');
drawBullet('Técnico N1 — Helpdesk / Atendimento Básico (TECNICO_N1)', 'Primeiro ponto de contato, atendimento a chamados de rotina dos operadores, triagem de ocorrências e resolução de dúvidas de uso.');
drawBullet('Analista de Recursos Humanos (ANALISTA_RH / RH)', 'Rotinas de admissão, acompanhamento de equipe, controle documental e atendimento ao colaborador.');
drawBullet('Administração (ADMINISTRACAO)', 'Responsável por pré-cadastro de novos contratados, requisição de insumos de almoxarifado e abertura de pedidos de compras.');

drawSubSectionTitle('Nível 5 — Operacional e Visitantes');
drawBullet('Operador (OPERADOR)', 'Acesso às rotinas básicas de atendimento, registro de ocorrências, consulta de insumos e agenda. Conforme normas de compliance, não possui botões de compras.');
drawBullet('Limpeza (LIMPEZA)', 'Acesso focado na solicitação de materiais de consumo e higienização.');
drawBullet('Visitante (VISITANTE)', 'Acesso anônimo/público estritamente aos murais de comunicados e agenda cultural, sem necessidade de credenciais de login.');

drawSectionTitle('3', 'Matriz de Páginas e Módulos por Perfil Base');

drawParagraph('A tabela a seguir apresenta os módulos disponíveis por padrão para cada cargo na aplicação:');

// Tabela de matriz
const tableY = doc.y;
const colWidths = [120, 60, 60, 60, 65, 65, 65];
const headers = ['Perfil / Cargo', 'Dash', 'Equip', 'Docs', 'Ocorrên.', 'Insumos', 'Compras'];

doc.rect(50, tableY, 495, 18).fill(PRIMARY);
doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
let curX = 55;
headers.forEach((h, i) => {
  doc.text(h, curX, tableY + 5, { width: colWidths[i] });
  curX += colWidths[i];
});

const matrizDados = [
  ['ADMIN / SUPER ADMIN', 'Total', 'Total', 'Total', 'Total', 'Total', 'Total'],
  ['ADMINISTRADOR', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Aprovar'],
  ['GESTOR_RH', 'Sim', 'Consulta', 'Setorial', 'Sim', 'Sim', 'Criar'],
  ['GESTOR_INFRA', 'Sim', 'Total', 'Consulta', 'Total (N3)', 'Sim', 'Criar'],
  ['GESTOR_OPERADOR', 'Sim', 'Consulta', 'Consulta', 'Sim', 'Sim', 'Criar'],
  ['TECNICO_N3', 'Sim', 'Total', 'Consulta', 'Atender/N3', 'Sim', 'Não'],
  ['TECNICO_N2', 'Sim', 'Manuten.', 'Consulta', 'Atender/N2', 'Sim', 'Não'],
  ['TECNICO_N1', 'Sim', 'Consulta', 'Consulta', 'Atender/N1', 'Sim', 'Não'],
  ['ANALISTA_RH / RH', 'Sim', 'Consulta', 'Via Concessão', 'Registrar', 'Consulta', 'Não'],
  ['ADMINISTRACAO', 'Sim', 'Consulta', 'Consulta', 'Registrar', 'Total', 'Criar'],
  ['OPERADOR', 'Sim', 'Consulta', 'Consulta', 'Registrar', 'Consulta', 'Não'],
  ['LIMPEZA', 'Sim', 'Não', 'Não', 'Registrar', 'Consumo', 'Não']
];

let curY = tableY + 18;
doc.font('Helvetica').fontSize(7.5);
matrizDados.forEach((row, idx) => {
  const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
  doc.rect(50, curY, 495, 15).fillAndStroke(bg, '#e2e8f0');
  doc.fillColor(DARK);

  let x = 55;
  row.forEach((cell, ci) => {
    if (ci === 0) doc.font('Helvetica-Bold');
    else doc.font('Helvetica');

    if (cell === 'Total' || cell === 'Aprovar') doc.fillColor(PRIMARY);
    else if (cell === 'Não') doc.fillColor('#94a3b8');
    else if (cell.includes('Via Concessão')) doc.fillColor(SECONDARY);
    else doc.fillColor(DARK);

    doc.text(cell, x, curY + 4, { width: colWidths[ci] });
    x += colWidths[ci];
  });
  curY += 15;
});

doc.y = curY + 15;

drawCallout(
  'Isolamento Rígido do Perfil OPERADOR',
  'Em conformidade com as diretrizes do AGENTS.md, os Operadores não possuem acesso nem visualização aos botões e rotas de compras e aprovações orçamentárias.',
  ACCENT_AMBER
);

// ============================================================================
// PÁGINA 4: FLUXO DE PERMISSÕES GRANULARES (CASO DO RH)
// ============================================================================
doc.addPage();
drawHeader('Manual de Governança & Hierarquia — HUB ES+');

drawSectionTitle('4', 'Permissões Granulares & Concessão Sob Medida');

drawParagraph('Um dos pilares mais importantes desta evolução é a capacidade de conceder **acessos pontuais sem alterar o cargo do usuário**. O caso típico solicitado pela equipe exemplifica com precisão essa necessidade:');

drawCallout(
  'Exemplo Prático: Concessão de Documentos para o Setor de RH',
  'O setor de Recursos Humanos necessita consultar contratos, certidões e termos de adesão, além de realizar o upload de atestados e documentações trabalhistas. Com o novo sistema, o Administrador ou Gestor pode manter o colaborador no cargo "RH" ou "ANALISTA_RH" e simplesmente marcar os privilégios adicionais: "documentos.visualizar" e "documentos.enviar". O colaborador terá acesso imediato à aba Documentos com permissão de upload para o setor de RH!',
  PRIMARY
);

drawSubSectionTitle('Como Funciona o Mecanismo Técnico:');
drawBullet('Tabela usuario_permissoes', 'Armazena de forma persistente e auditada cada permissão individual atribuída a um usuário específico.');
drawBullet('União Automática na Sessão JWT', 'Durante a autenticação e verificação de rotas, o middleware mescla as permissões inerentes ao perfil base do usuário com suas permissões adicionais concedidas.');
drawBullet('Interface Visual Amigável', 'Nos modais de Criação de Usuário e Edição de Cargo, foi incluído o painel "Permissões Específicas / Acessos Adicionais" com caixas de seleção (checkboxes) intuitivas.');
drawBullet('Invalidação de Cache em Tempo Real', 'Sempre que o Administrador altera as permissões de um usuário, a função clearUserPermCache(userId) limpa o cache em memória, refletindo as novas permissões instantaneamente no próximo clique.');

drawSubSectionTitle('Catálogo de Permissões Granulares Disponíveis para Concessão:');

drawBullet('documentos.visualizar', 'Permite pesquisar, filtrar e baixar documentos digitais arquivados.');
drawBullet('documentos.enviar', 'Permite enviar novos anexos, laudos e arquivos PDF para repositório do setor.');
drawBullet('documentos.excluir', 'Permite arquivar ou remover documentos do repositório setorial.');
drawBullet('ocorrencias.atender', 'Permite que técnicos e gestores assumam formalmente a responsabilidade por um chamado.');
drawBullet('ocorrencias.escalonar', 'Permite transferir o chamado entre os níveis N1, N2 e N3 com parecer técnico.');
drawBullet('insumos.visualizar', 'Permite consultar o saldo físico e catálogo do almoxarifado.');
drawBullet('insumos.movimentar', 'Permite registrar saídas de materiais e entradas de novos insumos.');
drawBullet('compras.criar', 'Permite cadastrar novas solicitações de cotação e compra de materiais.');
drawBullet('equipamentos.visualizar', 'Permite consultar a lista de patrimônios e status de equipamentos.');
drawBullet('equipamentos.gerenciar', 'Permite cadastrar novos bens patrimoniais e atualizar sua condição física.');

// ============================================================================
// PÁGINA 5: FLUXO DE OCORRÊNCIAS TÉCNICAS (N1, N2, N3) & EQUIPAMENTOS
// ============================================================================
doc.addPage();
drawHeader('Manual de Governança & Hierarquia — HUB ES+');

drawSectionTitle('5', 'Fluxo Profissional de Suporte Técnico (N1, N2, N3)');

drawParagraph('Para assegurar que nenhum incidente no HUB ES+ fique sem atendimento ou diagnóstico, o módulo de Ocorrências Técnicas foi totalmente reformulado com suporte a níveis de serviço (SLA), vinculação de patrimônio e histórico de pareceres técnicos.');

drawSubSectionTitle('Etapas do Ciclo de Vida do Chamado:');

drawBullet('1. Abertura do Chamado', 'Qualquer colaborador ou operador pode registrar um chamado informando Local, Categoria, Descrição, Foto da Câmera (Webcam ou Mobile), Anexo e agora o Equipamento Patrimonial Relacionado.');
drawBullet('2. Nível Inicial (N1 — Helpdesk)', 'A ocorrência nasce prioritariamente como N1 (Atendimento Inicial). A equipe de Helpdesk analisa o problema para identificar se pode ser resolvido com orientação ao usuário ou configuração remota.');
drawBullet('3. Ação "Assumir Chamado"', 'Ao clicar em "Assumir Chamado", o técnico é registrado como responsável imediato pelo atendimento e o status avança automaticamente para "Em Andamento".');
drawBullet('4. Escalonamento com Parecer Técnico Obrigatório', 'Se o problema exigir reparo físico de placas, redes ou bancada, o técnico utiliza a ação "Escalonar (N1 / N2 / N3)". O sistema exige o preenchimento do Parecer Técnico (diagnóstico preliminar e motivo da transferência).');
drawBullet('5. Atendimento N2 (Hardware / Bancada)', 'A equipe N2 recebe o chamado em sua fila especializada para intervenção física em componentes e cabeamento.');
drawBullet('6. Atendimento N3 (Infraestrutura Crítica)', 'Casos de queda de links de internet, falhas em servidores centrais, no-breaks industriais ou bancos de dados são transferidos para N3 sob comando do Gestor de Infraestrutura.');
drawBullet('7. Encerramento e Auditoria', 'Ao resolver a falha, o status é alterado para "Resolvido", e o equipamento vinculado retorna ao status "OPERACIONAL" no catálogo patrimonial.');

drawSectionTitle('6', 'Vínculo Direto com o Inventário de Equipamentos');
drawParagraph('A integração entre Ocorrências e Equipamentos soluciona a perda de histórico de manutenções de computadores, mesas de som e projetores:');
drawBullet('Seleção de Equipamento na Abertura', 'O formulário de ocorrência permite selecionar diretamente o bem patrimonial.');
drawBullet('Rastreabilidade Patrimonial', 'Na tela de detalhes da ocorrência e no inventário de equipamentos, é possível consultar o histórico completo de avarias sofridas por aquele patrimônio.');

drawCallout(
  'Auditoria e Transparência Governamental',
  'Todas as alterações de status, assunções de chamados e pareceres de escalonamento gravam registros imutáveis na tabela de auditoria, registrando IP, usuário responsável e horário com precisão de segundos.',
  ACCENT_GREEN
);

// ============================================================================
// PÁGINA 6: AUDITORIA, SEGURANÇA E CONCLUSÃO
// ============================================================================
doc.addPage();
drawHeader('Manual de Governança & Hierarquia — HUB ES+');

drawSectionTitle('7', 'Governança, Trilha de Auditoria e Segurança');

drawParagraph('O HUB ES+ opera sob rigorosas exigências de conformidade para o setor público (Secult / Governo do Estado do Espírito Santo). Todas as operações sensíveis seguem salvaguardas programadas:');

drawBullet('Proteção Anti-Exclusão Física (Soft Delete)', 'Nenhum registro de usuário, ocorrência, insumo ou documento é excluído fisicamente do banco de dados TiDB Cloud. Todas as deleções utilizam deleted_at = NOW() para permitir perícia e recuperação.');
drawBullet('Bloqueio de Auto-Alteração Crítica', 'Nenhum usuário pode alterar o próprio cargo, auto-inativar sua conta ou conceder privilégios a si mesmo.');
drawBullet('Auditoria de Ações de Escrita', 'Toda criação, alteração de status, homologação de cadastro, concessão de permissão adicional ou escalonamento invoca registrarAuditoria(...) gravando os dados anteriores e posteriores.');
drawBullet('Isolamento de Sessão por Aba (sessionStorage)', 'Usuários que trabalham com múltiplas contas de teste em abas simultâneas mantêm suas sessões estritamente isoladas, evitando que um F5 misture credenciais.');

drawSectionTitle('8', 'Quadro Resumo de Responsabilidades dos Gestores');

const gestoresResumo = [
  ['GESTOR_RH', 'Supervisão de pessoal, aprovação de acessos com o Admin, gestão de cargos de RH e concessão de leitura/envio de documentos setoriais.'],
  ['GESTOR_INFRA', 'Comando dos técnicos N1, N2 e N3, gestão do inventário de equipamentos patrimoniais, supervisão de chamados críticos e manutenção.'],
  ['GESTOR_OPERADOR', 'Liderança dos operadores, acompanhamento de comunicados institucionais, validação de reservas de espaço na agenda e rotinas diárias.'],
  ['GESTOR GERAL', 'Supervisão integrada de compras, aprovação de pedidos orçamentários e alinhamento administrativo direto com a Direção Geral.']
];

let gy = doc.y + 5;
gestoresResumo.forEach(([cargo, desc]) => {
  doc.rect(50, gy, 120, 36).fillAndStroke(PRIMARY, '#cbd5e1');
  doc.rect(170, gy, 375, 36).fillAndStroke('#ffffff', '#cbd5e1');

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
     .text(cargo, 55, gy + 12, { width: 110, align: 'center' });

  doc.fontSize(8).font('Helvetica').fillColor(DARK)
     .text(desc, 180, gy + 6, { width: 355, lineGap: 1.5 });

  gy += 42;
});

doc.y = gy + 15;

drawCallout(
  'Homologação Final',
  'Este manual reflete a versão de software implantada no HUB ES+. Quaisquer inclusões de novos módulos ou alterações nas permissões-base devem ser formalmente homologadas pelo Administrador Geral e documentadas neste guia.',
  PRIMARY
);

doc.moveDown(1.5);
doc.fontSize(8).font('Helvetica-Oblique').fillColor(MUTED)
   .text('Documento gerado automaticamente pelo Sistema HUB ES+ • Arquitetura e Engenharia de Software 2026', { align: 'center' });

// ============================================================================
// NUMERAÇÃO DE PÁGINAS EM TODAS AS PÁGINAS
// ============================================================================
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  if (i > 0) { // Não exibe rodapé na capa
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
       .text(
         `Página ${i + 1} de ${range.count} • HUB ES+ / SECULT / SENAI PORTO`,
         50,
         785,
         { align: 'center', width: 495 }
       );
  }
}

doc.end();

writeStream.on('finish', () => {
  console.log(`[PDF] Documento gerado com sucesso em: ${outputPath}`);
});

writeStream.on('error', (err) => {
  console.error('[PDF] Erro ao gerar documento:', err);
});
