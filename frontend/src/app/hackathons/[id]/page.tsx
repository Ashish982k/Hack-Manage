"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Flag,
  Link,
  Loader2,
  QrCode,
  ScanLine,
  Settings,
  Sparkles,
  Users,
  Gavel,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar";
import {
  confirmHackathonShortlist,
  deleteHackathon,
  fetchHackathonById,
  fetchHackathonLeaderboard,
  fetchHackathonShortlistedTeams,
  fetchHackathonTeamState,
  fetchJudgeAccess as fetchHackathonJudgeAccess,
  joinHackathon,
  leaveHackathon,
  uploadHackathonSubmission,
} from "@/api";

gsap.registerPlugin(ScrollTrigger);

type SubmissionStatus = "Not submitted" | "Submitted" | "Under review";
type StageType = "SUBMISSION" | "EVALUATION" | "FINAL";

type StageInfo = {
  id: string;
  title: string;
  type: StageType;
  startTime: string | null;
  endTime: string | null;
};

type TeamMember = {
  id: string;
  userId: string;
  status: "pending" | "approved";
  name: string;
  role: "Leader" | "Member";
};

type TeamInfo = {
  id: string;
  name: string;
  leaderId: string;
  members: TeamMember[];
  submission: {
    id: string;
    pptUrl: string | null;
    githubUrl: string | null;
    problemStatementId: string | null;
    submittedAt: string;
    evaluated?: boolean;
    scoreBreakdown?: {
      technical: number;
      feasibility: number;
      innovation: number;
      presentation: number;
      impact: number;
      totalScore: number;
      evaluationCount: number;
    } | null;
  } | null;
};

type TeamStateResponse = {
  joined: boolean;
  team: {
    id: string;
    name: string;
    leaderId: string;
    members: Array<{
      id: string;
      userId: string;
      status: "pending" | "approved";
      user?: {
        id: string;
        name: string;
      };
    }>;
    submission: {
      id: string;
      pptUrl: string | null;
      githubUrl: string | null;
      problemStatementId: string | null;
      submittedAt: string;
      evaluated?: boolean;
      scoreBreakdown?: {
        technical: number;
        feasibility: number;
        innovation: number;
        presentation: number;
        impact: number;
        totalScore: number;
        evaluationCount: number;
      } | null;
    } | null;
  } | null;
};

type ApiMessageResponse = {
  message?: string;
};

type JudgeAccessResponse = {
  isJudge: boolean;
  isAdmin?: boolean;
};

type ShortlistedTeamsResponse = {
  data?: Array<{
    teamId?: string;
  }>;
};

type ProblemStatement = {
  id: string;
  title: string;
  body: string;
};

type LeaderboardTeam = {
  teamId: string;
  teamName: string;
  totalScore: number;
  technical: number;
  feasibility: number;
  innovation: number;
  presentation: number;
  impact: number;
  submissionCount: number;
};

type HackathonApiResponse = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  createdBy: string;
  headerImage: string | null;
  location: string | null;
  problemStatements?: ProblemStatement[];
  stages?: StageInfo[];
};

type HackathonViewModel = HackathonApiResponse & {
  shortDescription: string;
  longDescription: string;
  status: "Open" | "Closed";
  submissionDeadline: string;
  finalRoundDate: string;
  tags: string[];
  rules: string[];
  problemStatements: ProblemStatement[];
  stages: StageInfo[];
};

const hasMessage = (value: unknown): value is ApiMessageResponse =>
  typeof value === "object" && value !== null && "message" in value;

const isTeamStateResponse = (value: unknown): value is TeamStateResponse =>
  typeof value === "object" &&
  value !== null &&
  "joined" in value &&
  typeof (value as { joined: unknown }).joined === "boolean";

const isJudgeAccessResponse = (value: unknown): value is JudgeAccessResponse =>
  typeof value === "object" &&
  value !== null &&
  "isJudge" in value &&
  typeof (value as { isJudge: unknown }).isJudge === "boolean";

const readShortlistedTeamIds = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return new Set<string>();
  }

  const rows = (value as ShortlistedTeamsResponse).data;
  if (!Array.isArray(rows)) {
    return new Set<string>();
  }

  return new Set(
    rows
      .map((item) => (typeof item?.teamId === "string" ? item.teamId : ""))
      .filter(Boolean),
  );
};

const readShortlistedStageId = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null) return null;
  if (
    "shortlistedStageId" in value &&
    typeof (value as { shortlistedStageId?: unknown }).shortlistedStageId ===
      "string"
  ) {
    return (value as { shortlistedStageId: string }).shortlistedStageId;
  }
  if (
    "finalStageId" in value &&
    typeof (value as { finalStageId?: unknown }).finalStageId === "string"
  ) {
    return (value as { finalStageId: string }).finalStageId;
  }
  if ("stageId" in value && typeof (value as { stageId?: unknown }).stageId === "string") {
    return (value as { stageId: string }).stageId;
  }
  return null;
};

const resolveFinalStageIdFromStages = (stages: StageInfo[]) => {
  const finalStages = stages
    .filter((stage) => stage.type === "FINAL")
    .sort(
      (a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
        a.id.localeCompare(b.id),
    );

  return finalStages[0]?.id ?? null;
};

const readNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const mapLeaderboardTeam = (value: unknown): LeaderboardTeam | null => {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;

  if (typeof row.teamId !== "string" || typeof row.teamName !== "string") {
    return null;
  }

  const totalScore = readNumber(row.totalScore);
  if (totalScore === null) return null;

  return {
    teamId: row.teamId,
    teamName: row.teamName,
    totalScore,
    technical: readNumber(row.technical) ?? 0,
    feasibility: readNumber(row.feasibility) ?? 0,
    innovation: readNumber(row.innovation) ?? 0,
    presentation: readNumber(row.presentation) ?? 0,
    impact: readNumber(row.impact) ?? 0,
    submissionCount:
      readNumber(row.submissionCount) ?? readNumber(row.evaluationCount) ?? 0,
  };
};

const readLeaderboardTeams = (value: unknown): LeaderboardTeam[] => {
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: unknown[] }).data
      .map(mapLeaderboardTeam)
      .filter((team): team is LeaderboardTeam => team !== null);
  }

  return [];
};

