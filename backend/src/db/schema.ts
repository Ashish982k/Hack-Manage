import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userVerifications = sqliteTable("user_verifications", {
  id: text("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  collegeIdUrl: text("college_id_url"),
  aadhaarMasked: text("aadhaar_masked"),
  selfieUrl: text("selfie_url"),

  status: text("status", {
    enum: ["pending", "approved", "rejected"],
  })
    .default("pending")
    .notNull(),

  reviewedBy: text("reviewed_by").references(() => user.id),

  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const hackathons = sqliteTable("hackathons", {
  id: text("id").primaryKey(),

  title: text("title").notNull(),
  description: text("description"),
  headerImage: text("header_url"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  registrationDeadline: text("registration_deadline"),
  location: text("location"),

  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
});

export const hackathonParticipants = sqliteTable(
  "hackathon_participants",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: text("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("hackathon_participants_hackathon_idx").on(table.hackathonId),
    index("hackathon_participants_user_idx").on(table.userId),
    uniqueIndex("hackathon_participants_hackathon_user_unique").on(
      table.hackathonId,
      table.userId,
    ),
  ],
);

export const stages = sqliteTable("stages", {
  id: text("id").primaryKey(),

  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id),

  title: text("title").notNull(),
  description: text("description"),

  startTime: text("start_time"),
  endTime: text("end_time"),
});
/* ===================== PROBLEM STATEMENTS ===================== */
export const problemStatements = sqliteTable("problem_statements", {
  id: text("id").primaryKey(),

  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),
});

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),

  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id, { onDelete: "cascade" }),

  name: text("name").notNull(),

  leaderId: text("leader_id")
    .notNull()
    .references(() => user.id),
});

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),

  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["pending", "approved"],
  })
    .default("pending")
    .notNull(),
});

export const teamsRelations = relations(teams, ({ one, many }) => ({
  hackathon: one(hackathons, {
    fields: [teams.hackathonId],
    references: [hackathons.id],
  }),
  leader: one(user, {
    fields: [teams.leaderId],
    references: [user.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(user, {
    fields: [teamMembers.userId],
    references: [user.id],
  }),
}));

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),

  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),

  round: integer("round").notNull(),

  pptUrl: text("ppt_url"),
  githubUrl: text("github_url"),
  problemStatementId: text("problem_statement_id").references(
    () => problemStatements.id,
  ),

  submittedAt: text("submitted_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const evaluations = sqliteTable("evaluations", {
  id: text("id").primaryKey(),

  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),

  judgeId: text("judge_id")
    .notNull()
    .references(() => user.id),

  innovation: integer("innovation_score").notNull(),
  feasibility: integer("feasibility_score").notNull(),
  technical: integer("technical_score").notNull(),
  presentation: integer("presentation_score").notNull(),
  impact: integer("impact_score").notNull(),

  total: integer("total_score").notNull(),
});

export const qrCodes = sqliteTable("qr_codes", {
  id: text("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  type: text("type", {
    enum: ["entry", "breakfast", "lunch", "dinner"],
  }).notNull(),

  token: text("token").notNull().unique(),

  isUsed: integer("is_used", { mode: "boolean" }).default(false).notNull(),

  expiresAt: text("expires_at").notNull(),

  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const qrScans = sqliteTable("qr_scans", {
  id: text("id").primaryKey(),

  qrId: text("qr_id")
    .notNull()
    .references(() => qrCodes.id, { onDelete: "cascade" }),

  scannedBy: text("scanned_by")
    .notNull()
    .references(() => user.id),

  scannedAt: text("scanned_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const shortlistedTeams = sqliteTable("shortlisted_teams", {
  id: text("id").primaryKey(),

  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),

  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id, { onDelete: "cascade" }),

  round: integer("round").notNull(),
});

/* ===================== CERTIFICATES ===================== */
export const certificates = sqliteTable("certificates", {
  id: text("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id, { onDelete: "cascade" }),

  certificateUrl: text("certificate_url").notNull(),

  issuedAt: text("issued_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});
