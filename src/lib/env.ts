import { cleanEnv, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  BOT_TOKEN: str(),
  TITORELLI_HOST: url(),
  CAS_ORIGIN: url(),
  TELEMETRY_ORIGIN: url(),
  TITORELLI_CLIENT_ID: str(),
  TITORELLI_ACCESS_TOKEN: str(),
  INITIAL_ACCESS_TOKEN: str(),
});
