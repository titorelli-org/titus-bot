export class OutgoingMessageTemplate<Params extends Record<string, unknown>> {
  constructor(private template: string) {}

  public render(params: Params) {
    let text = this.template
      .trim()
      .split(/\n+/)
      .join("\n")
      .split(/ +/)
      .join(" ")
      .split(" ")
      .map((l) => l.trim())
      .join(" ");

    for (const [name, value] of Object.entries(params)) {
      text = text.replace(`{{${name}}}`, String(value));
    }

    return text;
  }
}
