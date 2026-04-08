"use client";

import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function HackathonsClient({ hackathons }: any) {
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
              Explore upcoming hackathons and participate.
            </p>
          </div>

          <div className="flex items-center gap-3">
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

        {/* GRID */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hackathons.map((h: any) => (
            <button
              key={h.id}
              onClick={() => router.push(`/hackathons/${h.id}`)}
              className="text-left"
            >
              <Card className="group h-full overflow-hidden transition hover:border-white/20 hover:bg-white/10">
                {/* IMAGE */}
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    src={`http://localhost:5000/images/${h.headerImg}`}
                    alt={h.title}
                    className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100 group-hover:scale-[1.02]"
                  />
                </div>

                {/* HEADER */}
                <CardHeader className="space-y-2">
                  <CardTitle>{h.title}</CardTitle>

                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Calendar className="size-4" />
                    <span>
                      {h.startdate} → {h.enddate}
                    </span>
                  </div>
                </CardHeader>

                {/* CONTENT */}
                <CardContent className="space-y-4">
                  <p className="text-sm text-white/70">{h.description}</p>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-sm font-medium text-white/80">
                      View details
                    </span>
                    <ChevronRight className="size-4 text-white/60 group-hover:translate-x-1" />
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
