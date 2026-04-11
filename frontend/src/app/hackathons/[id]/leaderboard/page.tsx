"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicLeaderboardTeam = {
  teamId: string;
  teamName: string;
  totalScore: number;
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

const isPublicLeaderboardTeam = (value: unknown): value is PublicLeaderboardTeam => {
  if (typeof value !== "object" || value === null) return false;

  const team = value as Record<string, unknown>;
  return (
    typeof team.teamId === "string" &&
    typeof team.teamName === "string" &&
    typeof team.totalScore === "number" &&
    typeof team.qualified === "boolean"
  );
};

const readLeaderboardTeams = (value: unknown): PublicLeaderboardTeam[] => {
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: unknown[] }).data.filter(isPublicLeaderboardTeam);
  }

  return [];
};

const sortByScore = (teams: PublicLeaderboardTeam[]) =>
  [...teams].sort(
    (a, b) => b.totalScore - a.totalScore || a.teamName.localeCompare(b.teamName),
  );

const formatScore = (score: number) =>
  Number.isInteger(score) ? String(score) : score.toFixed(2);

const getTopRankClasses = (rank: number) => {
  if (rank === 1) {
    return {
      row: "bg-yellow-500/10",
      rankBadge: "bg-yellow-500/20 text-yellow-100 ring-yellow-300/30",
      rankLabel: "Gold",
    };
  }

  if (rank === 2) {
    return {
      row: "bg-slate-400/10",
      rankBadge: "bg-slate-300/20 text-slate-100 ring-slate-200/30",
      rankLabel: "Silver",
    };
  }

  if (rank === 3) {
    return {
      row: "bg-amber-700/15",
      rankBadge: "bg-amber-700/30 text-amber-100 ring-amber-300/30",
      rankLabel: "Bronze",
    };
  }

  return {
    row: "",
    rankBadge: "bg-white/10 text-white/75 ring-white/15",
    rankLabel: null as string | null,
  };
};

export default function PublicLeaderboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<PublicLeaderboardTeam[]>([]);

  const loadLeaderboard = React.useCallback(async () => {
    if (!hackathonId) {
      setIsLoading(false);
      setError("Hackathon not found.");
      setTeams([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `http://localhost:5000/hackathons/${encodeURIComponent(
          hackathonId,
        )}/leaderboard`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setTeams([]);
        setError(readMessage(data) ?? "Failed to load leaderboard.");
        return;
      }

      setTeams(sortByScore(readLeaderboardTeams(data)));
    } catch {
      setTeams([]);
      setError("Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  React.useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const highestScore = React.useMemo(() => {
    if (teams.length === 0) return null;
    return teams[0]?.totalScore ?? null;
  }, [teams]);

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-sm text-white/60">
              <Trophy className="size-4 text-amber-300" />
              Public Results
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Hackathon Leaderboard
            </h1>
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
              <CardTitle className="text-white">No rankings published yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">
                Final results will appear here once evaluations are complete.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs uppercase tracking-wide text-white/60">Total Teams</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{teams.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs uppercase tracking-wide text-white/60">Highest Score</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {highestScore === null ? "-" : formatScore(highestScore)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Team Name</th>
                        <th className="px-4 py-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, index) => {
                        const rank = index + 1;
                        const rankStyles = getTopRankClasses(rank);

                        return (
                          <tr
                            key={team.teamId}
                            className={cn(
                              "border-b border-white/10 transition-colors hover:bg-white/5",
                              rankStyles.row,
                            )}
                          >
                            <td className="px-4 py-4">
                              <div className="inline-flex items-center gap-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                                    rankStyles.rankBadge,
                                  )}
                                >
                                  #{rank}
                                </span>
                                {rankStyles.rankLabel ? (
                                  <span className="text-xs text-white/70">
                                    {rankStyles.rankLabel}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-white">{team.teamName}</span>
                                {team.qualified ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-200 ring-emerald-300/20">
                                    Qualified
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-base font-semibold text-white">
                              {formatScore(team.totalScore)}
                            </td>
                          </tr>
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
