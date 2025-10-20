import type { Logger } from "pino";
import { createCipheriv } from "crypto";

export class BotTokenEncryptor {
  private readonly tokenEncryptionSecret: Buffer;

  constructor(tokenEncryptionSecret: string, private readonly logger: Logger) {
    this.tokenEncryptionSecret = Buffer.from(tokenEncryptionSecret, "utf-8");
  }

  public encryptBotToken(botId: string, botToken: string): string | null {
    return botToken;
  }

  // public encryptBotToken(botId: string, botToken: string): string | null {
  //   try {
  //     const botIdBuf = Buffer.from(botId, "utf-8");
  //     const botTokenBuf = Buffer.from(botToken, "utf-8");
  //     const iv = Buffer.alloc(12);

  //     botIdBuf.copy(iv, 0, 0, Math.min(botIdBuf.length, 12));

  //     const cipher = createCipheriv(
  //       "aes-256-cbc",
  //       this.tokenEncryptionSecret,
  //       iv,
  //     );

  //     let encrypted = cipher.update(botTokenBuf, undefined, "base64");
  //     encrypted += cipher.final("base64");

  //     return encrypted;
  //   } catch (error) {
  //     this.logger.error(error, "Failed to encrypt bot token");

  //     return null;
  //   }
  // }
}
