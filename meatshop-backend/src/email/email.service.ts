import { Injectable } from '@nestjs/common';

import { MailerService } from '@nestjs-modules/mailer';

interface SendEmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
  ) {}

  async sendEmail(
    data: SendEmailData,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: data.to,

      subject: data.subject,

      html: data.html,

      text: data.text,
    });
  }
}