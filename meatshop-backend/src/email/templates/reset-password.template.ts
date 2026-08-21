import { EmailTemplate } from '../interfaces/email-template.interface';

export function resetPasswordTemplate(
  userName: string,
  resetUrl: string,
): EmailTemplate {
  return {
    subject: 'Reset your MeatShop password',

    text: `
Hello ${userName},

Reset your password using the link below:

${resetUrl}
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
  <h2>Password Reset 🔒</h2>

  <p>Hello <strong>${userName}</strong>,</p>

  <p>
    We received a request to reset your password.
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
    Reset Password
  </a>

  <p style="margin-top: 24px;">
    If you did not request this,
    please ignore this email.
  </p>
</div>
    `,
  };
}