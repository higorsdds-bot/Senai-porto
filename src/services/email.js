/**
 * HUB ES+ - Serviço de Envio de E-mails e Gestão de Notificações
 * 
 * Responsabilidades:
 * 1. Notificação por e-mail ao Administrador Geral sobre novas solicitações de cadastro.
 * 2. Envio de e-mail ao novo usuário com link seguro e de uso único para ativação de conta e definição de senha.
 * 3. Envio de e-mail ao solicitante em caso de rejeição, com motivo quando informado.
 * 4. Proteção contra envio excessivo (rate limiting de e-mails).
 * 5. Geração de tokens de alta entropia (SHA-256) com tempo de expiração e uso único.
 * 6. Fallback resiliente em ambiente de desenvolvimento (simulação com log no console se SMTP não estiver configurado).
 */
const crypto = require('crypto');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  // Nodemailer será instalado via npm install, mantemos fallback seguro
}

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const ACTIVATION_TOKEN_EXPIRES_HOURS = parseInt(process.env.ACTIVATION_TOKEN_EXPIRES_HOURS || '24', 10);

// Rate limiting em memória para envio de e-mails (evita inundação / email-bomb)
const emailSendLimit = new Map();
const MAX_EMAILS_PER_HOUR = parseInt(process.env.EMAIL_RATE_LIMIT || '30', 10);

function checkEmailRateLimit(email) {
  const key = String(email).toLowerCase().trim();
  const now = Date.now();
  const entry = emailSendLimit.get(key) || { count: 0, resetAt: now + 60 * 60 * 1000 };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60 * 60 * 1000;
  }

  if (entry.count >= MAX_EMAILS_PER_HOUR) {
    return false;
  }

  entry.count++;
  emailSendLimit.set(key, entry);
  return true;
}

/**
 * Cria ou retorna o transportador de e-mail configurado via variáveis de ambiente (.env).
 */
function getTransporter() {
  if (!nodemailer) return null;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    // Timeouts de 12s para evitar travar requisições se porta SMTP estiver bloqueada
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Extrai nome e e-mail do remetente de forma inteligente.
 * Garante que se o usuário estiver autenticando via Gmail ou Brevo com um email real,
 * o endereço remetente corresponda a essa conta para evitar rejeições SPF/DMARC (ex: 550 5.7.1).
 */
function parseRemetente() {
  // 1. Prioridade máxima: Configuração do Brevo API
  if (process.env.BREVO_API_KEY) {
    const brevoEmail = (
      process.env.BREVO_SENDER_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      ''
    ).trim();

    if (brevoEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brevoEmail) && !brevoEmail.includes('@smtp-brevo.com')) {
      return {
        name: (process.env.BREVO_SENDER_NAME || 'HUB ES+ | SECULT').trim(),
        email: brevoEmail
      };
    }
  }

  // 2. Provedor Resend API
  if (process.env.RESEND_API_KEY) {
    const resendEmail = (
      process.env.RESEND_SENDER_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      ''
    ).trim();
    if (resendEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail)) {
      return {
        name: (process.env.RESEND_SENDER_NAME || 'HUB ES+ | SECULT').trim(),
        email: resendEmail
      };
    }
  }

  // 3. Formato explícito "Nome <email>" em EMAIL_FROM ou SMTP_FROM
  const raw = (process.env.EMAIL_FROM || process.env.SMTP_FROM || '').trim();
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<\s*([^>\s]+)\s*>\s*$/);
  if (match) {
    const specifiedEmail = match[2].trim();
    if (!specifiedEmail.includes('notificacoes@secult.es.gov.br') && !specifiedEmail.includes('@smtp-brevo.com')) {
      return { name: match[1].trim() || 'HUB ES+ | SECULT', email: specifiedEmail };
    }
  } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) && !raw.includes('notificacoes@secult.es.gov.br') && !raw.includes('@smtp-brevo.com')) {
    return { name: 'HUB ES+ | SECULT', email: raw };
  }

  // 4. Se houver usuário autenticado no SMTP (somente se não for login técnico @smtp-brevo.com)
  const authUser = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || '').trim();
  if (authUser && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authUser) && !authUser.includes('@smtp-brevo.com')) {
    return { name: 'HUB ES+ | SECULT', email: authUser };
  }

  return {
    name: 'HUB ES+ | SECULT',
    email: 'notificacoes@secult.es.gov.br'
  };
}

