import { cleanEnv, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  TITORELLI_HOST: url(),
  BOT_TOKEN: str(),
  TITORELLI_CLIENT_ID: str(),
  TITORELLI_ACCESS_TOKEN: str(),
});
