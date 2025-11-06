import pino from "pino";
import { env } from "./env";

export const logger = pino({
  name: `titus-bot-${env.TITORELLI_CLIENT_ID}`,
});
