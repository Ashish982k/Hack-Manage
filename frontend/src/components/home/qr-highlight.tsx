import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BadgeCheck, QrCode, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container, Glow, TiltCard } from "@/components/home/shared";

gsap.registerPlugin(ScrollTrigger);

export default function QRHighlight() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const leftRef = React.useRef<HTMLDivElement>(null);
  const rightRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        leftRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1.2,
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
        { x: 60, opacity: 0, rotateY: -15 },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse",
          },
        },
      );

      const items = leftRef.current?.querySelectorAll(".qr-feature");
      if (items) {
        gsap.fromTo(
          items,
          { y: 30, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 60%",
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
      className="py-24 sm:py-32 relative"
      style={{ perspective: "1000px" }}
    >
      <Glow />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div ref={leftRef}>
            <Badge variant="glow" className="inline-flex">
              <QrCode className="mr-2 size-4" />
              QR System
            </Badge>
            <h3 className="mt-6 text-balance text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              QR entry + food distribution with zero coupons
            </h3>
            <p className="mt-4 text-lg text-white/70">
              Replace paper slips and manual registers with secure scanning and
              instant marking.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="qr-feature flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition-colors duration-300 backdrop-blur-sm">
                <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/25 shadow-lg shadow-emerald-500/10">
                  <BadgeCheck className="size-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
                    No paper coupons
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    One QR pass can grant entry + food access based on your
                    rules.
                  </p>
                </div>
              </div>

              <div className="qr-feature flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition-colors duration-300 backdrop-blur-sm">
                <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-purple-500/15 ring-1 ring-purple-500/25 shadow-lg shadow-purple-500/10">
                  <ShieldCheck className="size-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
                    No duplicate entries
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    Each scan is tracked instantly with tamper-resistant
                    marking.
                  </p>
                </div>
              </div>

              <div className="qr-feature flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition-colors duration-300 backdrop-blur-sm">
                <div className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/25 shadow-lg shadow-blue-500/10">
                  <QrCode className="size-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
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

          <div
            ref={rightRef}
            className="relative"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-purple-500/30 via-blue-500/25 to-pink-500/25 blur-3xl" />
            <TiltCard>
              <Card className="rounded-3xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <QrCode className="size-5 text-white/80" />
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
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-colors duration-300">
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
                      <Badge className="bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20 animate-pulse">
                        Verified
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-white/70">
                      Marked at Gate A • 10:42 AM • Device: Scanner-03
                    </p>
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
