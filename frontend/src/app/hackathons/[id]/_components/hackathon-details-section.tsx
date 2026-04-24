"use client";

import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { HackathonViewModel } from "../_lib/types";

type HackathonDetailsSectionProps = {
  hackathon: HackathonViewModel;
  expanded: Record<string, boolean>;
  onToggleProblem: (problemId: string) => void;
};

export function HackathonDetailsSection({
  hackathon,
  expanded,
  onToggleProblem,
}: HackathonDetailsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white">
          Hackathon Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-white/90">
            Description
          </p>
          <p className="mt-2 text-sm leading-7 text-white/70">
            {hackathon.longDescription}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">
            Problem Statements
          </p>
          <div className="mt-3 space-y-3">
            {hackathon.problemStatements?.map((ps) => {
              const isOpen = !!expanded[ps.id];
              return (
                <div
                  key={ps.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    onClick={() => onToggleProblem(ps.id)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                        <Sparkles className="size-4 text-white/80" />
                      </span>
                      <p className="truncate text-sm font-semibold text-white/90">
                        {ps.title}
                      </p>
                    </div>
                    <span className="text-xs text-white/60">
                      {isOpen ? "Hide" : "View"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-4 pb-4">
                      <p className="text-sm leading-7 text-white/70">
                        {ps.body && ps.body !== ps.title
                          ? ps.body
                          : "Use this statement when submitting your project."}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">
            Rules & Guidelines
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {hackathon.rules?.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/30" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">
            Important Dates
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Start</p>
              <p className="mt-2 text-sm font-semibold text-white/90">
                {new Date(hackathon.startDate).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">
                Submission Deadline
              </p>
              <p className="mt-2 text-sm font-semibold text-white/90">
                {new Date(
                  hackathon.submissionDeadline,
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Final Round</p>
              <p className="mt-2 text-sm font-semibold text-white/90">
                {new Date(
                  hackathon.finalRoundDate,
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
