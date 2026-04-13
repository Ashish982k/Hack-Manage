"use client";

import { useRouter } from "next/navigation";
import { Calendar,  Plus } from "lucide-react";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { buildApiAssetUrl, fetchHackathonsList } from "@/api";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

interface Hackathon {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  headerImage?: string;
}

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/35 via-pink-500/25 to-blue-500/25 blur-3xl" />
      <div className="absolute right-[-140px] top-[220px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
      <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/15 blur-3xl" />
    </div>
  );
}

export default function HackathonsPage() {
  const router = useRouter();

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  const headerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const headerAnimatedRef = useRef(false);
  const cardsAnimatedRef = useRef(false);

  useEffect(() => {
    fetchHackathonsList()
      .then((res) => res.json())
      .then((data) => {
        setHackathons(data.hackathons || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Header animations
  useLayoutEffect(() => {
    if (headerAnimatedRef.current) return;
    headerAnimatedRef.current = true;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.from(badgeRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.6,
        ease: "power3.out",
      })
        .from(
          titleRef.current,
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.3",
        )
        .from(
          descRef.current,
          {
            opacity: 0,
            y: 20,
            duration: 0.6,
            ease: "power3.out",
          },
          "-=0.4",
        )
        .from(
          statsRef.current,
          {
            opacity: 0,
            scale: 0.9,
            duration: 0.6,
            ease: "back.out(1.7)",
          },
          "-=0.3",
        );
    });

    return () => ctx.revert();
  }, []);

  // Cards scroll trigger animations
  useLayoutEffect(() => {
    if (loading) return;
    if (cardsAnimatedRef.current) return;
    if (hackathons.length === 0) return;
    if (!cardsRef.current) return;

    cardsAnimatedRef.current = true;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(
        ".hackathon-card",
        cardsRef.current,
      );

      if (cards.length === 0) return;

      gsap.from(cards, {
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 80%",
          end: "bottom 20%",
          once: true,
        },
        opacity: 0,
        y: 60,
        scale: 0.95,
        rotationX: -5,
        duration: 0.8,
        stagger: {
          amount: 0.6,
          from: "start",
        },
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, [loading, hackathons]);

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Glow />
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div
          ref={headerRef}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div ref={badgeRef}>
              <Badge className="bg-white/5 text-white/80 ring-1 ring-white/10">
                Browse
              </Badge>
            </div>

            <h1
              ref={titleRef}
              className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl"
            >
              Hackathons
            </h1>

            <p ref={descRef} className="mt-3 max-w-2xl text-white/70">
              Explore upcoming hackathons.
            </p>
          </div>

          <div ref={statsRef} className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 backdrop-blur-xl sm:block">
              {hackathons.length} events available
            </div>

            <Button
              onClick={() => router.push("/hackathons/create")}
              variant="primary"
              className="gap-2 font-bold"
            >
              <Plus className="size-4" />
              Create Hackathon
            </Button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <p className="mt-10 text-center text-white/60">Loading...</p>
        ) : hackathons.length === 0 ? (
          <p className="mt-10 text-center text-white/60">
            No hackathons available
          </p>
        ) : (
          <div
            ref={cardsRef}
            className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {hackathons.map((h) => (
              <button
                key={h.id}
                onClick={() => router.push(`/hackathons/${h.id}`)}
                className="hackathon-card text-left"
              >
                <Card className="group h-full overflow-hidden transition hover:border-white/20 hover:bg-white/10">
                  {/* IMAGE */}
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image
                      src={
                        h.headerImage
                          ? buildApiAssetUrl(h.headerImage)
                          : "/placeholder.jpg"
                      }
                      alt={h.title}
                      fill
                      className="object-cover opacity-80 transition group-hover:opacity-100 group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>

                  <CardHeader>
                    <CardTitle className="py-4">{h.title}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Calendar className="size-4" />
                      <span>
                        {h.startDate} → {h.endDate}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-white/70">
                      {h.description.substring(0, 150) + "....."}
                    </p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
