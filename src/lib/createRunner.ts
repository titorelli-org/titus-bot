import {
  createSource,
  createSequentialSink,
  type UpdateConsumer,
} from "@grammyjs/runner";
import { type BotError } from "@grammyjs/runner/out/deps.node";
import { type Socket } from "socket.io-client";
import { createRunner as grammyCreateRunner } from "@grammyjs/runner";
import { type Bot } from "grammy";
import { SocketIoUpdateSupplier } from "./SocketIOUpdateSupplier";

export const createRunner = (bot: Bot, socket: Socket) => {
  const supplier = new SocketIoUpdateSupplier(socket);
  const source = createSource<any>(supplier);
  const consumer: UpdateConsumer<any> = {
    consume: (update) => {
      return bot.handleUpdate(update, {
        send: (data) => {
          console.log("webhook reply", data);

          return Promise.resolve();
        },
      });
    },
  };
  const errorHandler = async (error: BotError<any>) => {
    bot.errorHandler(error);
  };

  return grammyCreateRunner(
    source,
    createSequentialSink(consumer, errorHandler),
  );
};
