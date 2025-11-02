import type { Socket } from "socket.io-client";
import type { Logger } from "pino";
import type { Update } from "@grammyjs/types";
import { Bot as GrammyBot } from "grammy";
import EventEmitter from "events";
import { Timeout } from "./Timeout";
import { UpdateFilter } from "./UpdateFilter";

export type BotRunType = "long-polling" | "transmitter";

export type BotManagerConfig = {
  botToken: string;
  updateFilter: UpdateFilter;
  socket?: Socket | null;
  logger: Logger;
};

export type BotManagerEventsMap = {
  started: [{ bot: GrammyBot }];
};

export class BotManager extends EventEmitter<BotManagerEventsMap> {
  private runType: BotRunType | null = null;
  private readonly socket: Socket | null;
  private bot: GrammyBot | null = null;
  private botReady: Promise<void> | null = null;
  private readonly botToken: string;
  private readonly updateFilter: UpdateFilter;
  private readonly logger: Logger;
  private readonly allowedUpdates = [
    "message",
    "edited_message",
    "channel_post",
    "edited_channel_post",
    // 'business_connection',
    // 'business_message',
    // 'edited_business_message',
    // 'deleted_business_messages',
    "message_reaction",
    "message_reaction_count",
    "inline_query",
    "chosen_inline_result",
    "callback_query",
    "shipping_query",
    "pre_checkout_query",
    // 'purchased_paid_media',
    "poll",
    "poll_answer",
    "my_chat_member",
    "chat_member",
    "chat_join_request",
    "chat_boost",
    "removed_chat_boost",
  ];

  constructor({ botToken, socket, updateFilter, logger }: BotManagerConfig) {
    super();

    this.socket = socket ?? null;
    this.botToken = botToken;
    this.updateFilter = updateFilter;
    this.logger = logger;
  }

  public get isRunning() {
    return this.bot?.isRunning() ?? false;
  }

  public async getBot() {
    await this.botReady;

    return this.bot;
  }

  public async start(runType: BotRunType) {
    if (this.isRunning) {
      return null;
    }

    switch (runType) {
      case "long-polling":
        return this.launchLongPolling();
      case "transmitter":
        if (this.socket == null) {
          throw new Error("Socket is required for transmitter");
        }

        return this.launchTransmitter();
      default:
        new Error(`Unknown launch run type: ${runType}`);
    }
  }

  public async restart(kind: BotRunType) {
    this.logger.info("Restarting bot...");

    await this.stop();
    await this.start(kind);

    this.logger.info("Bot restarted");
  }

  public async stop() {
    this.logger.info("Stopping bot...");

    const { bot } = this;

    this.bot = null;
    this.runType = null;

    await bot?.stop();

    this.logger.info("Bot stopped");
  }

  public isRunType(runType: BotRunType) {
    return this.runType === runType;
  }

  private async launchLongPolling() {
    if (this.isRunning) {
      return null;
    }

    this.logger.info("Launching bot in long-polling mode...");

    this.botReady = new Promise(async (resolve, reject) => {
      try {
        this.runType = "long-polling";

        this.bot = await this.createBot();

        await new Promise<void>((resolve, reject) => {
          const timeout = new Timeout(() =>
            reject(new Error("Bot start timeout")),
          ).start(12_000);

          this.bot!.start({
            allowed_updates: this.allowedUpdates as any,
            onStart: () => {
              const aborted = timeout.stopped;

              if (aborted) {
                return;
              }

              timeout.stop();

              this.logger.info("Bot started in long-polling mode");

              resolve();
            },
          });
        });

        resolve();

        this.emit("started", { bot: this.bot });
      } catch (error) {
        this.runType = null;
        this.bot = null;

        this.logger.error(error);

        reject(error);
      }
    });

    return this.botReady;
  }

  private async launchTransmitter() {
    if (this.isRunning) {
      return null;
    }

    this.logger.info("Launching bot in transmitter mode...");

    this.botReady = new Promise(async (resolve, reject) => {
      try {
        this.runType = "transmitter";

        this.bot = await this.createBot();

        const updateListener = (incomingUpdate: Update) => {
          const wasProcessed = this.updateFilter.has(incomingUpdate);

          if (wasProcessed) {
            return;
          }

          this.bot!.handleUpdate(incomingUpdate);
        };

        const reconnectListener = () => {
          this.restart("transmitter");
        };

        const disconnectListener = async () => {
          this.socket!.off("update", updateListener);
          this.socket!.off("disconnect", disconnectListener);
          this.socket!.off("error", disconnectListener);
          this.socket!.once("connect", reconnectListener);

          // TODO: Disable long-polling fallback for now
          // this.restart("long-polling");
          await this.stop();
        };

        this.socket!.on("update", updateListener);

        this.socket!.once("error", disconnectListener);

        this.socket!.once("disconnect", disconnectListener);

        resolve();

        this.logger.info("Bot started in transmitter mode");

        this.emit("started", { bot: this.bot });
      } catch (error) {
        this.runType = null;
        this.bot = null;

        this.logger.error(error);

        reject(error);
      }
    });

    return this.botReady;
  }

  private async createBot() {
    switch (this.runType) {
      case "long-polling":
        return new GrammyBot(this.botToken);
      case "transmitter":
        return new GrammyBot(this.botToken, {
          botInfo: await this.getBotInfo(),
        });
      default:
        throw new Error(`Unknown run type: ${this.runType}`);
    }
  }

  private async getBotInfo() {
    const resp = await fetch(
      `https://api.telegram.org/bot${this.botToken}/getMe`,
    );
    const data = await resp.json();

    return data.result;
  }
}
