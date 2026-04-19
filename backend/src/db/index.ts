import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({ url: process.env.DB_FILE_NAME! });
export const db = drizzle({ client, schema });


// export const certificates = sqliteTable("certificates", {
//   id: text("id").primaryKey(),

//   userId: text("user_id")
//     .notNull()
//     .references(() => user.id, { onDelete: "cascade" }),

//   hackathonId: text("hackathon_id")
//     .notNull()
//     .references(() => hackathons.id, { onDelete: "cascade" }),

//   certificateUrl: text("certificate_url").notNull(),

//   issuedAt: text("issued_at")
//     .default(sql`CURRENT_TIMESTAMP`)
//     .notNull(),
// });
