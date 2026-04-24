"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Gavel, Loader2, QrCode, ScanLine, Trophy, Users } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  fetchHackathonShortlistedTeams,
  fetchJudgeAccess,
  fetchJudgeSubmissions,
  generateHackathonEntryQr,
  generateHackathonFoodQr,
} from "@/api";

type StageType = "SUBMISSION" | "EVALUATION" | "FINAL";

type Submission = {
  submissionId: string;
  pptUrl: string | null;
  githubUrl: string | null;
  submittedAt: string;
  stageId: string;
  stageTitle: string;
  stageType: string;
  teamId: string;
  teamName: string;
  evaluated?: boolean;
};

type ShortlistedTeam = {
  teamId: string;
  teamName: string;
};

type JudgeAccessResponse = {
  isJudge: boolean;
  isAdmin: boolean;
  activeStageType: StageType | null;
};

const isStageType = (value: unknown): value is StageType =>
  value === "SUBMISSION" || value === "EVALUATION" || value === "FINAL";

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

const readSubmissions = (value: unknown): Submission[] => {
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: Submission[] }).data;
  }

  return [];
};

const readShortlistedTeams = (value: unknown): ShortlistedTeam[] => {
  const rows =
    Array.isArray(value)
      ? value
      : typeof value === "object" &&
          value !== null &&
          "data" in value &&
          Array.isArray((value as { data?: unknown }).data)
        ? (value as { data: unknown[] }).data
        : [];

  return rows
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;
      const item = row as Record<string, unknown>;

      if (typeof item.teamId !== "string" || typeof item.teamName !== "string") {
        return null;
      }

      return { teamId: item.teamId, teamName: item.teamName };
    })
    .filter((row): row is ShortlistedTeam => row !== null);
};

const readJudgeAccess = (value: unknown): JudgeAccessResponse | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("isJudge" in value) ||
    typeof (value as { isJudge?: unknown }).isJudge !== "boolean"
  ) {
    return null;
  }

  const isAdmin =
    "isAdmin" in value && typeof (value as { isAdmin?: unknown }).isAdmin === "boolean"
      ? (value as { isAdmin: boolean }).isAdmin
      : false;

  const activeStageType =
    "activeStageType" in value && isStageType((value as { activeStageType?: unknown }).activeStageType)
      ? (value as { activeStageType: StageType }).activeStageType
      : null;

  return {
    isJudge: (value as { isJudge: boolean }).isJudge,
    isAdmin,
    activeStageType,
  };
};

