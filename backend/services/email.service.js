const nodemailer = require('nodemailer');

const normalizeSecret = (value = '') => String(value).replace(/\s+/g, '').trim();

const hasMailConfig = () => {
  return Boolean(process.env.MAIL_USER && normalizeSecret(process.env.MAIL_APP_PASSWORD));
};

const getTransporter = () => {
  if (!hasMailConfig()) {
    return null;
  }

  const provider = (process.env.MAIL_PROVIDER || 'gmail').toLowerCase();
  const mailUser = String(process.env.MAIL_USER || '').trim();
  const mailPass = normalizeSecret(process.env.MAIL_APP_PASSWORD);

  if (provider === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: mailUser,
        pass: mailPass
      }
    });
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: mailUser,
      pass: mailPass
    }
  });
};

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('MAIL_USER / MAIL_APP_PASSWORD missing');
  }

  const fromName = process.env.MAIL_FROM_NAME || 'EduFocus';
  const fromAddress = process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER;

  return transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject,
    text,
    html
  });
};

const sendWelcomeEmail = async ({ to, name }) => {
  const subject = 'Welcome to EduFocus - Your account is ready';
  const safeName = name || 'Student';
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard`;

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;background:#08080f;color:#f8fafc;border-radius:18px;overflow:hidden;border:1px solid #24243b;box-shadow:0 30px 70px rgba(0,0,0,.5);">
      <div style="background:radial-gradient(circle at top right,#fde047 0%,#eab308 45%,#a16207 100%);padding:24px 26px;color:#111827;">
        <div style="font-size:12px;letter-spacing:.12em;font-weight:700;opacity:.8;">EDUFOCUS</div>
        <h1 style="margin:6px 0 0 0;font-size:26px;line-height:1.2;">Bienvenue ${safeName}</h1>
        <p style="margin:8px 0 0 0;font-size:14px;opacity:.9;">Votre espace premium est prêt.</p>
      </div>
      <div style="padding:26px;line-height:1.6;">
        <p style="margin:0 0 14px 0;color:#d1d5db;">Votre compte EduFocus a été créé avec succès. Commencez à planifier vos sessions, organiser vos notes et suivre vos objectifs avec une expérience premium.</p>
        <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#facc15,#eab308);color:#111827;text-decoration:none;padding:12px 20px;border-radius:11px;font-weight:800;">Accéder au Dashboard</a>
        <div style="margin-top:22px;padding:12px 14px;border-radius:10px;background:#101022;border:1px solid #2a2a46;color:#a5b4fc;font-size:12px;">Sécurité: Si ce compte n'a pas été créé par vous, changez immédiatement votre mot de passe.</div>
      </div>
    </div>
  `;

  const text = `Welcome to EduFocus, ${safeName}. Your account is ready. Open your dashboard: ${dashboardUrl}`;
  return sendMail({ to, subject, html, text });
};

const sendResetPasswordEmail = async ({ to, name, resetUrl, expiresInMinutes = 15 }) => {
  const subject = 'EduFocus Password Reset Request';
  const safeName = name || 'Student';

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;background:#08080f;color:#f8fafc;border-radius:18px;overflow:hidden;border:1px solid #24243b;box-shadow:0 30px 70px rgba(0,0,0,.5);">
      <div style="background:radial-gradient(circle at top right,#6366f1 0%,#4338ca 45%,#312e81 100%);padding:24px 26px;color:#f8fafc;">
        <div style="font-size:12px;letter-spacing:.12em;font-weight:700;opacity:.85;">EDUFOCUS SECURITY</div>
        <h1 style="margin:6px 0 0 0;font-size:25px;line-height:1.2;">Réinitialisation du mot de passe</h1>
        <p style="margin:8px 0 0 0;font-size:14px;opacity:.9;">Demande reçue pour le compte de ${safeName}</p>
      </div>
      <div style="padding:26px;line-height:1.6;">
        <p style="margin:0 0 14px 0;color:#d1d5db;">Cliquez sur le bouton sécurisé ci-dessous pour créer un nouveau mot de passe.</p>
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:11px;font-weight:800;">Réinitialiser mon mot de passe</a>
        <div style="margin-top:16px;color:#9ca3af;font-size:13px;">Ce lien expire dans ${expiresInMinutes} minutes.</div>
        <div style="margin-top:10px;padding:12px 14px;border-radius:10px;background:#101022;border:1px solid #2a2a46;color:#fca5a5;font-size:12px;">Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email et sécurisez votre compte.</div>
      </div>
    </div>
  `;

  const text = `Hello ${safeName}. Reset your password using this secure link: ${resetUrl}. It expires in ${expiresInMinutes} minutes.`;
  return sendMail({ to, subject, html, text });
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail
};
