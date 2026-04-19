"use client";

import { Clock3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { ScheduleEnabledState, ScheduleState, ScheduleType } from "../_lib/types";

type FinalRoundScheduleSectionProps = {
  finalRoundSchedule: ScheduleState;
  enabledSchedules: ScheduleEnabledState;
  onToggleSchedule: (type: Exclude<ScheduleType, "entry">) => void;
  onUpdateScheduleTime: (
    type: ScheduleType,
    field: "startTime" | "endTime",
    value: string,
  ) => void;
};

export function FinalRoundScheduleSection({
  finalRoundSchedule,
  enabledSchedules,
  onToggleSchedule,
  onUpdateScheduleTime,
}: FinalRoundScheduleSectionProps) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Clock3 className="size-5 text-amber-300" />
          <CardTitle className="text-xl font-semibold text-white">
            3. Final Round Schedule
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        <p className="text-sm text-white/60">
          Entry schedule is required. Breakfast, lunch, and dinner are optional.
          Enable a checkpoint to set its own timing.
        </p>

        {(
          [
            { key: "entry", label: "Entry" },
            { key: "breakfast", label: "Breakfast" },
            { key: "lunch", label: "Lunch" },
            { key: "dinner", label: "Dinner" },
          ] as const
        ).map((item) => {
          const config = finalRoundSchedule[item.key];
          const isRequired = item.key === "entry";
          const isEnabled = isRequired || enabledSchedules[item.key];
          return (
            <div
              key={item.key}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white/90">
                  {item.label}
                </p>
                <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-white/20 bg-black/20 accent-purple-500"
                    checked={isEnabled}
                    disabled={isRequired}
                    onChange={() => !isRequired && onToggleSchedule(item.key)}
                  />
                  {isRequired ? "Required" : "Enable"}
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    Start Date & Time{" "}
                    {isEnabled ? <span className="text-purple-400">*</span> : null}
                  </label>
                  <Input
                    type="datetime-local"
                    value={config.startTime}
                    onChange={(event) =>
                      onUpdateScheduleTime(
                        item.key,
                        "startTime",
                        event.target.value,
                      )
                    }
                    className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
                    required={isEnabled}
                    disabled={!isEnabled}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    End Date & Time{" "}
                    {isEnabled ? <span className="text-purple-400">*</span> : null}
                  </label>
                  <Input
                    type="datetime-local"
                    value={config.endTime}
                    onChange={(event) =>
                      onUpdateScheduleTime(item.key, "endTime", event.target.value)
                    }
                    className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
                    required={isEnabled}
                    disabled={!isEnabled}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
