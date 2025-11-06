import { logger } from "@titorelli/client";
import { io } from "socket.io-client";
import { env } from "./env";
import { simpleEncrypt } from "@titorelli-org/shared-simple-crypto";

export const createTransmitterSocket = () => {
  if (!env.FEAT_TRANSMITTER) {
    return null;
  }

  if (!env.TRANSMITTER_ORIGIN) {
    logger.warn(
      "FEAT_TRANSMITTER is enabled but TRANSMITTER_ORIGIN is not set, skipping transmitter socket creation",
    );

    return null;
  }

  const socket = io(env.TRANSMITTER_ORIGIN, {
    auth: {
      botId: env.TITORELLI_CLIENT_ID,
      accessToken: env.TITORELLI_ACCESS_TOKEN,
      botTokenEncrypted: simpleEncrypt<string>(env.BOT_TOKEN),
    },
  });

  socket.on("connect", () => {
    logger.info("Transmitter connected");
  });

  socket.on("disconnect", () => {
    logger.info("Transmitter disconnected");
  });

  socket.on("error", (error) => {
    logger.error(error, "Transmitter error");
  });

  socket.on("message", (message) => {
    logger.info(message, "Transmitter message");
  });

  socket.on("update", (update) => {
    logger.info(update, "Transmitter update");
  });

  return socket;
};
