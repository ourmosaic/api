import * as fs from 'fs';

export default class Template<TData extends Record<string, string>> {
  content: string;
  requiredFields: readonly (keyof TData)[];

  constructor(path: string, requiredFields: readonly (keyof TData)[] = []) {
    this.content = fs.readFileSync(
      __dirname + '/../../templates/' + path,
      'utf8',
    );
    this.requiredFields = requiredFields;
  }

  render(data: TData): string {
    let renderedContent = this.content;
    for (const field of this.requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${String(field)}`);
      }
    }
    for (const [key, value] of Object.entries(data) as Array<
      [keyof TData, TData[keyof TData]]
    >) {
      const placeholder = `{{${String(key)}}}`;
      renderedContent = renderedContent.replace(
        new RegExp(placeholder, 'g'),
        value,
      );
    }
    return renderedContent;
  }

  getTitle(): string {
    return this.content.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
  }
}
