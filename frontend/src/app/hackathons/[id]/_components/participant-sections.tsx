"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, Link, Loader2, QrCode, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { formatScore } from "../_lib/utils";
import type {
  ProblemStatement,
  SubmissionStatus,
  TeamInfo,
} from "../_lib/types";
import { ToneBadge } from "./shared-ui";

type ScoreBreakdown = {
  technical: number;
  feasibility: number;
  innovation: number;
  presentation: number;
  impact: number;
  totalScore: number;
  evaluationCount: number;
} | null;

type ParticipantSectionsProps = {
  hackathonId: string;
  isLoadingTeam: boolean;
  isHackathonAdmin: boolean;
  isJoined: boolean;
  team: TeamInfo | null;
  canViewQrCodes: boolean;
  onJoin: () => Promise<void>;
  submissionStatus: SubmissionStatus;
  isSubmissionStageActive: boolean;
  hasTeam: boolean;
  driveUrl: string;
  onDriveUrlChange: (value: string) => void;
  repo: string;
  onRepoChange: (value: string) => void;
  isSubmissionEvaluated: boolean;
  isSubmissionLocked: boolean;
  canSubmit: boolean;
  problemStatements: ProblemStatement[];
  selectedProblemStatementId: string;
  onSelectedProblemStatementChange: (value: string) => void;
  lastSubmitted: { fileName: string; at: string } | null;
  isEditing: boolean;
  onStartEditing: () => void;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  showScoreBreakdown: boolean;
  onToggleScoreBreakdown: () => void;
  submissionScoreBreakdown: ScoreBreakdown;
};

