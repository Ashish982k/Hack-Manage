"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchHackathonById, fetchHackathonShortlistedTeams } from "@/api";
import { cn } from "@/lib/utils";

type ShortlistedTeam = {
  teamId: string;
  teamName: string;
};

type StageSummary = {
  id: string;
  type: string;
  startTime: string | null;
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

const isShortlistedTeam = (value: unknown): value is ShortlistedTeam => {
  if (typeof value !== "object" || value === null) return false;

  const team = value as Record<string, unknown>;
  return (
    typeof team.teamId === "string" &&
    typeof team.teamName === "string"
  );
};

const readShortlistedTeams = (value: unknown): ShortlistedTeam[] => {
  if (Array.isArray(value)) {
    return value.filter(isShortlistedTeam);
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: unknown[] }).data.filter(isShortlistedTeam);
  }

  return [];
};

const readStages = (value: unknown): StageSummary[] => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("stages" in value) ||
    !Array.isArray((value as { stages?: unknown }).stages)
  ) {
    return [];
  }

  return (value as { stages: unknown[] }).stages
    .map((stage) => {
      if (typeof stage !== "object" || stage === null) return null;
      const row = stage as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.type !== "string") return null;
      return {
        id: row.id,
        type: row.type,
        startTime:
          typeof row.startTime === "string" && row.startTime.trim().length > 0
            ? row.startTime
            : null,
      };
    })
    .filter((stage): stage is StageSummary => stage !== null)
    .sort(
      (a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
        a.id.localeCompare(b.id),
    );
};

const readDefaultStageId = (stages: StageSummary[]) => {
  const finalStage = stages.find((stage) => stage.type === "FINAL");
  if (finalStage) return finalStage.id;

  const latestEvaluation = [...stages]
    .filter((stage) => stage.type === "EVALUATION")
    .sort(
      (a, b) =>
        (b.startTime ?? "").localeCompare(a.startTime ?? "") ||
        b.id.localeCompare(a.id),
    )[0];
  if (latestEvaluation) return latestEvaluation.id;

  return stages[0]?.id ?? null;
};

const sortByTeamName = (teams: ShortlistedTeam[]) =>
  [...teams].sort((a, b) => a.teamName.localeCompare(b.teamName));

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
  const searchParams = useSearchParams();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const stageId = searchParams.get("stageId");

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<ShortlistedTeam[]>([]);
  const [resolvedStageId, setResolvedStageId] = React.useState<string | null>(null);

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
      const hackathonRes = await fetchHackathonById(hackathonId);
      const hackathonData: unknown = await hackathonRes.json().catch(() => null);
      if (!hackathonRes.ok) {
        setTeams([]);
        setError(readMessage(hackathonData) ?? "Failed to load shortlisted teams.");
        return;
      }

      const stages = readStages(hackathonData);
      if (stages.length === 0) {
        setTeams([]);
        setError("No stages are configured for this hackathon.");
        return;
      }

      const requestedStageId =
        stageId && stages.some((stage) => stage.id === stageId) ? stageId : null;
      const initialStageId = requestedStageId ?? readDefaultStageId(stages);

      if (!initialStageId) {
        setTeams([]);
        setError("No valid stage found for shortlist.");
        return;
      }

      const stageCandidates = [
        initialStageId,
        ...[...stages]
          .sort(
            (a, b) =>
              (b.startTime ?? "").localeCompare(a.startTime ?? "") ||
              b.id.localeCompare(a.id),
          )
          .map((stage) => stage.id)
          .filter((id) => id !== initialStageId),
      ];

      let resolvedStage = initialStageId;
      let resolvedTeams: ShortlistedTeam[] = [];
      let lastError: string | null = null;

      for (const candidateStageId of stageCandidates) {
        const res = await fetchHackathonShortlistedTeams(hackathonId, candidateStageId);
        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          lastError = readMessage(data) ?? "Failed to load shortlisted teams.";
          continue;
        }

        const candidateTeams = sortByTeamName(readShortlistedTeams(data));
        if (candidateTeams.length > 0) {
          resolvedStage = candidateStageId;
          resolvedTeams = candidateTeams;
          break;
        }
      }

      setResolvedStageId(resolvedStage);
      setTeams(resolvedTeams);

      if (stageId !== resolvedStage) {
        router.replace(
          `/hackathons/${hackathonId}/leaderboard?stageId=${encodeURIComponent(resolvedStage)}`,
        );
      }

      if (!resolvedTeams.length && lastError) {
        setError(lastError);
      } else {
        setError(null);
      }
    } catch {
      setTeams([]);
      setError("Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, router, stageId]);

  React.useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);


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

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-sm text-white/60">
              <Trophy className="size-4 text-amber-300" />
              Public Results
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Shortlisted Teams
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
                Loading shortlisted teams...
              </span>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Unable to load shortlisted teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rose-300">{error}</p>
              {resolvedStageId ? (
                <p className="text-xs text-white/60">
                  Resolved stage: {resolvedStageId}
                </p>
              ) : null}
              <Button variant="outline" onClick={loadLeaderboard}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : teams.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">No shortlisted teams yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">
                Shortlisted teams will appear here after judges confirm the shortlist.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-1">
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs uppercase tracking-wide text-white/60">Total Shortlisted</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{teams.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Team Name</th>
                        <th className="px-4 py-3">Status</th>
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
                              </div>
                            </td>
                            <td className="px-4 py-4 text-base font-semibold text-white">
                              <Badge className="bg-emerald-500/15 text-emerald-200 ring-emerald-300/20">
                                Shortlisted
                              </Badge>
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

