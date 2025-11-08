import { cleanEnv, str, url, bool } from "envalid";

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production"],
    default: "development",
  }),
  DRY_RUN: bool({ default: false }),
  BOT_TOKEN: str(),
  TITORELLI_HOST: url(),
  CAS_ORIGIN: url(),
  TELEMETRY_ORIGIN: url(),
  TITORELLI_CLIENT_ID: str(),
  TITORELLI_ACCESS_TOKEN: str(),
  INITIAL_ACCESS_TOKEN: str(),
  TRANSMITTER_ORIGIN: url({ default: "" }),
  // Feature flags:
  FEAT_TRANSMITTER: bool({ default: false }),
});
