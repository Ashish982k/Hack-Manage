import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { submissions, teamMembers } from "../src/db/schema";

export const upload = async (c: any) => {
  try {
    const hackathonId = c.req.param("id");
    const user = c.get("user");

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const userId = user.id;

    // ✅ Step 1: Find user's team for THIS hackathon
    const teamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, userId),
      with: {
        team: true,
      },
    });

    // ❌ No team at all
    if (!teamMember) {
      return c.json({ message: "User is not in any team" }, 400);
    }

    // ❌ Team exists but not for this hackathon
    if (teamMember.team.hackathonId !== hackathonId) {
      return c.json({ message: "User is not in a team for this hackathon" }, 400);
    }

    const teamId = teamMember.team.id;

    // ✅ Step 2: (Optional but recommended) check team size / eligibility
    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
    });

    if (members.length < 2) {
      return c.json({ message: "Team is not eligible (minimum 2 members required)" }, 400);
    }

    // ✅ Step 3: Parse file
    const body = await c.req.parseBody();
    const file = body.file;

    if (!(file instanceof File)) {
      return c.json({ message: "File is required" }, 400);
    }

    // ✅ Step 4: Save file
    const fileName = `${teamId}-${Date.now()}-${file.name}`;
    const filePath = path.join("uploads", fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // ✅ Step 5: Save submission
    await db.insert(submissions).values({
      id: crypto.randomUUID(),
      teamId,
      round: 1,
      pptUrl: filePath,
    });

    return c.json({
      message: "Submission successful",
      filePath,
    });

  } catch (error) {
    console.error(error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};