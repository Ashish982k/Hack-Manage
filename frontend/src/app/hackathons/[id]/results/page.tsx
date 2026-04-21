"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";

import {
  fetchHackathonById,
  fetchHackathonLeaderboard,
  fetchHackathonShortlistedTeams,
} from "@/api";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StageType = "SUBMISSION" | "EVALUATION" | "FINAL";

type LeaderboardTeam = {
  teamId: string;
  teamName: string;
  totalScore: number;
};

const podiumLabels = [
  { medal: "🥇", title: "Winner" },
  { medal: "🥈", title: "Runner-up" },
  { medal: "🥉", title: "Second runner-up" },
] as const;

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

const readScore = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const readFinalStageId = (value: unknown): string | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("stages" in value) ||
    !Array.isArray((value as { stages?: unknown }).stages)
  ) {
    return null;
  }

  const finalStages = (value as { stages: unknown[] }).stages
    .map((stage) => {
      if (typeof stage !== "object" || stage === null) return null;
      const row = stage as Record<string, unknown>;
      if (typeof row.id !== "string" || row.type !== "FINAL") return null;
      const startTime =
        typeof row.startTime === "string" && row.startTime.trim().length > 0
          ? row.startTime
          : null;
      const stageType = row.type as StageType;

      return {
        id: row.id,
        type: stageType,
        startTime,
      };
    })
    .filter(
      (
        stage,
      ): stage is { id: string; type: StageType; startTime: string | null } =>
        stage !== null,
    )
    .sort(
      (a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
        a.id.localeCompare(b.id),
    );

  return finalStages[0]?.id ?? null;
};

const readLeaderboard = (value: unknown): LeaderboardTeam[] => {
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
      const totalScore = readScore(entry.totalScore);
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
      };
    })
    .filter((team): team is LeaderboardTeam => team !== null)
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore || a.teamName.localeCompare(b.teamName),
    );
};

const readShortlistedTeamIds = (value: unknown) => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("data" in value) ||
    !Array.isArray((value as { data?: unknown }).data)
  ) {
    return new Set<string>();
  }

  return new Set(
    (value as { data: unknown[] }).data
      .map((row) => {
        if (typeof row !== "object" || row === null) return null;
        const entry = row as Record<string, unknown>;
        return typeof entry.teamId === "string" ? entry.teamId : null;
      })
      .filter((teamId): teamId is string => teamId !== null),
  );
};

const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export default function HackathonResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedStageId = searchParams.get("stageId");

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardTeam[]>([]);

  const loadResults = React.useCallback(async () => {
    if (!hackathonId) {
      setIsLoading(false);
      setError("Hackathon not found.");
      setLeaderboard([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hackathonRes = await fetchHackathonById(hackathonId);
      const hackathonData: unknown = await hackathonRes.json().catch(() => null);

      if (!hackathonRes.ok) {
        setLeaderboard([]);
        setError(readMessage(hackathonData) ?? "Failed to fetch results");
        return;
      }

      const finalStageId = readFinalStageId(hackathonData);
      if (!finalStageId) {
        setLeaderboard([]);
        setError("Final stage is not configured for this hackathon.");
        return;
      }

      if (requestedStageId && requestedStageId !== finalStageId) {
        setLeaderboard([]);
        setError("Results are available only for the final stage. Redirecting...");
        router.replace(
          `/hackathons/${hackathonId}/results?stageId=${encodeURIComponent(finalStageId)}`,
        );
        return;
      }

      const leaderboardRes = await fetchHackathonLeaderboard(hackathonId, finalStageId);
      const leaderboardData: unknown = await leaderboardRes.json().catch(() => null);

      if (!leaderboardRes.ok) {
        setLeaderboard([]);
        setError(readMessage(leaderboardData) ?? "Failed to fetch results");
        return;
      }

      const allFinalTeams = readLeaderboard(leaderboardData);
      const shortlistedRes = await fetchHackathonShortlistedTeams(hackathonId, finalStageId);
      const shortlistedData: unknown = await shortlistedRes.json().catch(() => null);
      const shortlistedTeamIds = shortlistedRes.ok
        ? readShortlistedTeamIds(shortlistedData)
        : new Set<string>();

      if (shortlistedTeamIds.size > 0) {
        const winnerRows = allFinalTeams.filter((team) =>
          shortlistedTeamIds.has(team.teamId),
        );
        setLeaderboard(winnerRows);
        return;
      }

      setLeaderboard(allFinalTeams);
    } catch {
      setLeaderboard([]);
      setError("Failed to fetch results");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, requestedStageId, router]);

  React.useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const winners = leaderboard.slice(0, 3);

  return (
    <div className="relative min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <div className="mb-8">
          <p className="inline-flex items-center gap-2 text-sm text-white/60">
            <Trophy className="size-4 text-amber-300" />
            Final Results
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Winners
          </h1>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center py-10 text-white/70">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading results...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Unable to load results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rose-300">{error}</p>
              <Button variant="outline" onClick={() => void loadResults()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : leaderboard.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-sm text-white/70">
              No final-round evaluations available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {winners.map((winner, index) => {
                const label = podiumLabels[index];
                return (
                  <Card
                    key={winner.teamId}
                    className={index === 0 ? "border-amber-300/30 bg-amber-300/5" : "border-white/10"}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white/90">
                        {label.medal} {label.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <p className="text-lg font-semibold text-white">{winner.teamName}</p>
                      <p className="text-sm text-white/70">Score: {formatScore(winner.totalScore)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-white">Final Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Team Name</th>
                        <th className="px-4 py-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((team, index) => (
                        <tr key={team.teamId} className="border-b border-white/10">
                          <td className="px-4 py-3 font-semibold text-white">#{index + 1}</td>
                          <td className="px-4 py-3 text-white/90">{team.teamName}</td>
                          <td className="px-4 py-3 text-white/80">
                            {formatScore(team.totalScore)}
                          </td>
                        </tr>
                      ))}
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

