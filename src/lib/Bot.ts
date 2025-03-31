import { type Logger } from "pino";
import { Context, deunionize, Telegraf } from "telegraf";
import { TitorelliClient } from "@titorelli/client";
import {
  TelemetryClient,
  telegrafMiddleware,
} from "@titorelli/telemetry-client";
import { Update } from "telegraf/typings/core/types/typegram";

export class Bot {
  private logger: Logger;
  private bot: Telegraf<Context<Update>>;
  private titorelli: TitorelliClient;
  private telemetry: TelemetryClient;

  constructor({
    clientId,
    accessToken,
    botToken,
    logger,
    titorelliServiceUrl,
  }: {
    clientId: string;
    accessToken: string;
    botToken: string;
    logger: Logger;
    titorelliServiceUrl: string;
  }) {
    this.logger = logger;
    this.bot = new Telegraf(botToken);

    this.telemetry = new TelemetryClient({
      serviceUrl: titorelliServiceUrl,
    });
    this.titorelli = new TitorelliClient({
      serviceUrl: titorelliServiceUrl,
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

    return this.bot.launch();
  }

  private installExitHandlers() {
    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
  }

  private installBotHandlers() {
    this.installTelemetry();
    this.installMessageHandler();
    this.installChatMemberHandler();
  }

  private installTelemetry() {
    this.bot.use(telegrafMiddleware(this.telemetry));
  }

  private installMessageHandler() {
    this.bot.on("message", async (ctx, next) => {
      const text =
        deunionize(ctx.message).text || deunionize(ctx.message).caption;
      const {
        message_id: messageId,
        from: { id: fromId },
      } = ctx.message;

      if (!text) {
        this.logger.warn("Received empty message from: %s", fromId);

        return next();
      }

      const { value: label, reason } = await this.titorelli.predict({
        text,
        tgUserId: fromId,
      });

      await this.titorelli.duplicate.train({ text, label });

      if (reason === "totem") {
        return next();
      }

      if (reason === "cas") {
        await this.tryDeleteMessage(ctx);
        await this.tryBanChatMember(ctx, fromId);

        return next();
      }

      if (reason === "duplicate") {
        if (label === "spam") {
          await this.tryDeleteMessage(ctx);
          await this.titorelli.cas.train({ tgUserId: fromId });
        }
      }

      if (reason === "classifier") {
        if (label === "ham") {
          await this.titorelli.totems.train({ tgUserId: fromId });

          return next();
        } else if (label === "spam") {
          await this.tryDeleteMessage(ctx);

          return next();
        }
      }
    });
  }

  private installChatMemberHandler() {
    this.bot.on("chat_member", async (ctx, next) => {
      const { new_chat_member: newChatMember } = ctx.chatMember;

      if (newChatMember.status === "member") {
        const { id: tgUserId } = newChatMember.user;

        const { banned } = await this.titorelli.cas.predictCas({
          tgUserId,
        });

        if (banned) {
          await this.tryBanChatMember(ctx, tgUserId);
        }
      }
    });
  }

  private async tryDeleteMessage(ctx: Context<Update>) {
    try {
      await ctx.deleteMessage();
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async tryBanChatMember(ctx: Context<Update>, fromId: number) {
    try {
      await ctx.banChatMember(fromId);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
