import { type Logger } from "pino";
import { Bot as GrammyBot, type Context } from "grammy";
import {
  CasClient,
  createClient,
  ModelClient,
  serviceDiscovery,
  clientsStore,
} from "@titorelli/client";
import { TelemetryClient, grammyMiddleware } from "@titorelli/telemetry-client";
import { env } from "./env";
import { OutgoingMessageTemplate } from "./OutgoingMessageTemplate";

const helloPrivateMessage = new OutgoingMessageTemplate<{
  siteUrl: string;
}>(`
  Добро пожаловать!

  Это бот Титус.

  Он помогает в борьбе против спама в сообествах Telegram.

  Сейчас никаких функций в приватных чатах (таких, как этот) нет, но скоро появятся )

  Если у вас есть группа или канал, можете добавить туда этого бота и назначить его администратором.

  Так же, нужно будет добавить боту права на удаление сообщений.

  Пока на этом все.

  Узнать больше можно тут: {{siteUrl}}
`);

export class Bot {
  private logger: Logger;
  private bot: GrammyBot;
  private telemetry: TelemetryClient;
  private readonly clientName = `titus-${env.TITORELLI_CLIENT_ID}`;

  constructor({
    clientId,
    accessToken,
    botToken,
    logger,
  }: {
    clientId: string;
    accessToken: string;
    botToken: string;
    logger: Logger;
  }) {
    this.logger = logger;
    this.bot = new GrammyBot(botToken);

    this.telemetry = new TelemetryClient({
      serviceUrl: env.TELEMETRY_ORIGIN,
      clientName: this.clientName,
      initialAccessToken: env.INITIAL_ACCESS_TOKEN,
      clientStore: clientsStore,
    });
  }

  public async launch() {
    this.installExitHandlers();
    this.installBotHandlers();

    this.bot.catch((error) => this.logger.error(error));

    return this.bot.start({
      allowed_updates: [
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
      ],
      onStart: () => {
        this.logger.info("Bot started");
      },
    });
  }

  private installExitHandlers() {
    process.once("SIGINT", () => this.bot.stop());
    process.once("SIGTERM", () => this.bot.stop());
  }

  private installBotHandlers() {
    this.installTelemetry();
    this.installStartHandler();
    this.installMessageHandler();
    this.installChatMemberHandler();
  }

  private installTelemetry() {
    this.bot.use(grammyMiddleware(this.telemetry));
  }

  private installStartHandler() {
    this.bot.command("start", async (ctx, next) => {
      if (ctx.message?.chat.type !== "private") return next();

      await ctx.api.sendMessage(
        ctx.chat.id,
        helloPrivateMessage.render({
          siteUrl: "https://next.titorelli.ru",
        }),
      );
    });
  }

  private installMessageHandler() {
    this.bot.on("message", async (ctx, next) => {
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

    this.bot.on("message", async (ctx, next) => {});
  }

  private installChatMemberHandler() {
    this.bot.on("chat_member", async (ctx, next) => {
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
        clientName: this.clientName,
        initialAccessToken: env.INITIAL_ACCESS_TOKEN,
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
      auth: Object.assign{
        
      }, {accessToken: env.TITORELLI_ACCESS_TOKEN}),
      logger: this.logger,
    });

    this._casClient = cas;

    return cas;
  }
}
