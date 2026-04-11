import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  BarChart3,
  FileText,
  QrCode,
  ShieldCheck,
  Users,
  Utensils,
} from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Container,
  Glow,
  SectionHeading,
  TiltCard,
} from "@/components/home/shared";

gsap.registerPlugin(ScrollTrigger);

export default function Features() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const cardsRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll(".feature-card");

      if (cards) {
        gsap.fromTo(
          cards,
          {
            opacity: 0,
            y: 80,
            scale: 0.9,
            rotateX: -15,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 1,
            stagger: {
              amount: 0.8,
              from: "start",
            },
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 80%",
              end: "center 60%",
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
      id="features"
      className="relative py-24 sm:py-32"
      style={{ perspective: "1000px" }}
    >
      <Glow />
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to run a premium hackathon"
          subtitle="Built for colleges and organizers who want speed, clarity, and control — without manual chaos."
        />

        <div
          ref={cardsRef}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          style={{ transformStyle: "preserve-3d" }}
        >
          {items.map((f, idx) => (
            <TiltCard key={f.title} className="feature-card">
              <Card className="group h-full transition-all duration-500 hover:bg-white/7 hover:ring-1 hover:ring-white/15 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_25px_80px_rgba(168,85,247,0.25)]">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-blue-500/20 ring-1 ring-white/10 group-hover:from-purple-500/40 group-hover:to-blue-500/35 transition-all duration-500 group-hover:scale-110"
                      style={{
                        transform: `translateZ(${20 + idx * 5}px)`,
                        boxShadow: "0 8px 32px rgba(168, 85, 247, 0.15)",
                      }}
                    >
                      <f.icon className="size-5 text-white/90" />
                    </span>
                    <div>
                      <CardTitle className="text-white group-hover:text-white transition-colors">
                        {f.title}
                      </CardTitle>
                      <p className="mt-2 text-sm text-white/70 group-hover:text-white/80 transition-colors">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </TiltCard>
          ))}
        </div>
      </Container>
    </section>
  );
}
