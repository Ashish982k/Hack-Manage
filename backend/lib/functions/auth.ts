import type { Context } from "hono";

export const getUserIdFromContext = (c: Context) => c.get("user")?.id ?? null;

