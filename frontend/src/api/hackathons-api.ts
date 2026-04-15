import { fetchFromApi } from "./client";

const encode = (value: string) => encodeURIComponent(value);

export const fetchHackathonsList = () => fetchFromApi("/hackathons");

export const fetchHackathonById = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}`);

export const createHackathon = (formData: FormData) =>
  fetchFromApi("/hackathons", {
    method: "POST",
    body: formData,
  });

export const saveHackathonSchedules = (
  hackathonId: string,
  payload: {
    schedules: Array<{
      type: "entry" | "breakfast" | "lunch" | "dinner";
      startTime: string;
      endTime: string;
    }>;
  },
) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const deleteHackathon = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}`, {
    method: "DELETE",
  });

export const fetchHackathonTeamState = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/team`);

export const uploadHackathonSubmission = (
  hackathonId: string,
  payload: {
    driveUrl: string;
    githubUrl: string;
    problemStatementId?: string;
  },
) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const joinHackathon = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/join`, {
    method: "POST",
  });

export const leaveHackathon = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/join`, {
    method: "DELETE",
  });

export const fetchHackathonRoles = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/roles`);

export const updateHackathonRoles = (
  hackathonId: string,
  payload: {
    admins: string[];
    judges: string[];
  },
) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/roles`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const fetchJudgeAccess = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/judge-access`);

export const fetchJudgeSubmissions = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/submissions`);

export const fetchHackathonLeaderboard = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/leaderboard`);

export const fetchHackathonShortlistedTeams = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/shortlisted`);

export const confirmHackathonShortlist = (
  hackathonId: string,
  payload: { teamIds: string[] },
) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/shortlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const fetchHackathonQrCodes = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/qr`);

export const scanHackathonQr = (
  hackathonId: string,
  payload: { token: string },
) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const generateHackathonEntryQr = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/generate-entry-qr`, {
    method: "POST",
  });

export const generateHackathonFoodQr = (hackathonId: string) =>
  fetchFromApi(`/hackathons/${encode(hackathonId)}/generate-food-qr`, {
    method: "POST",
  });

export const evaluateTeamSubmission = (
  hackathonId: string,
  teamId: string,
  scores: {
    innovation: number;
    feasibility: number;
    technical: number;
    presentation: number;
    impact: number;
  },
  stageId?: string | null,
) => {
  const formData = new FormData();
  formData.append("innovation", String(scores.innovation));
  formData.append("feasibility", String(scores.feasibility));
  formData.append("technical", String(scores.technical));
  formData.append("presentation", String(scores.presentation));
  formData.append("impact", String(scores.impact));
  const stageQuery = stageId ? `?stageId=${encode(stageId)}` : "";

  return fetchFromApi(
    `/hackathons/${encode(hackathonId)}/evaluate/${encode(teamId)}${stageQuery}`,
    {
      method: "POST",
      body: formData,
    },
  );
};
