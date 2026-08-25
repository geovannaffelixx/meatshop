import { EmailTemplate } from '../interfaces/email-template.interface';

export function verifyEmailTemplate(
  userName: string,
  verificationUrl: string,
): EmailTemplate {
  return {
    subject: 'Confirme sua conta MeatShop',

    text: `
Olá ${userName},

Confirme sua conta usando o link abaixo:

${verificationUrl}
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
  <h2>Bem-vindo ao MeatShop 🥩</h2>

  <p>Olá <strong>${userName}</strong>,</p>

  <p>
    Obrigado por criar sua conta.
  </p>

  <p>
    Confirme seu e-mail clicando no botão abaixo.
  </p>

  <a
    href="${verificationUrl}"
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
    Confirmar e-mail
  </a>

  <p style="margin-top: 24px;">
    Se você não criou esta conta,
    basta ignorar este e-mail.
  </p>
</div>
    `,
  };
}
