import { type Logger } from "pino";
import { Bot as GrammyBot, type Context } from "grammy";
import {
  CasClient,
  createClient,
  ModelClient,
  serviceDiscovery,
} from "@titorelli/client";
// import { TelemetryClient, grammyMiddleware } from "@titorelli/telemetry-client";
import { env } from "./env";
import { type Socket } from "socket.io-client";
import { BotManager } from "./BotManager";
import { welcomeMessage } from "./messages";

type BotConfig = {
  clientId: string;
  accessToken: string;
  botToken: string;
  socket?: Socket | null;
  logger: Logger;
};

export class Bot {
  private readonly logger: Logger;
  // private readonly telemetry: TelemetryClient;
  private readonly socket: Socket | null;
  private readonly clientName: string;
  private readonly manager: BotManager;

  constructor({
    clientId,
    accessToken: _accessToken,
    botToken,
    socket,
    logger,
  }: BotConfig) {
    this.logger = logger;
    this.clientName = `titus-${clientId}`;
    this.socket = socket ?? null;
    // this.telemetry = new TelemetryClient({
    //   serviceUrl: env.TELEMETRY_ORIGIN,
    //   clientName: this.clientName,
    //   initialAccessToken: env.INITIAL_ACCESS_TOKEN,
    //   clientStore: clientsStore,
    // });
    this.manager = new BotManager({
      botToken,
      socket,
      logger,
    });
  }

  public async launch() {
    this.manager.on("started", ({ bot }) => {
      if (!bot) {
        this.logger.error("Bot manager started but bot is null");

        return;
      }

      this.installExitHandlers(bot);
      this.installBotHandlers(bot);
    });

    await this.manager.start(this.socket ? "transmitter" : "long-polling");
  }

  private installExitHandlers(bot: GrammyBot) {
    process.once("SIGINT", () => bot.stop());
    process.once("SIGTERM", () => bot.stop());
  }

  private installBotHandlers(bot: GrammyBot) {
    // Disable for now
    // this.installTelemetry();

    this.installStartHandler(bot);
    this.installMessageHandler(bot);
    this.installChatMemberHandler(bot);
    this.installUpdateProcessedHandler(bot);
  }

  // private installTelemetry() {
  //   this.bot.use(grammyMiddleware(this.telemetry));
  // }

  private installStartHandler(bot: GrammyBot) {
    bot.command("start", async (ctx, next) => {
      if (ctx.message?.chat.type !== "private") return next();

      await ctx.api.sendMessage(
        ctx.chat.id,
        welcomeMessage.render({
          siteUrl: "https://next.titorelli.ru",
        }),
      );
    });
  }

  private installMessageHandler(bot: GrammyBot) {
    bot.on("message", async (ctx, next) => {
      const text = ctx.message.text ?? ctx.message.caption;

      if (!text) {
        this.logger.warn(
          "Received empty message from: %s",
          ctx.message.from.id,
        );

        return next();
      }

      const cas = await this.getCasClient();

      const { banned, reason: casReason } = await cas.isBanned(
        ctx.message.from.id,
      );

      if (banned) {
        await this.tryDeleteMessage(ctx);
        await this.tryBanChatMember(ctx);

        this.logger.info("User banned because failed CAS check");

        return next();
      } else if (casReason === "totem") {
        this.logger.info("User passed because has totem");

        return next();
      }

      const model = await this.getModelClient();

      const { label, reason } = await model.predict({ text });

      this.logger.info({ label, reason }, "Classification result:");

      switch (reason) {
        case "totem":
          this.logger.info("User passed because has totem");

          return next();
        case "cas":
          if (label === "spam") {
            await this.tryDeleteMessage(ctx);
            await this.tryBanChatMember(ctx);

            this.logger.info("User banned because of CAS");

            return next();
          } else if (label === "ham") {
            this.logger.info("User passed CAS check");
          }
        case "duplicate":
          if (label === "spam") {
            await this.tryDeleteMessage(ctx);

            this.logger.info("User failed duplicate check, message deleted");

            return next();
          } else if (label === "ham") {
            await cas.protect(ctx.message.from.id);

            this.logger.info("User passed duplicate check, totem granted");

            return next();
          }
        case "classifier":
          switch (label) {
            case "spam":
              await this.tryDeleteMessage(ctx);

              this.logger.info("User failed classifier check, message deleted");

              return next();
            case "ham":
              await cas.protect(ctx.message.from.id);

              this.logger.info(
                "User passed classifier check, message preserved",
              );

              return next();
          }
      }

      return next();
    });
  }

  private installChatMemberHandler(bot: GrammyBot) {
    bot.on("chat_member", async (ctx, next) => {
      const { new_chat_member: newChatMember } = ctx.chatMember;

      if (newChatMember.status === "member") {
        const { id: tgUserId } = newChatMember.user;

        const cas = await this.getCasClient();

        const { banned } = await cas.isBanned(tgUserId);

        if (banned) {
          await this.tryBanChatMember(ctx);

          this.logger.info("User failed CAS check on entrerance, banned");
        }
      }

      return next();
    });
  }

  private installUpdateProcessedHandler(bot: GrammyBot) {
    if (this.manager.getRunType() === "transmitter") {
      return;
    }

    bot.use(async (ctx, next) => {
      if (ctx.update.update_id) {
        this.socket?.emit("update-processed", ctx.update.update_id);
      }

      return next();
    });
  }

  private async tryDeleteMessage(ctx: Context) {
    try {
      await ctx.deleteMessage();
    } catch (e) {
      this.logger.error(e, "Error when deleting message");
    }
  }

  private async tryBanChatMember(ctx: Context) {
    try {
      await ctx.banAuthor();
    } catch (e) {
      this.logger.error(e, "Error when ban chat member");
    }
  }

  private _modelClient: ModelClient | null = null;
  private async getModelClient() {
    if (this._modelClient) return this._modelClient;

    const { modelOrigin } = await serviceDiscovery("next.titorelli.ru");

    const model = await createClient("model", {
      baseUrl: modelOrigin,
      auth: {
        accessToken: env.TITORELLI_ACCESS_TOKEN,
      },
      logger: this.logger,
    });

    this._modelClient = model;

    return model;
  }

  private _casClient: CasClient | null = null;
  private async getCasClient() {
    if (this._casClient) return this._casClient;

    const { casOrigin } = await serviceDiscovery("next.titorelli.ru");

    const cas = await createClient("cas", {
      baseUrl: casOrigin,
      auth: {
        accessToken: env.TITORELLI_ACCESS_TOKEN,
      },
      logger: this.logger,
    });

    this._casClient = cas;

    return cas;
  }
}