export default function JudgePage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const stageId = searchParams.get("stageId");

  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isJudge, setIsJudge] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [activeStageType, setActiveStageType] = React.useState<StageType | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [isFetchingSubmissions, setIsFetchingSubmissions] = React.useState(false);

  const [shortlistedTeams, setShortlistedTeams] = React.useState<ShortlistedTeam[]>(
    [],
  );
  const [isFetchingShortlistedTeams, setIsFetchingShortlistedTeams] =
    React.useState(false);

  const [isGeneratingEntryQr, setIsGeneratingEntryQr] = React.useState(false);
  const [isGeneratingFoodQr, setIsGeneratingFoodQr] = React.useState(false);
  const [finalRoundFeedback, setFinalRoundFeedback] = React.useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const fetchSubmissions = React.useCallback(async () => {
    if (!hackathonId) return;
    if (!stageId) {
      setError("Stage ID is required.");
      setSubmissions([]);
      return;
    }

    setIsFetchingSubmissions(true);
    setError(null);
    setSubmissions([]);

    try {
      const res = await fetchJudgeSubmissions(hackathonId, stageId);
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setError(readMessage(data) ?? "Failed to fetch submissions.");
        return;
      }

      setSubmissions(readSubmissions(data));
    } catch {
      setError("Error fetching submissions.");
    } finally {
      setIsFetchingSubmissions(false);
    }
  }, [hackathonId, stageId]);

  const fetchShortlisted = React.useCallback(async () => {
    if (!hackathonId) return;
    if (!stageId) {
      setShortlistedTeams([]);
      return;
    }

    setIsFetchingShortlistedTeams(true);
    setError(null);
    setShortlistedTeams([]);

    try {
      const res = await fetchHackathonShortlistedTeams(hackathonId, stageId);
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setError(readMessage(data) ?? "Failed to fetch shortlisted teams.");
        return;
      }

      setShortlistedTeams(readShortlistedTeams(data));
    } catch {
      setError("Error fetching shortlisted teams.");
    } finally {
      setIsFetchingShortlistedTeams(false);
    }
  }, [hackathonId, stageId]);

  const loadPanel = React.useCallback(async () => {
    if (!hackathonId) {
      setIsLoading(false);
      setError("Hackathon not found.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFinalRoundFeedback(null);

    try {
      const res = await fetchJudgeAccess(hackathonId);
      const data: unknown = await res.json().catch(() => null);
      const access = readJudgeAccess(data);

      if (!res.ok || !access) {
        setIsJudge(false);
        setIsAdmin(false);
        setActiveStageType(null);
        setError(readMessage(data) ?? "Unable to verify access.");
        return;
      }

      const canAccess = access.isJudge || (access.isAdmin && access.activeStageType === "FINAL");

      if (!canAccess) {
        setIsJudge(access.isJudge);
        setIsAdmin(access.isAdmin);
        setActiveStageType(access.activeStageType);
        setError("Access to judge panel is restricted.");
        return;
      }

      setIsJudge(access.isJudge);
      setIsAdmin(access.isAdmin);
      setActiveStageType(access.activeStageType);
      setSubmissions([]);
      setShortlistedTeams([]);

      if (access.activeStageType === "EVALUATION") {
        if (!stageId) {
          setError("Stage ID is required.");
          return;
        }
        await fetchSubmissions();
        return;
      }

      if (access.activeStageType === "FINAL") {
        await fetchShortlisted();
      }
    } catch {
      setIsJudge(false);
      setIsAdmin(false);
      setActiveStageType(null);
      setError("Unable to verify judge access right now.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchShortlisted, fetchSubmissions, hackathonId, stageId]);

  React.useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    void loadPanel();
  }, [isSessionPending, loadPanel, router, session?.user?.id]);

  const handleGenerateEntryQr = React.useCallback(async () => {
    if (!hackathonId) return;

    setFinalRoundFeedback(null);
    setIsGeneratingEntryQr(true);
    try {
      const res = await generateHackathonEntryQr(hackathonId);
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setFinalRoundFeedback({
          kind: "error",
          message: readMessage(data) ?? "Failed to generate entry QR.",
        });
        return;
      }

      setFinalRoundFeedback({
        kind: "success",
        message: readMessage(data) ?? "Entry QR generated successfully.",
      });
    } catch {
      setFinalRoundFeedback({
        kind: "error",
        message: "Unable to generate entry QR right now.",
      });
    } finally {
      setIsGeneratingEntryQr(false);
    }
  }, [hackathonId]);

  const handleGenerateFoodQr = React.useCallback(async () => {
    if (!hackathonId) return;

    setFinalRoundFeedback(null);
    setIsGeneratingFoodQr(true);
    try {
      const res = await generateHackathonFoodQr(hackathonId);
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setFinalRoundFeedback({
          kind: "error",
          message: readMessage(data) ?? "Failed to generate food QR.",
        });
        return;
      }

      setFinalRoundFeedback({
        kind: "success",
        message: readMessage(data) ?? "Food QR generated successfully.",
      });
    } catch {
      setFinalRoundFeedback({
        kind: "error",
        message: "Unable to generate food QR right now.",
      });
    } finally {
      setIsGeneratingFoodQr(false);
    }
  }, [hackathonId]);

  return (
    <div className="relative min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center py-12">
              <Loader2 className="animate-spin" />
            </CardContent>
          </Card>
        ) : !isJudge && !(isAdmin && activeStageType === "FINAL") ? (
          <Card>
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error ?? "Access to judge panel is restricted."}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="size-5" />
                Judge Panel
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white/60">
                  Active stage: {activeStageType ?? "No active stage"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {isJudge ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!stageId) {
                          setError("Stage ID is required.");
                          return;
                        }
                        router.push(
                          `/hackathons/${hackathonId}/judge/leaderboard?stageId=${encodeURIComponent(stageId)}`,
                        );
                      }}
                    >
                      <Trophy className="size-4 text-amber-300" />
                      Leaderboard
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => void loadPanel()}>
                    Refresh
                  </Button>
                </div>
              </div>

              {activeStageType === "FINAL" ? (
                isAdmin ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <h3 className="text-lg font-semibold text-white">
                        Final Round Operations
                      </h3>
                      <p className="mt-1 text-sm text-white/60">
                        Manage final round QR operations and participant scanning.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          onClick={handleGenerateEntryQr}
                          disabled={isGeneratingEntryQr}
                        >
                          {isGeneratingEntryQr ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Generating...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <QrCode className="size-4" />
                              Generate Entry QR
                            </span>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={handleGenerateFoodQr}
                          disabled={isGeneratingFoodQr}
                        >
                          {isGeneratingFoodQr ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Generating...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <QrCode className="size-4" />
                              Generate Food QR
                            </span>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() =>
                            router.push(`/hackathons/${hackathonId}/scan`)
                          }
                        >
                          Open Scanner
                        </Button>
                      </div>

                      {finalRoundFeedback ? (
                        <p
                          className={`mt-3 text-sm ${
                            finalRoundFeedback.kind === "success"
                              ? "text-emerald-300"
                              : "text-rose-300"
                          }`}
                        >
                          {finalRoundFeedback.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-white/90">
                        <Users className="size-4" />
                        Shortlisted Teams
                      </h4>

                      {isFetchingShortlistedTeams ? (
                        <p className="mt-3 text-sm text-white/70">
                          Loading shortlisted teams...
                        </p>
                      ) : error ? (
                        <p className="mt-3 text-sm text-rose-300">{error}</p>
                      ) : shortlistedTeams.length === 0 ? (
                        <p className="mt-3 text-sm text-white/70">
                          No teams shortlisted yet
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {shortlistedTeams.map((team, index) => (
                            <div
                              key={team.teamId}
                              className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2"
                            >
                              <span className="text-sm font-medium text-white/90">
                                {team.teamName}
                              </span>
                              <span className="text-xs text-white/60">#{index + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold text-white">
                      Final Round Evaluation
                    </h3>
                    <p className="mt-1 text-sm text-white/60">
                      Scan TEAM QR to verify eligibility and jump straight to the
                      team evaluation form.
                    </p>
                    <div className="mt-4">
                      <Button
                        onClick={() =>
                          router.push(`/hackathons/${hackathonId}/scan`)
                        }
                      >
                        <ScanLine className="size-4" />
                        Open Scanner
                      </Button>
                    </div>
                  </div>
                )
              ) : activeStageType === "SUBMISSION" ? (
                <p className="text-white/70">
                  Submission stage is active. Team scoring will open during the
                  evaluation stage.
                </p>
              ) : activeStageType === "EVALUATION" ? (
                isFetchingSubmissions ? (
                  <p>Loading submissions...</p>
                ) : error ? (
                  <p className="text-rose-300">{error}</p>
                ) : submissions.length === 0 ? (
                  <p>No submissions found</p>
                ) : (
                  submissions.map((item) => (
                    <div key={item.submissionId} className="w-full rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{item.teamName}</p>
                        {item.evaluated ? (
                          <span className="text-sm font-semibold text-emerald-400">
                            Evaluated
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-4">
                          {item.pptUrl ? (
                            <a
                              href={item.pptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 underline"
                            >
                              PPT
                            </a>
                          ) : (
                            <span className="text-sm text-white/50">PPT not provided</span>
                          )}

                          {item.githubUrl ? (
                            <a
                              href={item.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-green-400 underline"
                            >
                              GitHub
                            </a>
                          ) : (
                            <span className="text-sm text-white/50">GitHub not provided</span>
                          )}
                        </div>

                        <Button
                          className="ml-auto"
                          onClick={() => {
                            if (!item.stageId) {
                              setError("Stage ID is required.");
                              return;
                            }
                            router.push(
                              `/hackathons/${hackathonId}/judge/evaluate/${item.teamId}?stageId=${encodeURIComponent(item.stageId)}`,
                            );
                          }}
                        >
                          Evaluate the team
                        </Button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <p className="text-white/70">No active stage right now.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

