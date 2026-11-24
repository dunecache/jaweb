import type { AuthUser } from "@jaweb/shared";
import type { Context } from "hono";
import type { Logger } from "pino";

export type AppEnv = {
  Variables: {
    requestId: string;
    logger: Logger;
    user: AuthUser;
    sessionId: string;
  };
};

export type AppContext = Context<AppEnv>;
