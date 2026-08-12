import Template from './template.class';

export type FarewellTemplateFields = {
  user_name: string;
  instance_name: string;
};

export default class FarewellTemplate extends Template<FarewellTemplateFields> {
  constructor() {
    super('farewell.html', ['user_name', 'instance_name']);
  }

  getTitle(): string {
    return 'Mosaic Account Deletion Confirmation';
  }
}