/**
 * Envio via API HTTP da Brevo (porta 443 HTTPS).
 * Perfeito para hospedagens como o plano Free do Render que bloqueiam portas SMTP 25/465/587.
 */
async function enviarViaBrevo({ destinatarios, assunto, texto, html }) {
  const remetente = parseRemetente();
  const apiKey = (process.env.BREVO_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('BREVO_API_KEY não está configurada no ambiente do servidor.');
  }

  const payload = {
    sender: remetente,
    to: destinatarios.map(email => ({ email })),
    subject: assunto,
    htmlContent: html,
    textContent: texto
  };

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });

  if (!resp.ok) {
    let corpo = '';
    try {
      const errObj = await resp.json();
      corpo = errObj.message || JSON.stringify(errObj);
    } catch (_) {
      corpo = await resp.text().catch(() => '');
    }
    throw new Error(`Brevo API HTTP ${resp.status}: ${corpo.slice(0, 300)}`);
  }

  const data = await resp.json().catch(() => ({}));
  return data.messageId || null;
}

/**
 * Envio via API HTTP do Resend (porta 443 HTTPS).
 */
async function enviarViaResend({ destinatarios, assunto, texto, html }) {
  const remetente = parseRemetente();
  const fromStr = `${remetente.name} <${remetente.email}>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: fromStr,
      to: destinatarios,
      subject: assunto,
      html: html,
      text: texto
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`Resend API HTTP ${resp.status}: ${corpo.slice(0, 300)}`);
  }
  const data = await resp.json().catch(() => ({}));
  return data.id || null;
}

/**
 * Retorna qual provedor de envio está ativo, para diagnóstico e testes.
 */
function getProvedorEmail() {
  if (process.env.BREVO_API_KEY) return 'BREVO_API';
  if (process.env.RESEND_API_KEY) return 'RESEND_API';
  if (getTransporter()) return 'SMTP';
  return 'SIMULACAO';
}

/**
 * Dispara um e-mail com fallback para exibição no console em ambiente de testes/dev.
 */
async function enviarEmail({ para, assunto, texto, html }) {
  if (!para || (Array.isArray(para) && para.length === 0)) {
    console.warn('[EMAIL] Destinatário não informado. Envio cancelado.');
    return { success: false, message: 'Destinatário não informado.' };
  }

  const destinatarios = (Array.isArray(para) ? para : [para])
    .map(e => String(e).trim())
    .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (!destinatarios.length) {
    console.warn('[EMAIL] Nenhum endereço de e-mail com formato válido informado:', para);
    return { success: false, message: 'E-mail de destino possui formato inválido.' };
  }

  const destinatario = destinatarios.join(', ');

  // Rate limiting de envio
  if (!checkEmailRateLimit(destinatarios[0])) {
    console.warn(`[EMAIL] Rate limit de envio atingido para ${destinatarios[0]}.`);
    return {
      success: false,
      message: 'Limite de e-mails para este endereço atingido nesta hora. Aguarde alguns minutos.'
    };
  }

  const provedor = getProvedorEmail();

  try {
    if (provedor === 'BREVO_API') {
      const messageId = await enviarViaBrevo({ destinatarios, assunto, texto, html });
      console.log(`[EMAIL] ✅ (Brevo API) E-mail "${assunto}" enviado para ${destinatario}. ID: ${messageId}`);
      return { success: true, messageId, provedor };
    }

    if (provedor === 'RESEND_API') {
      const messageId = await enviarViaResend({ destinatarios, assunto, texto, html });
      console.log(`[EMAIL] ✅ (Resend API) E-mail "${assunto}" enviado para ${destinatario}. ID: ${messageId}`);
      return { success: true, messageId, provedor };
    }

    if (provedor === 'SMTP') {
      const remetente = parseRemetente();
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: { name: remetente.name, address: remetente.email },
        to: destinatario,
        subject: assunto,
        text: texto,
        html: html
      });
      console.log(`[EMAIL] ✅ (SMTP) E-mail "${assunto}" enviado para ${destinatario}. ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId, provedor };
    }

    // Modo simulação / desenvolvimento
    logPreviewEmail({ para: destinatario, assunto, texto });
    return { success: true, simulated: true, provedor };
  } catch (err) {
    console.error(`[EMAIL] ❌ Falha (${provedor}) ao enviar "${assunto}" para ${destinatario}: ${err.message}`);
    if (provedor === 'SMTP' && /timeout|ETIMEDOUT|ECONNREFUSED|ESOCKET/i.test(err.message)) {
      console.error('[EMAIL] Dica: o plano Free do Render bloqueia conexões SMTP (25/465/587). Configure BREVO_API_KEY no Render para envio direto via HTTPS.');
    }
    return { success: false, error: err.message, provedor };
  }
}

