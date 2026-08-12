import Template from './template.class';

export type DataExportTemplateFields = {
  user_name: string;
  instance_name: string;
  download_link: string;
  expiration_time: string;
};

export default class DataExportTemplate extends Template<DataExportTemplateFields> {
  constructor() {
    super('data-export.html', [
      'user_name',
      'instance_name',
      'download_link',
      'expiration_time',
    ]);
  }

  getTitle(): string {
    return 'Your Mosaic Data Export';
  }
}
