"use client";

import { FileText, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { ProblemStatement } from "../_lib/types";

type ProblemDetailsSectionProps = {
  problemStatements: ProblemStatement[];
  onAddProblemStatement: () => void;
  onRemoveProblemStatement: (id: string) => void;
  onUpdateProblemStatement: (
    id: string,
    field: "title" | "description",
    value: string,
  ) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
};

export function ProblemDetailsSection({
  problemStatements,
  onAddProblemStatement,
  onRemoveProblemStatement,
  onUpdateProblemStatement,
  description,
  onDescriptionChange,
}: ProblemDetailsSectionProps) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <FileText className="size-5 text-purple-400" />
          <CardTitle className="text-xl font-semibold text-white">
            5. Problem Statements & Details
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="mb-4 text-sm text-white/60">
          Add one or more problem statements, then describe the hackathon
          context and expectations.
        </p>
        <div className="relative border-l border-white/10 ml-4 space-y-8 pb-4">
          {problemStatements.map((statement, index) => (
            <div key={statement.id} className="relative pl-8">
              <span className="absolute -left-3 top-2 flex size-6 items-center justify-center rounded-full bg-black ring-2 ring-white/10">
                <span className="size-2.5 rounded-full bg-purple-500" />
              </span>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 relative group">
                {problemStatements.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onRemoveProblemStatement(statement.id)}
                    className="absolute right-3 top-3 px-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                      Problem Statement {index + 1}
                    </label>
                    <Input
                      value={statement.title}
                      onChange={(event) =>
                        onUpdateProblemStatement(
                          statement.id,
                          "title",
                          event.target.value,
                        )
                      }
                      placeholder="e.g. Build an AI tutor for campus support"
                      className="bg-black/20 border-white/10 text-white font-medium focus-visible:ring-purple-500/40 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                      Description{" "}
                      <span className="text-white/30">(Optional)</span>
                    </label>
                    <textarea
                      value={statement.description}
                      onChange={(event) =>
                        onUpdateProblemStatement(
                          statement.id,
                          "description",
                          event.target.value,
                        )
                      }
                      placeholder="Add extra context, constraints, or goals for this statement..."
                      className="block w-full min-h-24 resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
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
            onClick={onAddProblemStatement}
            className="rounded-xl border-dashed border-white/20 text-white/70 hover:text-white"
          >
            <Plus className="mr-2 size-4" />
            Add Another Problem Statement
          </Button>
        </div>

        <p className="mb-4 mt-6 text-sm text-white/60">
          Provide a complete overview of the hackathon, including rules,
          themes, resources, and contact information.
        </p>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Include background context, expected deliverables, and marking criteria..."
          className="block min-h-48 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
      </CardContent>
    </Card>
  );
}