/**
 * Exibe a prévia formatada no console do servidor (apenas fora de produção).
 */
function logPreviewEmail({ para, assunto, texto }) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[EMAIL] Modo Simulação em Produção: E-mail "${assunto}" para ${para} não possui provedor configurado.`);
  }
  console.log('\n========================= [EMAIL SERVICE • PREVIEW] =========================');
  console.log(`Para:     ${para}`);
  console.log(`Assunto:  ${assunto}`);
  console.log('-----------------------------------------------------------------------------');
  console.log(texto);
  console.log('=============================================================================\n');
}
/**
 * Gera um token seguro de ativação com alta entropia (32 bytes / 256 bits)
 * e calcula seu hash SHA-256 para persistência segura no banco.
 */
function gerarTokenAtivacao() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

/**
 * Gera o hash SHA-256 de um token fornecido para comparação segura com o banco.
 */
function gerarHashToken(token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Template base HTML institucional para o HUB ES+ / Governo do Estado do Espírito Santo
 */
function aplicarTemplateBaseHtml({ titulo, conteudoHtml, rodapeInfo = '' }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 40px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%);
      padding: 32px 30px;
      text-align: center;
      color: #ffffff;
    }
    .logo-badge {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      background-color: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 14px;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 4px 0 0;
      font-size: 12px;
      opacity: 0.9;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
      margin: 20px 0;
    }
    .btn-danger {
      background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
      box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);
    }
    .info-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 13px;
    }
    .info-card p {
      margin: 6px 0;
    }
    .security-notice {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 0 10px 10px 0;
      padding: 14px 16px;
      font-size: 12px;
      color: #1e40af;
      margin: 24px 0 10px;
    }
    .warning-notice {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 0 10px 10px 0;
      padding: 14px 16px;
      font-size: 12px;
      color: #92400e;
      margin: 24px 0 10px;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 30px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
    }
    .footer p {
      margin: 4px 0;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">ES+</div>
        <h1>HUB ES+ • SECULT</h1>
        <p>Plataforma Administrativa Integrada do Governo do Estado do ES</p>
      </div>
      <div class="content">
        ${conteudoHtml}
      </div>
      <div class="footer">
        <p><strong>HUB ES+</strong> — Centro de Inovação e Criatividade</p>
        <p>Secretaria da Cultura (SECULT) • Governo do Estado do Espírito Santo em parceria com o SENAI</p>
        ${rodapeInfo ? `<p style="margin-top:8px;">${rodapeInfo}</p>` : ''}
        <p style="margin-top: 12px; font-size: 10px; color: #94a3b8;">
          Esta é uma notificação automática gerada pelo sistema. Não responda diretamente a este e-mail.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 1. Notifica o Administrador Geral sobre nova solicitação de cadastro aguardando análise.
 */
async function notificarNovoCadastroAdmin({ adminEmails, usuarioNome, usuarioEmail, solicitacaoId, origem = 'Tela de Login' }) {
  const painelUrl = `${APP_URL}/#auditoria`;
  const dataFormatada = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const texto = `
HUB ES+ • Notificação Administrativa

Prezado(a) Administrador(a) Geral,

Existe uma nova solicitação de cadastro aguardando análise no sistema HUB ES+.

Dados do Solicitante:
- Nome: ${usuarioNome}
- E-mail: ${usuarioEmail}
- Origem: ${origem}
- Data/Hora: ${dataFormatada}
- ID da Solicitação: #${solicitacaoId}

Para aprovar, editar ou rejeitar esta solicitação, acesse o painel de Auditoria & Governança no link abaixo:
${painelUrl}

HUB ES+ • Segurança e Governança Integrada
  `.trim();

  const conteudoHtml = `
    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0;">Novo Cadastro Aguardando Análise</h2>
    <p style="font-size: 14px; color: #334155;">
      Informamos que um novo pedido de acesso ao sistema foi registrado e aguarda sua validação administrativa.
    </p>

    <div class="info-card">
      <p><strong>Solicitante:</strong> ${usuarioNome}</p>
      <p><strong>E-mail:</strong> ${usuarioEmail}</p>
      <p><strong>Origem:</strong> ${origem}</p>
      <p><strong>Data da Solicitação:</strong> ${dataFormatada}</p>
      <p><strong>ID da Solicitação:</strong> #${solicitacaoId}</p>
    </div>

    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${painelUrl}" class="btn">Analisar Solicitação no Painel</a>
    </div>

    <div class="security-notice">
      <strong>Regra de Governança:</strong> Somente usuários com privilégios de Administrador Geral podem aprovar atribuição de perfil e liberação de acesso.
    </div>
  `;

  const html = aplicarTemplateBaseHtml({
    titulo: 'HUB ES+ • Novo Cadastro Aguardando Análise',
    conteudoHtml
  });

  return enviarEmail({
    para: adminEmails,
    assunto: `[HUB ES+] Nova Solicitação de Cadastro Aguardando Análise (${usuarioNome})`,
    texto,
    html
  });
}

