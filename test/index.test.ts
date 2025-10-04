import { createClient, serviceDiscovery } from "@titorelli/client";
import { it, assert, describe } from "node:test";
import { env } from "../src/lib/env";

describe("cas-request", async () => {
  await it("should not fail", async ({ assert }) => {
    const { casOrigin } = await serviceDiscovery("http://next.titorelli.ru");
    const casClient = await createClient("cas", {
      baseUrl: casOrigin,
      auth: {
        clientName: "--test-2--",
        initialAccessToken: env.INITIAL_ACCESS_TOKEN,
      },
    });

    const [result1, result2] = await Promise.all([
      casClient.isBanned(1234),
      casClient.isBanned(4321),
    ]);

    assert.deepEqual(result1, {
      banned: false,
      reason: "chain",
    });

    assert.deepEqual(result2, {
      banned: false,
      reason: "chain",
    });
  });
});
