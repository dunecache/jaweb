import type { Context } from "hono";
import type { Logger } from "pino";

export type AppEnv = {
  Variables: {
    requestId: string;
    logger: Logger;
  };
};

export type AppContext = Context<AppEnv>;
