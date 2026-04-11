"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchHackathonLeaderboard } from "@/api";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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
  qualified: boolean;
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

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const mapLeaderboardTeam = (value: unknown): LeaderboardTeam | null => {
  if (typeof value !== "object" || value === null) return null;

  const team = value as Record<string, unknown>;

  if (typeof team.teamId !== "string" || typeof team.teamName !== "string") {
    return null;
  }

  const totalScore = readNumber(team.totalScore);
  if (totalScore === null) return null;

  return {
    teamId: team.teamId,
    teamName: team.teamName,
    totalScore,
    technical: readNumber(team.technical) ?? 0,
    feasibility: readNumber(team.feasibility) ?? 0,
    innovation: readNumber(team.innovation) ?? 0,
    presentation: readNumber(team.presentation) ?? 0,
    impact: readNumber(team.impact) ?? 0,
    submissionCount:
      readNumber(team.submissionCount) ?? readNumber(team.evaluationCount) ?? 0,
    qualified: typeof team.qualified === "boolean" ? team.qualified : false,
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

const sortByTotalScore = (teams: LeaderboardTeam[]) =>
  [...teams].sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.technical - a.technical ||
      a.teamName.localeCompare(b.teamName),
  );

const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export default function JudgeLeaderboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [noActiveStageMessage, setNoActiveStageMessage] =
    React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<LeaderboardTeam[]>([]);
  const [qualifyCountInput, setQualifyCountInput] = React.useState("0");
  const [confirmedShortlistSize, setConfirmedShortlistSize] = React.useState<
    number | null
  >(null);
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>(
    {},
  );
  const [confirmationNotice, setConfirmationNotice] = React.useState<
    string | null
  >(null);

  const sortedTeams = React.useMemo(() => sortByTotalScore(teams), [teams]);

  const shortlistSize = React.useMemo(() => {
    const parsed = Number.parseInt(qualifyCountInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, sortedTeams.length);
  }, [qualifyCountInput, sortedTeams.length]);

  const autoQualifiedTeamIds = React.useMemo(
    () => new Set(sortedTeams.slice(0, shortlistSize).map((team) => team.teamId)),
    [shortlistSize, sortedTeams],
  );

  const loadLeaderboard = React.useCallback(async () => {
    if (!hackathonId) {
      setError("Hackathon not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAccessDenied(false);
    setNoActiveStageMessage(null);
    setConfirmationNotice(null);

    try {
      const res = await fetchHackathonLeaderboard(hackathonId);

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message = readMessage(data);

        if (
          res.status === 400 &&
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

        setAccessDenied(res.status === 403);
        setTeams([]);
        setError(message ?? "Failed to load leaderboard.");
        return;
      }

      const rows = sortByTotalScore(readLeaderboardTeams(data));
      setTeams(rows);
      setExpandedRows({});

      const existingQualifiedCount = rows.filter((team) => team.qualified).length;
      const defaultShortlistSize =
        existingQualifiedCount > 0 ? existingQualifiedCount : Math.min(3, rows.length);
      setQualifyCountInput(String(defaultShortlistSize));
      setConfirmedShortlistSize(existingQualifiedCount > 0 ? existingQualifiedCount : null);
    } catch {
      setTeams([]);
      setError("Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  React.useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    loadLeaderboard();
  }, [isSessionPending, loadLeaderboard, router, session?.user?.id]);

  const handleQualifyCountChange = (value: string) => {
    setConfirmationNotice(null);

    if (value === "") {
      setQualifyCountInput("");
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    setQualifyCountInput(String(Math.max(0, parsed)));
  };

  const toggleExpanded = (teamId: string) => {
    setExpandedRows((current) => ({ ...current, [teamId]: !current[teamId] }));
  };

  const handleConfirmShortlist = () => {
    setConfirmedShortlistSize(shortlistSize);
    setConfirmationNotice(
      shortlistSize > 0
        ? `Shortlist confirmed for top ${shortlistSize} team${shortlistSize === 1 ? "" : "s"} (UI simulation).`
        : "Shortlist cleared (UI simulation).",
    );
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}/judge`)}
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
              Leaderboard & Shortlisting
            </h1>
            <p className="mt-3 text-sm text-white/60 sm:text-base">
              Review rankings, inspect score breakdowns, and shortlist teams.
            </p>
          </div>

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

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-white/70">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                Loading leaderboard...
              </span>
            </CardContent>
          </Card>
        ) : accessDenied ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Access denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/70">
                Only judges/admins can access this leaderboard.
              </p>
              <p className="text-sm text-rose-300">{error}</p>
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
        ) : sortedTeams.length === 0 ? (
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
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Shortlisting Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="w-full max-w-xs space-y-2">
                    <span className="text-sm text-white/80">Number of teams to qualify</span>
                    <Input
                      type="number"
                      min={0}
                      max={sortedTeams.length}
                      value={qualifyCountInput}
                      onChange={(e) => handleQualifyCountChange(e.target.value)}
                    />
                  </label>
                  <Button variant="primary" onClick={handleConfirmShortlist}>
                    Confirm Shortlist
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-200 ring-emerald-300/20">
                    Auto-qualifying top {shortlistSize}
                  </Badge>
                  {confirmedShortlistSize !== null ? (
                    <Badge className="bg-blue-500/15 text-blue-200 ring-blue-300/20">
                      Last confirmed: top {confirmedShortlistSize}
                    </Badge>
                  ) : (
                    <Badge className="bg-white/10 text-white/70">Not confirmed yet</Badge>
                  )}
                </div>

                {confirmationNotice ? (
                  <p className="text-sm text-emerald-300">{confirmationNotice}</p>
                ) : null}
              </CardContent>
            </Card>

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
                        <th className="px-4 py-3">Qualification Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team, index) => {
                        const rank = index + 1;
                        const isTopThree = rank <= 3;
                        const isCutoff = shortlistSize > 0 && rank === shortlistSize;
                        const isQualifying = autoQualifiedTeamIds.has(team.teamId);
                        const isExpanded = !!expandedRows[team.teamId];

                        return (
                          <React.Fragment key={team.teamId}>
                            <tr
                              className={cn(
                                "border-b border-white/10 align-top transition-colors",
                                isTopThree && "bg-purple-500/10",
                                isCutoff && "bg-amber-500/10",
                              )}
                            >
                              <td className="px-4 py-4">
                                <div className="inline-flex items-center gap-2 font-semibold text-white">
                                  <span>#{rank}</span>
                                  {isTopThree ? (
                                    <Award className="size-4 text-amber-300" />
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-semibold text-white">{team.teamName}</p>
                                <p className="mt-1 text-xs text-white/55">
                                  Evaluations: {team.submissionCount}
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
                                  onClick={() => toggleExpanded(team.teamId)}
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
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className={
                                      isQualifying
                                        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-300/20"
                                        : "bg-white/10 text-white/70"
                                    }
                                  >
                                    {isQualifying ? "Qualifying" : "Not qualifying"}
                                  </Badge>
                                  {isCutoff ? (
                                    <Badge className="bg-amber-500/20 text-amber-200 ring-amber-300/20">
                                      Cutoff
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/hackathons/${hackathonId}/evaluate/${team.teamId}`,
                                    )
                                  }
                                >
                                  <BadgeCheck className="size-4" />
                                  Review
                                </Button>
                              </td>
                            </tr>

                            {isExpanded ? (
                              <tr className="border-b border-white/10 bg-white/[0.02]">
                                <td colSpan={6} className="px-4 py-4">
                                  <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-3 lg:grid-cols-6">
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
                                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                      <p className="text-xs text-white/60">API Qualified</p>
                                      <p className="mt-1 font-semibold">
                                        {team.qualified ? "Yes" : "No"}
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
          </div>
        )}
      </div>
    </div>
  );
}
