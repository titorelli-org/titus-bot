import type { Update } from "@grammyjs/types";

export class UpdateFilter {
  private readonly processedUpdates = new Set<Update["update_id"]>();

  public has(update: Update) {
    return this.processedUpdates.has(update.update_id);
  }

  public add(updateId: Update["update_id"]) {
    if (!this.processedUpdates.has(updateId)) {
      this.processedUpdates.add(updateId);

      setTimeout(this.delete.bind(this), 3_600_000, updateId); // forget after 1 hour
    }

    return this;
  }

  public delete(updateId: Update["update_id"]) {
    this.processedUpdates.delete(updateId);

    return this;
  }
}
