import path from "path";
import { readFileSync } from "fs";

export class OutgoingMessageTemplate<
  Params extends Record<string, unknown> = {},
> {
  private readonly template?: string;

  public static fromFile<Params extends Record<string, unknown> = {}>(
    filename: string,
  ) {
    if (filename.endsWith(".html")) {
      return OutgoingMessageTemplate.fromHtmlFile<Params>(filename);
    } else if (filename.endsWith(".md")) {
      return OutgoingMessageTemplate.fromMarkdownFile<Params>(filename);
    }

    throw new Error(`Unsupported file extension: ${filename}`);
  }

  private static fromHtmlFile<Params extends Record<string, unknown> = {}>(
    filename: string,
  ) {
    const fullPath = path.join(__dirname, "templates", filename);
    const html = readFileSync(fullPath, "utf8");

    return class BoundOutgoingMessageTemplate extends OutgoingMessageTemplate<Params> {
      constructor() {
        super({ template: html });
      }
    };
  }

  private static fromMarkdownFile<Params extends Record<string, unknown> = {}>(
    filename: string,
  ) {
    const fullPath = path.join(__dirname, "templates", filename);
    const markdown = readFileSync(fullPath, "utf8");

    return class BoundOutgoingMessageTemplate extends OutgoingMessageTemplate<Params> {
      constructor() {
        super({ template: markdown });
      }
    };
  }

  constructor({ template }: { template?: string } = {}) {
    this.template = template;
  }

  public render(_params?: Params) {
    return this.template!;
  }
}
