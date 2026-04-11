"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Gavel, Loader2, Trophy } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { authClient } from "@/lib/auth-client";
import { fetchJudgeAccess, fetchJudgeSubmissions } from "@/api";
import { Button } from "@/components/ui/button";

type Submission = {
  submissionId: string;
  pptUrl: string;
  githubUrl: string;
  submittedAt: string;
  stageId: string;
  stageTitle: string;
  stageType: string;
  teamId: string;
  teamName: string;
  evaluated?: boolean;
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

export default function JudgePage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isJudge, setIsJudge] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [isFetchingSubmissions, setIsFetchingSubmissions] =
    React.useState(false);

  React.useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    if (!hackathonId) {
      setIsLoading(false);
      setIsJudge(false);
      setError("Hackathon not found.");
      return;
    }

    const fetchSubmissions = async () => {
      setIsFetchingSubmissions(true);
      setError(null);

      try {
        const res = await fetchJudgeSubmissions(hackathonId);

        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          setError(readMessage(data) ?? "Failed to fetch submissions");
          return;
        }

        setSubmissions(readSubmissions(data));
      } catch {
        setError("Error fetching submissions");
      } finally {
        setIsFetchingSubmissions(false);
      }
    };

    const checkAccess = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetchJudgeAccess(hackathonId);

        const data: unknown = await res.json().catch(() => null);
        const canJudge =
          typeof data === "object" &&
          data !== null &&
          "isJudge" in data &&
          (data as { isJudge?: unknown }).isJudge === true;

        if (!res.ok || !canJudge) {
          setIsJudge(false);
          setError(readMessage(data) ?? "Access to judge only.");
          return;
        }

        setIsJudge(true);
        fetchSubmissions();
      } catch {
        setIsJudge(false);
        setError("Unable to verify judge access right now.");
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [hackathonId, isSessionPending, router, session?.user?.id]);

  return (
    <div className="relative min-h-screen bg-black text-white">
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
        ) : !isJudge ? (
          <Card>
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
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
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/hackathons/${hackathonId}/judge/leaderboard`)
                  }
                >
                  <Trophy className="size-4 text-amber-300" />
                  Leaderboard
                </Button>
              </div>

              {isFetchingSubmissions ? (
                <p>Loading submissions...</p>
              ) : error ? (
                <p className="text-rose-300">{error}</p>
              ) : submissions.length === 0 ? (
                <p>No submissions found</p>
              ) : (
                submissions.map((item) => (
                  <div
                    key={item.submissionId}
                    className="border p-4 rounded-lg w-full"
                    >
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
                          <a
                            href={item.pptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 underline"
                          >
                            PPT
                          </a>

                          <a
                            href={item.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-400 underline"
                          >
                            GitHub
                          </a>
                        </div>

                        <Button
                          className="ml-auto"
                          onClick={() =>
                            router.push(
                              `/hackathons/${hackathonId}/evaluate/${item.teamId}`,
                            )
                          }
                        >
                          Evaluate the team
                        </Button>
                      </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
