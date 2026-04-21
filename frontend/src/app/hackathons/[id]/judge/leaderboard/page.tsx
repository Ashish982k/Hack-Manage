"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
} from "lucide-react";

import { fetchHackathonById, fetchHackathonLeaderboard } from "@/api";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type StageType = "SUBMISSION" | "EVALUATION" | "FINAL";

type LeaderboardTeam = {
  teamId: string;
  teamName: string;
  totalScore: number;
  technical: number;
  feasibility: number;
  innovation: number;
  presentation: number;
  impact: number;
  evaluationCount: number;
};

const readMessage = (value: unknown) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  return null;
};

const readNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const readStageType = (value: unknown, stageId: string): StageType | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("stages" in value) ||
    !Array.isArray((value as { stages?: unknown }).stages)
  ) {
    return null;
  }

  const stage = (value as { stages: unknown[] }).stages.find((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    return (
      "id" in entry &&
      (entry as { id?: unknown }).id === stageId &&
      "type" in entry &&
      typeof (entry as { type?: unknown }).type === "string"
    );
  });

  if (!stage) return null;
  const stageType = (stage as { type: string }).type;
  return stageType === "SUBMISSION" || stageType === "EVALUATION" || stageType === "FINAL"
    ? stageType
    : null;
};

const readLeaderboardTeams = (value: unknown): LeaderboardTeam[] => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("data" in value) ||
    !Array.isArray((value as { data?: unknown }).data)
  ) {
    return [];
  }

  return (value as { data: unknown[] }).data
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;
      const entry = row as Record<string, unknown>;
      const totalScore = readNumber(entry.totalScore);

      if (
        typeof entry.teamId !== "string" ||
        typeof entry.teamName !== "string" ||
        totalScore === null
      ) {
        return null;
      }

      return {
        teamId: entry.teamId,
        teamName: entry.teamName,
        totalScore,
        technical: readNumber(entry.technical) ?? 0,
        feasibility: readNumber(entry.feasibility) ?? 0,
        innovation: readNumber(entry.innovation) ?? 0,
        presentation: readNumber(entry.presentation) ?? 0,
        impact: readNumber(entry.impact) ?? 0,
        evaluationCount: readNumber(entry.evaluationCount) ?? 0,
      };
    })
    .filter((team): team is LeaderboardTeam => team !== null)
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        b.technical - a.technical ||
        a.teamName.localeCompare(b.teamName),
    );
};

