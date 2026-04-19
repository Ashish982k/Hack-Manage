"use client";

import { Calendar, FileText, Gavel, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ScheduleItem, StageInfo, SubmissionStatus, TeamInfo } from "../_lib/types";
import { ToneBadge } from "./shared-ui";

type SidebarSectionProps = {
  scheduleItems: ScheduleItem[];
  isParticipantRole: boolean;
  isJoined: boolean;
  team: TeamInfo | null;
  submissionStatus: SubmissionStatus;
  isSubmissionEvaluated: boolean;
  evaluationStageInfo: StageInfo | null;
  finalStageInfo: StageInfo | null;
};

export function SidebarSection({
  scheduleItems,
  isParticipantRole,
  isJoined,
  team,
  submissionStatus,
  isSubmissionEvaluated,
  evaluationStageInfo,
  finalStageInfo,
}: SidebarSectionProps) {
  return (
    <aside
      className="space-y-6 lg:sticky lg:top-8 lg:h-fit"
      data-reveal="up"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Important Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {scheduleItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      {item.badge === "Registration" ? (
                        <Calendar className="size-4 text-white/80" />
                      ) : item.badge === "Submission" ? (
                        <FileText className="size-4 text-white/80" />
                      ) : item.badge === "Evaluation" ? (
                        <Gavel className="size-4 text-white/80" />
                      ) : (
                        <Trophy className="size-4 text-white/80" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white/90">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-white/60">{item.date}</p>
                      <p className="mt-0.5 text-xs text-white/60">{item.time}</p>
                    </div>
                  </div>
                  <ToneBadge tone={item.active ? "success" : "neutral"}>
                    {item.badge}
                  </ToneBadge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isParticipantRole ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Your Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-semibold text-white/90">Team</p>
                  <p className="mt-1 text-xs text-white/60">
                    {!isJoined
                      ? "Not joined"
                      : team
                        ? `${team.members.length} members`
                        : "No team"}
                  </p>
                </div>
                <ToneBadge tone={team ? "success" : "warning"}>
                  {team ? "Ready" : isJoined ? "Pending" : "Join"}
                </ToneBadge>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-semibold text-white/90">Submission</p>
                  <p className="mt-1 text-xs text-white/60">{submissionStatus}</p>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/90">Step 1</p>
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
                  <p className="text-sm font-semibold text-white/90">Step 2</p>
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
                  <p className="text-sm font-semibold text-white/90">Step 3</p>
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
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Judge/Admin Stage View</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <p>
              Evaluation stage:{" "}
              <span className="text-white/90">
                {evaluationStageInfo?.title ?? "Not configured"}
              </span>
            </p>
            <p>
              Final stage:{" "}
              <span className="text-white/90">
                {finalStageInfo?.title ?? "Not configured"}
              </span>
            </p>
            <p className="text-white/60">
              Participant-only team/submission widgets are hidden for your role.
            </p>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
