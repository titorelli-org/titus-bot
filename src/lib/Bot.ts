import { type Logger } from "pino";
import { Bot as GrammyBot, type Context } from "grammy";
import { TitorelliClient } from "@titorelli/client";
import { TelemetryClient, grammyMiddleware } from "@titorelli/telemetry-client";
import { env } from "./env";

export class Bot {
  private logger: Logger;
  private bot: GrammyBot;
  private titorelli: TitorelliClient;
  private telemetry: TelemetryClient;

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
      serviceUrl: env.CAS_ORIGIN,
    });
    this.titorelli = new TitorelliClient({
      serviceUrl: env.TITORELLI_HOST,
      casUrl: env.CAS_ORIGIN,
      clientId: clientId,
      clientSecret: accessToken,
      modelId: "generic",
      scope: [
        "predict",
        "train",
        "exact_match/train",
        "totems/train",
        "cas/predict",
        "cas/train",
      ],
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
    this.installMessageHandler();
    this.installChatMemberHandler();
  }

  private installTelemetry() {
    this.bot.use(grammyMiddleware(this.telemetry));
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

      const { label, reason } = await this.titorelli.predict({
        text,
        tgUserId: ctx.message.from.id,
      });

      await this.titorelli.duplicate.train({ text, label });

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
          } else {
            await this.titorelli.cas.protect(ctx.message.from.id);

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
              await this.titorelli.cas.protect(ctx.message.from.id);

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

        const { banned } = await this.titorelli.cas.isBanned(tgUserId);

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
}
