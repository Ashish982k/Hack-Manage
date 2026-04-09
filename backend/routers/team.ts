import { Hono } from "hono";
import { addTeamMember, createTeam, removeTeamMember, updateTeam, updateTeamMember } from "../controllers/team";
import { authMiddleware } from "../middleware/auth.middleware";

const Teams = new Hono();
Teams.use("*", authMiddleware);
Teams.post("/", createTeam);
Teams.patch("/:id", updateTeam);

Teams.post("/:teamId/members", addTeamMember);
Teams.patch("/:teamId/members/:userId", updateTeamMember);
Teams.delete("/:teamId/members/:userId", removeTeamMember);

export default Teams