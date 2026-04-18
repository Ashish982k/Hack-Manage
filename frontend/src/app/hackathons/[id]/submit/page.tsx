"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { fetchHackathonById, fetchHackathonTeamState, fetchJudgeAccess } from "@/api";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type StageInfo = {
  id: string;
  type: "SUBMISSION" | "EVALUATION" | "FINAL";
  startTime: string | null;
  endTime: string | null;
};

const toTimestamp = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const isStageActive = (stage: StageInfo, nowMs: number) => {
  const start = toTimestamp(stage.startTime);
  const end = toTimestamp(stage.endTime);
  if (start === null || end === null) return false;
  return start <= nowMs && nowMs <= end;
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

export default function HackathonSubmitPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!hackathonId) {
        setError("Hackathon not found.");
        setIsLoading(false);
        return;
      }

      if (isSessionPending) return;

      if (!session?.user?.id) {
        router.push("/login");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [hackathonRes, accessRes, teamRes] = await Promise.all([
          fetchHackathonById(hackathonId),
          fetchJudgeAccess(hackathonId),
          fetchHackathonTeamState(hackathonId),
        ]);

        const hackathonData: unknown = await hackathonRes.json().catch(() => null);
        const accessData: unknown = await accessRes.json().catch(() => null);
        const teamData: unknown = await teamRes.json().catch(() => null);

        if (!hackathonRes.ok) {
          setError(readMessage(hackathonData) ?? "Failed to load hackathon.");
          return;
        }

        const stages =
          typeof hackathonData === "object" &&
          hackathonData !== null &&
          "stages" in hackathonData &&
          Array.isArray((hackathonData as { stages?: unknown }).stages)
            ? ((hackathonData as { stages: unknown[] }).stages
                .map((stage) => {
                  if (typeof stage !== "object" || stage === null) return null;
                  const row = stage as Record<string, unknown>;
                  if (
                    typeof row.id !== "string" ||
                    (row.type !== "SUBMISSION" &&
                      row.type !== "EVALUATION" &&
                      row.type !== "FINAL")
                  ) {
                    return null;
                  }

                  return {
                    id: row.id,
                    type: row.type,
                    startTime:
                      typeof row.startTime === "string" ? row.startTime : null,
                    endTime: typeof row.endTime === "string" ? row.endTime : null,
                  } satisfies StageInfo;
                })
                .filter((stage): stage is StageInfo => stage !== null))
            : [];

        const isSubmissionStageActive = stages.some(
          (stage) => stage.type === "SUBMISSION" && isStageActive(stage, Date.now()),
        );

        const isJudge =
          typeof accessData === "object" &&
          accessData !== null &&
          "isJudge" in accessData &&
          (accessData as { isJudge?: unknown }).isJudge === true;
        const isAdmin =
          typeof accessData === "object" &&
          accessData !== null &&
          "isAdmin" in accessData &&
          (accessData as { isAdmin?: unknown }).isAdmin === true;
        const isParticipant = !isJudge && !isAdmin;

        const hasTeam =
          typeof teamData === "object" &&
          teamData !== null &&
          "joined" in teamData &&
          (teamData as { joined?: unknown }).joined === true &&
          "team" in teamData &&
          (teamData as { team?: unknown }).team !== null;

        if (!isParticipant) {
          setError("Submission is available to participants only.");
          return;
        }

        if (!isSubmissionStageActive) {
          setError("Submission stage is not active");
          return;
        }

        if (!hasTeam) {
          setError("Create or join a team before submitting.");
          return;
        }

        router.replace(`/hackathons/${hackathonId}#submission`);
      } catch {
        setError("Failed to load submission access.");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [hackathonId, isSessionPending, router, session?.user?.id]);

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Submission Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="size-4 animate-spin" />
                Checking submission access...
              </p>
            ) : error ? (
              <>
                <p className="text-sm text-rose-300">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/hackathons/${hackathonId}`)}
                >
                  Go back
                </Button>
              </>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="size-4 animate-spin" />
                Redirecting to submission form...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
