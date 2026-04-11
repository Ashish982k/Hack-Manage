import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Boxes, FileText, QrCode, ShieldCheck, Users, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container, SectionHeading, TiltCard } from "@/components/home/shared";

gsap.registerPlugin(ScrollTrigger);

export default function AdminPreview() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const statsRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      const statCards = statsRef.current?.querySelectorAll(".stat-card");

      if (statCards) {
        gsap.fromTo(
          statCards,
          {
            opacity: 0,
            y: 50,
            scale: 0.9,
            rotateX: -10,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 0.8,
            stagger: {
              amount: 0.6,
              from: "start",
            },
            ease: "power3.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
              toggleActions: "play none none reverse",
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-32"
      style={{ perspective: "1000px" }}
    >
      <Container>
        <SectionHeading
          eyebrow="Admin"
          title="A clean dashboard that organizers actually enjoy"
          subtitle="Monitor everything in real time — verification, submissions, check-ins, and distribution."
        />

        <div className="mt-14">
          <TiltCard>
            <Card className="rounded-3xl">
              <CardContent className="pt-8">
                <div
                  ref={statsRef}
                  className="flex flex-col gap-5 lg:flex-row lg:items-stretch"
                >
                  <div className="grid flex-1 gap-5 sm:grid-cols-2">
                    {stats.map((s) => (
                      <div
                        key={s.label}
                        className="stat-card h-full rounded-2xl border border-white/10 bg-black/25 p-6 hover:bg-white/5 transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/70">{s.label}</p>
                          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/10 shadow-lg shadow-purple-500/10">
                            <s.icon className="size-5 text-white/80" />
                          </span>
                        </div>
                        <p className="mt-4 text-4xl font-bold text-white">
                          {s.value}
                        </p>
                        <p className="mt-2 text-sm text-white/60">{s.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="stat-card lg:w-[380px]">
                    <div className="h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">
                          Live Activity
                        </p>
                        <Badge className="bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/20 animate-pulse">
                          Streaming
                        </Badge>
                      </div>
                      <div className="mt-5 grid gap-3">
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
                            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-white/5 transition-colors duration-300"
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
          </TiltCard>
        </div>
      </Container>
    </section>
  );
}
