export type StartStoppable = {
  start(): Promise<void>;
  stop(): Promise<void>;
};
