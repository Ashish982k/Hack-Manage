"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar";
import {
  deleteHackathon,
  fetchHackathonById,
  fetchHackathonLeaderboard,
  fetchHackathonShortlistedTeams,
  fetchHackathonTeamState,
  fetchJudgeAccess as fetchHackathonJudgeAccess,
} from "@/api";

import { HackathonDetailsSection } from "./_components/hackathon-details-section";
import { HeroSection } from "./_components/hero-section";
import { LeaderboardSection } from "./_components/leaderboard-section";
import { ParticipantSections } from "./_components/participant-sections";
import { SidebarSection } from "./_components/sidebar-section";
import { PageGlow, Toast } from "./_components/shared-ui";
import { useHackathonActions } from "./_hooks/use-hackathon-actions";
import type {
  HackathonApiResponse,
  HackathonViewModel,
  LeaderboardTeam,
  SubmissionStatus,
  TeamInfo,
  ToastState,
} from "./_lib/types";
import {
  formatDateLabel,
  formatTimeLabel,
  hasMessage,
  isJudgeAccessResponse,
  isStageActive,
  isTeamStateResponse,
  readLeaderboardTeams,
  readShortlistedTeamIds,
  resolveFinalStageIdFromStages,
  sortLeaderboardTeams,
} from "./_lib/utils";

gsap.registerPlugin(ScrollTrigger);

