"use client";

import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { LeaderboardTeam } from "../_lib/types";
import { JudgeLeaderboard, PublicLeaderboard } from "./leaderboards";

type LeaderboardSectionProps = {
  showJudgeLeaderboard: boolean;
  isLeaderboardLoading: boolean;
  leaderboardError: string | null;
  sortedLeaderboardTeams: LeaderboardTeam[];
  selectedShortlistedTeams: Set<string>;
  shortlistedTeams: Set<string>;
  isShortlistConfirmed: boolean;
  isConfirmingShortlist: boolean;
  onToggleShortlist: (teamId: string) => void;
  onConfirmShortlist: () => Promise<void>;
};

export function LeaderboardSection({
  showJudgeLeaderboard,
  isLeaderboardLoading,
  leaderboardError,
  sortedLeaderboardTeams,
  selectedShortlistedTeams,
  shortlistedTeams,
  isShortlistConfirmed,
  isConfirmingShortlist,
  onToggleShortlist,
  onConfirmShortlist,
}: LeaderboardSectionProps) {
  return (
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
              onToggleShortlist={onToggleShortlist}
              onConfirmShortlist={onConfirmShortlist}
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
    </section>
  );
}
