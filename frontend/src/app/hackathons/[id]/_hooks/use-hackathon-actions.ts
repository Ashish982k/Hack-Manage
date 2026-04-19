"use client";

import * as React from "react";

import {
  confirmHackathonShortlist,
  fetchHackathonShortlistedTeams,
  joinHackathon,
  leaveHackathon,
  uploadHackathonSubmission,
} from "@/api";

import type {
  LeaderboardTeam,
  ProblemStatement,
  TeamInfo,
  ToastState,
} from "../_lib/types";
import { hasMessage, readShortlistedStageId, readShortlistedTeamIds } from "../_lib/utils";

type UseHackathonActionsArgs = {
  hackathonId: string;
  sessionExists: boolean;
  push: (href: string) => void;
  isHackathonAdmin: boolean;
  isJoined: boolean;
  team: TeamInfo | null;
  isSubmissionEvaluated: boolean;
  driveUrl: string;
  repo: string;
  problemStatements: ProblemStatement[];
  selectedProblemStatementId: string;
  fetchTeam: () => Promise<void>;
  leaderboardStageId: string | null;
  isShortlistConfirmed: boolean;
  sortedLeaderboardTeams: LeaderboardTeam[];
  selectedShortlistedTeams: Set<string>;
  setSelectedShortlistedTeams: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  setShortlistedTeams: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsShortlistConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  setIsConfirmingShortlist: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setLastSubmitted: React.Dispatch<
    React.SetStateAction<{ fileName: string; at: string } | null>
  >;
  setSubmissionStatus: React.Dispatch<
    React.SetStateAction<"Not submitted" | "Submitted" | "Under review">
  >;
  setIsSubmissionEvaluated: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
};

export function useHackathonActions({
  hackathonId,
  sessionExists,
  push,
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
}: UseHackathonActionsArgs) {
  const handleSubmit = React.useCallback(async () => {
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
  }, [
    driveUrl,
    fetchTeam,
    hackathonId,
    isJoined,
    isSubmissionEvaluated,
    problemStatements.length,
    repo,
    selectedProblemStatementId,
    setIsEditing,
    setIsSubmissionEvaluated,
    setIsSubmitting,
    setLastSubmitted,
    setSubmissionStatus,
    setToast,
    team,
  ]);

  const toggleTeamShortlist = React.useCallback(
    (teamId: string) => {
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
    },
    [isShortlistConfirmed, setSelectedShortlistedTeams],
  );

  const handleConfirmShortlist = React.useCallback(async () => {
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
        .filter((teamRow) => selectedShortlistedTeams.has(teamRow.teamId))
        .map((teamRow) => teamRow.teamId);

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
  }, [
    hackathonId,
    isShortlistConfirmed,
    leaderboardStageId,
    selectedShortlistedTeams,
    setIsConfirmingShortlist,
    setIsShortlistConfirmed,
    setSelectedShortlistedTeams,
    setShortlistedTeams,
    setToast,
    sortedLeaderboardTeams,
  ]);

  const handleJoin = React.useCallback(async () => {
    if (!sessionExists) {
      push("/login");
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
      } catch {
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
    } catch {
      setToast({
        kind: "error",
        title: "Action Failed",
        message: "Some error occurred",
      });
    }
  }, [
    fetchTeam,
    hackathonId,
    isHackathonAdmin,
    isJoined,
    push,
    sessionExists,
    setToast,
  ]);

  return {
    handleSubmit,
    toggleTeamShortlist,
    handleConfirmShortlist,
    handleJoin,
  };
}
