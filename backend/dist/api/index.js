import { handle } from "@hono/node-server/vercel";
import app from "../dist/src/app.js";
export default handle(app);
