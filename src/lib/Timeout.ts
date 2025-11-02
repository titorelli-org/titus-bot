export class Timeout {
  private timeout: NodeJS.Timeout | null = null;
  public readonly started: boolean = false;
  public readonly stopped: boolean = false;

  constructor(private readonly callback: () => void) {}

  public start(ms: number) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    Reflect.set(this, "started", true);
    Reflect.set(this, "stopped", false);

    this.timeout = setTimeout(this.callback, ms);

    return this;
  }

  public stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    Reflect.set(this, "stopped", true);
    Reflect.set(this, "started", false);

    return this;
  }
}
