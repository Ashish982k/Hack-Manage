"use client";

import { Layers, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { Stage } from "../_lib/types";

type StagesSectionProps = {
  stages: Stage[];
  onAddStage: () => void;
  onRemoveStage: (id: string) => void;
  onUpdateStage: (id: string, field: keyof Stage, value: string) => void;
};

export function StagesSection({
  stages,
  onAddStage,
  onRemoveStage,
  onUpdateStage,
}: StagesSectionProps) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <div className="flex border-b border-white/10 items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <Layers className="size-5 text-pink-400" />
            <CardTitle className="text-xl text-white font-semibold">
              2. Stages & Timelines
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="relative border-l border-white/10 ml-4 space-y-8 pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="relative pl-8">
              <span className="absolute -left-3 top-2 flex size-6 items-center justify-center rounded-full bg-black ring-2 ring-white/10">
                <span className="size-2.5 rounded-full bg-pink-500" />
              </span>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 relative group">
                {stages.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onRemoveStage(stage.id)}
                    className="absolute right-3 top-3 px-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                      Stage Title
                    </label>
                    <Input
                      value={stage.title}
                      onChange={(event) =>
                        onUpdateStage(stage.id, "title", event.target.value)
                      }
                      placeholder="e.g. Round 1 - Ideation Phase"
                      className="bg-black/20 border-white/10 text-white font-medium focus-visible:ring-pink-500/40 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                      Stage Type
                    </label>
                    <select
                      value={stage.type}
                      onChange={(event) =>
                        onUpdateStage(stage.id, "type", event.target.value)
                      }
                      className="block w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    >
                      <option value="SUBMISSION">Submission</option>
                      <option value="EVALUATION">Evaluation</option>
                      <option value="FINAL">Final</option>
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                        Start Time
                      </label>
                      <Input
                        type="datetime-local"
                        value={stage.startDate}
                        onChange={(event) =>
                          onUpdateStage(stage.id, "startDate", event.target.value)
                        }
                        className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-pink-500/40 rounded-xl [color-scheme:dark]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                        End Time
                      </label>
                      <Input
                        type="datetime-local"
                        value={stage.endDate}
                        onChange={(event) =>
                          onUpdateStage(stage.id, "endDate", event.target.value)
                        }
                        className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-pink-500/40 rounded-xl [color-scheme:dark]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      value={stage.description}
                      onChange={(event) =>
                        onUpdateStage(stage.id, "description", event.target.value)
                      }
                      placeholder="Detail what participants need to do in this stage..."
                      className="block w-full min-h-20 resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pl-6">
          <Button
            type="button"
            variant="outline"
            onClick={onAddStage}
            className="rounded-xl border-dashed border-white/20 text-white/70 hover:text-white"
          >
            <Plus className="mr-2 size-4" />
            Add Another Stage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