/**
 * 2. Envia e-mail ao novo usuário com link seguro de ativação e definição de senha.
 * REGRA CRÍTICA: Não envia senhas provisórias nem definitivas em texto pelo e-mail.
 */
async function enviarEmailAtivacaoConta({ usuarioNome, usuarioEmail, token, perfil, setorNome }) {
  const ativacaoUrl = `${APP_URL}/#ativar-conta?token=${encodeURIComponent(token)}`;

  const texto = `
HUB ES+ • Ativação de Conta de Acesso

Olá, ${usuarioNome}!

Sua solicitação de cadastro na plataforma integrada HUB ES+ foi APROVADA pelo Administrador Geral.

Para concluir a ativação da sua conta e definir sua própria senha de acesso de forma segura, utilize o link exclusivo abaixo:
${ativacaoUrl}

INFORMAÇÕES IMPORTANTES DE SEGURANÇA:
- Este link é de USO ÚNICO e deixará de funcionar imediatamente após sua utilização.
- Este link possui validade de ${ACTIVATION_TOKEN_EXPIRES_HOURS} horas.
- Nenhuma senha foi gerada ou enviada por e-mail: você definirá sua senha pessoal diretamente pelo link acima.
- Caso o link expire, solicite uma nova análise à administração.

Perfil Atribuído: ${perfil || 'OPERADOR'}
Setor: ${setorNome || 'Geral / Não atribuído'}

Atenciosamente,
Equipe HUB ES+ • SECULT
  `.trim();

  const conteudoHtml = `
    <div style="display:inline-block; padding: 4px 12px; background-color: #dcfce7; color: #15803d; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;">
      Solicitação Aprovada
    </div>
    <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Bem-vindo(a) ao HUB ES+!</h2>
    <p style="font-size: 14px; color: #334155;">
      Olá, <strong>${usuarioNome}</strong>. Sua solicitação de cadastro foi analisada e aprovada pela administração do centro de inovação <strong>HUB ES+</strong>.
    </p>

    <div class="info-card">
      <p><strong>E-mail de Acesso:</strong> ${usuarioEmail}</p>
      <p><strong>Nível de Acesso (Perfil):</strong> ${perfil || 'OPERADOR'}</p>
      ${setorNome ? `<p><strong>Setor de Lotação:</strong> ${setorNome}</p>` : ''}
    </div>

    <p style="font-size: 14px; color: #334155;">
      Para concluir a ativação e <strong>definir sua própria senha de acesso</strong>, clique no botão seguro abaixo:
    </p>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${ativacaoUrl}" class="btn">Ativar Minha Conta e Criar Senha</a>
    </div>

    <p style="font-size: 12px; color: #64748b; word-break: break-all;">
      Ou copie e cole o seguinte link em seu navegador:<br>
      <a href="${ativacaoUrl}" style="color: #2563eb;">${ativacaoUrl}</a>
    </p>

    <div class="warning-notice">
      <strong>Avisos Cruciais de Segurança:</strong>
      <ul style="margin: 6px 0 0; padding-left: 18px;">
        <li>Este link é de <strong>uso único</strong> e expira em <strong>${ACTIVATION_TOKEN_EXPIRES_HOURS} horas</strong>.</li>
        <li>Por razões de segurança, <strong>não enviamos senhas por e-mail</strong>. Você criará sua própria senha confidencial.</li>
        <li>Nunca compartilhe este link com terceiros.</li>
      </ul>
    </div>
  `;

  const html = aplicarTemplateBaseHtml({
    titulo: 'HUB ES+ • Ativação de Conta e Definição de Senha',
    conteudoHtml
  });

  return enviarEmail({
    para: usuarioEmail,
    assunto: '[HUB ES+] Solicitação Aprovada - Ative sua Conta e Defina sua Senha',
    texto,
    html
  });
}

