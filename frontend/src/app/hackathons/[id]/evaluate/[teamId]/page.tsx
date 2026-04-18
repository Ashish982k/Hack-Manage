"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Gavel, Loader2, Users } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { evaluateTeamSubmission, fetchTeamDetailsById } from "@/api";

type TeamDetailsResponse = {
  team: {
    id: string;
    name: string;
    hackathonId: string;
    leaderId: string;
    members: Array<{
      id: string;
      userId: string;
      status: "pending" | "approved";
      user: {
        id: string;
        name: string;
        email: string;
      } | null;
    }>;
    submission: {
      id: string;
      stageId: string;
      pptUrl: string | null;
      githubUrl: string | null;
      problemStatementId: string | null;
      submittedAt: string;
      previousScores?: {
        innovation: number;
        feasibility: number;
        technical: number;
        presentation: number;
        impact: number;
        total: number;
      } | null;
    } | null;
  };
  stage?: {
    id: string;
    title: string;
    type: "SUBMISSION" | "EVALUATION" | "FINAL";
  };
};

const hasMessage = (value: unknown): value is { message?: string } =>
  typeof value === "object" && value !== null && "message" in value;

const isTeamDetailsResponse = (value: unknown): value is TeamDetailsResponse =>
  typeof value === "object" &&
  value !== null &&
  "team" in value &&
  typeof (value as { team?: unknown }).team === "object" &&
  (value as { team?: unknown }).team !== null;

type ScoreField =
  | "innovation"
  | "feasibility"
  | "technical"
  | "presentation"
  | "impact";

const SCORE_FIELDS: Array<{ key: ScoreField; label: string }> = [
  { key: "innovation", label: "Innovation" },
  { key: "feasibility", label: "Feasibility" },
  { key: "technical", label: "Technical" },
  { key: "presentation", label: "Presentation" },
  { key: "impact", label: "Impact" },
];

