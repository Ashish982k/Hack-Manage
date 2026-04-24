"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { gsap } from "gsap";
import { Flip, Observer, ScrollTrigger, SplitText } from "gsap/all";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Crown,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { HackathonCore3D } from "@/components/home/hackathon-core-3d";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

gsap.registerPlugin(ScrollTrigger, Observer, Flip, SplitText);

const SECTION_NAV = [
  { id: "hero", label: "Overview" },
  { id: "capabilities", label: "Capabilities" },
  { id: "journey", label: "Journey" },
  { id: "proof", label: "Proof" },
  { id: "launch", label: "Launch" },
] as const;

type Cluster = "All" | "Operations" | "Experience" | "Intelligence";

type Capability = {
  title: string;
  description: string;
  cluster: Exclude<Cluster, "All">;
  icon: LucideIcon;
};

const CLUSTERS: readonly Cluster[] = [
  "All",
  "Operations",
  "Experience",
  "Intelligence",
];

const CAPABILITIES: readonly Capability[] = [
  {
    title: "Identity-locked verification",
    description:
      "Approval pipelines that unify registration, validation, and audit-proof access states.",
    cluster: "Operations",
    icon: ShieldCheck,
  },
  {
    title: "Fluid team orchestration",
    description:
      "Invite, merge, and lock team structures with real-time roster confidence.",
    cluster: "Experience",
    icon: Users,
  },
  {
    title: "Live scoring intelligence",
    description:
      "Judge scoring, shortlist transitions, and ranking confidence in one clean layer.",
    cluster: "Intelligence",
    icon: BarChart3,
  },
  {
    title: "QR-native gate control",
    description:
      "Instant scans with duplicate-proof entry and frictionless on-ground execution.",
    cluster: "Operations",
    icon: QrCode,
  },
  {
    title: "Premium participant UX",
    description:
      "Fast, clear, and elegant interactions that reduce stress for students and staff.",
    cluster: "Experience",
    icon: Sparkles,
  },
  {
    title: "Decision-ready analytics",
    description:
      "Signal-rich dashboards for organizers to make faster and better event decisions.",
    cluster: "Intelligence",
    icon: Boxes,
  },
];

const JOURNEY_PANELS = [
  {
    title: "Registration to verification",
    description:
      "Use gesture-like interactions to move through event states while keeping context pinned and readable.",
    tag: "Step 01",
  },
  {
    title: "Team formation to submission",
    description:
      "Smooth transitions keep momentum high and remove the friction common in hackathon operations.",
    tag: "Step 02",
  },
  {
    title: "Shortlist to final scoring",
    description:
      "Motion highlights what changed, when it changed, and where organizers should act next.",
    tag: "Step 03",
  },
] as const;

function getOrderedCapabilities(cluster: Cluster): Capability[] {
  if (cluster === "All") {
    return [...CAPABILITIES];
  }

  return [...CAPABILITIES].sort((a, b) => {
    if (a.cluster === cluster && b.cluster !== cluster) return -1;
    if (a.cluster !== cluster && b.cluster === cluster) return 1;
    return 0;
  });
}

