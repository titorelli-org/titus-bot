import { env, logger, Bot, Liveness } from "./lib";
import { createTransmitterSocket } from "./lib/createTransmitterSocket";

const bot = new Bot({
  socket: createTransmitterSocket(),
  clientId: env.TITORELLI_CLIENT_ID,
  accessToken: env.TITORELLI_ACCESS_TOKEN,
  botToken: env.BOT_TOKEN,
  logger: logger.child({ module: "bot" }),
});

const liveness = new Liveness(
  env.TITORELLI_CLIENT_ID,
  20 * 1000 /* 20 seconds */,
  env.TITORELLI_HOST,
  logger.child({ module: "liveness" }),
);

liveness.startReporting();

bot.launch();
