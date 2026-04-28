import { handle } from "hono/vercel";
import app from "../dist/src/app.js";
export default handle(app);
