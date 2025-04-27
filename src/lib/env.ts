import { cleanEnv, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  BOT_TOKEN: str(),
  TITORELLI_HOST: url(),
  CAS_URL: url(),
  TITORELLI_CLIENT_ID: str(),
  TITORELLI_ACCESS_TOKEN: str(),
});