export function ParticipantSections({
  hackathonId,
  isLoadingTeam,
  isHackathonAdmin,
  isJoined,
  team,
  canViewQrCodes,
  onJoin,
  submissionStatus,
  isSubmissionStageActive,
  hasTeam,
  driveUrl,
  onDriveUrlChange,
  repo,
  onRepoChange,
  isSubmissionEvaluated,
  isSubmissionLocked,
  canSubmit,
  problemStatements,
  selectedProblemStatementId,
  onSelectedProblemStatementChange,
  lastSubmitted,
  isEditing,
  onStartEditing,
  isSubmitting,
  onSubmit,
  showScoreBreakdown,
  onToggleScoreBreakdown,
  submissionScoreBreakdown,
}: ParticipantSectionsProps) {
  const router = useRouter();

  return (
    <>
      <section className="grid gap-6" data-reveal="up">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Team</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTeam ? (
              <div className="flex justify-center p-4">
                <span className="inline-flex items-center gap-2 text-white/60">
                  <Loader2 className="size-5 animate-spin" />
                  Loading team...
                </span>
              </div>
            ) : isHackathonAdmin ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm font-semibold text-white/90">
                  Admin participation is restricted
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Hackathon admins cannot join teams for this event.
                </p>
              </div>
            ) : !isJoined ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm font-semibold text-white/90">
                  You have not joined this hackathon
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Join first, then create a team.
                </p>
                <Button
                  className="mt-4"
                  variant="primary"
                  onClick={() => void onJoin()}
                >
                  Join Hackathon
                </Button>
              </div>
            ) : team ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/60">Team Name</p>
                    <p className="mt-1 text-lg font-semibold text-white/90">
                      {team.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canViewQrCodes ? (
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/hackathons/${hackathonId}/qr`)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <QrCode className="size-4 text-emerald-300" />
                          View QR Codes
                        </span>
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/hackathons/${hackathonId}/team`)
                      }
                    >
                      Manage
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {team.members.map((member) => (
                    <div
                      key={member.id || member.name}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-blue-500/18 ring-1 ring-white/10">
                          <Users className="size-4 text-white/80" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white/90">
                            {member.name}
                          </p>
                          <p className="text-xs text-white/60">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm font-semibold text-white/90">
                  No team yet
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Create your team to start collaborating.
                </p>
                <Button
                  className="mt-4"
                  variant="primary"
                  onClick={() =>
                    router.push(`/hackathons/${hackathonId}/create-team`)
                  }
                >
                  Create Team
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6" data-reveal="up">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-white">Submission</CardTitle>
              <ToneBadge
                tone={
                  submissionStatus === "Submitted"
                    ? "success"
                    : submissionStatus === "Under review"
                      ? "warning"
                      : "neutral"
                }
              >
                {submissionStatus}
              </ToneBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!isSubmissionStageActive ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm font-semibold text-white/90">
                  Submission stage is not active
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Submissions can be made only during the active submission stage.
                </p>
              </div>
            ) : !isJoined && !isLoadingTeam ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm font-semibold text-white/90">
                  Join required
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Join the hackathon to unlock submissions.
                </p>
              </div>
            ) : !hasTeam && !isLoadingTeam ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm font-semibold text-white/90">
                  No team available
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Please create a team to unlock the submission form.
                </p>
                <Button
                  className="mt-4"
                  variant="primary"
                  onClick={() =>
                    router.push(`/hackathons/${hackathonId}/create-team`)
                  }
                >
                  Create Team
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white/90">
                      Presentation / Drive URL
                    </p>
                    <div className="mt-2 relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                        <Link className="size-4" />
                      </span>
                      <Input
                        value={driveUrl}
                        onChange={(event) => onDriveUrlChange(event.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="pl-10"
                        disabled={
                          isSubmissionEvaluated ||
                          isSubmissionLocked ||
                          !canSubmit
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white/90">
                      GitHub Repo
                    </p>
                    <div className="mt-2 relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                        <Link className="size-4" />
                      </span>
                      <Input
                        value={repo}
                        onChange={(event) => onRepoChange(event.target.value)}
                        placeholder="https://github.com/your-team/project"
                        className="pl-10"
                        disabled={
                          isSubmissionEvaluated ||
                          isSubmissionLocked ||
                          !canSubmit
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white/90">
                    Problem Statement
                    {problemStatements.length > 0 ? (
                      <span className="text-purple-400"> *</span>
                    ) : null}
                  </p>
                  {problemStatements.length > 0 ? (
                    <select
                      value={selectedProblemStatementId}
                      onChange={(event) =>
                        onSelectedProblemStatementChange(event.target.value)
                      }
                      className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      disabled={
                        isSubmissionEvaluated ||
                        isSubmissionLocked ||
                        !canSubmit
                      }
                    >
                      <option value="">Select a problem statement</option>
                      {problemStatements.map((statement) => (
                        <option key={statement.id} value={statement.id}>
                          {statement.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/50">
                      No problem statements are available for this
                      hackathon.
                    </div>
                  )}
                </div>

                {lastSubmitted ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-white/60">
                      Last submission
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white/90">
                      {lastSubmitted.fileName}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      {new Date(lastSubmitted.at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className={
                      isSubmissionEvaluated
                        ? "text-sm text-emerald-300"
                        : "text-sm text-white/60"
                    }
                  >
                    {isSubmissionEvaluated
                      ? "Your submission has been evaluated."
                      : submissionStatus === "Submitted"
                        ? "Your submission is saved."
                        : "Make sure your deck explains the workflow, QR flow, and evaluation."}
                  </div>
                  <div className="flex items-center gap-2">
                    {submissionStatus === "Submitted" &&
                      !isEditing &&
                      !isSubmissionEvaluated && (
                        <Button
                          variant="outline"
                          onClick={onStartEditing}
                        >
                          Update Submission
                        </Button>
                      )}
                    {!(!isEditing && submissionStatus === "Submitted") && (
                      <Button
                        variant="primary"
                        onClick={() => void onSubmit()}
                        disabled={
                          isSubmissionEvaluated ||
                          isSubmissionLocked ||
                          !canSubmit
                        }
                      >
                        {isSubmitting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <FileText className="size-4" />
                            Submit
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {isSubmissionEvaluated && submissionScoreBreakdown ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white/90">
                        Score Breakdown
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleScoreBreakdown}
                      >
                        {showScoreBreakdown ? (
                          <>
                            <ChevronUp className="size-4" />
                            Hide scores
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-4" />
                            View scores
                          </>
                        )}
                      </Button>
                    </div>

                    {showScoreBreakdown ? (
                      <div className="mt-3 grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs text-white/60">
                            Technical
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatScore(
                              submissionScoreBreakdown.technical,
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs text-white/60">
                            Feasibility
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatScore(
                              submissionScoreBreakdown.feasibility,
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs text-white/60">
                            Innovation
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatScore(
                              submissionScoreBreakdown.innovation,
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs text-white/60">
                            Presentation
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatScore(
                              submissionScoreBreakdown.presentation,
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs text-white/60">Impact</p>
                          <p className="mt-1 font-semibold">
                            {formatScore(submissionScoreBreakdown.impact)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs text-white/60">
                            Total Score
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatScore(
                              submissionScoreBreakdown.totalScore,
                            )}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            Evaluations:{" "}
                            {submissionScoreBreakdown.evaluationCount}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
