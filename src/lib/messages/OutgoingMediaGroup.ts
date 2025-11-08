import path from "path";
import { InputFile, type InputMediaPhoto } from "grammy/types";

export class OutgoingMediaGroup {
  public readonly media: InputMediaPhoto[] = [];

  constructor() {}

  public addPhoto({ uploadsFilename }: { uploadsFilename: string }) {
    this.media.push({
      type: "photo",
      media: new InputFile(
        this.getUploadsFullPath(uploadsFilename),
        uploadsFilename,
      ),
    });
  }

  protected getUploadsFullPath(filename: string) {
    return path.join(process.cwd(), "static", filename);
  }
}
