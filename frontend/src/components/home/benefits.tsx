import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BadgeCheck, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container, SectionHeading, TiltCard } from "@/components/home/shared";

gsap.registerPlugin(ScrollTrigger);

export default function Benefits() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const leftRef = React.useRef<HTMLDivElement>(null);
  const rightRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        leftRef.current,
        { x: -50, opacity: 0, rotateY: 10 },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        rightRef.current,
        { x: 50, opacity: 0, rotateY: -10 },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse",
          },
        },
      );
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
          eyebrow="Benefits"
          title="Built for both organizers and students"
          subtitle="Automation for colleges. A smooth experience for participants."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div ref={leftRef}>
            <TiltCard>
              <Card className="h-full rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">
                    For Colleges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {[
                      "Automation across registration, verification, and evaluation",
                      "Fraud prevention with secure QR and scan logs",
                      "Reduced manpower at entry gates and food counters",
                      "Centralized analytics for reporting and decisions",
                    ].map((t) => (
                      <div
                        key={t}
                        className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 hover:bg-white/5 transition-colors duration-300"
                      >
                        <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-purple-500/15 ring-1 ring-purple-500/25 shadow-lg shadow-purple-500/10">
                          <ShieldCheck className="size-5 text-purple-300" />
                        </span>
                        <p className="text-sm text-white/80">{t}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TiltCard>
          </div>

          <div ref={rightRef}>
            <TiltCard>
              <Card className="h-full rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">
                    For Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {[
                      "Smooth check-ins with fast QR scanning",
                      "No queues and no coupon issues for food",
                      "Transparent scoring and live leaderboard",
                      "Clean team formation and submission flow",
                    ].map((t) => (
                      <div
                        key={t}
                        className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 hover:bg-white/5 transition-colors duration-300"
                      >
                        <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/25 shadow-lg shadow-blue-500/10">
                          <BadgeCheck className="size-5 text-blue-300" />
                        </span>
                        <p className="text-sm text-white/80">{t}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TiltCard>
          </div>
        </div>
      </Container>
    </section>
  );
}
