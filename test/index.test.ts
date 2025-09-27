import { createClient, serviceDiscovery } from "@titorelli/client";
import { test, it } from "node:test";
import { env } from "../src/lib/env";

test("cas-request", async () => {
  await it("should not fail", async () => {
    const { casOrigin } = await serviceDiscovery("http://next.titorelli.ru");
    const casClient = await createClient("cas", {
      baseUrl: casOrigin,
      auth: {
        clientName: "--test-2--",
        initialAccessToken: env.INITIAL_ACCESS_TOKEN,
      },
    });

    const result = await casClient.isBanned(1234);

    console.log(result);
  });
});
