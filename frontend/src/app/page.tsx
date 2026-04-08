"use client";
import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  ChevronDown,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC GLOW - Layered gradient orbs for depth
   ═══════════════════════════════════════════════════════════════════════════ */
function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Background layer - largest, most diffuse */}
      <div className="absolute left-1/2 top-[-200px] h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-600/30 via-pink-500/20 to-blue-600/20 blur-[120px] animate-pulse-slow" />
      {/* Midground layer */}
      <div className="absolute right-[-200px] top-[150px] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-blue-500/25 via-purple-500/20 to-pink-500/15 blur-[100px]" />
      <div className="absolute bottom-[-300px] left-[-200px] h-[700px] w-[700px] rounded-full bg-gradient-to-br from-pink-500/25 via-purple-500/20 to-blue-500/20 blur-[100px]" />
      {/* Foreground accent orbs */}
      <div className="absolute left-[20%] top-[40%] h-[300px] w-[300px] rounded-full bg-purple-500/15 blur-[80px]" />
      <div className="absolute right-[15%] bottom-[20%] h-[250px] w-[250px] rounded-full bg-blue-500/15 blur-[70px]" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLOATING PARTICLES - Ambient depth elements
   ═══════════════════════════════════════════════════════════════════════════ */
function FloatingParticles() {
  const [particles, setParticles] = React.useState<
    {
      width: string;
      height: string;
      left: string;
      top: string;
      animationDelay: string;
      animationDuration: string;
    }[]
  >([]);

  React.useEffect(() => {
    setParticles(
      [...Array(20)].map(() => ({
        width: `${Math.random() * 4 + 2}px`,
        height: `${Math.random() * 4 + 2}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${Math.random() * 10 + 10}s`,
      })),
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-5 overflow-hidden"
    >
      {particles.map((style, i) => (
        <div
          key={i}
          className="floating-particle absolute rounded-full bg-white/10"
          style={style}
        />
      ))}
    </div>
  );
}

type CharType = "lowerCase" | "upperCase" | "numbers" | "XO" | string;

function ScrambleText({
  text,
  duration = 800,
  delay = 0,
  chars = "!<>-_\\\\/[]{}—=+*^?#________",
  className,
  onComplete,
}: {
  text: string;
  duration?: number;
  delay?: number;
  chars?: CharType;
  className?: string;
  onComplete?: () => void;
}) {
  const [displayText, setDisplayText] = React.useState("");
  const [isFinished, setIsFinished] = React.useState(false);

  React.useEffect(() => {
    let charSet = chars;
    if (chars === "lowerCase") charSet = "abcdefghijklmnopqrstuvwxyz";
    if (chars === "upperCase") charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (chars === "numbers") charSet = "0123456789";
    if (chars === "XO") charSet = "XO";

    const startTimeout = setTimeout(() => {
      let frame = 0;
      const totalFrames = Math.floor((duration / 1000) * 60);
      const queue: {
        from: string;
        to: string;
        start: number;
        end: number;
        char?: string;
      }[] = [];

      for (let i = 0; i < text.length; i++) {
        const from = charSet[Math.floor(Math.random() * charSet.length)];
        const start = Math.floor(Math.random() * (totalFrames * 0.4));
        const end = start + Math.floor(Math.random() * (totalFrames * 0.6));
        queue.push({ from, to: text[i], start, end });
      }

      let animationFrameId: number;

      const update = () => {
        let output = "";
        let complete = 0;

        for (let i = 0; i < queue.length; i++) {
          const { from, to, start, end,  } = queue[i];
          let char = queue[i].char;
          if (frame >= end) {
            complete++;
            output += to;
          } else if (frame >= start) {
            if (!char || Math.random() < 0.28) {
              char = charSet[Math.floor(Math.random() * charSet.length)];
              queue[i].char = char;
            }
            output += `<span class="opacity-50 font-mono">${char}</span>`;
          } else {
            output += `<span class="opacity-0">${from}</span>`;
          }
        }

        setDisplayText(output);

        if (complete === queue.length) {
          setDisplayText(text);
          setIsFinished(true);
          if (onComplete) onComplete();
        } else {
          frame++;
          animationFrameId = requestAnimationFrame(update);
        }
      };

      update();

      return () => cancelAnimationFrame(animationFrameId);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, duration, delay, chars, onComplete]);

  if (!displayText && !isFinished) {
    return (
      <span className={className} style={{ opacity: 0 }}>
        {text}
      </span>
    );
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: displayText }}
    />
  );
}

function AnimatedHeadline() {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    // Empty useEffect or remove if not needed.
  }, []);

  return (
    <div>
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
        <span className="hx-headline-line">
          <ScrambleText
            text="FORGE THE FUTURE"
            chars="upperCase"
            duration={2000}
            onComplete={() => setStep((s) => Math.max(s, 1))}
          />
        </span>
        <br />
        <span className="hx-headline-line flex flex-wrap items-center gap-x-3 mt-2">
          {step >= 1 ? (
            <ScrambleText
              text="IN CODE"
              chars="XO"
              duration={1500}
              onComplete={() => setStep((s) => Math.max(s, 2))}
            />
          ) : (
            <span className="opacity-0">IN CODE</span>
          )}
        </span>
      </h1>
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

/* ═══════════════════════════════════════════════════════════════════════════
   3D TILT CARD - Interactive hover with perspective
   ═══════════════════════════════════════════════════════════════════════════ */
function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 15;
    const rotateX = (0.5 - py) * 12;
    el.style.setProperty("--hx-rx", `${rotateX.toFixed(2)}deg`);
    el.style.setProperty("--hx-ry", `${rotateY.toFixed(2)}deg`);
    el.style.setProperty("--hx-gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--hx-gy", `${(py * 100).toFixed(1)}%`);
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--hx-rx", `0deg`);
    el.style.setProperty("--hx-ry", `0deg`);
    el.style.setProperty("--hx-gx", `50%`);
    el.style.setProperty("--hx-gy", `50%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`hx-tilt ${className}`}
    >
      <div className="hx-tilt__card">{children}</div>
      <div className="hx-tilt__glare" aria-hidden />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC HERO - Fullscreen immersive with parallax layers
   ═══════════════════════════════════════════════════════════════════════════ */
function Hero() {
  const heroRef = React.useRef<HTMLElement>(null);
  const backgroundRef = React.useRef<HTMLDivElement>(null);
  const midgroundRef = React.useRef<HTMLDivElement>(null);
  const foregroundRef = React.useRef<HTMLDivElement>(null);
  const headlineRef = React.useRef<HTMLDivElement>(null);
  const subtitleRef = React.useRef<HTMLParagraphElement>(null);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = React.useRef<HTMLDivElement>(null);
  const tiltRef = React.useRef<HTMLDivElement | null>(null);

  // GSAP Hero entrance + parallax setup
  React.useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial entrance timeline
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Fade in and zoom background layer
      tl.fromTo(
        backgroundRef.current,
        { scale: 1.2, opacity: 0 },
        { scale: 1, opacity: 1, duration: 2 },
      )
        // Midground floats up
        .fromTo(
          midgroundRef.current,
          { y: 100, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.5 },
          "-=1.5",
        )
        // Headline fade + upward motion
        .fromTo(
          headlineRef.current,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2 },
          "-=1",
        )
        // Subtitle
        .fromTo(
          subtitleRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1 },
          "-=0.8",
        )
        // CTA buttons
        .fromTo(
          ctaRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          "-=0.6",
        )
        // Foreground card
        .fromTo(
          foregroundRef.current,
          { y: 80, opacity: 0, rotateX: -10 },
          { y: 0, opacity: 1, rotateX: 0, duration: 1.2 },
          "-=0.8",
        )
        // Scroll indicator bounce
        .fromTo(
          scrollIndicatorRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.3",
        );

      // Parallax on scroll - background moves slower
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

      // Midground parallax - medium speed
      gsap.to(midgroundRef.current, {
        yPercent: 15,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Foreground moves fastest (card)
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
      {/* BACKGROUND LAYER - Glow orbs */}
      <div ref={backgroundRef} className="absolute inset-0 -z-20">
        <Glow />
        <FloatingParticles />
      </div>

      {/* MIDGROUND LAYER - Gradient mesh */}
      <div ref={midgroundRef} className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-gradient-to-b from-purple-900/10 via-transparent to-blue-900/10 blur-3xl" />
      </div>

      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 pt-20 pb-32">
          {/* LEFT SIDE - Text content */}
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

          {/* RIGHT SIDE - 3D Card (FOREGROUND) */}
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

      {/* SCROLL INDICATOR */}
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

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC FEATURES - Scene-like scroll animations with 3D depth
   ═══════════════════════════════════════════════════════════════════════════ */
function Features() {
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

  // Cinematic scroll animation for cards
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
            rotateX: -15, // 3D tilt effect
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

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC WORKFLOW - Sequential reveal with depth
   ═══════════════════════════════════════════════════════════════════════════ */
function Workflow() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const stepsRef = React.useRef<HTMLDivElement>(null);

  const steps = [
    { name: "Register", desc: "Start sign-ups" },
    { name: "Verify", desc: "Auto + admin checks" },
    { name: "Form Team", desc: "Invite & lock teams" },
    { name: "Submit", desc: "PPT/project upload" },
    { name: "Shortlist", desc: "Shortlist rules" },
    { name: "QR Entry", desc: "Scan & mark entry" },
    { name: "Final Evaluation", desc: "Judge scoring" },
  ];

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      const stepElements = stepsRef.current?.querySelectorAll(".workflow-step");

      if (stepElements) {
        // Sequential staggered reveal with scale
        gsap.fromTo(
          stepElements,
          {
            opacity: 0,
            x: -30,
            scale: 0.8,
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.6,
            stagger: {
              amount: 1,
              from: "start",
            },
            ease: "power3.out",
            scrollTrigger: {
              trigger: stepsRef.current,
              start: "top 75%",
              toggleActions: "play none none reverse",
            },
          },
        );

        // Animate connecting lines
        const lines = stepsRef.current?.querySelectorAll(".workflow-line");
        if (lines) {
          gsap.fromTo(
            lines,
            { scaleX: 0, transformOrigin: "left center" },
            {
              scaleX: 1,
              duration: 0.4,
              stagger: 0.15,
              ease: "power2.out",
              scrollTrigger: {
                trigger: stepsRef.current,
                start: "top 70%",
                toggleActions: "play none none reverse",
              },
            },
          );
        }
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="workflow" className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Workflow"
          title="A smooth flow from registration to results"
          subtitle="A step-based pipeline designed to minimize queues, avoid manual errors, and keep judges focused."
        />

        <div className="mt-14" data-reveal="up">
          <Card className="rounded-3xl overflow-hidden">
            <CardContent className="pt-8 pb-8">
              <div ref={stepsRef} className="grid gap-4 md:grid-cols-7">
                {steps.map((s, idx) => (
                  <div key={s.name} className="workflow-step relative">
                    <div className="flex items-center gap-3 md:flex-col md:items-start">
                      <div className="flex items-center gap-3 md:w-full">
                        <div
                          className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/10 text-sm font-semibold text-white shadow-lg shadow-purple-500/10 hover:scale-110 transition-transform duration-300"
                          style={{ transform: `translateZ(${10 + idx * 3}px)` }}
                        >
                          {idx + 1}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="workflow-line h-[2px] flex-1 bg-gradient-to-r from-purple-500/30 via-pink-500/20 to-transparent md:hidden" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-white/90 md:mt-3">
                        {s.name}
                      </p>
                      <p className="mt-1 hidden text-xs text-white/60 md:block">
                        {s.desc}
                      </p>
                    </div>

                    {idx < steps.length - 1 && (
                      <div className="workflow-line mt-4 hidden h-[2px] w-full bg-gradient-to-r from-purple-500/30 via-pink-500/20 to-transparent md:block" />
                    )}
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

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC QR HIGHLIGHT - Split screen with parallax depth
   ═══════════════════════════════════════════════════════════════════════════ */
function QRHighlight() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const leftRef = React.useRef<HTMLDivElement>(null);
  const rightRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      // Left content slides in
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

      // Right card slides in with 3D rotation
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

      // Feature items stagger in
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

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC ADMIN PREVIEW - Counter animation with depth
   ═══════════════════════════════════════════════════════════════════════════ */
function AdminPreview() {
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

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC BENEFITS - Side-by-side reveal with depth
   ═══════════════════════════════════════════════════════════════════════════ */
function Benefits() {
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

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC CTA - Dramatic entrance with floating elements
   ═══════════════════════════════════════════════════════════════════════════ */
function CTA() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        {
          y: 60,
          opacity: 0,
          scale: 0.95,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 sm:py-32">
      <Container>
        <div ref={contentRef}>
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-blue-500/20 p-10 sm:p-16">
            <div className="absolute inset-0 bg-black/40" />

            {/* Floating glow orbs */}
            <div className="absolute -left-32 -top-32 size-[450px] rounded-full bg-purple-500/30 blur-[100px] animate-pulse-slow" />
            <div
              className="absolute -right-32 -bottom-32 size-[450px] rounded-full bg-blue-500/25 blur-[100px] animate-pulse-slow"
              style={{ animationDelay: "1s" }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[300px] rounded-full bg-pink-500/15 blur-[80px]" />

            <div className="relative mx-auto max-w-2xl text-center">
              <Badge variant="glow" className="mx-auto inline-flex">
                <Sparkles className="mr-2 size-4" />
                Ready to launch
              </Badge>
              <h3 className="mt-6 text-balance text-4xl font-bold text-white sm:text-5xl">
                Launch your hackathon in minutes
              </h3>
              <p className="mt-5 text-lg text-white/70">
                Get a streamlined registration flow, secure QR check-ins, and a
                real-time leaderboard — all in one system.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  className="group relative overflow-hidden text-base px-8 py-4"
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 py-4 backdrop-blur-sm"
                >
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP - Cinematic landing page with scene transitions
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  // Global reveal animations for data-reveal elements
  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>("[data-reveal='up']");

      els.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
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
    <main className="min-h-full bg-black text-white overflow-x-hidden">
      {/* Navbar stays fixed */}
      <Navbar />

      {/* SCENE 1: Fullscreen Hero with parallax */}
      <Hero />

      {/* SCENE 2: Features grid with 3D cards */}
      <Features />

      {/* SCENE 3: Workflow timeline */}
      <Workflow />

      {/* SCENE 4: QR System showcase */}
      <QRHighlight />

      {/* SCENE 5: Admin dashboard preview */}
      <AdminPreview />

      {/* SCENE 6: Benefits comparison */}
      <Benefits />

      {/* SCENE 7: Call to action */}
      <CTA />

      {/* Footer */}
      <Footer />
    </main>
  );
}
