import crypto from "crypto";
import { hackathonRoles, teams, submissions, stages, evaluations, shortlistedTeams, teamMembers, qrCodes, } from "../src/db/schema";
import { eq, and, inArray, sql, desc, isNotNull, asc } from "drizzle-orm";
import { db } from "../src/db";
