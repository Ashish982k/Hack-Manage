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
  deleteHackathon,
  fetchHackathonById,
  fetchHackathonRoles,
  fetchHackathonShortlistedTeams,
  fetchHackathonTeamState,
  fetchJudgeAccess as fetchHackathonJudgeAccess,
  joinHackathon,
  leaveHackathon,
  uploadHackathonSubmission,
} from "@/api";

gsap.registerPlugin(ScrollTrigger);

type SubmissionStatus = "Not submitted" | "Submitted" | "Under review";

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

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / (3600 * 24));
  const h = Math.floor((total % (3600 * 24)) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

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
  const [canManageRoles, setCanManageRoles] = React.useState(false);
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

    try {
      const res = await fetchHackathonShortlistedTeams(hackathonId);
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
  ]);

  React.useEffect(() => {
    if (isSessionPending) return;
    fetchQrAccess();
  }, [fetchQrAccess, isSessionPending]);

  const fetchManageAccess = React.useCallback(async () => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      setCanManageRoles(false);
      return;
    }

    try {
      const res = await fetchHackathonRoles(hackathonId);
      setCanManageRoles(res.ok);
    } catch {
      setCanManageRoles(false);
    }
  }, [hackathonId, isSessionPending, session?.user?.id]);

  React.useEffect(() => {
    if (isSessionPending) return;
    fetchManageAccess();
  }, [fetchManageAccess, isSessionPending]);

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

  const [hackathon, setHackathon] = React.useState<HackathonViewModel | null>(
    null,
  );
  const [isLoadingHackathon, setIsLoadingHackathon] = React.useState(true);

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

  const deadlineMs = React.useMemo(
    () =>
      hackathon?.submissionDeadline
        ? new Date(hackathon.submissionDeadline).getTime()
        : 0,
    [hackathon?.submissionDeadline],
  );

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const timeLeft = React.useMemo(
    () => formatTime(deadlineMs - now),
    [deadlineMs, now],
  );
  const isDeadlinePassed = now > deadlineMs;

  React.useEffect(() => {
    if (isSubmissionEvaluated && isEditing) {
      setIsEditing(false);
    }
  }, [isEditing, isSubmissionEvaluated]);

  const hasTeam = isJoined && !!team;
  const isSubmissionLocked = submissionStatus === "Submitted" && !isEditing;
  const submissionScoreBreakdown = team?.submission?.scoreBreakdown ?? null;
  const canSubmit =
    hasTeam && submissionStatus !== "Under review" && !isSubmitting;

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
                  {submissionStatus}
                </ToneBadge>
                {isSubmissionEvaluated ? (
                  <ToneBadge tone="success">Evaluated</ToneBadge>
                ) : null}
                <ToneBadge tone={isDeadlinePassed ? "danger" : "warning"}>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-3.5" />
                    Deadline:{" "}
                    {new Date(hackathon.submissionDeadline).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
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
                {!canJudge && !isHackathonAdmin ? (
                  <Button
                    variant={isJoined ? "outline" : "primary"}
                    onClick={handleJoin}
                  >
                    {isJoined ? "Leave Hackathon" : "Join Hackathon"}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/hackathons/${hackathonId}/leaderboard`)
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Trophy className="size-4 text-amber-300" />
                    Leaderboard
                  </span>
                </Button>
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
                {canJudge && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/hackathons/${hackathonId}/judge`)
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <Gavel className="size-4" />
                      Judge Panel
                    </span>
                  </Button>
                )}
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

            <section className="grid gap-6" data-reveal="up">
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
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.push(`/hackathons/${hackathonId}/team`)
                          }
                        >
                          Manage
                        </Button>
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
                  {isHackathonAdmin ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        Submission unavailable
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Hackathon admins cannot submit as participants.
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
          </div>

          <aside
            className="space-y-6 lg:sticky lg:top-8 lg:h-fit"
            data-reveal="up"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/60">Countdown</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    until submission deadline
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <Calendar className="size-4 text-white/80" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">
                          Deadline
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {new Date(
                            hackathon.submissionDeadline,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <Users className="size-4 text-white/80" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">
                          Team
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {!isJoined
                            ? "Not joined"
                            : team
                              ? `${team.members.length} members`
                              : "No team"}
                        </p>
                      </div>
                    </div>
                    <ToneBadge tone={team ? "success" : "warning"}>
                      {team ? "Ready" : isJoined ? "Pending" : "Join"}
                    </ToneBadge>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <FileText className="size-4 text-white/80" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">
                          Submission
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {submissionStatus}
                        </p>
                      </div>
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
                    <p className="text-sm font-semibold text-white/90">
                      Step 1
                    </p>
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
                    <p className="text-sm font-semibold text-white/90">
                      Step 2
                    </p>
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
                    <p className="text-sm font-semibold text-white/90">
                      Step 3
                    </p>
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
          </aside>
        </div>
      </div>
    </div>
  );
}
