import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 5000),
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
