import type { Logger } from "pino";
import { makePoller, type Poller } from "reactive-poller";
import type { StartStoppable } from "./types";

export type LivenessConfig = {
  clientId: string;
  intervalMs: number;
  titorelliServiceUrl: string;
  logger: Logger;
};

export class Liveness implements StartStoppable {
  private readonly titorelliServiceUrl: string;
  private readonly backoffTimeout = 60 * 1000; /* 1 min */
  private readonly poller: Poller<void>;
  private readonly clientId: string;
  private readonly logger: Logger;

  constructor({
    clientId,
    intervalMs,
    titorelliServiceUrl,
    logger,
  }: LivenessConfig) {
    this.titorelliServiceUrl = titorelliServiceUrl;
    this.clientId = clientId;
    this.logger = logger;
    this.poller = makePoller({
      dataProvider: this.report,
      interval: intervalMs,
      retryInterval: this.backoffTimeout,
      errorHandler: (e) => logger.error(e),
    });
  }

  public start = async () => {
    await this.poller.start();
  };

  public stop = async () => {
    await this.poller.stop();
  };

  private report = async () => {
    try {
      const url = new URL("/bots/liveness", this.titorelliServiceUrl);

      url.searchParams.set("clientId", this.clientId);

      const resp = await fetch(url, { method: "POST" });

      if (!resp.ok) {
        this.logger.error(
          { clientId: this.clientId },
          "Liveness endpoint not responding",
        );
      }
    } catch (e) {
      this.logger.error(e, "Error when reporting liveness");
    }
  };
}
