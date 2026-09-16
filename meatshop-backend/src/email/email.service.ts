import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SendEmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly resendApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const mailHost = this.configService.get<string>('MAIL_HOST');
    this.transporter = mailHost
      ? nodemailer.createTransport({
          host: this.configService.get<string>('MAIL_HOST'),
          port: Number(this.configService.get<string>('MAIL_PORT')) || 2525,
          secure: this.configService.get<string>('MAIL_SECURE') === 'true',
          requireTLS: this.configService.get<string>('NODE_ENV') === 'production',
          auth: {
            user: this.configService.get<string>('MAIL_USER'),
            pass: this.configService.get<string>('MAIL_PASSWORD'),
          },
        })
      : null;
    this.from = this.configService.get<string>(
      'RESEND_FROM',
      this.configService.get<string>('MAIL_FROM', 'MeatShop <no-reply@meatshop.local>'),
    );
  }

  async sendEmail(data: SendEmailData): Promise<void> {
    if (this.resendApiKey) {
      const response = await globalThis.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, ...data }),
      });
      if (!response.ok) throw new Error(`Resend rejected the email (${response.status})`);
      return;
    }
    if (!this.transporter) throw new Error('Email provider is not configured');
    await this.transporter.sendMail({
      from: this.from,
      to: data.to,

      subject: data.subject,

      html: data.html,

      text: data.text,
    });
  }
}