const sortLeaderboardTeams = (teams: LeaderboardTeam[]) =>
  [...teams].sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.technical - a.technical ||
      a.teamName.localeCompare(b.teamName),
  );

const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimeLabel = (value: string | null | undefined) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toTimestamp = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const isStageActive = (stage: StageInfo, nowMs: number) => {
  const start = toTimestamp(stage.startTime);
  const end = toTimestamp(stage.endTime);
  if (start === null || end === null) return false;
  return start <= nowMs && nowMs <= end;
};

function ToneBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
        : tone === "danger"
          ? "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20"
          : "bg-white/5 text-white/80 ring-1 ring-white/10";

  return <Badge className={cls}>{children}</Badge>;
}

function PageGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-[-140px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/35 via-pink-500/25 to-blue-500/25 blur-3xl" />
      <div className="absolute right-[-180px] top-[240px] h-[440px] w-[440px] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
      <div className="absolute bottom-[-240px] left-[-180px] h-[560px] w-[560px] rounded-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/15 blur-3xl" />
    </div>
  );
}

function Toast({
  toast,
  onClose,
}: {
  toast: { kind: "success" | "error"; title: string; message?: string } | null;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div
        className={
          "rounded-2xl border bg-black/40 p-4 backdrop-blur-xl shadow-2xl " +
          (toast.kind === "success"
            ? "border-emerald-500/20"
            : "border-rose-500/20")
        }
        role="status"
      >
        <div className="flex items-start gap-3">
          <div
            className={
              "mt-0.5 flex size-9 items-center justify-center rounded-xl ring-1 " +
              (toast.kind === "success"
                ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                : "bg-rose-500/10 text-rose-200 ring-rose-500/20")
            }
          >
            {toast.kind === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Flag className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            {toast.message ? (
              <p className="mt-1 text-sm text-white/70">{toast.message}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicLeaderboard({
  teams,
  shortlistedTeams,
  isShortlistConfirmed,
}: {
  teams: LeaderboardTeam[];
  shortlistedTeams: Set<string>;
  isShortlistConfirmed: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const isShortlisted = shortlistedTeams.has(team.teamId);
            return (
              <tr
                key={team.teamId}
                className={
                  "border-b border-white/10 " +
                  (isShortlisted ? "bg-emerald-500/10" : "")
                }
              >
                <td className="px-4 py-4 font-semibold text-white">#{index + 1}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-white">{team.teamName}</p>
                  <p className="mt-1 text-xs text-white/55">
                    Evaluations: {team.submissionCount}
                  </p>
                </td>
                <td className="px-4 py-4 font-semibold text-white">
                  {formatScore(team.totalScore)}
                </td>
                <td className="px-4 py-4">
                  {isShortlistConfirmed && isShortlisted ? (
                    <Badge className="bg-emerald-500/15 text-emerald-200 ring-emerald-300/20">
                      Shortlisted
                    </Badge>
                  ) : (
                    <Badge className="bg-white/10 text-white/70">—</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JudgeLeaderboard({
  teams,
  selectedShortlistedTeams,
  isShortlistConfirmed,
  isConfirmingShortlist,
  onToggleShortlist,
  onConfirmShortlist,
}: {
  teams: LeaderboardTeam[];
  selectedShortlistedTeams: Set<string>;
  isShortlistConfirmed: boolean;
  isConfirmingShortlist: boolean;
  onToggleShortlist: (teamId: string) => void;
  onConfirmShortlist: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-blue-500/15 text-blue-200 ring-blue-300/20">
            Selected: {selectedShortlistedTeams.size}
          </Badge>
          {isShortlistConfirmed ? (
            <Badge className="bg-emerald-500/15 text-emerald-200 ring-emerald-300/20">
              Shortlist confirmed
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-200 ring-amber-300/20">
              Not confirmed
            </Badge>
          )}
        </div>
        <Button
          variant="primary"
          onClick={onConfirmShortlist}
          disabled={isShortlistConfirmed || isConfirmingShortlist}
        >
          {isConfirmingShortlist ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Confirming...
            </span>
          ) : (
            "Confirm Shortlist"
          )}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Shortlist</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => {
              const selected = selectedShortlistedTeams.has(team.teamId);
              return (
                <tr
                  key={team.teamId}
                  className={
                    "border-b border-white/10 " + (selected ? "bg-emerald-500/10" : "")
                  }
                >
                  <td className="px-4 py-4 font-semibold text-white">#{index + 1}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{team.teamName}</p>
                    <p className="mt-1 text-xs text-white/55">
                      Evaluations: {team.submissionCount}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-white">
                    {formatScore(team.totalScore)}
                  </td>
                  <td className="px-4 py-4">
                    <label className="inline-flex items-center gap-2 text-white/80">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleShortlist(team.teamId)}
                        disabled={isShortlistConfirmed}
                        className="size-4 rounded border-white/30 bg-black/30"
                      />
                      {selected ? "Shortlisted" : "Mark shortlisted"}
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HackathonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [toast, setToast] = React.useState<{
    kind: "success" | "error";
    title: string;
    message?: string;
  } | null>(null);

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const router = useRouter();

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [isJoined, setIsJoined] = React.useState(false);
  const [team, setTeam] = React.useState<TeamInfo | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = React.useState(true);
  const [canJudge, setCanJudge] = React.useState(false);
  const [isHackathonAdmin, setIsHackathonAdmin] = React.useState(false);
  const [canViewQrCodes, setCanViewQrCodes] = React.useState(false);

  const [driveUrl, setDriveUrl] = React.useState("");
  const [repo, setRepo] = React.useState("");
  const [selectedProblemStatementId, setSelectedProblemStatementId] =
    React.useState("");

  const [submissionStatus, setSubmissionStatus] =
    React.useState<SubmissionStatus>("Not submitted");
  const [isSubmissionEvaluated, setIsSubmissionEvaluated] =
    React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [lastSubmitted, setLastSubmitted] = React.useState<{
    fileName: string;
    at: string;
  } | null>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [leaderboardTeams, setLeaderboardTeams] = React.useState<LeaderboardTeam[]>(
    [],
  );
  const [isLeaderboardLoading, setIsLeaderboardLoading] = React.useState(false);
  const [leaderboardError, setLeaderboardError] = React.useState<string | null>(
    null,
  );
  const [shortlistedTeams, setShortlistedTeams] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedShortlistedTeams, setSelectedShortlistedTeams] = React.useState<
    Set<string>
  >(new Set());
  const [isShortlistConfirmed, setIsShortlistConfirmed] = React.useState(false);
  const [isConfirmingShortlist, setIsConfirmingShortlist] = React.useState(false);
  const [hackathon, setHackathon] = React.useState<HackathonViewModel | null>(
    null,
  );
  const [isLoadingHackathon, setIsLoadingHackathon] = React.useState(true);

  const hackathonId = React.use(params).id;
  const resetSubmissionState = React.useCallback(() => {
    setDriveUrl("");
    setRepo("");
    setSelectedProblemStatementId("");
    setSubmissionStatus("Not submitted");
    setIsSubmissionEvaluated(false);
    setLastSubmitted(null);
    setShowScoreBreakdown(false);
    setIsEditing(false);
  }, []);

  const fetchTeam = React.useCallback(async () => {
    if (isSessionPending) {
      return;
    }

    if (!session?.user?.id) {
      setIsJoined(false);
      setTeam(null);
      resetSubmissionState();
      setIsLoadingTeam(false);
      return;
    }

    setIsLoadingTeam(true);
    try {
      const res = await fetchHackathonTeamState(hackathonId);
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
          setToast({
            kind: "error",
            title: "Failed to load team",
            message:
              hasMessage(data) && data.message
                ? data.message
                : "Please refresh and try again.",
          });
        }
        setIsJoined(false);
        setTeam(null);
        resetSubmissionState();
        return;
      }

      if (!isTeamStateResponse(data)) {
        setToast({
          kind: "error",
          title: "Failed to load team",
          message: "Received an invalid response from the server.",
        });
        setIsJoined(false);
        setTeam(null);
        resetSubmissionState();
        return;
      }

      setIsJoined(Boolean(data.joined));

      const teamState = data.team;
      if (!data.joined || !teamState) {
        setTeam(null);
        resetSubmissionState();
        return;
      }

      const normalizedTeam: TeamInfo = {
        id: teamState.id,
        name: teamState.name,
        leaderId: teamState.leaderId,
        members: teamState.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          status: m.status,
          name: m.user?.name || "Unknown Member",
          role: m.userId === teamState.leaderId ? "Leader" : "Member",
        })),
        submission: teamState.submission,
      };

      setTeam(normalizedTeam);

      if (normalizedTeam.submission) {
        setDriveUrl(normalizedTeam.submission.pptUrl || "");
        setRepo(normalizedTeam.submission.githubUrl || "");
        setSelectedProblemStatementId(
          normalizedTeam.submission.problemStatementId || "",
        );
        setSubmissionStatus("Submitted");
        setIsSubmissionEvaluated(Boolean(normalizedTeam.submission.evaluated));
        setLastSubmitted({
          fileName: "Presentation URL",
          at: normalizedTeam.submission.submittedAt,
        });
        setShowScoreBreakdown(false);
      } else {
        resetSubmissionState();
      }
    } catch {
      setToast({
        kind: "error",
        title: "Failed to load team",
        message: "Please check your connection and try again.",
      });
      setTeam(null);
      setIsJoined(false);
      resetSubmissionState();
    } finally {
      setIsLoadingTeam(false);
    }
  }, [hackathonId, isSessionPending, resetSubmissionState, session?.user?.id]);

  React.useEffect(() => {
    if (isSessionPending) return;
    fetchTeam();
  }, [fetchTeam, isSessionPending]);

  const fetchQrAccess = React.useCallback(async () => {
    if (isSessionPending || isLoadingTeam) return;

    if (!session?.user?.id || !isJoined || !team?.id) {
      setCanViewQrCodes(false);
      return;
    }

    const finalStageId = resolveFinalStageIdFromStages(hackathon?.stages ?? []);
    if (!finalStageId) {
      setCanViewQrCodes(false);
      return;
    }

    try {
      const res = await fetchHackathonShortlistedTeams(hackathonId, finalStageId);
      if (!res.ok) {
        setCanViewQrCodes(false);
        return;
      }

      const data: unknown = await res.json().catch(() => null);
      const shortlistedTeamIds = readShortlistedTeamIds(data);
      setCanViewQrCodes(shortlistedTeamIds.has(team.id));
    } catch {
      setCanViewQrCodes(false);
    }
  }, [
    hackathonId,
    isJoined,
    isLoadingTeam,
    isSessionPending,
    session?.user?.id,
    team?.id,
    hackathon?.stages,
  ]);

  React.useEffect(() => {
    if (isSessionPending) return;
    fetchQrAccess();
  }, [fetchQrAccess, isSessionPending]);

  const fetchJudgeAccess = React.useCallback(async () => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      setCanJudge(false);
      setIsHackathonAdmin(false);
      return;
    }

    try {
      const res = await fetchHackathonJudgeAccess(hackathonId);

      if (!res.ok) {
        setCanJudge(false);
        setIsHackathonAdmin(false);
        return;
      }

      const data: unknown = await res.json().catch(() => null);
      if (!isJudgeAccessResponse(data)) {
        setCanJudge(false);
        setIsHackathonAdmin(false);
        return;
      }

      const access = data as JudgeAccessResponse;
      setCanJudge(access.isJudge);
      setIsHackathonAdmin(Boolean(access.isAdmin));
    } catch {
      setCanJudge(false);
      setIsHackathonAdmin(false);
    }
  }, [hackathonId, isSessionPending, session?.user?.id]);

  React.useEffect(() => {
    if (isSessionPending) return;
    fetchJudgeAccess();
  }, [fetchJudgeAccess, isSessionPending]);

  const canManageRoles = isHackathonAdmin;

  React.useEffect(() => {
    async function fetchHackathon() {
      setIsLoadingHackathon(true);
      try {
        const res = await fetchHackathonById(hackathonId);
        if (res.ok) {
          const found = (await res.json()) as HackathonApiResponse;
          const description =
            typeof found.description === "string" ? found.description : "";
          setHackathon({
            ...found,
            shortDescription: description,
            longDescription: description,
            status: "Open",
            submissionDeadline:
              found.registrationDeadline || "2026-04-10T18:30:00.000Z",
            finalRoundDate: found.endDate || "2026-04-12T09:00:00.000Z",
            tags: ["AI", "Web", "DevTools", "Security"],
            problemStatements: found.problemStatements ?? [],
            rules: ["Follow the code of conduct"],
            stages: found.stages ?? [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch hackathon:", err);
      } finally {
        setIsLoadingHackathon(false);
      }
    }
    fetchHackathon();
  }, [hackathonId]);

  const problemStatements = React.useMemo(
    () => hackathon?.problemStatements ?? [],
    [hackathon?.problemStatements],
  );

  React.useEffect(() => {
    if (problemStatements.length === 1 && !selectedProblemStatementId) {
      setSelectedProblemStatementId(problemStatements[0].id);
    }
  }, [problemStatements, selectedProblemStatementId]);

  const handleDeleteHackathon = async () => {
    if (!confirm("Are you sure you want to delete this hackathon?")) return;
    try {
      const res = await deleteHackathon(hackathonId);
      if (res.ok) {
        setToast({ kind: "success", title: "Deleted successfully" });
        setTimeout(() => router.push("/hackathons"), 1000);
      } else {
        setToast({ kind: "error", title: "Failed to delete" });
      }
    } catch (err) {
      setToast({ kind: "error", title: "Error deleting hackathon" });
    }
  };

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (isSubmissionEvaluated && isEditing) {
      setIsEditing(false);
    }
  }, [isEditing, isSubmissionEvaluated]);

  const hasTeam = isJoined && !!team;
  const isParticipantRole = !canJudge && !isHackathonAdmin;
  const isSubmissionLocked = submissionStatus === "Submitted" && !isEditing;
  const submissionScoreBreakdown = team?.submission?.scoreBreakdown ?? null;
  const canSubmit =
    hasTeam && submissionStatus !== "Under review" && !isSubmitting;
  const stageList = React.useMemo(() => hackathon?.stages ?? [], [hackathon?.stages]);
  const activeSubmissionStage = React.useMemo(
    () => stageList.find((stage) => stage.type === "SUBMISSION" && isStageActive(stage, now)),
    [now, stageList],
  );
  const activeEvaluationStage = React.useMemo(
    () => stageList.find((stage) => stage.type === "EVALUATION" && isStageActive(stage, now)),
    [now, stageList],
  );
  const activeFinalStage = React.useMemo(
    () => stageList.find((stage) => stage.type === "FINAL" && isStageActive(stage, now)),
    [now, stageList],
  );
  const fallbackEvaluationStage = React.useMemo(
    () => stageList.find((stage) => stage.type === "EVALUATION"),
    [stageList],
  );
  const fallbackSubmissionStage = React.useMemo(
    () => stageList.find((stage) => stage.type === "SUBMISSION"),
    [stageList],
  );
  const fallbackFinalStage = React.useMemo(
    () => stageList.find((stage) => stage.type === "FINAL"),
    [stageList],
  );
  const isSubmissionStageActive = Boolean(activeSubmissionStage);
  const registrationDeadlineDate = formatDateLabel(
    hackathon?.registrationDeadline ?? null,
  );
  const registrationDeadlineTime = formatTimeLabel(
    hackathon?.registrationDeadline ?? null,
  );
  const submissionStageInfo = activeSubmissionStage ?? fallbackSubmissionStage ?? null;
  const evaluationStageInfo = activeEvaluationStage ?? fallbackEvaluationStage ?? null;
  const finalStageInfo = activeFinalStage ?? fallbackFinalStage ?? null;
  const evaluationStageId = activeEvaluationStage?.id ?? fallbackEvaluationStage?.id ?? null;
  const finalStageId = resolveFinalStageIdFromStages(stageList);
  const leaderboardStageId = evaluationStageId ?? finalStageId;
  const roleLabel = isHackathonAdmin
    ? "You are an Admin"
    : canJudge
      ? "You are a Judge"
      : "You are a Participant";
  const evaluateUrl = evaluationStageId
    ? `/hackathons/${hackathonId}/judge?stageId=${encodeURIComponent(evaluationStageId)}`
    : `/hackathons/${hackathonId}/judge`;
  const judgeLeaderboardUrl = leaderboardStageId
    ? `/hackathons/${hackathonId}/judge/leaderboard?stageId=${encodeURIComponent(leaderboardStageId)}`
    : null;
  const shortlistedTeamsUrl = finalStageId
    ? `/hackathons/${hackathonId}/leaderboard?stageId=${encodeURIComponent(finalStageId)}`
    : null;
  const sortedLeaderboardTeams = React.useMemo(
    () => sortLeaderboardTeams(leaderboardTeams),
    [leaderboardTeams],
  );
  const showJudgeLeaderboard = canJudge;
  const scheduleItems = React.useMemo(
    () => [
      {
        label: "Registration Deadline",
        badge: "Registration",
        date: registrationDeadlineDate,
        time: registrationDeadlineTime,
        active: false,
      },
      {
        label: "Submission Time",
        badge: "Submission",
        date: formatDateLabel(submissionStageInfo?.startTime ?? null),
        time: `${formatTimeLabel(submissionStageInfo?.startTime ?? null)} - ${formatTimeLabel(submissionStageInfo?.endTime ?? null)}`,
        active: Boolean(activeSubmissionStage),
      },
      {
        label: "Evaluation Time",
        badge: "Evaluation",
        date: formatDateLabel(evaluationStageInfo?.startTime ?? null),
        time: `${formatTimeLabel(evaluationStageInfo?.startTime ?? null)} - ${formatTimeLabel(evaluationStageInfo?.endTime ?? null)}`,
        active: Boolean(activeEvaluationStage),
      },
      {
        label: "Final Round Time",
        badge: "Final",
        date: formatDateLabel(finalStageInfo?.startTime ?? null),
        time: `${formatTimeLabel(finalStageInfo?.startTime ?? null)} - ${formatTimeLabel(finalStageInfo?.endTime ?? null)}`,
        active: Boolean(activeFinalStage),
      },
    ],
    [
      activeEvaluationStage,
      activeFinalStage,
      activeSubmissionStage,
      evaluationStageInfo,
      finalStageInfo,
      registrationDeadlineDate,
      registrationDeadlineTime,
      submissionStageInfo,
    ],
  );

  const loadDualLeaderboardData = React.useCallback(async () => {
    if (!hackathonId) return;
    if (!leaderboardStageId) {
      setLeaderboardTeams([]);
      setLeaderboardError("Stage ID is required to load leaderboard.");
      return;
    }

    setIsLeaderboardLoading(true);
    setLeaderboardError(null);

    try {
      const [leaderboardRes, shortlistedRes] = await Promise.all([
        fetchHackathonLeaderboard(hackathonId, leaderboardStageId),
        finalStageId
          ? fetchHackathonShortlistedTeams(hackathonId, finalStageId)
          : Promise.resolve(new Response(null, { status: 400 })),
      ]);

      const leaderboardData: unknown = await leaderboardRes.json().catch(() => null);
      const shortlistedData: unknown = await shortlistedRes.json().catch(() => null);

      if (!leaderboardRes.ok) {
        setLeaderboardError(
          hasMessage(leaderboardData) && leaderboardData.message
            ? leaderboardData.message
            : "Failed to fetch leaderboard data.",
        );
        setLeaderboardTeams([]);
      } else {
        setLeaderboardTeams(readLeaderboardTeams(leaderboardData));
      }

      if (shortlistedRes.ok) {
        const shortlistedIds = readShortlistedTeamIds(shortlistedData);
        setShortlistedTeams(shortlistedIds);
        setSelectedShortlistedTeams(new Set(shortlistedIds));
        setIsShortlistConfirmed(shortlistedIds.size > 0);
      } else {
        setShortlistedTeams(new Set());
        setSelectedShortlistedTeams(new Set());
        setIsShortlistConfirmed(false);
      }
    } catch {
      setLeaderboardError("Failed to fetch leaderboard data.");
      setLeaderboardTeams([]);
      setShortlistedTeams(new Set());
      setSelectedShortlistedTeams(new Set());
      setIsShortlistConfirmed(false);
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, [hackathonId, leaderboardStageId, finalStageId]);

  React.useEffect(() => {
    if (isLoadingHackathon) return;
    loadDualLeaderboardData();
  }, [isLoadingHackathon, loadDualLeaderboardData]);

  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray<Element>("[data-reveal='up']");
      elements.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              once: true,
            },
          },
        );
      });
    });

    return () => ctx.revert();
  }, []);

  if (isLoadingHackathon) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center">
        <PageGlow />
        <Navbar />
        <Loader2 className="size-8 text-white/60 animate-spin" />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <PageGlow />
        <Navbar />
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Hackathon not found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-white/70">
                We couldn’t find a hackathon with id{" "}
                <span className="text-white">{hackathonId}</span>.
              </p>
              <Button
                variant="primary"
                onClick={() => (window.location.href = "/hackathons")}
              >
                Back to Hackathons
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (isSubmissionEvaluated) {
      setToast({
        kind: "error",
        title: "Submission locked",
        message: "Your submission has already been evaluated.",
      });
      return;
    }

    if (!isJoined) {
      setToast({
        kind: "error",
        title: "Join required",
        message: "Join the hackathon before submitting.",
      });
      return;
    }

    if (!team) {
      setToast({
        kind: "error",
        title: "Team required",
        message: "Create or join a team before submitting.",
      });
      return;
    }

    if (!driveUrl.trim()) {
      setToast({
        kind: "error",
        title: "Required",
        message: "Please provide a Drive URL for your presentation.",
      });
      return;
    }

    if (problemStatements.length > 0 && !selectedProblemStatementId) {
      setToast({
        kind: "error",
        title: "Required",
        message: "Please select a problem statement before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await uploadHackathonSubmission(hackathonId, {
        driveUrl,
        githubUrl: repo,
        problemStatementId: selectedProblemStatementId,
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        setToast({
          kind: "error",
          title: "Submission failed",
          message: hasMessage(data)
            ? data.message || "Please try again."
            : "Please try again.",
        });
        return;
      }

      setLastSubmitted({
        fileName: "Presentation URL",
        at: new Date().toISOString(),
      });
      setSubmissionStatus("Submitted");
      setIsSubmissionEvaluated(false);
      setIsEditing(false);
      await fetchTeam();
      setToast({
        kind: "success",
        title: "Submission received",
        message: "Good luck!",
      });
    } catch {
      setToast({
        kind: "error",
        title: "Submission failed",
        message: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTeamShortlist = (teamId: string) => {
    if (isShortlistConfirmed) return;
    setSelectedShortlistedTeams((current) => {
      const next = new Set(current);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleConfirmShortlist = async () => {
    if (!hackathonId || isShortlistConfirmed) return;
    if (!leaderboardStageId) {
      setToast({
        kind: "error",
        title: "Stage ID is required",
      });
      return;
    }

    setIsConfirmingShortlist(true);
    try {
      const teamIds = sortedLeaderboardTeams
        .filter((team) => selectedShortlistedTeams.has(team.teamId))
        .map((team) => team.teamId);

      const res = await confirmHackathonShortlist(hackathonId, {
        stageId: leaderboardStageId,
        teamIds,
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setToast({
          kind: "error",
          title: "Shortlist failed",
          message:
            hasMessage(data) && data.message
              ? data.message
              : "Could not confirm shortlist.",
        });
        return;
      }

      const shortlistedStageId = readShortlistedStageId(data);
      if (!shortlistedStageId) {
        setToast({
          kind: "error",
          title: "Shortlist confirmed",
          message:
            "Shortlist saved, but final stage information is missing. Please refresh.",
        });
        return;
      }

      const shortlistRes = await fetchHackathonShortlistedTeams(
        hackathonId,
        shortlistedStageId,
      );
      const shortlistData: unknown = await shortlistRes.json().catch(() => null);
      if (!shortlistRes.ok) {
        setToast({
          kind: "error",
          title: "Shortlist confirmed",
          message:
            hasMessage(shortlistData) && shortlistData.message
              ? shortlistData.message
              : "Shortlist saved, but public shortlist is not available yet.",
        });
        return;
      }

      const syncedTeamIds = readShortlistedTeamIds(shortlistData);
      setShortlistedTeams(syncedTeamIds);
      setSelectedShortlistedTeams(new Set(syncedTeamIds));
      setIsShortlistConfirmed(syncedTeamIds.size > 0);
      setToast({
        kind: "success",
        title: "Shortlist confirmed",
        message: "Public shortlist has been updated for the final round.",
      });
    } catch {
      setToast({
        kind: "error",
        title: "Shortlist failed",
        message: "Please try again.",
      });
    } finally {
      setIsConfirmingShortlist(false);
    }
  };

  const handleJoin = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!isJoined && isHackathonAdmin) {
      setToast({
        kind: "error",
        title: "Not allowed",
        message: "Hackathon admins cannot participate as contestants.",
      });
      return;
    }

    if (isJoined) {
      try {
        const res = await leaveHackathon(hackathonId);

        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          setToast({
            kind: "error",
            title: hasMessage(data)
              ? data.message || "Something went wrong"
              : "Something went wrong",
          });
          return;
        }

        setToast({
          kind: "success",
          title: "Left the hackathon",
        });

        await fetchTeam();
      } catch (err) {
        setToast({
          kind: "error",
          title: "Action Failed",
          message: "Some error occurred",
        });
      }
      return;
    }

    try {
      const res = await joinHackathon(hackathonId);

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setToast({
          kind: "error",
          title: hasMessage(data)
            ? data.message || "Something went wrong"
            : "Something went wrong",
        });
        return;
      }

      await fetchTeam();
      setToast({
        kind: "success",
        title: "Joined hackathon",
        message: "Create your team to start submitting.",
      });
    } catch (err) {
      setToast({
        kind: "error",
        title: "Action Failed",
        message: "Some error occurred",
      });
    }
  };
  return (
    <div className="relative min-h-screen bg-black text-white">
      <PageGlow />
      <Navbar />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section data-reveal="up">
              <div className="flex flex-wrap items-center gap-3">
                <ToneBadge
                  tone={hackathon.status === "Open" ? "success" : "danger"}
                >
                  {hackathon.status}
                </ToneBadge>
                <ToneBadge
                  tone={
                    submissionStatus === "Submitted"
                      ? "success"
                      : submissionStatus === "Under review"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {isParticipantRole ? submissionStatus : roleLabel.replace("You are ", "")}
                </ToneBadge>
                {isParticipantRole && isSubmissionEvaluated ? (
                  <ToneBadge tone="success">Evaluated</ToneBadge>
                ) : null}
                <ToneBadge tone="warning">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-3.5" />
                    Registration: {registrationDeadlineDate} {registrationDeadlineTime}
                  </span>
                </ToneBadge>
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                {hackathon.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
                {hackathon.shortDescription.substring(0, 150) + "....."}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {hackathon.tags?.map((t: string) => (
                  <Badge
                    key={t}
                    className="bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10 transition"
                  >
                    {t}
                  </Badge>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <ToneBadge tone="neutral">{roleLabel}</ToneBadge>

                {isParticipantRole ? (
                  <Button
                    variant={isJoined ? "outline" : "primary"}
                    onClick={handleJoin}
                  >
                    {isJoined ? "Leave Hackathon" : "Join Hackathon"}
                  </Button>
                ) : null}

                {/* {isParticipantRole && canShowSubmitAction ? (
                  <Button variant="primary" onClick={handleSubmitNavigation}>
                    <span className="inline-flex items-center gap-2">
                      <FileText className="size-4" />
                      Submit
                    </span>
                  </Button>
                ) : null} */}

                {(isParticipantRole || isHackathonAdmin) && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/hackathons/${hackathonId}/results`)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trophy className="size-4 text-purple-300" />
                      View Results
                    </span>
                  </Button>
                )}

                {(canJudge) && (
                  <Button variant="outline" onClick={() => router.push(evaluateUrl)}>
                    <span className="inline-flex items-center gap-2">
                      <Gavel className="size-4" />
                      Evaluate
                    </span>
                  </Button>
                )}

                {canJudge && judgeLeaderboardUrl ? (
                  <Button
                    variant="outline"
                    onClick={() => router.push(judgeLeaderboardUrl)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trophy className="size-4 text-amber-300" />
                      Leaderboard (Shortlist Teams)
                    </span>
                  </Button>
                ) : null}

                {(isParticipantRole || isHackathonAdmin) && shortlistedTeamsUrl ? (
                  <Button
                    variant="outline"
                    onClick={() => router.push(shortlistedTeamsUrl)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trophy className="size-4 text-emerald-300" />
                      View Shortlisted Teams
                    </span>
                  </Button>
                ) : null}

                {(isHackathonAdmin || canJudge) && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/hackathons/${hackathonId}/scan`)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ScanLine className="size-4 text-cyan-300" />
                      Scan QR
                    </span>
                  </Button>
                )}

                {isHackathonAdmin && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/hackathons/${hackathonId}/admin/attendance`)
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <Users className="size-4 text-emerald-300" />
                      Attendance
                    </span>
                  </Button>
                )}

                {canViewQrCodes && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/hackathons/${hackathonId}/qr`)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <QrCode className="size-4 text-emerald-300" />
                      View QR Codes
                    </span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      title: "Invite link copied",
                      message: "(mock)",
                    })
                  }
                >
                  Share
                </Button>

                {canManageRoles && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/hackathons/${hackathonId}/manage`)
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings className="size-4" />
                      Manage Hackathon
                    </span>
                  </Button>
                )}

                {canManageRoles && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteHackathon}
                    className="ml-auto text-red-500 border-red-500/50 hover:bg-red-500/10"
                  >
                    Delete Hackathon
                  </Button>
                )}
              </div>
            </section>

            <section id="submission" className="grid gap-6" data-reveal="up">
              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle className="text-white">
                    {showJudgeLeaderboard
                      ? "Judge Leaderboard"
                      : "Public Leaderboard"}
                  </CardTitle>
                  <p className="text-sm text-white/60">
                    {showJudgeLeaderboard
                      ? "Score teams, mark shortlisted teams, and confirm the shortlist."
                      : "Live rankings for all teams. Shortlisted teams are highlighted once judges confirm."}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLeaderboardLoading ? (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Loader2 className="size-4 animate-spin" />
                      Loading leaderboard...
                    </div>
                  ) : leaderboardError ? (
                    <p className="text-sm text-rose-300">{leaderboardError}</p>
                  ) : sortedLeaderboardTeams.length === 0 ? (
                    <p className="text-sm text-white/60">
                      No leaderboard data available yet.
                    </p>
                  ) : showJudgeLeaderboard ? (
                    <JudgeLeaderboard
                      teams={sortedLeaderboardTeams}
                      selectedShortlistedTeams={selectedShortlistedTeams}
                      isShortlistConfirmed={isShortlistConfirmed}
                      isConfirmingShortlist={isConfirmingShortlist}
                      onToggleShortlist={toggleTeamShortlist}
                      onConfirmShortlist={handleConfirmShortlist}
                    />
                  ) : (
                    <PublicLeaderboard
                      teams={sortedLeaderboardTeams}
                      shortlistedTeams={shortlistedTeams}
                      isShortlistConfirmed={isShortlistConfirmed}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-white">
                    Hackathon Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-white/90">
                      Description
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      {hackathon.longDescription}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/90">
                      Problem Statements
                    </p>
                    <div className="mt-3 space-y-3">
                      {hackathon.problemStatements?.map((ps) => {
                        const isOpen = !!expanded[ps.id];
                        return (
                          <div
                            key={ps.id}
                            className="rounded-2xl border border-white/10 bg-black/20"
                          >
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                              onClick={() =>
                                setExpanded((s) => ({
                                  ...s,
                                  [ps.id]: !s[ps.id],
                                }))
                              }
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                                  <Sparkles className="size-4 text-white/80" />
                                </span>
                                <p className="truncate text-sm font-semibold text-white/90">
                                  {ps.title}
                                </p>
                              </div>
                              <span className="text-xs text-white/60">
                                {isOpen ? "Hide" : "View"}
                              </span>
                            </button>
                            {isOpen ? (
                              <div className="px-4 pb-4">
                                <p className="text-sm leading-7 text-white/70">
                                  {ps.body && ps.body !== ps.title
                                    ? ps.body
                                    : "Use this statement when submitting your project."}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/90">
                      Rules & Guidelines
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-white/70">
                      {hackathon.rules?.map((r: string) => (
                        <li key={r} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/30" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/90">
                      Important Dates
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-white/60">Start</p>
                        <p className="mt-2 text-sm font-semibold text-white/90">
                          {new Date(hackathon.startDate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-white/60">
                          Submission Deadline
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white/90">
                          {new Date(
                            hackathon.submissionDeadline,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-white/60">Final Round</p>
                        <p className="mt-2 text-sm font-semibold text-white/90">
                          {new Date(
                            hackathon.finalRoundDate,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {isParticipantRole ? (
              <>
            <section className="grid gap-6" data-reveal="up">
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Team</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingTeam ? (
                    <div className="flex justify-center p-4">
                      <span className="inline-flex items-center gap-2 text-white/60">
                        <Loader2 className="size-5 animate-spin" />
                        Loading team...
                      </span>
                    </div>
                  ) : isHackathonAdmin ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        Admin participation is restricted
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Hackathon admins cannot join teams for this event.
                      </p>
                    </div>
                  ) : !isJoined ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        You have not joined this hackathon
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Join first, then create a team.
                      </p>
                      <Button
                        className="mt-4"
                        variant="primary"
                        onClick={handleJoin}
                      >
                        Join Hackathon
                      </Button>
                    </div>
                  ) : team ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-white/60">Team Name</p>
                          <p className="mt-1 text-lg font-semibold text-white/90">
                            {team.name}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {canViewQrCodes ? (
                            <Button
                              variant="outline"
                              onClick={() => router.push(`/hackathons/${hackathonId}/qr`)}
                            >
                              <span className="inline-flex items-center gap-2">
                                <QrCode className="size-4 text-emerald-300" />
                                View QR Codes
                              </span>
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            onClick={() =>
                              router.push(`/hackathons/${hackathonId}/team`)
                            }
                          >
                            Manage
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {team.members.map((m) => (
                          <div
                            key={m.id || m.name}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-blue-500/25 ring-1 ring-white/10">
                                <Users className="size-4 text-white/80" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-white/90">
                                  {m.name}
                                </p>
                                <p className="text-xs text-white/60">
                                  {m.role}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        No team yet
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Create your team to start collaborating.
                      </p>
                      <Button
                        className="mt-4"
                        variant="primary"
                        onClick={() =>
                          router.push(`/hackathons/${hackathonId}/create-team`)
                        }
                      >
                        Create Team
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6" data-reveal="up">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-white">Submission</CardTitle>
                    <ToneBadge
                      tone={
                        submissionStatus === "Submitted"
                          ? "success"
                          : submissionStatus === "Under review"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {submissionStatus}
                    </ToneBadge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!isSubmissionStageActive ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        Submission stage is not active
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Submissions can be made only during the active submission stage.
                      </p>
                    </div>
                  ) : !isJoined && !isLoadingTeam ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        Join required
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Join the hackathon to unlock submissions.
                      </p>
                    </div>
                  ) : !hasTeam && !isLoadingTeam ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        No team available
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Please create a team to unlock the submission form.
                      </p>
                      <Button
                        className="mt-4"
                        variant="primary"
                        onClick={() =>
                          router.push(`/hackathons/${hackathonId}/create-team`)
                        }
                      >
                        Create Team
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-white/90">
                            Presentation / Drive URL
                          </p>
                          <div className="mt-2 relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                              <Link className="size-4" />
                            </span>
                            <Input
                              value={driveUrl}
                              onChange={(e) => setDriveUrl(e.target.value)}
                              placeholder="https://drive.google.com/..."
                              className="pl-10"
                              disabled={
                                isSubmissionEvaluated ||
                                isSubmissionLocked ||
                                !canSubmit
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-white/90">
                            GitHub Repo
                          </p>
                          <div className="mt-2 relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                              <Link className="size-4" />
                            </span>
                            <Input
                              value={repo}
                              onChange={(e) => setRepo(e.target.value)}
                              placeholder="https://github.com/your-team/project"
                              className="pl-10"
                              disabled={
                                isSubmissionEvaluated ||
                                isSubmissionLocked ||
                                !canSubmit
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-white/90">
                          Problem Statement
                          {problemStatements.length > 0 ? (
                            <span className="text-purple-400"> *</span>
                          ) : null}
                        </p>
                        {problemStatements.length > 0 ? (
                          <select
                            value={selectedProblemStatementId}
                            onChange={(e) =>
                              setSelectedProblemStatementId(e.target.value)
                            }
                            className="block w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            disabled={
                              isSubmissionEvaluated ||
                              isSubmissionLocked ||
                              !canSubmit
                            }
                          >
                            <option value="">Select a problem statement</option>
                            {problemStatements.map((ps) => (
                              <option key={ps.id} value={ps.id}>
                                {ps.title}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
                            No problem statements are available for this
                            hackathon.
                          </div>
                        )}
                      </div>

                      {lastSubmitted ? (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs text-white/60">
                            Last submission
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white/90">
                            {lastSubmitted.fileName}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            {new Date(lastSubmitted.at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div
                          className={
                            isSubmissionEvaluated
                              ? "text-sm text-emerald-300"
                              : "text-sm text-white/60"
                          }
                        >
                          {isSubmissionEvaluated
                            ? "Your submission has been evaluated."
                            : submissionStatus === "Submitted"
                              ? "Your submission is saved."
                              : "Make sure your deck explains the workflow, QR flow, and evaluation."}
                        </div>
                        <div className="flex items-center gap-2">
                          {submissionStatus === "Submitted" &&
                            !isEditing &&
                            !isSubmissionEvaluated && (
                              <Button
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                              >
                                Update Submission
                              </Button>
                            )}
                          {!(
                            !isEditing && submissionStatus === "Submitted"
                          ) && (
                            <Button
                              variant="primary"
                              onClick={handleSubmit}
                              disabled={
                                isSubmissionEvaluated ||
                                isSubmissionLocked ||
                                !canSubmit
                              }
                            >
                              {isSubmitting ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="size-4 animate-spin" />
                                  Submitting...
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <FileText className="size-4" />
                                  Submit
                                </span>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {isSubmissionEvaluated && submissionScoreBreakdown ? (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white/90">
                              Score Breakdown
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setShowScoreBreakdown((current) => !current)
                              }
                            >
                              {showScoreBreakdown ? (
                                <>
                                  <ChevronUp className="size-4" />
                                  Hide scores
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="size-4" />
                                  View scores
                                </>
                              )}
                            </Button>
                          </div>

                          {showScoreBreakdown ? (
                            <div className="mt-3 grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-white/60">
                                  Technical
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatScore(
                                    submissionScoreBreakdown.technical,
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-white/60">
                                  Feasibility
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatScore(
                                    submissionScoreBreakdown.feasibility,
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-white/60">
                                  Innovation
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatScore(
                                    submissionScoreBreakdown.innovation,
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-white/60">
                                  Presentation
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatScore(
                                    submissionScoreBreakdown.presentation,
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-white/60">Impact</p>
                                <p className="mt-1 font-semibold">
                                  {formatScore(submissionScoreBreakdown.impact)}
                                </p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-white/60">
                                  Total Score
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatScore(
                                    submissionScoreBreakdown.totalScore,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-white/50">
                                  Evaluations:{" "}
                                  {submissionScoreBreakdown.evaluationCount}
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </section>
              </>
            ) : null}
          </div>

          <aside
            className="space-y-6 lg:sticky lg:top-8 lg:h-fit"
            data-reveal="up"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Important Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {scheduleItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                            {item.badge === "Registration" ? (
                              <Calendar className="size-4 text-white/80" />
                            ) : item.badge === "Submission" ? (
                              <FileText className="size-4 text-white/80" />
                            ) : item.badge === "Evaluation" ? (
                              <Gavel className="size-4 text-white/80" />
                            ) : (
                              <Trophy className="size-4 text-white/80" />
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white/90">
                              {item.label}
                            </p>
                            <p className="mt-1 text-xs text-white/60">{item.date}</p>
                            <p className="mt-0.5 text-xs text-white/60">{item.time}</p>
                          </div>
                        </div>
                        <ToneBadge tone={item.active ? "success" : "neutral"}>
                          {item.badge}
                        </ToneBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isParticipantRole ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Your Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <p className="text-sm font-semibold text-white/90">Team</p>
                        <p className="mt-1 text-xs text-white/60">
                          {!isJoined
                            ? "Not joined"
                            : team
                              ? `${team.members.length} members`
                              : "No team"}
                        </p>
                      </div>
                      <ToneBadge tone={team ? "success" : "warning"}>
                        {team ? "Ready" : isJoined ? "Pending" : "Join"}
                      </ToneBadge>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <p className="text-sm font-semibold text-white/90">Submission</p>
                        <p className="mt-1 text-xs text-white/60">{submissionStatus}</p>
                      </div>
                      <ToneBadge
                        tone={
                          submissionStatus === "Submitted"
                            ? "success"
                            : submissionStatus === "Under review"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {submissionStatus === "Not submitted" ? "Todo" : "Done"}
                      </ToneBadge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white/90">Step 1</p>
                        <ToneBadge tone={isJoined ? "success" : "warning"}>
                          {isJoined ? "Joined" : "Join"}
                        </ToneBadge>
                      </div>
                      <p className="mt-2 text-sm text-white/60">
                        Join the hackathon to unlock submissions.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white/90">Step 2</p>
                        <ToneBadge
                          tone={
                            submissionStatus === "Submitted"
                              ? "success"
                              : submissionStatus === "Under review"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {submissionStatus === "Not submitted"
                            ? "Submit"
                            : submissionStatus}
                        </ToneBadge>
                      </div>
                      <p className="mt-2 text-sm text-white/60">
                        Upload your deck and repo link.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white/90">Step 3</p>
                        <ToneBadge
                          tone={isSubmissionEvaluated ? "success" : "neutral"}
                        >
                          {isSubmissionEvaluated ? "Evaluated" : "Evaluation"}
                        </ToneBadge>
                      </div>
                      <p className="mt-2 text-sm text-white/60">
                        Track your results on leaderboard after review.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Judge/Admin Stage View</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/70">
                  <p>
                    Evaluation stage:{" "}
                    <span className="text-white/90">
                      {evaluationStageInfo?.title ?? "Not configured"}
                    </span>
                  </p>
                  <p>
                    Final stage:{" "}
                    <span className="text-white/90">
                      {finalStageInfo?.title ?? "Not configured"}
                    </span>
                  </p>
                  <p className="text-white/60">
                    Participant-only team/submission widgets are hidden for your role.
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