const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export default function JudgeLeaderboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const stageId = searchParams.get("stageId");
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [noActiveStageMessage, setNoActiveStageMessage] =
    React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<LeaderboardTeam[]>([]);
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});
  const [isFinalStage, setIsFinalStage] = React.useState(false);

  const loadLeaderboard = React.useCallback(async () => {
    if (!hackathonId) {
      setError("Hackathon not found.");
      setIsLoading(false);
      return;
    }

    if (!stageId) {
      setIsLoading(false);
      setNoActiveStageMessage(null);
      setError("Stage ID is required.");
      setTeams([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNoActiveStageMessage(null);

    try {
      const [leaderboardRes, hackathonRes] = await Promise.all([
        fetchHackathonLeaderboard(hackathonId, stageId),
        fetchHackathonById(hackathonId),
      ]);

      const leaderboardData: unknown = await leaderboardRes.json().catch(() => null);
      const hackathonData: unknown = await hackathonRes.json().catch(() => null);

      if (!leaderboardRes.ok) {
        const message = readMessage(leaderboardData);
        if (
          leaderboardRes.status === 400 &&
          typeof message === "string" &&
          (message.toLowerCase().includes("no active stage") ||
            message.toLowerCase().includes("no evaluation stage found"))
        ) {
          setTeams([]);
          setNoActiveStageMessage(
            "No active stage is currently running. The leaderboard will appear when an evaluation stage becomes active.",
          );
          return;
        }

        setTeams([]);
        setError(message ?? "Failed to load leaderboard.");
        return;
      }

      setTeams(readLeaderboardTeams(leaderboardData));
      setExpandedRows({});
      setIsFinalStage(
        hackathonRes.ok && stageId
          ? readStageType(hackathonData, stageId) === "FINAL"
          : false,
      );
    } catch {
      setTeams([]);
      setError("Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, stageId]);

  React.useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    void loadLeaderboard();
  }, [isSessionPending, loadLeaderboard, router, session?.user?.id]);

  return (
    <div className="relative min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <button
          onClick={() =>
            router.push(
              `/hackathons/${hackathonId}/judge${
                stageId ? `?stageId=${encodeURIComponent(stageId)}` : ""
              }`,
            )
          }
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Judge Panel
        </button>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm text-white/60">
              <Trophy className="size-4 text-amber-300" />
              Judge/Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Leaderboard
            </h1>
            <p className="mt-3 text-sm text-white/60 sm:text-base">
              Review final rankings, then confirm{" "}
              {isFinalStage ? "winners" : "shortlisted teams"} on the dedicated page.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!stageId) {
                  setError("Stage ID is required.");
                  return;
                }
                router.push(
                  `/hackathons/${hackathonId}/judge/confirm-shortlist?stageId=${encodeURIComponent(stageId)}`,
                );
              }}
            >
              {isFinalStage ? "Go to Confirm Winners" : "Go to Confirm Shortlist"}
            </Button>
            <Button variant="outline" onClick={loadLeaderboard} disabled={isLoading}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Refreshing...
                </span>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-white/70">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                Loading leaderboard...
              </span>
            </CardContent>
          </Card>
        ) : noActiveStageMessage ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Leaderboard unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/70">{noActiveStageMessage}</p>
              <Button variant="outline" onClick={loadLeaderboard}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Unable to load leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rose-300">{error}</p>
              <Button variant="outline" onClick={loadLeaderboard}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : teams.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">No leaderboard data yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">
                Scores will appear once judges submit evaluations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Leaderboard Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Team Name</th>
                      <th className="px-4 py-3">Total Score</th>
                      <th className="px-4 py-3">Score Breakdown</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, index) => {
                      const rank = index + 1;
                      const isTopThree = rank <= 3;
                      const isExpanded = !!expandedRows[team.teamId];

                      return (
                        <React.Fragment key={team.teamId}>
                          <tr
                            className={`border-b border-white/10 align-top transition-colors ${
                              isTopThree ? "bg-purple-500/10" : ""
                            }`}
                          >
                            <td className="px-4 py-4 font-semibold text-white">#{rank}</td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-white">{team.teamName}</p>
                              <p className="mt-1 text-xs text-white/55">
                                Evaluations: {team.evaluationCount}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-base font-semibold text-white">
                                {formatScore(team.totalScore)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedRows((current) => ({
                                    ...current,
                                    [team.teamId]: !current[team.teamId],
                                  }))
                                }
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="size-4" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="size-4" />
                                    Expand
                                  </>
                                )}
                              </Button>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (!stageId) {
                                    setError("Stage ID is required.");
                                    return;
                                  }
                                  router.push(
                                    isFinalStage
                                      ? `/hackathons/${hackathonId}/judge/final/evaluate/${team.teamId}?stageId=${encodeURIComponent(stageId)}`
                                      : `/hackathons/${hackathonId}/judge/evaluate/${team.teamId}?stageId=${encodeURIComponent(stageId)}`,
                                  );
                                }}
                              >
                                Review
                              </Button>
                            </td>
                          </tr>

                          {isExpanded ? (
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                              <td colSpan={5} className="px-4 py-4">
                                <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-3 lg:grid-cols-5">
                                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs text-white/60">Technical</p>
                                    <p className="mt-1 font-semibold">
                                      {formatScore(team.technical)}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs text-white/60">Feasibility</p>
                                    <p className="mt-1 font-semibold">
                                      {formatScore(team.feasibility)}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs text-white/60">Innovation</p>
                                    <p className="mt-1 font-semibold">
                                      {formatScore(team.innovation)}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs text-white/60">Presentation</p>
                                    <p className="mt-1 font-semibold">
                                      {formatScore(team.presentation)}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs text-white/60">Impact</p>
                                    <p className="mt-1 font-semibold">
                                      {formatScore(team.impact)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


