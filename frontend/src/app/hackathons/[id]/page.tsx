"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  Link,
  Loader2,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/file-upload";
import { HACKATHONS } from "@/lib/hackathons";
import { Navbar } from "@/components/navbar";

gsap.registerPlugin(ScrollTrigger);

type SubmissionStatus = "Not submitted" | "Submitted" | "Under review";

type TeamMember = {
  name: string;
  role?: string;
};

type TeamInfo = {
  name: string;
  members: TeamMember[];
};

type HackathonStatus = "Open" | "Closed";

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / (3600 * 24));
  const h = Math.floor((total % (3600 * 24)) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

function ToneBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
        : tone === "danger"
          ? "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20"
          : "bg-white/5 text-white/80 ring-1 ring-white/10";

  return <Badge className={cls}>{children}</Badge>;
}

function PageGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-[-140px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/35 via-pink-500/25 to-blue-500/25 blur-3xl" />
      <div className="absolute right-[-180px] top-[240px] h-[440px] w-[440px] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
      <div className="absolute bottom-[-240px] left-[-180px] h-[560px] w-[560px] rounded-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/15 blur-3xl" />
    </div>
  );
}

function Toast({
  toast,
  onClose,
}: {
  toast: { kind: "success" | "error"; title: string; message?: string } | null;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div
        className={
          "rounded-2xl border bg-black/40 p-4 backdrop-blur-xl shadow-2xl " +
          (toast.kind === "success"
            ? "border-emerald-500/20"
            : "border-rose-500/20")
        }
        role="status"
      >
        <div className="flex items-start gap-3">
          <div
            className={
              "mt-0.5 flex size-9 items-center justify-center rounded-xl ring-1 " +
              (toast.kind === "success"
                ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                : "bg-rose-500/10 text-rose-200 ring-rose-500/20")
            }
          >
            {toast.kind === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Flag className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            {toast.message ? (
              <p className="mt-1 text-sm text-white/70">{toast.message}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HackathonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [toast, setToast] = React.useState<{
    kind: "success" | "error";
    title: string;
    message?: string;
  } | null>(null);

  const router = useRouter();

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [isJoined, setIsJoined] = React.useState(true);
  const [team, setTeam] = React.useState<TeamInfo | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = React.useState(true);

  const [file, setFile] = React.useState<File | null>(null);
  const [repo, setRepo] = React.useState("");
  const [demo, setDemo] = React.useState("");

  const [submissionStatus, setSubmissionStatus] = React.useState<SubmissionStatus>(
    "Not submitted"
  );
  const [lastSubmitted, setLastSubmitted] = React.useState<{
    fileName: string;
    at: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const hackathonId = React.use(params).id;

  React.useEffect(() => {
    async function fetchTeam() {
      setIsLoadingTeam(true);
      try {
        const res = await fetch(`http://localhost:5000/hackathons/${hackathonId}/team`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          // Adjust based on the actual backend response, e.g. mapping if needed. 
          // For now, assuming exact match with TeamInfo `name` and `members`.
          setTeam(data);
        } else {
          setTeam(null);
        }
      } catch (err) {
        console.error("Failed to fetch team:", err);
        setTeam(null);
      } finally {
        setIsLoadingTeam(false);
      }
    }
    fetchTeam();
  }, [hackathonId]);

  const hackathon = React.useMemo(() => {
    const found = HACKATHONS.find((h) => h.id === hackathonId);
    if (!found) return null;

    return {
      ...found,
      shortDescription: found.description,
      longDescription:
        found.description +
        "\n\nBuild a product-grade workflow that feels effortless for students and scalable for colleges. Prioritize UX clarity, reliability, and security.",
      status: "Open" as HackathonStatus,
      startDate: "2026-04-01T10:00:00.000Z",
      submissionDeadline: "2026-04-10T18:30:00.000Z",
      finalRoundDate: "2026-04-12T09:00:00.000Z",
      tags: ["AI", "Web", "DevTools", "Security"],
      problemStatements: [
        {
          id: "ps-1",
          title: "Smart Verification + Fraud Detection",
          body: "Create a robust verification pipeline that prevents duplicate registrations and supports admin review with audit logs.",
        },
        {
          id: "ps-2",
          title: "QR Gate + Food Distribution Tracking",
          body: "Design a scanning experience for entry and meals that is fast, secure, and works on multiple devices concurrently.",
        },
        {
          id: "ps-3",
          title: "Evaluation Console + Realtime Leaderboard",
          body: "Build an evaluator-friendly scoring interface with rubric support and a public leaderboard updated in real time.",
        },
      ],
    };
  }, [hackathonId]);

  if (!hackathon) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <PageGlow />
        <Navbar />
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Hackathon not found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-white/70">
                We couldn’t find a hackathon with id <span className="text-white">{hackathonId}</span>.
              </p>
              <Button variant="primary" onClick={() => (window.location.href = "/hackathons")}
              >
                Back to Hackathons
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const deadlineMs = React.useMemo(
    () => new Date(hackathon.submissionDeadline).getTime(),
    [hackathon.submissionDeadline]
  );

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const timeLeft = React.useMemo(() => formatTime(deadlineMs - now), [deadlineMs, now]);
  const isDeadlinePassed = now > deadlineMs;

  const canSubmit =
    isJoined &&
    !!team &&
    !isDeadlinePassed &&
    submissionStatus !== "Under review" &&
    !isSubmitting;

  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray<Element>("[data-reveal='up']");
      elements.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  const handleSubmit = async () => {
    if (isDeadlinePassed) {
      setToast({
        kind: "error",
        title: "Submission closed",
        message: "The submission deadline has passed.",
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

    if (!file) {
      setToast({
        kind: "error",
        title: "Upload required",
        message: "Please upload a PPT/PDF file.",
      });
      return;
    }

    if (!repo.trim()) {
      setToast({
        kind: "error",
        title: "Repo link required",
        message: "Please provide a GitHub repository link.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const at = new Date().toISOString();
      setLastSubmitted({ fileName: file.name, at });
      setSubmissionStatus("Submitted");
      setToast({ kind: "success", title: "Submission received", message: "Good luck!" });
    } catch {
      setToast({
        kind: "error",
        title: "Submission failed",
        message: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <PageGlow />
      <Navbar />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section data-reveal="up">
              <div className="flex flex-wrap items-center gap-3">
                <ToneBadge tone={hackathon.status === "Open" ? "success" : "danger"}>
                  {hackathon.status}
                </ToneBadge>
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
                <ToneBadge tone={isDeadlinePassed ? "danger" : "warning"}>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-3.5" />
                    Deadline: {new Date(hackathon.submissionDeadline).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </ToneBadge>
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                {hackathon.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
                {hackathon.shortDescription}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {hackathon.tags.map((t) => (
                  <Badge
                    key={t}
                    className="bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10 transition"
                  >
                    {t}
                  </Badge>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  variant={isJoined ? "outline" : "primary"}
                  onClick={() => {
                    setIsJoined((v) => !v);
                    setToast({
                      kind: "success",
                      title: !isJoined ? "Joined hackathon" : "Left hackathon",
                    });
                  }}
                >
                  {isJoined ? "Already Joined" : "Join Hackathon"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setToast({ kind: "success", title: "Invite link copied", message: "(mock)" })
                  }
                >
                  Share
                </Button>
              </div>
            </section>

            <section className="grid gap-6" data-reveal="up">
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Hackathon Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Description</p>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      {hackathon.longDescription}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/90">Problem Statements</p>
                    <div className="mt-3 space-y-3">
                      {hackathon.problemStatements.map((ps) => {
                        const isOpen = !!expanded[ps.id];
                        return (
                          <div
                            key={ps.id}
                            className="rounded-2xl border border-white/10 bg-black/20"
                          >
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                              onClick={() =>
                                setExpanded((s) => ({ ...s, [ps.id]: !s[ps.id] }))
                              }
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                                  <Sparkles className="size-4 text-white/80" />
                                </span>
                                <p className="truncate text-sm font-semibold text-white/90">
                                  {ps.title}
                                </p>
                              </div>
                              <span className="text-xs text-white/60">
                                {isOpen ? "Hide" : "View"}
                              </span>
                            </button>
                            {isOpen ? (
                              <div className="px-4 pb-4">
                                <p className="text-sm leading-7 text-white/70">{ps.body}</p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/90">Rules & Guidelines</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/70">
                      {hackathon.rules.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/30" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/90">Important Dates</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-white/60">Start</p>
                        <p className="mt-2 text-sm font-semibold text-white/90">
                          {new Date(hackathon.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-white/60">Submission Deadline</p>
                        <p className="mt-2 text-sm font-semibold text-white/90">
                          {new Date(hackathon.submissionDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-white/60">Final Round</p>
                        <p className="mt-2 text-sm font-semibold text-white/90">
                          {new Date(hackathon.finalRoundDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

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
                  ) : team ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-white/60">Team Name</p>
                          <p className="mt-1 text-lg font-semibold text-white/90">
                            {team.name}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setToast({
                              kind: "success",
                              title: "Manage team",
                              message: "(mock)",
                            })
                          }
                        >
                          Manage
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {team.members.map((m) => (
                          <div
                            key={m.name}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-blue-500/25 ring-1 ring-white/10">
                                <Users className="size-4 text-white/80" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-white/90">
                                  {m.name}
                                </p>
                                <p className="text-xs text-white/60">
                                  {m.role ?? "Member"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white/90">
                          No team yet
                        </p>
                        <p className="mt-1 text-sm text-white/60">
                          Create or join a team to submit.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => router.push(`/hackathons/${hackathonId}/create-team`)}
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
                            : isDeadlinePassed
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {isDeadlinePassed ? "Deadline passed" : submissionStatus}
                    </ToneBadge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!team && !isLoadingTeam ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-sm font-semibold text-white/90">
                        No team available
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Please create a team to unlock the submission form.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                      <p className="text-sm font-semibold text-white/90">
                        Upload PPT/PDF
                      </p>
                      <FileUpload
                        value={file}
                        onChange={setFile}
                        disabled={!canSubmit || submissionStatus === "Submitted"}
                        accept=".pdf,.ppt,.pptx"
                      />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-white/90">GitHub Repo</p>
                        <div className="mt-2 relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                            <Link className="size-4" />
                          </span>
                          <Input
                            value={repo}
                            onChange={(e) => setRepo(e.target.value)}
                            placeholder="https://github.com/your-team/project"
                            className="pl-10"
                            disabled={!canSubmit || submissionStatus === "Submitted"}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white/90">
                          Demo Video (optional)
                        </p>
                        <div className="mt-2 relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                            <Video className="size-4" />
                          </span>
                          <Input
                            value={demo}
                            onChange={(e) => setDemo(e.target.value)}
                            placeholder="https://youtu.be/..."
                            className="pl-10"
                            disabled={!canSubmit || submissionStatus === "Submitted"}
                          />
                        </div>
                      </div>

                      {lastSubmitted ? (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs text-white/60">Last submission</p>
                          <p className="mt-2 text-sm font-semibold text-white/90">
                            {lastSubmitted.fileName}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            {new Date(lastSubmitted.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-white/60">
                      {isDeadlinePassed
                        ? "Submission is closed."
                        : submissionStatus === "Submitted"
                          ? "Your submission is saved."
                          : "Make sure your deck explains the workflow, QR flow, and evaluation."}
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={!canSubmit || submissionStatus === "Submitted"}
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Submitting...
                        </span>
                      ) : submissionStatus === "Submitted" ? (
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 className="size-4" />
                          Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <FileText className="size-4" />
                          Submit
                        </span>
                      )}
                    </Button>
                  </div>
                  </>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-8 lg:h-fit" data-reveal="up">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/60">Countdown</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    until submission deadline
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <Calendar className="size-4 text-white/80" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">Deadline</p>
                        <p className="mt-1 text-xs text-white/60">
                          {new Date(hackathon.submissionDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <Users className="size-4 text-white/80" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">Team</p>
                        <p className="mt-1 text-xs text-white/60">
                          {team ? `${team.members.length} members` : "Not created"}
                        </p>
                      </div>
                    </div>
                    <ToneBadge tone={team ? "success" : "warning"}>
                      {team ? "Ready" : "Pending"}
                    </ToneBadge>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <FileText className="size-4 text-white/80" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">Submission</p>
                        <p className="mt-1 text-xs text-white/60">
                          {submissionStatus}
                        </p>
                      </div>
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
                      {submissionStatus === "Not submitted" ? "Submit" : submissionStatus}
                    </ToneBadge>
                  </div>
                  <p className="mt-2 text-sm text-white/60">
                    Upload your deck and repo link.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white/90">Step 3</p>
                    <ToneBadge tone={"neutral"}>Evaluation</ToneBadge>
                  </div>
                  <p className="mt-2 text-sm text-white/60">
                    Track your results on leaderboard after review.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white/90">Links</p>
                    <span className="text-xs text-white/60">Mock</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <a
                      href={repo || "#"}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub Repo
                      <ExternalLink className="size-4" />
                    </a>
                    <a
                      href={demo || "#"}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Demo Video
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
