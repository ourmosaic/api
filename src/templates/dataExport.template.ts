import Template from './template.class';

export type DataExportTemplateFields = {
  user_name: string;
  instance_name: string;
};

export default class DataExportTemplate extends Template<DataExportTemplateFields> {
  constructor() {
    super('data-export.html', ['user_name', 'instance_name']);
  }

  getTitle(): string {
    return 'Your Mosaic Data Export';
  }
}
