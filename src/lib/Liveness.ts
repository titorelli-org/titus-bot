import { Logger } from "pino";
import { makePoller, type Poller } from "reactive-poller";

export class Liveness {
  private backoffTimeout = 60 * 1000; /* 1 min */
  private poller: Poller<void>;

  constructor(
    private clientId: string,
    private intervalMs: number,
    private titorelliServiceUrl: string,
    private logger: Logger,
  ) {
    this.poller = makePoller({
      dataProvider: this.report,
      interval: this.intervalMs,
      retryInterval: this.backoffTimeout,
      errorHandler: (e) => logger.error(e),
    });
  }

  public startReporting = async () => {
    await this.poller.start();
  };

  public stopReporting = async () => {
    await this.poller.stop();
  };

  private report = async () => {
    const resp = await fetch(
      `${this.titorelliServiceUrl}/bots/liveness?clientId=${this.clientId}`,
      { method: "POST" },
    );

    if (!resp.ok) {
      this.logger.error(
        'Liveness endpoint for bot with client id = "%s" not responding',
        this.clientId,
      );
    }
  };
}
