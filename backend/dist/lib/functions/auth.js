export const getUserIdFromContext = (c) => c.get("user")?.id ?? null;
