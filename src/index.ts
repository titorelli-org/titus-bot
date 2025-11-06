import { env, logger, Bot, Liveness } from "./lib";
import { createTransmitterSocket } from "./lib/createTransmitterSocket";

const bot = new Bot({
  socket: createTransmitterSocket(),
  clientId: env.TITORELLI_CLIENT_ID,
  accessToken: env.TITORELLI_ACCESS_TOKEN,
  botToken: env.BOT_TOKEN,
  logger: logger.child({ module: "bot" }),
});

let liveness: Liveness | null = null;

if (env.NODE_ENV === "production") {
  liveness = new Liveness({
    clientId: env.TITORELLI_CLIENT_ID,
    intervalMs: 20 * 1000 /* 20 seconds */,
    titorelliServiceUrl: env.TITORELLI_HOST,
    logger: logger.child({ module: "liveness" }),
  });
}

Promise.all(
  [bot, liveness].map(async (service) => {
    if (service == null) {
      return service;
    }

    await service.start();

    const createStopListener = (exitCode: number) => async () => {
      await service.stop();

      process.exit(exitCode);
    };

    process.once("SIGINT", createStopListener(0));
    process.once("SIGTERM", createStopListener(0));
    process.once("unhandledRejection", createStopListener(1));
    process.once("uncaughtException", createStopListener(1));

    return service;
  }),
).then(([bot, liveness]) => {
  if (bot && liveness) {
    logger.info("Bot and liveness services started");
  }

  if (bot) {
    logger.info("Bot started");
  }

  if (liveness) {
    logger.info("Liveness started");
  }

  return [bot, liveness];
});
