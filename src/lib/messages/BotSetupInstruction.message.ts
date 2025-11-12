import { OutgoingMediaGroup } from "./OutgoingMediaGroup";

export class BotSetupInstruction extends OutgoingMediaGroup {
  constructor() {
    super();

    this.addPhoto({ uploadsFilename: "titus_bot_1.png" });
    this.addPhoto({ uploadsFilename: "titus_bot_2.png" });
    this.addPhoto({ uploadsFilename: "titus_bot_3.png" });
    this.addPhoto({ uploadsFilename: "titus_bot_4.png" });
    this.addPhoto({ uploadsFilename: "titus_bot_5.png" });
  }
}