export default function HackathonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [toast, setToast] = React.useState<ToastState>(null);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
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
    if (isSessionPending) return;

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
        members: teamState.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          status: member.status,
          name: member.user?.name || "Unknown Member",
          role: member.userId === teamState.leaderId ? "Leader" : "Member",
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

      setCanJudge(data.isJudge);
      setIsHackathonAdmin(Boolean(data.isAdmin));
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
      } catch (error) {
        console.error("Failed to fetch hackathon:", error);
      } finally {
        setIsLoadingHackathon(false);
      }
    }
    void fetchHackathon();
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
    } catch {
      setToast({ kind: "error", title: "Error deleting hackathon" });
    }
  };

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
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
    () =>
      stageList.find(
        (stage) => stage.type === "SUBMISSION" && isStageActive(stage, now),
      ),
    [now, stageList],
  );
  const activeEvaluationStage = React.useMemo(
    () =>
      stageList.find(
        (stage) => stage.type === "EVALUATION" && isStageActive(stage, now),
      ),
    [now, stageList],
  );
  const activeFinalStage = React.useMemo(
    () =>
      stageList.find((stage) => stage.type === "FINAL" && isStageActive(stage, now)),
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
  const evaluationStageId =
    activeEvaluationStage?.id ?? fallbackEvaluationStage?.id ?? null;
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
    void loadDualLeaderboardData();
  }, [isLoadingHackathon, loadDualLeaderboardData]);

  React.useLayoutEffect(() => {
    const context = gsap.context(() => {
      const elements = gsap.utils.toArray<Element>("[data-reveal='up']");
      elements.forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 85%",
              once: true,
            },
          },
        );
      });
    });

    return () => context.revert();
  }, []);

  const { handleSubmit, toggleTeamShortlist, handleConfirmShortlist, handleJoin } =
    useHackathonActions({
      hackathonId,
      sessionExists: Boolean(session),
      push: router.push,
      isHackathonAdmin,
      isJoined,
      team,
      isSubmissionEvaluated,
      driveUrl,
      repo,
      problemStatements,
      selectedProblemStatementId,
      fetchTeam,
      leaderboardStageId,
      isShortlistConfirmed,
      sortedLeaderboardTeams,
      selectedShortlistedTeams,
      setSelectedShortlistedTeams,
      setShortlistedTeams,
      setIsShortlistConfirmed,
      setIsConfirmingShortlist,
      setIsSubmitting,
      setLastSubmitted,
      setSubmissionStatus,
      setIsSubmissionEvaluated,
      setIsEditing,
      setToast,
    });

  if (isLoadingHackathon) {
    return (
      <div className="relative min-h-screen premium-page text-white flex items-center justify-center">
        <PageGlow />
        <Navbar />
        <Loader2 className="size-8 text-white/60 animate-spin" />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="relative min-h-screen premium-page text-white">
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

  return (
    <div className="relative min-h-screen premium-page text-white">
      <PageGlow />
      <Navbar />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <HeroSection
              hackathonId={hackathonId}
              hackathon={hackathon}
              submissionStatus={submissionStatus}
              isParticipantRole={isParticipantRole}
              isSubmissionEvaluated={isSubmissionEvaluated}
              registrationDeadlineDate={registrationDeadlineDate}
              registrationDeadlineTime={registrationDeadlineTime}
              roleLabel={roleLabel}
              isJoined={isJoined}
              canJudge={canJudge}
              evaluateUrl={evaluateUrl}
              judgeLeaderboardUrl={judgeLeaderboardUrl}
              shortlistedTeamsUrl={shortlistedTeamsUrl}
              isHackathonAdmin={isHackathonAdmin}
              canViewQrCodes={canViewQrCodes}
              canManageRoles={canManageRoles}
              onJoin={handleJoin}
              onDeleteHackathon={handleDeleteHackathon}
              onShare={() =>
                setToast({
                  kind: "success",
                  title: "Invite link copied",
                  message: "(mock)",
                })
              }
            />

            <LeaderboardSection
              showJudgeLeaderboard={showJudgeLeaderboard}
              isLeaderboardLoading={isLeaderboardLoading}
              leaderboardError={leaderboardError}
              sortedLeaderboardTeams={sortedLeaderboardTeams}
              selectedShortlistedTeams={selectedShortlistedTeams}
              shortlistedTeams={shortlistedTeams}
              isShortlistConfirmed={isShortlistConfirmed}
              isConfirmingShortlist={isConfirmingShortlist}
              onToggleShortlist={toggleTeamShortlist}
              onConfirmShortlist={handleConfirmShortlist}
            />

            <section className="grid gap-6" data-reveal="up">
              <HackathonDetailsSection
                hackathon={hackathon}
                expanded={expanded}
                onToggleProblem={(problemId) =>
                  setExpanded((current) => ({
                    ...current,
                    [problemId]: !current[problemId],
                  }))
                }
              />
            </section>

            {isParticipantRole ? (
              <ParticipantSections
                hackathonId={hackathonId}
                isLoadingTeam={isLoadingTeam}
                isHackathonAdmin={isHackathonAdmin}
                isJoined={isJoined}
                team={team}
                canViewQrCodes={canViewQrCodes}
                onJoin={handleJoin}
                submissionStatus={submissionStatus}
                isSubmissionStageActive={isSubmissionStageActive}
                hasTeam={hasTeam}
                driveUrl={driveUrl}
                onDriveUrlChange={setDriveUrl}
                repo={repo}
                onRepoChange={setRepo}
                isSubmissionEvaluated={isSubmissionEvaluated}
                isSubmissionLocked={isSubmissionLocked}
                canSubmit={canSubmit}
                problemStatements={problemStatements}
                selectedProblemStatementId={selectedProblemStatementId}
                onSelectedProblemStatementChange={setSelectedProblemStatementId}
                lastSubmitted={lastSubmitted}
                isEditing={isEditing}
                onStartEditing={() => setIsEditing(true)}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                showScoreBreakdown={showScoreBreakdown}
                onToggleScoreBreakdown={() =>
                  setShowScoreBreakdown((current) => !current)
                }
                submissionScoreBreakdown={submissionScoreBreakdown}
              />
            ) : null}
          </div>

          <SidebarSection
            scheduleItems={scheduleItems}
            isParticipantRole={isParticipantRole}
            isJoined={isJoined}
            team={team}
            submissionStatus={submissionStatus}
            isSubmissionEvaluated={isSubmissionEvaluated}
            evaluationStageInfo={evaluationStageInfo}
            finalStageInfo={finalStageInfo}
          />
        </div>
      </div>
    </div>
  );
}

