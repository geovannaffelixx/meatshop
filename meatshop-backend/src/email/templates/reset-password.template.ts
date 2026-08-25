import { EmailTemplate } from '../interfaces/email-template.interface';

export function resetPasswordTemplate(
  userName: string,
  resetUrl: string,
): EmailTemplate {
  return {
    subject: 'Redefinição de senha - MeatShop',

    text: `
Olá ${userName},

Recebemos uma solicitação para redefinir a sua senha. Use o link abaixo para continuar:

${resetUrl}

Se você não solicitou isso, ignore este e-mail.
    `,

    html: `
<div
  style="
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: auto;
    padding: 24px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
  "
>
  <h2>Redefinição de senha 🔒</h2>

  <p>Olá <strong>${userName}</strong>,</p>

  <p>
    Recebemos uma solicitação para redefinir a sua senha.
  </p>

  <a
    href="${resetUrl}"
    style="
      display: inline-block;
      background: #dc2626;
      color: white;
      padding: 12px 20px;
      text-decoration: none;
      border-radius: 8px;
      margin-top: 16px;
    "
  >
    Redefinir senha
  </a>

  <p style="margin-top: 24px;">
    Se você não solicitou isso,
    basta ignorar este e-mail.
  </p>
</div>
    `,
  };
}