export default function EvaluateTeamPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { id: hackathonId, teamId } = React.use(params);
  const stageId = searchParams.get("stageId");
  const isFinalRoute = pathname.includes("/judge/final/evaluate/");
  const judgePanelUrl = `/hackathons/${hackathonId}/judge${
    stageId ? `?stageId=${encodeURIComponent(stageId)}` : ""
  }`;
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [team, setTeam] = React.useState<TeamDetailsResponse["team"] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [scores, setScores] = React.useState<Record<ScoreField, string>>({
    innovation: "",
    feasibility: "",
    technical: "",
    presentation: "",
    impact: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [stageType, setStageType] = React.useState<
    "SUBMISSION" | "EVALUATION" | "FINAL" | null
  >(null);
  const isFinalStage = isFinalRoute || stageType === "FINAL";

  const totalScore = React.useMemo(
    () =>
      SCORE_FIELDS.reduce((sum, field) => sum + (Number(scores[field.key]) || 0), 0),
    [scores],
  );

  React.useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    if (!stageId) {
      setIsLoading(false);
      setError("Stage ID is required.");
      return;
    }

    const loadTeamDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetchTeamDetailsById(teamId, stageId);
        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          setError(
            hasMessage(data) && data.message
              ? data.message
              : "Failed to load team details.",
          );
          return;
        }

        if (!isTeamDetailsResponse(data)) {
          setError("Received invalid team details.");
          return;
        }

        if (data.team.hackathonId !== hackathonId) {
          setError("This team does not belong to the current hackathon.");
          return;
        }

        setTeam(data.team);
        setStageType(data.stage?.type ?? null);
        if (data.team.submission?.previousScores) {
          setScores({
            innovation: String(data.team.submission.previousScores.innovation),
            feasibility: String(data.team.submission.previousScores.feasibility),
            technical: String(data.team.submission.previousScores.technical),
            presentation: String(data.team.submission.previousScores.presentation),
            impact: String(data.team.submission.previousScores.impact),
          });
          setSubmitStatus({
            kind: "success",
            message: "Showing your previous evaluation scores.",
          });
        }
      } catch {
        setError("Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamDetails();
  }, [hackathonId, isSessionPending, router, session?.user?.id, stageId, teamId]);

  const updateScore = (field: ScoreField, value: string) => {
    setScores((current) => ({ ...current, [field]: value }));
    if (submitStatus) setSubmitStatus(null);
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);

    if (!stageId) {
      setSubmitStatus({
        kind: "error",
        message: "Stage ID is required.",
      });
      return;
    }

    if (!isFinalStage && !team?.submission) {
      setSubmitStatus({
        kind: "error",
        message: "No submission found for this team.",
      });
      return;
    }

    const parsedScores = {} as Record<ScoreField, number>;
    for (const field of SCORE_FIELDS) {
      const raw = scores[field.key].trim();
      const numeric = Number(raw);

      if (!raw || !Number.isInteger(numeric) || numeric < 0 || numeric > 10) {
        setSubmitStatus({
          kind: "error",
          message: `Please enter a valid ${field.label.toLowerCase()} score (0-10).`,
        });
        return;
      }

      parsedScores[field.key] = numeric;
    }

    setIsSubmitting(true);
    try {
      const res = await evaluateTeamSubmission(hackathonId, teamId, {
        innovation: parsedScores.innovation,
        feasibility: parsedScores.feasibility,
        technical: parsedScores.technical,
        presentation: parsedScores.presentation,
        impact: parsedScores.impact,
      }, stageId);

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitStatus({
          kind: "error",
          message:
            hasMessage(data) && data.message
              ? data.message
              : "Failed to submit evaluation.",
        });
        return;
      }

      setSubmitStatus({
        kind: "success",
        message: "Evaluation submitted successfully.",
      });
    } catch {
      setSubmitStatus({
        kind: "error",
        message: "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(judgePanelUrl)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Judge Panel
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Gavel className="size-5" />
              Team Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-white/70">
                <Loader2 className="mr-2 size-5 animate-spin" />
                Loading team details...
              </div>
            ) : error ? (
              <p className="text-sm text-rose-300">{error}</p>
            ) : team ? (
              <>
                <div>
                  <p className="text-xs text-white/60">Team</p>
                  <p className="mt-1 text-lg font-semibold text-white">{team.name}</p>
                  <p className="text-xs text-white/50">ID: {team.id}</p>
                </div>

                <div>
                  <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-white/90">
                    <Users className="size-4" />
                    Members
                  </p>
                  <div className="space-y-2">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                      >
                        <span className="text-white/90">
                          {member.user?.name ?? "Unknown User"}
                        </span>
                        <span className="ml-2 text-xs text-white/50">
                          ({member.user?.email ?? "no-email"})
                        </span>
                        <span className="ml-2 text-xs text-white/60">
                          [{member.status}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {!isFinalStage ? (
                  <div>
                    <p className="text-sm font-semibold text-white/90">Submission</p>
                    {team.submission ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          PPT:{" "}
                          {team.submission.pptUrl ? (
                            <a
                              href={team.submission.pptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-white/50">Not provided</span>
                          )}
                        </p>
                        <p>
                          GitHub:{" "}
                          {team.submission.githubUrl ? (
                            <a
                              href={team.submission.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-green-400 underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-white/50">Not provided</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-white/60">
                        No submission found for this team.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white/90">Evaluate Submission</p>
                  <p className="mt-1 text-xs text-white/60">
                    {isFinalStage
                      ? "Enter final-round scores out of 10."
                      : "Enter each criterion score out of 10."}
                  </p>

                  <form className="mt-4 space-y-4" onSubmit={handleEvaluate}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SCORE_FIELDS.map((field) => (
                        <label key={field.key} className="space-y-1">
                          <span className="text-xs font-medium text-white/70">
                            {field.label}
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            step={1}
                            value={scores[field.key]}
                            onChange={(e) => updateScore(field.key, e.target.value)}
                            disabled={isSubmitting}
                            placeholder="0 - 10"
                          />
                        </label>
                      ))}
                    </div>

                    <p className="text-xs text-white/60">
                      Total Score: <span className="font-semibold text-white">{totalScore}</span> / 50
                    </p>

                    {submitStatus ? (
                      <p
                        className={
                          submitStatus.kind === "success"
                            ? "text-sm text-emerald-300"
                            : "text-sm text-rose-300"
                        }
                      >
                        {submitStatus.message}
                      </p>
                    ) : null}

                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Submitting...
                        </span>
                      ) : isFinalStage ? (
                        "Submit Final Evaluation"
                      ) : (
                        "Submit Evaluation"
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/60">Team details unavailable.</p>
            )}

            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                {stageId ? (
                  <Button
                    onClick={() =>
                      router.push(
                        `/hackathons/${hackathonId}/judge/confirm-shortlist?stageId=${encodeURIComponent(stageId)}`,
                      )
                    }
                  >
                    Go to Confirm Shortlist
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => router.push(judgePanelUrl)}
                >
                  Return to submissions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
