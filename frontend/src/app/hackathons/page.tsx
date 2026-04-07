"use client";


import { useRouter } from "next/navigation";
import { Calendar, ChevronRight } from "lucide-react";

import { HACKATHONS } from "@/lib/hackathons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";

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

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Glow />
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="bg-white/5 text-white/80 ring-1 ring-white/10">
              Browse
            </Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Hackathons
            </h1>
            <p className="mt-3 max-w-2xl text-white/70">
              Explore upcoming hackathons, view full details, and submit your project deck.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 backdrop-blur-xl">
            {HACKATHONS.length} events available
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HACKATHONS.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => router.push(`/hackathons/${h.id}`)}
              className="text-left"
            >
              <Card className="group h-full overflow-hidden transition hover:border-white/20 hover:bg-white/10">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-blue-500/15" />
                  <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-blue-600/20">
                    <img
                      src={h.image}
                      alt={h.title}
                      className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:opacity-100 group-hover:scale-[1.02]"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex h-full w-full items-center justify-center">
                              <div class="flex flex-col items-center gap-2 text-white/40">
                                <svg class="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span class="text-xs">Image not available</span>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                </div>

                <CardHeader className="space-y-2">
                  <CardTitle className="text-white">{h.title}</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Calendar className="size-4" />
                    <span>{h.date}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-white/70">{h.description}</p>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-sm font-medium text-white/80">
                      View details
                    </span>
                    <ChevronRight className="size-4 text-white/60 transition group-hover:translate-x-0.5 group-hover:text-white/80" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
