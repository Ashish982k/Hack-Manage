import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  BadgeCheck,
  BarChart3,
  Boxes,
  ChevronDown,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AnimatedHeadline,
  Container,
  FloatingParticles,
  Glow,
} from "@/components/home/shared";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = React.useRef<HTMLElement>(null);
  const backgroundRef = React.useRef<HTMLDivElement>(null);
  const midgroundRef = React.useRef<HTMLDivElement>(null);
  const foregroundRef = React.useRef<HTMLDivElement>(null);
  const headlineRef = React.useRef<HTMLDivElement>(null);
  const subtitleRef = React.useRef<HTMLParagraphElement>(null);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = React.useRef<HTMLDivElement>(null);
  const tiltRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        backgroundRef.current,
        { scale: 1.2, opacity: 0 },
        { scale: 1, opacity: 1, duration: 2 },
      )
        .fromTo(
          midgroundRef.current,
          { y: 100, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.5 },
          "-=1.5",
        )
        .fromTo(
          headlineRef.current,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2 },
          "-=1",
        )
        .fromTo(
          subtitleRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1 },
          "-=0.8",
        )
        .fromTo(
          ctaRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          "-=0.6",
        )
        .fromTo(
          foregroundRef.current,
          { y: 80, opacity: 0, rotateX: -10 },
          { y: 0, opacity: 1, rotateX: 0, duration: 1.2 },
          "-=0.8",
        )
        .fromTo(
          scrollIndicatorRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.3",
        );

      gsap.to(backgroundRef.current, {
        yPercent: 30,
        scale: 1.1,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      gsap.to(midgroundRef.current, {
        yPercent: 15,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(foregroundRef.current, {
        yPercent: -10,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
        },
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const onTiltMove = (e: React.MouseEvent) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 12;
    const rotateX = (0.5 - py) * 10;
    el.style.setProperty("--hx-rx", `${rotateX.toFixed(2)}deg`);
    el.style.setProperty("--hx-ry", `${rotateY.toFixed(2)}deg`);
    el.style.setProperty("--hx-gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--hx-gy", `${(py * 100).toFixed(1)}%`);
  };

  const onTiltLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--hx-rx", `0deg`);
    el.style.setProperty("--hx-ry", `0deg`);
    el.style.setProperty("--hx-gx", `50%`);
    el.style.setProperty("--hx-gy", `50%`);
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen overflow-hidden flex items-center"
      style={{ perspective: "1000px" }}
    >
      <div ref={backgroundRef} className="absolute inset-0 -z-20">
        <Glow />
        <FloatingParticles />
      </div>

      <div ref={midgroundRef} className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-gradient-to-b from-purple-900/10 via-transparent to-blue-900/10 blur-3xl" />
      </div>

      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 pt-20 pb-32">
          <div className="relative z-10">
            <div ref={headlineRef}>
              <Badge variant="glow" className="inline-flex mb-6">
                <ShieldCheck className="mr-2 size-4" />
                Designed for modern hackathons
              </Badge>
              <AnimatedHeadline />
            </div>

            <p
              ref={subtitleRef}
              className="mt-6 max-w-xl text-pretty text-lg text-white/70 sm:text-xl leading-relaxed"
            >
              The premium operating system for high-stakes hackathons — team
              management, submissions, secure QR entry, and evaluator-ready
              scoring.
            </p>

            <div ref={ctaRef} className="mt-10 flex flex-wrap gap-4">
              <Button
                variant="primary"
                size="lg"
                className="group relative overflow-hidden"
              >
                <span className="relative z-10">Launch a Hackathon</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
              <Button variant="outline" size="lg" className="backdrop-blur-sm">
                View Demo
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Badge className="backdrop-blur-sm">Team-first</Badge>
              <Badge className="backdrop-blur-sm">Verification</Badge>
              <Badge className="backdrop-blur-sm">QR entry</Badge>
              <Badge className="backdrop-blur-sm">Scoring</Badge>
            </div>
          </div>

          <div
            ref={foregroundRef}
            className="relative z-10"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-blue-500/20 blur-2xl" />
            <div
              ref={tiltRef}
              onMouseMove={onTiltMove}
              onMouseLeave={onTiltLeave}
              className="hx-tilt"
            >
              <Card className="rounded-3xl hx-tilt__card cinematic-card">
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
                        <p className="text-xs text-white/60">
                          Live ops preview
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20 animate-pulse">
                      Live
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-colors duration-300">
                      <div className="flex items-center gap-2 text-white/80">
                        <Users className="size-4" />
                        <span className="text-sm">Registered</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        1,248
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        +22% this week
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-colors duration-300">
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
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-colors duration-300">
                      <div className="flex items-center gap-2 text-white/80">
                        <QrCode className="size-4" />
                        <span className="text-sm">QR Check-ins</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        968
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        No duplicates
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-colors duration-300">
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
                      <p className="text-sm font-semibold text-white">
                        QR Pass
                      </p>
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
              <div className="hx-tilt__glare" aria-hidden />
            </div>
          </div>
        </div>
      </Container>

      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
      >
        <span className="text-xs uppercase tracking-widest">
          Scroll to explore
        </span>
        <ChevronDown className="size-5 animate-bounce" />
      </div>
    </section>
  );
}
