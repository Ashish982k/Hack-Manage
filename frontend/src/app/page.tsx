"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Boxes,
  Crown,
  FileText,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

gsap.registerPlugin(ScrollTrigger);

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/35 via-pink-500/25 to-blue-500/25 blur-3xl" />
      <div className="absolute right-[-140px] top-[220px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
      <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/15 blur-3xl" />
    </div>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div data-reveal="up">
        <Badge variant="glow" className="mx-auto inline-flex">
          <Sparkles className="mr-2 size-4" />
          {eyebrow}
        </Badge>
      </div>
      <h2
        data-reveal="up"
        className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl"
      >
        {title}
      </h2>
      <p data-reveal="up" className="mt-3 text-balance text-white/70">
        {subtitle}
      </p>
    </div>
  );
}

function Navbar() {
  const links = [
    { label: "Features", href: "#features" },
    { label: "Workflow", href: "#workflow" },
    { label: "Contact", href: "#contact" },
  ];

  const router = useRouter();
  const { data: session, isPending, error, refetch } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/"); 
        },
      },
    });
  };

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-white">
            <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/60 via-pink-500/40 to-blue-500/50 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]">
              <Crown className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide">
              HackathonX
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!session && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => router.push("/login")}
              >
                Login
              </Button>
            )}
            {session && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => handleSignOut()}
              >
                Sign Out
              </Button>
            )}
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 sm:pt-16">
      <Glow />
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative">
            <div data-reveal="up">
              <Badge variant="glow" className="inline-flex">
                <ShieldCheck className="mr-2 size-4" />
                Smart verification. Secure QR entry. Live scoring.
              </Badge>
            </div>

            <h1
              data-reveal="up"
              className="mt-5 text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              Run Hackathons Without Chaos
            </h1>

            <p
              data-reveal="up"
              className="mt-5 max-w-xl text-pretty text-base text-white/70 sm:text-lg"
            >
              From registration to final evaluation — fully automated with smart
              verification, QR entry, and real-time scoring.
            </p>

            <div data-reveal="up" className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="lg">
                Get Started
              </Button>
              <Button variant="outline" size="lg">
                Explore Features
              </Button>
            </div>

            <div data-reveal="up" className="mt-8 flex flex-wrap gap-2">
              <Badge>College-ready</Badge>
              <Badge>Fraud-resistant</Badge>
              <Badge>Queue-less entry</Badge>
              <Badge>Live leaderboard</Badge>
            </div>
          </div>

          <div data-reveal="up" className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-blue-500/20 blur-2xl" />
            <Card className="rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      <LayoutDashboard className="size-4 text-white/80" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        HackathonX Console
                      </p>
                      <p className="text-xs text-white/60">Live ops preview</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20">
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <Users className="size-4" />
                      <span className="text-sm">Registered</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      1,248
                    </p>
                    <p className="mt-1 text-xs text-white/60">+22% this week</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <Boxes className="size-4" />
                      <span className="text-sm">Teams</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      312
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      Auto-balanced invites
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <QrCode className="size-4" />
                      <span className="text-sm">QR Check-ins</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      968
                    </p>
                    <p className="mt-1 text-xs text-white/60">No duplicates</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <BarChart3 className="size-4" />
                      <span className="text-sm">Avg. Score</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      8.6
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      Realtime ranking
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">QR Pass</p>
                    <Badge className="bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/20">
                      Secure
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-[88px_1fr] gap-4">
                    <div className="flex size-[88px] items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div
                            key={i}
                            className={
                              i % 7 === 0 || i % 5 === 0
                                ? "size-2 rounded-[3px] bg-white/80"
                                : "size-2 rounded-[3px] bg-white/15"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/80">
                        Entry + Food access
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Scan once. Marked instantly. Track usage per student.
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                        <BadgeCheck className="size-4 text-emerald-300" />
                        Verified • Non-transferable
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: "Smart Student Verification",
      desc: "Instant approval flows with ID proof checks and admin controls.",
      icon: ShieldCheck,
    },
    {
      title: "Team Management",
      desc: "Invite, merge, and lock teams with clean audit logs.",
      icon: Users,
    },
    {
      title: "PPT Evaluation System",
      desc: "Judge panels, rubrics, and scoring — optimized for speed.",
      icon: FileText,
    },
    {
      title: "QR-Based Entry",
      desc: "Fast check-in with secure tokens and zero duplicate entries.",
      icon: QrCode,
    },
    {
      title: "Food Distribution Tracking",
      desc: "No paper coupons. Scan-and-mark meals in real time.",
      icon: Utensils,
    },
    {
      title: "Live Leaderboard",
      desc: "Realtime rankings with automatic tie-break rules.",
      icon: BarChart3,
    },
  ];

  return (
    <section id="features" className="relative py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to run a premium hackathon"
          subtitle="Built for colleges and organizers who want speed, clarity, and control — without manual chaos."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <div key={f.title} data-reveal="up">
              <Card className="group h-full transition-all hover:bg-white/7 hover:ring-1 hover:ring-white/15 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_70px_rgba(168,85,247,0.18)]">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-blue-500/20 ring-1 ring-white/10 group-hover:from-purple-500/35 group-hover:to-blue-500/30 transition-colors">
                      <f.icon className="size-5 text-white/85" />
                    </span>
                    <div>
                      <CardTitle className="text-white">{f.title}</CardTitle>
                      <p className="mt-2 text-sm text-white/70">{f.desc}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Workflow() {
  const steps = [
    "Register",
    "Verify",
    "Form Team",
    "Submit",
    "Shortlist",
    "QR Entry",
    "Final Evaluation",
  ];

  return (
    <section id="workflow" className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Workflow"
          title="A smooth flow from registration to results"
          subtitle="A step-based pipeline designed to minimize queues, avoid manual errors, and keep judges focused."
        />

        <div className="mt-10" data-reveal="up">
          <Card className="rounded-3xl">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-7">
                {steps.map((s, idx) => (
                  <div key={s} className="relative">
                    <div className="flex items-center gap-3 md:flex-col md:items-start">
                      <div className="flex items-center gap-3 md:w-full">
                        <div className="flex size-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 text-sm font-semibold text-white">
                          {idx + 1}
                        </div>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/15 to-transparent md:hidden" />
                      </div>
                      <p className="text-sm font-medium text-white/85 md:mt-3">
                        {s}
                      </p>
                      <p className="mt-1 hidden text-xs text-white/60 md:block">
                        {idx === 0 && "Start sign-ups"}
                        {idx === 1 && "Auto + admin checks"}
                        {idx === 2 && "Invite & lock teams"}
                        {idx === 3 && "PPT/project upload"}
                        {idx === 4 && "Shortlist rules"}
                        {idx === 5 && "Scan & mark entry"}
                        {idx === 6 && "Judge scoring"}
                      </p>
                    </div>

                    {idx < steps.length - 1 ? (
                      <div className="mt-4 hidden h-[1px] w-full bg-gradient-to-r from-white/15 via-white/10 to-transparent md:block" />
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}

function QRHighlight() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div data-reveal="up">
              <Badge variant="glow" className="inline-flex">
                <QrCode className="mr-2 size-4" />
                QR System
              </Badge>
            </div>
            <h3
              data-reveal="up"
              className="mt-4 text-balance text-3xl font-semibold text-white sm:text-4xl"
            >
              QR entry + food distribution with zero coupons
            </h3>
            <p data-reveal="up" className="mt-3 text-white/70">
              Replace paper slips and manual registers with secure scanning and
              instant marking.
            </p>

            <div data-reveal="up" className="mt-6 grid gap-3">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <BadgeCheck className="size-4 text-emerald-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    No paper coupons
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    One QR pass can grant entry + food access based on your
                    rules.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/20">
                  <ShieldCheck className="size-4 text-purple-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    No duplicate entries
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    Each scan is tracked instantly with tamper-resistant
                    marking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                  <QrCode className="size-4 text-blue-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Secure scanning
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    Built to support multiple gates and staff devices
                    concurrently.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div data-reveal="up" className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-purple-500/25 via-blue-500/20 to-pink-500/20 blur-2xl" />
            <Card className="rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      <QrCode className="size-4 text-white/80" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Scan Pass
                      </p>
                      <p className="text-xs text-white/60">HackathonX Gate</p>
                    </div>
                  </div>
                  <Badge className="bg-white/5 text-white/80 ring-1 ring-white/10">
                    #HX-2026
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs text-white/60">Student</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      Aditi Sharma
                    </p>
                    <p className="mt-1 text-xs text-white/60">CSE • Year 3</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20">
                        Entry Allowed
                      </Badge>
                      <Badge className="bg-blue-500/10 text-blue-200 ring-1 ring-blue-500/20">
                        Food: 2/2
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="grid grid-cols-9 gap-1">
                      {Array.from({ length: 81 }).map((_, i) => (
                        <div
                          key={i}
                          className={
                            i % 11 === 0 || i % 9 === 0 || i % 7 === 0
                              ? "size-2 rounded-[3px] bg-white/80"
                              : "size-2 rounded-[3px] bg-white/12"
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      Scan Result
                    </p>
                    <Badge className="bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20">
                      Verified
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    Marked at Gate A • 10:42 AM • Device: Scanner-03
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}

function AdminPreview() {
  const stats = [
    { label: "Students", value: "1,248", icon: Users, note: "Verified: 1,104" },
    { label: "Teams", value: "312", icon: Boxes, note: "Locked: 280" },
    {
      label: "Submissions",
      value: "214",
      icon: FileText,
      note: "Shortlisted: 48",
    },
    {
      label: "Food Usage",
      value: "1,876",
      icon: Utensils,
      note: "Remaining: 124",
    },
  ];

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Admin"
          title="A clean dashboard that organizers actually enjoy"
          subtitle="Monitor everything in real time — verification, submissions, check-ins, and distribution."
        />

        <div className="mt-10" data-reveal="up">
          <Card className="rounded-3xl">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  {stats.map((s) => (
                    <div key={s.label} data-reveal="up">
                      <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/70">{s.label}</p>
                          <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                            <s.icon className="size-4 text-white/80" />
                          </span>
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-white">
                          {s.value}
                        </p>
                        <p className="mt-2 text-sm text-white/60">{s.note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="lg:w-[360px]" data-reveal="up">
                  <div className="h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        Live Activity
                      </p>
                      <Badge className="bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/20">
                        Streaming
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {[
                        {
                          title: "Verification approved",
                          meta: "ID: 48A2 • 2m ago",
                          icon: ShieldCheck,
                        },
                        {
                          title: "Gate scan marked",
                          meta: "Gate B • 6m ago",
                          icon: QrCode,
                        },
                        {
                          title: "PPT scored",
                          meta: "Panel 2 • 11m ago",
                          icon: FileText,
                        },
                        {
                          title: "Meal distributed",
                          meta: "Counter 1 • 14m ago",
                          icon: Utensils,
                        },
                      ].map((a) => (
                        <div
                          key={a.title}
                          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <span className="mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                            <a.icon className="size-4 text-white/80" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white/85">
                              {a.title}
                            </p>
                            <p className="mt-1 text-xs text-white/60">
                              {a.meta}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}

function Benefits() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Benefits"
          title="Built for both organizers and students"
          subtitle="Automation for colleges. A smooth experience for participants."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div data-reveal="up">
            <Card className="h-full rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">For Colleges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {[
                    "Automation across registration, verification, and evaluation",
                    "Fraud prevention with secure QR and scan logs",
                    "Reduced manpower at entry gates and food counters",
                    "Centralized analytics for reporting and decisions",
                  ].map((t) => (
                    <div
                      key={t}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <span className="mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/20">
                        <ShieldCheck className="size-4 text-purple-200" />
                      </span>
                      <p className="text-sm text-white/75">{t}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div data-reveal="up">
            <Card className="h-full rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">For Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {[
                    "Smooth check-ins with fast QR scanning",
                    "No queues and no coupon issues for food",
                    "Transparent scoring and live leaderboard",
                    "Clean team formation and submission flow",
                  ].map((t) => (
                    <div
                      key={t}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <span className="mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                        <BadgeCheck className="size-4 text-blue-200" />
                      </span>
                      <p className="text-sm text-white/75">{t}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div data-reveal="up">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-blue-500/15 p-8 sm:p-12">
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute -left-24 -top-24 size-[360px] rounded-full bg-purple-500/25 blur-3xl" />
            <div className="absolute -right-28 -bottom-28 size-[360px] rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative mx-auto max-w-2xl text-center">
              <Badge variant="glow" className="mx-auto inline-flex">
                <Sparkles className="mr-2 size-4" />
                Ready to launch
              </Badge>
              <h3 className="mt-4 text-balance text-3xl font-semibold text-white sm:text-4xl">
                Launch your hackathon in minutes
              </h3>
              <p className="mt-3 text-white/70">
                Get a streamlined registration flow, secure QR check-ins, and a
                real-time leaderboard — all in one system.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
                <Button variant="outline" size="lg">
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 py-12">
      <Container>
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/60 via-pink-500/40 to-blue-500/50 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]">
                <Crown className="size-4" />
              </span>
              <span className="text-sm font-semibold tracking-wide">
                HackathonX
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-white/60">
              A premium hackathon management system for colleges — verification,
              QR entry, evaluation, distribution, and live scoring.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-white">Product</p>
              <div className="mt-3 grid gap-2 text-sm">
                <a className="text-white/60 hover:text-white" href="#features">
                  Features
                </a>
                <a className="text-white/60 hover:text-white" href="#workflow">
                  Workflow
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Company</p>
              <div className="mt-3 grid gap-2 text-sm">
                <a className="text-white/60 hover:text-white" href="#contact">
                  Contact
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  Privacy
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  Terms
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Social</p>
              <div className="mt-3 grid gap-2 text-sm">
                <a className="text-white/60 hover:text-white" href="#">
                  X (Twitter)
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  GitHub
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HackathonX. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-emerald-400/80" />
            Status: Operational
          </p>
        </div>
      </Container>
    </footer>
  );
}

export default function Home() {
  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>("[data-reveal='up']");

      els.forEach((el) => {
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
          },
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-full bg-black text-white">
      <Navbar />
      <Hero />
      <Features />
      <Workflow />
      <QRHighlight />
      <AdminPreview />
      <Benefits />
      <CTA />
      <Footer />
    </main>
  );
}