/**
 * 3. Notifica o solicitante sobre a rejeição da solicitação de cadastro.
 */
async function enviarEmailRejeicaoCadastro({ usuarioNome, usuarioEmail, motivo }) {
  const texto = `
HUB ES+ • Comunicado sobre Solicitação de Cadastro

Olá, ${usuarioNome}.

Informamos que sua solicitação de cadastro para acesso à plataforma HUB ES+ foi analisada e NÃO foi aprovada pela administração neste momento.

${motivo ? `Motivo informado:\n${motivo}\n` : ''}
Por razões de segurança, o acesso a esta conta não está habilitado.

Caso considere que houve um engano ou precise de esclarecimentos adicionais, entre em contato com a equipe de gestão da SECULT / HUB ES+.

Atenciosamente,
Administração HUB ES+ • SECULT
  `.trim();

  const conteudoHtml = `
    <div style="display:inline-block; padding: 4px 12px; background-color: #ffe4e6; color: #be123c; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;">
      Solicitação Recusada
    </div>
    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0;">Atualização sobre seu Pedido de Acesso</h2>
    <p style="font-size: 14px; color: #334155;">
      Olá, <strong>${usuarioNome}</strong>. Comunicamos que sua solicitação de cadastro para acesso ao sistema integrado <strong>HUB ES+</strong> foi analisada e não foi aprovada neste momento.
    </p>

    ${motivo ? `
    <div class="info-card" style="border-left: 4px solid #f43f5e;">
      <p style="margin: 0; font-weight: 700; color: #9f1239;">Motivo da Decisão:</p>
      <p style="margin: 6px 0 0; color: #475569; font-style: italic;">"${motivo}"</p>
    </div>` : ''}

    <p style="font-size: 13px; color: #64748b;">
      O acesso para as credenciais solicitadas permanece restrito. Se você necessita de acesso às dependências ou aos serviços públicos do centro, é possível continuar utilizando as áreas públicas de consulta de eventos e comunicados.
    </p>
  `;

  const html = aplicarTemplateBaseHtml({
    titulo: 'HUB ES+ • Solicitação de Cadastro Recusada',
    conteudoHtml
  });

  return enviarEmail({
    para: usuarioEmail,
    assunto: '[HUB ES+] Atualização sobre sua Solicitação de Cadastro',
    texto,
    html
  });
}

