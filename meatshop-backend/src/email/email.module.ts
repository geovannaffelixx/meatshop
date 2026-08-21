import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { MailerModule } from '@nestjs-modules/mailer';

import { EmailService } from './email.service';

@Module({
  imports: [
    ConfigModule,

    MailerModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => ({
        transport: {
          host:
            configService.get<string>(
              'MAIL_HOST',
            ),

          port:
            Number(
              configService.get<string>(
                'MAIL_PORT',
              ),
            ) || 2525,

          auth: {
            user:
              configService.get<string>(
                'MAIL_USER',
              ),

            pass:
              configService.get<string>(
                'MAIL_PASSWORD',
              ),
          },
        },

        defaults: {
          from:
            configService.get<string>(
              'MAIL_FROM',
            ),
        },
      }),
    }),
  ],

  providers: [EmailService],

  exports: [EmailService],
})
export class EmailModule {}