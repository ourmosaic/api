import Template from './template.class';

export type RegisterTemplateFields = {
  user_name: string;
  instance_name: string;
  activation_link: string;
};

export default class RegisterTemplate extends Template<RegisterTemplateFields> {
  constructor() {
    super('register.html', [
      'user_name',
      'instance_name',
      'activation_link',
    ]);
  }

  getTitle(): string {
    return 'Mosaic Account Registration';
  }
}
