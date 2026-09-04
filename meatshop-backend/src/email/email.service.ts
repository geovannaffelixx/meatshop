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
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: Number(this.configService.get<string>('MAIL_PORT')) || 2525,
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      requireTLS: this.configService.get<string>('NODE_ENV') === 'production',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
    this.from = this.configService.get<string>('MAIL_FROM', 'MeatShop <no-reply@meatshop.local>');
  }

  async sendEmail(data: SendEmailData): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: data.to,

      subject: data.subject,

      html: data.html,

      text: data.text,
    });
  }
}
