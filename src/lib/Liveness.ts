import { Logger } from "pino"

export class Liveness {
  private i?: NodeJS.Timeout
  private backoffTimeout = 60 * 1000 /* 1 min */

  constructor(
    private clientId: string,
    private intervalMs: number,
    private titorelliServiceUrl: string,
    private logger: Logger
  ) { }

  public startReporting = () => {
    this.i = setInterval(this.report, this.intervalMs)
  }

  public stopReporting = () => {
    clearInterval(this.i)

    delete this.i
  }

  private report = async () => {
    const restartReporting = () => {
      this.stopReporting()

      setTimeout(this.startReporting, this.backoffTimeout)
    }

    try {
      const resp = await fetch(`${this.titorelliServiceUrl}/bots/liveness?clientId=${this.clientId}`, { method: 'POST' })

      if (!resp.ok) {
        restartReporting()
      }
    } catch (e) {
      this.logger.error(e)

      restartReporting()
    }
  }
}
