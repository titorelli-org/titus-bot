import { env, logger, Bot, Liveness } from "./lib";

const bot = new Bot({
  clientId: env.TITORELLI_CLIENT_ID,
  accessToken: env.TITORELLI_ACCESS_TOKEN,
  botToken: env.BOT_TOKEN,
  titorelliServiceUrl: env.TITORELLI_HOST,
  casUrl: env.CAS_URL,
  logger: logger.child({ module: "bot" }),
});

const liveness = new Liveness(
  env.TITORELLI_CLIENT_ID,
  20 * 1000 /* 20 seconds */,
  env.TITORELLI_HOST,
  logger.child({ module: "liveness" }),
);

liveness.startReporting();

bot
  .launch()
  .catch(() => process.exit(1))
  .then(() => process.exit(0));
