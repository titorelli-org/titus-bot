import { io } from "socket.io-client";
import { env, logger, Bot, Liveness } from "./lib";

const socket = env.FEAT_TRANSMITTER
  ? io(env.TRANSMITTER_ORIGIN, {
      auth: {
        botId: env.TITORELLI_CLIENT_ID,
        accessToken: env.TITORELLI_ACCESS_TOKEN,
        botTokenEncrypted: env.BOT_TOKEN,
      },
    })
  : null;

const bot = new Bot({
  socket,
  clientId: env.TITORELLI_CLIENT_ID,
  accessToken: env.TITORELLI_ACCESS_TOKEN,
  botToken: env.BOT_TOKEN,
  logger: logger.child({ module: "bot" }),
});

// const liveness = new Liveness(
//   env.TITORELLI_CLIENT_ID,
//   20 * 1000 /* 20 seconds */,
//   env.TITORELLI_HOST,
//   logger.child({ module: "liveness" }),
// );

// liveness.startReporting();

bot
  .launch()
  .catch(() => process.exit(1))
  .then(() => process.exit(0));
