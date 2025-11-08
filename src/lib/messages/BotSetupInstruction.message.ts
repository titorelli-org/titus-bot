import { OutgoingMediaGroup } from "./OutgoingMediaGroup";

export class BotSetupInstruction extends OutgoingMediaGroup {
  constructor() {
    super();

    this.addPhoto({ uploadsFilename: "390_640.gif" });
    this.addPhoto({ uploadsFilename: "390_640.gif" });
    this.addPhoto({ uploadsFilename: "390_640.gif" });
    this.addPhoto({ uploadsFilename: "390_640.gif" });
    this.addPhoto({ uploadsFilename: "390_640.gif" });
    this.addPhoto({ uploadsFilename: "390_640.gif" });
  }
}
