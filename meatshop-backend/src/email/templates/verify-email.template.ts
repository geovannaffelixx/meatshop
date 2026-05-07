import { EmailTemplate } from '../interfaces/email-template.interface';

export function verifyEmailTemplate(
  userName: string,
  verificationUrl: string,
): EmailTemplate {
  return {
    subject: 'Verify your MeatShop account',

    text: `
Hello ${userName},

Please verify your account using the link below:

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
  <h2>Welcome to MeatShop 🥩</h2>

  <p>Hello <strong>${userName}</strong>,</p>

  <p>
    Thank you for creating your account.
  </p>

  <p>
    Please confirm your email address by clicking the button below.
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
    Verify Email
  </a>

  <p style="margin-top: 24px;">
    If you did not create this account,
    please ignore this email.
  </p>
</div>
    `,
  };
}