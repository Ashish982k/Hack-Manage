"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatScore } from "../_lib/utils";
import type { LeaderboardTeam } from "../_lib/types";
import { ToneBadge } from "./shared-ui";

export function PublicLeaderboard({
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
      <table className="w-full min-w-[640px] border-collapse text-sm">
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
            const rank = index + 1;
            const shortlisted = shortlistedTeams.has(team.teamId);

            return (
              <tr key={team.teamId} className="border-b border-white/10">
                <td className="px-4 py-3 font-semibold text-white/90">#{rank}</td>
                <td className="px-4 py-3 text-white/90">{team.teamName}</td>
                <td className="px-4 py-3 text-white/80">{formatScore(team.totalScore)}</td>
                <td className="px-4 py-3">
                  {isShortlistConfirmed ? (
                    shortlisted ? (
                      <ToneBadge tone="success">Shortlisted</ToneBadge>
                    ) : (
                      <ToneBadge tone="neutral">Not shortlisted</ToneBadge>
                    )
                  ) : (
                    <ToneBadge tone="warning">Pending shortlist</ToneBadge>
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

export function JudgeLeaderboard({
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
  onConfirmShortlist: () => Promise<void>;
}) {
  const hasSelection = selectedShortlistedTeams.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">
          Select teams to shortlist for final round.
        </p>
        <Button
          variant="primary"
          onClick={() => void onConfirmShortlist()}
          disabled={!hasSelection || isShortlistConfirmed || isConfirmingShortlist}
        >
          {isConfirmingShortlist ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Confirming...
            </span>
          ) : isShortlistConfirmed ? (
            "Shortlist confirmed"
          ) : (
            "Confirm shortlist"
          )}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <th className="px-4 py-3">Select</th>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Evaluations</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => {
              const checked = selectedShortlistedTeams.has(team.teamId);

              return (
                <tr key={team.teamId} className="border-b border-white/10">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-white/20 bg-white/[0.04] accent-purple-500"
                      checked={checked}
                      disabled={isShortlistConfirmed}
                      onChange={() => onToggleShortlist(team.teamId)}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-white/90">#{index + 1}</td>
                  <td className="px-4 py-3 text-white/90">{team.teamName}</td>
                  <td className="px-4 py-3 text-white/80">{formatScore(team.totalScore)}</td>
                  <td className="px-4 py-3 text-white/70">{team.evaluationCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
