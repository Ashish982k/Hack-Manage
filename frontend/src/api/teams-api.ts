import { fetchFromApi } from "./client";

const encode = (value: string) => encodeURIComponent(value);

export const fetchTeamDetailsById = (teamId: string, stageId?: string | null) =>
  fetchFromApi(
    `/teams/${encode(teamId)}${stageId ? `?stageId=${encode(stageId)}` : ""}`,
  );

export const createTeam = (payload: {
  hackathonId: string;
  teamName: string;
  members: string[];
}) =>
  fetchFromApi("/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const renameTeam = (teamId: string, name: string) =>
  fetchFromApi(`/teams/${encode(teamId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

export const addTeamMember = (teamId: string, email: string) =>
  fetchFromApi(`/teams/${encode(teamId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

export const reviewTeamMember = (
  teamId: string,
  memberUserId: string,
  action: "approve" | "reject",
) =>
  fetchFromApi(`/teams/${encode(teamId)}/members/${encode(memberUserId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

export const removeTeamMember = (teamId: string, memberUserId: string) =>
  fetchFromApi(`/teams/${encode(teamId)}/members/${encode(memberUserId)}`, {
    method: "DELETE",
  });
