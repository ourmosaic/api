import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import DataExportTemplate from '../templates/dataExport.template';
import { randomUUID } from 'crypto';
import RegisterTemplate from '../templates/register.template';

@Injectable()
export class MailService {
  private logger: Logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    if (!this.configService.get<string>('SMTP_HOST')) {
      throw new Error('SMTP_HOST is not defined in environment variables');
    }
    if (!this.configService.get<number>('SMTP_PORT')) {
      throw new Error('SMTP_PORT is not defined in environment variables');
    }
    if (!this.configService.get<boolean>('SMTP_SECURE')) {
      throw new Error('SMTP_SECURE is not defined in environment variables');
    }
    if (!this.configService.get<string>('SMTP_USER')) {
      throw new Error('SMTP_USER is not defined in environment variables');
    }
    if (!this.configService.get<string>('SMTP_PASSWORD')) {
      throw new Error('SMTP_PASSWORD is not defined in environment variables');
    }

    this.testConnection()
      .then(() => {
        this.logger.log('SMTP connection successful');
      })
      .catch((error) => {
        this.logger.error('Failed to connect to SMTP server:', error);
      });
  }

  testConnection() {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
    return transporter.verify();
  }

  async sendMail(to: string, subject: string, html: string, attachments?: any[]) {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
    await transporter.sendMail({
      from: `"${this.configService.get<string>('SMTP_FROM_NAME')}" <${this.configService.get<string>('SMTP_FROM_ADDRESS')}>`,
      to,
      html,
      subject,
      attachments,
    });
  }
}