export function HomePage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const rootRef = React.useRef<HTMLElement>(null);
  const headerRef = React.useRef<HTMLElement>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);
  const capabilityGridRef = React.useRef<HTMLDivElement>(null);
  const journeyDeckRef = React.useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = React.useState(0);
  const [activeCluster, setActiveCluster] = React.useState<Cluster>("All");
  const [orderedCapabilities, setOrderedCapabilities] =
    React.useState<Capability[]>(getOrderedCapabilities("All"));
  const [activeJourneyIndex, setActiveJourneyIndex] = React.useState(0);

  const handlePrimaryRoute = React.useCallback(() => {
    router.push(session?.user?.id ? "/hackathons" : "/login");
  }, [router, session?.user?.id]);

  const jumpToSection = React.useCallback((sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const handleClusterChange = React.useCallback(
    (cluster: Cluster) => {
      if (cluster === activeCluster) return;

      const next = getOrderedCapabilities(cluster);
      if (!capabilityGridRef.current) {
        setActiveCluster(cluster);
        setOrderedCapabilities(next);
        return;
      }

      const state = Flip.getState(Array.from(capabilityGridRef.current.children));
      flushSync(() => {
        setActiveCluster(cluster);
        setOrderedCapabilities(next);
      });

      Flip.from(state, {
        duration: 0.7,
        ease: "power3.inOut",
        absolute: true,
        nested: true,
        stagger: 0.045,
      });
    },
    [activeCluster],
  );

  React.useEffect(() => {
    if (!journeyDeckRef.current) return;

    const cards = Array.from(
      journeyDeckRef.current.querySelectorAll<HTMLElement>("[data-journey-card]"),
    );

    cards.forEach((card, index) => {
      const offset = index - activeJourneyIndex;
      const distance = Math.abs(offset);
      const isActive = distance === 0;
      card.dataset.active = isActive ? "true" : "false";
      card.style.pointerEvents = isActive ? "auto" : "none";

      gsap.to(card, {
        yPercent: offset * 15,
        xPercent: offset * 2.5,
        scale: isActive ? 1 : 0.9,
        autoAlpha: isActive ? 1 : Math.max(0.16, 0.55 - distance * 0.18),
        filter: `blur(${isActive ? 0 : Math.min(2.4, distance * 1.1)}px)`,
        zIndex: isActive ? 30 : 20 - distance,
        duration: 0.6,
        ease: "power3.out",
        overwrite: true,
      });
    });
  }, [activeJourneyIndex]);

  React.useLayoutEffect(() => {
    const splitTexts: SplitText[] = [];
    const observers: Observer[] = [];
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      if (progressRef.current) {
        const setScaleX = gsap.quickSetter(progressRef.current, "scaleX");
        gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "left" });

        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => setScaleX(self.progress),
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 36, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 1.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 86%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
        const split = new SplitText(el, {
          type: "lines,words",
          linesClass: "split-line",
        });
        splitTexts.push(split);

        gsap.from(split.lines, {
          yPercent: 115,
          autoAlpha: 0,
          stagger: 0.08,
          duration: 1.1,
          ease: "power4.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      });

      const sectionNodes = SECTION_NAV.map(({ id }) =>
        document.getElementById(id),
      ).filter((el): el is HTMLElement => Boolean(el));

      sectionNodes.forEach((section, index) => {
        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActiveSection(index);
          },
        });
      });

      if (!prefersReducedMotion && sectionNodes.length > 1 && window.innerWidth >= 1024) {
        ScrollTrigger.create({
          start: 0,
          end: "max",
          snap: {
            snapTo: 1 / (sectionNodes.length - 1),
            duration: { min: 0.18, max: 0.45 },
            delay: 0.04,
            ease: "power2.out",
          },
        });
      }

      if (headerRef.current && !prefersReducedMotion) {
        observers.push(
          Observer.create({
            target: window,
            type: "wheel,touch",
            tolerance: 8,
            onDown: () =>
              gsap.to(headerRef.current, {
                y: -10,
                autoAlpha: 0.82,
                duration: 0.32,
                ease: "power2.out",
                overwrite: true,
              }),
            onUp: () =>
              gsap.to(headerRef.current, {
                y: 0,
                autoAlpha: 1,
                duration: 0.36,
                ease: "power2.out",
                overwrite: true,
              }),
          }),
        );
      }

      if (journeyDeckRef.current && !prefersReducedMotion) {
        observers.push(
          Observer.create({
            target: journeyDeckRef.current,
            type: "wheel,touch,pointer",
            tolerance: 12,
            preventDefault: true,
            onDown: () =>
              setActiveJourneyIndex((current) => (current + 1) % JOURNEY_PANELS.length),
            onLeft: () =>
              setActiveJourneyIndex((current) => (current + 1) % JOURNEY_PANELS.length),
            onUp: () =>
              setActiveJourneyIndex(
                (current) => (current - 1 + JOURNEY_PANELS.length) % JOURNEY_PANELS.length,
              ),
            onRight: () =>
              setActiveJourneyIndex(
                (current) => (current - 1 + JOURNEY_PANELS.length) % JOURNEY_PANELS.length,
              ),
          }),
        );
      }
    }, rootRef);

    return () => {
      observers.forEach((observer) => observer.kill());
      splitTexts.forEach((split) => split.revert());
      ctx.revert();
    };
  }, []);

  return (
    <main ref={rootRef} className="premium-home relative min-h-screen overflow-x-clip text-white">
      <div className="fixed inset-x-0 top-0 z-[70] h-px bg-white/10">
        <div
          ref={progressRef}
          className="h-full w-full origin-left bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300"
        />
      </div>

      <header
        ref={headerRef}
        className="premium-nav-glass fixed left-1/2 top-5 z-50 w-[min(1100px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/12 px-4 py-3 sm:px-6"
      >
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Crown className="size-4 text-white/90" />
            </span>
            <span className="text-sm font-semibold tracking-[0.2em] text-white/90">
              HACKATHONX
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {SECTION_NAV.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToSection(item.id)}
                className={`text-xs tracking-[0.16em] transition-colors ${
                  activeSection === index ? "text-white" : "text-white/55 hover:text-white/80"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!session && (
              <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
                Login
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handlePrimaryRoute}>
              {session ? "Open Console" : "Get Started"}
            </Button>
          </div>
        </div>
      </header>

      <aside className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
        <div className="rounded-full border border-white/10 bg-white/[0.06] p-2 backdrop-blur-md">
          {SECTION_NAV.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpToSection(item.id)}
              aria-label={item.label}
              className={`my-2 block size-2.5 rounded-full transition-all ${
                activeSection === index
                  ? "bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.15)]"
                  : "bg-white/35 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </aside>

      <section id="hero" className="premium-section flex min-h-screen items-center px-6 pt-24 sm:px-10">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <p
              data-reveal
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs tracking-[0.2em] text-white/70"
            >
              <Sparkles className="size-3.5" />
              Premium hackathon operating system
            </p>

            <h1
              data-split
              className="text-balance text-5xl font-semibold tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl"
            >
              Designed to feel as refined as the event you are building.
            </h1>

            <p data-reveal className="max-w-2xl text-lg leading-relaxed text-white/68 sm:text-xl">
              A high-end workflow from registrations to judging, with smooth transitions,
              controlled motion, and a visual rhythm that feels intentional at every step.
            </p>

            <div data-reveal className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="lg" onClick={handlePrimaryRoute}>
                Start your event
                <ArrowUpRight className="size-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => jumpToSection("capabilities")}>
                Explore platform
              </Button>
            </div>
          </div>

          <div data-reveal className="space-y-4">
            <HackathonCore3D />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Participants", value: "1,248" },
                { label: "Teams", value: "312" },
                { label: "Secure scans", value: "968" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="premium-card rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-white/52">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="premium-section px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <p data-reveal className="text-xs tracking-[0.2em] text-white/58">
              CAPABILITIES
            </p>
            <h2 data-split className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Minimal interface, premium control, elegant system logic.
            </h2>
          </div>

          <div data-reveal className="mt-10 flex flex-wrap gap-3">
            {CLUSTERS.map((cluster) => (
              <button
                key={cluster}
                type="button"
                onClick={() => handleClusterChange(cluster)}
                className={`rounded-full border px-4 py-2 text-xs tracking-[0.16em] transition-colors ${
                  cluster === activeCluster
                    ? "border-white/35 bg-white/12 text-white"
                    : "border-white/15 bg-white/[0.03] text-white/65 hover:text-white"
                }`}
              >
                {cluster}
              </button>
            ))}
          </div>

          <div ref={capabilityGridRef} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {orderedCapabilities.map((item) => (
              <article
                key={item.title}
                data-reveal
                className={`premium-card rounded-2xl border p-6 transition-colors ${
                  activeCluster === "All" || activeCluster === item.cluster
                    ? "border-white/16"
                    : "border-white/8 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] tracking-[0.16em] text-white/60">
                    {item.cluster}
                  </span>
                  <item.icon className="size-4 text-white/80" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/64">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="journey" className="premium-section px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <p data-reveal className="text-xs tracking-[0.2em] text-white/58">
              INTERACTION JOURNEY
            </p>
            <h2 data-split className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Gesture-driven section storytelling powered by Observer.
            </h2>
            <p data-reveal className="max-w-xl text-base leading-relaxed text-white/66">
              Scroll or swipe over the panel stack to move through each stage. Motion is tuned to
              feel immediate, clear, and premium without being loud.
            </p>
            <p data-reveal className="inline-flex items-center gap-2 text-xs tracking-[0.16em] text-white/56">
              <ArrowRight className="size-3.5" />
              Wheel, swipe, or tap a step
            </p>
          </div>

          <div
            ref={journeyDeckRef}
            data-reveal
            className="relative h-[420px] touch-pan-y select-none [perspective:1200px]"
          >
            {JOURNEY_PANELS.map((panel, index) => (
              <article
                key={panel.title}
                data-journey-card
                className="premium-card absolute inset-0 rounded-3xl border border-white/14 p-8 sm:p-10"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015)), rgba(12,14,20,0.96)",
                }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(360px_220px_at_10%_0%,rgba(125,211,252,0.09),rgba(12,14,20,0))]" />
                <div className="relative">
                  <p className="text-xs tracking-[0.16em] text-white/52">{panel.tag}</p>
                  <h3 className="mt-6 max-w-md text-3xl font-semibold tracking-tight text-white">
                    {panel.title}
                  </h3>
                  <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
                    {panel.description}
                  </p>
                  <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-4 py-2 text-xs text-white/66">
                    State {index + 1} of {JOURNEY_PANELS.length}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:col-start-2">
            {JOURNEY_PANELS.map((panel, index) => (
              <button
                key={panel.tag}
                type="button"
                onClick={() => setActiveJourneyIndex(index)}
                className={`rounded-full border px-4 py-2 text-[11px] tracking-[0.14em] transition-colors ${
                  activeJourneyIndex === index
                    ? "border-white/35 bg-white/12 text-white"
                    : "border-white/14 bg-white/[0.03] text-white/60 hover:text-white"
                }`}
              >
                {panel.tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="premium-section px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p data-reveal className="text-xs tracking-[0.2em] text-white/58">
              OPERATIONAL PROOF
            </p>
            <h2 data-split className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Clear metrics, confident decisions, and a calmer event floor.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article data-reveal className="premium-card rounded-3xl border border-white/12 p-8">
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  { label: "Approval latency", value: "11s" },
                  { label: "Duplicate scan rate", value: "0.0%" },
                  { label: "Judge feedback cycle", value: "< 2m" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/50">{item.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 max-w-2xl text-sm text-white/62">
                Built for teams who care about both operational precision and participant
                experience.
              </p>
            </article>

            <article data-reveal className="premium-card rounded-3xl border border-white/12 p-8">
              <p className="text-xs tracking-[0.16em] text-white/55">Organizer feedback</p>
              <p className="mt-5 text-2xl leading-snug tracking-tight text-white/95">
                “The interface made our event feel premium. The motion gave clarity to every stage,
                and the flow reduced stress for both judges and students.”
              </p>
              <p className="mt-8 text-sm text-white/60">Program Lead • University Hackday</p>
            </article>
          </div>
        </div>
      </section>

      <section id="launch" className="premium-section px-6 pb-20 pt-24 sm:px-10 sm:pt-28">
        <div className="mx-auto w-full max-w-6xl">
          <div
            data-reveal
            className="premium-card overflow-hidden rounded-[30px] border border-white/14 p-10 sm:p-14"
          >
            <p className="text-xs tracking-[0.2em] text-white/58">READY TO LAUNCH</p>
            <h2 data-split className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Give your next hackathon the polish of a high-end product.
            </h2>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button variant="primary" size="lg" onClick={handlePrimaryRoute}>
                {session ? "Go to dashboard" : "Start now"}
              </Button>
              <Button variant="outline" size="lg" onClick={() => jumpToSection("hero")}>
                Back to top
              </Button>
            </div>
          </div>

          <footer className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs tracking-[0.12em] text-white/46 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} HackathonX</p>
            <p>Premium event operations platform</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
