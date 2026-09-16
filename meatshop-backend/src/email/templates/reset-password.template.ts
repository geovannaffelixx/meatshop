import type { EmailTemplate } from '../interfaces/email-template.interface';

export function resetPasswordTemplate(userName: string, resetUrl: string): EmailTemplate {
  return {
    subject: 'Password reset - MeatShop',

    text: `
Hello ${userName},

We received a request to reset your password. Use the link below to continue:

${resetUrl}

If you did not request this, ignore this email.
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
  <h2>Password reset</h2>

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
    Reset password
  </a>

  <p style="margin-top: 24px;">
    If you did not request this,
    just ignore this email.
  </p>
</div>
    `,
  };
}
