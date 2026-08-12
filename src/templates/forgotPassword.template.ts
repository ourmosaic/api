import Template from './template.class';

export type ForgotPasswordTemplateFields = {
  user_name: string;
  instance_name: string;
  expiration_time: string;
  reset_link: string;
};

export default class ForgotPasswordTemplate extends Template<ForgotPasswordTemplateFields> {
  constructor() {
    super('forgot-password.html', [
      'user_name',
      'instance_name',
      'expiration_time',
      'reset_link',
    ]);
  }

  getTitle(): string {
    return 'Your Mosaic Password Reset Request';
  }
}