/**
 * Consulta a lista de e-mails de todos os administradores gerais ativos no banco de dados.
 * Valida o formato estritamente para não enviar a endereços inválidos (como fallbacks sem domínio).
 */
async function buscarEmailsAdministradoresGerais(pool) {
  const emails = [];

  try {
    const [rows] = await pool.query(
      `SELECT email, nome FROM usuarios
       WHERE perfil IN ('ADMIN', 'ADMINISTRADOR')
         AND status = 'ATIVO'
         AND deleted_at IS NULL`
    );

    const validFromDb = rows
      .map(r => (r.email || '').trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !e.includes('@smtp-brevo.com'));

    emails.push(...validFromDb);
  } catch (err) {
    console.error('[EMAIL] Erro ao buscar e-mails dos administradores:', err.message);
  }

  // Fallback e complementos com e-mails reais do administrador do sistema
  const defaultNotify = (process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_DEFAULT_EMAIL || '').trim().toLowerCase();
  if (defaultNotify && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(defaultNotify) && !emails.includes(defaultNotify)) {
    emails.push(defaultNotify);
  }

  // O e-mail configurado no Brevo (ex: higor.sdds@gmail.com) é o canal real do administrador
  const brevoSender = (process.env.BREVO_SENDER_EMAIL || '').trim().toLowerCase();
  if (brevoSender && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brevoSender) && !emails.includes(brevoSender)) {
    emails.push(brevoSender);
  }

  const smtpFrom = (process.env.SMTP_FROM || '').trim().toLowerCase();
  if (smtpFrom && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpFrom) && !smtpFrom.includes('@smtp-brevo.com') && !emails.includes(smtpFrom)) {
    emails.push(smtpFrom);
  }

  const smtpUser = (process.env.SMTP_USER || '').trim().toLowerCase();
  if (smtpUser && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpUser) && !smtpUser.includes('@smtp-brevo.com') && !emails.includes(smtpUser)) {
    emails.push(smtpUser);
  }

  // Remove duplicados e exclui dummy secult se houver e-mails externos configurados
  const distinct = [...new Set(emails)];
  const externalEmails = distinct.filter(e => !e.endsWith('@secult.es.gov.br'));

  return externalEmails.length > 0 ? externalEmails : distinct;
}

/**
 * Envia e-mail de boas-vindas com credenciais geradas pelo Administrador Geral
 */
