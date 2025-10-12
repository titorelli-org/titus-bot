import { type UpdateSupplier } from "@grammyjs/runner";
import { type AbortSignal } from "@grammyjs/runner/out/node-shim";
import { type Socket } from "socket.io-client";

export class SocketIoUpdateSupplier<Y> implements UpdateSupplier<Y> {
  private readonly updates: Y[] = [];

  constructor(private readonly socket: Socket) {
    this.socket.on("update", this.onSocketUpdate);
  }

  public supply = async (batchSize: number, signal: AbortSignal) => {
    signal.addEventListener("abort", this.onSignalAbort);

    await new Promise((resolve) => setTimeout(resolve, 200));

    if (Number.isFinite(batchSize)) {
      return this.updates.splice(-batchSize);
    }

    return this.updates.splice(-0);
  };

  private onSocketUpdate = ({ update }: { update: Y }) => {
    this.updates.push(update);
  };

  private onSignalAbort = () => {
    this.socket.off("update", this.onSocketUpdate);
  };
}