async function enviarEmailCredenciaisCriacaoDireta({
  usuarioNome,
  usuarioEmail,
  senhaProvisoria,
  perfil,
  setorNome,
  criadoPorNome
}) {
  const dest = (usuarioEmail || '').trim();
  if (!dest || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)) {
    return { success: false, error: 'E-mail de destinatário inválido.' };
  }

  const loginUrl = `${APP_URL}/`;
  const dataFormatada = new Date().toLocaleString('pt-BR');

  const assunto = `[HUB ES+] Acesso Liberado — Suas Credenciais de Entrada`;

  const texto = `Olá, ${usuarioNome}!\n\n` +
    `Sua conta no HUB ES+ (SECULT / SENAI) foi criada diretamente pela administração (${criadoPorNome || 'Administrador Geral'}).\n\n` +
    `Seguem as suas credenciais de acesso institucional:\n` +
    `- E-mail: ${dest}\n` +
    `- Senha Provisória: ${senhaProvisoria}\n` +
    `- Perfil / Cargo: ${perfil || 'OPERADOR'}\n` +
    (setorNome ? `- Setor: ${setorNome}\n` : '') +
    `\nAcesse a plataforma no link abaixo e efetue o seu primeiro login:\n` +
    `${loginUrl}\n\n` +
    `Por motivos de segurança corporativa, você pode alterar sua senha no primeiro acesso utilizando a opção 'Alterar Minha Senha' disponível no menu do seu perfil.\n\n` +
    `Atenciosamente,\nEquipe de Gestão e Tecnologia HUB ES+`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Credenciais de Acesso HUB ES+</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
        <tr>
          <td style="background: linear-gradient(135deg, #0a192f 0%, #004d99 100%); padding: 32px 28px; text-align: center;">
            <div style="background: rgba(255, 255, 255, 0.15); display: inline-block; padding: 6px 14px; border-radius: 100px; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
              Plataforma Integrada
            </div>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
              HUB ES+ • SECULT & SENAI
            </h1>
            <p style="color: #93c5fd; font-size: 13px; margin: 6px 0 0;">
              Bem-vindo(a) à plataforma corporativa!
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px;">
            <p style="font-size: 14px; color: #1e293b; margin: 0 0 16px;">
              Olá, <strong>${usuarioNome}</strong>!
            </p>
            <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
              A sua conta foi cadastrada diretamente pela administração (<strong>${criadoPorNome || 'Administrador Geral'}</strong>). Abaixo estão suas credenciais institucionais para acesso:
            </p>

            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 16px;">
                  <div style="margin-bottom: 10px;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block;">E-mail de Login</span>
                    <strong style="font-size: 13px; color: #0f172a; font-family: monospace;">${dest}</strong>
                  </div>
                  <div style="margin-bottom: 10px;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block;">Senha Provisória</span>
                    <strong style="font-size: 15px; color: #0284c7; font-family: monospace; letter-spacing: 1px;">${senhaProvisoria}</strong>
                  </div>
                  <div style="margin-bottom: 6px;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block;">Cargo / Perfil</span>
                    <span style="font-size: 12px; color: #1e293b; font-weight: 700;">${perfil || 'OPERADOR'}</span>
                    ${setorNome ? `<span style="font-size: 12px; color: #64748b;"> • Setor: ${setorNome}</span>` : ''}
                  </div>
                </td>
              </tr>
            </table>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${loginUrl}" target="_blank" style="background: linear-gradient(135deg, #0066cc 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(0, 102, 204, 0.3);">
                Acessar Plataforma &rarr;
              </a>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 10px 10px 0; margin-top: 20px;">
              <p style="font-size: 12px; color: #1e40af; margin: 0; line-height: 1.5;">
                🔒 <strong>Segurança recomendada:</strong> Por política de conformidade, altere sua senha no primeiro acesso através do menu superior com seu nome clicando em <em>Alterar Minha Senha</em>.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 28px; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">
              Mensagem automática enviada pelo sistema HUB ES+ em ${dataFormatada}.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await enviarEmail({
    para: dest,
    assunto,
    texto,
    html
  });
}

module.exports = {
  enviarEmail,
  getProvedorEmail,
  parseRemetente,
  gerarTokenAtivacao,
  gerarHashToken,
  notificarNovoCadastroAdmin,
  enviarEmailAtivacaoConta,
  enviarEmailRejeicaoCadastro,
  enviarEmailCredenciaisCriacaoDireta,
  buscarEmailsAdministradoresGerais,
  ACTIVATION_TOKEN_EXPIRES_HOURS
};

