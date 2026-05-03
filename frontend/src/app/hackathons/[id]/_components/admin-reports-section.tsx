"use client";

import { Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminReportsSectionProps = {
  isHackathonAdmin: boolean;
  isFinalRoundEnded: boolean;
  onDownloadTeamLogs: () => Promise<void>;
  onDownloadTeamAnalytics: () => Promise<void>;
  onDownloadJudgeAnalytics: () => Promise<void>;
};

export function AdminReportsSection({
  isHackathonAdmin,
  isFinalRoundEnded,
  onDownloadTeamLogs,
  onDownloadTeamAnalytics,
  onDownloadJudgeAnalytics,
}: AdminReportsSectionProps) {
  if (!isHackathonAdmin || !isFinalRoundEnded) {
    return null;
  }

  return (
    <section className="grid gap-6" data-reveal="up">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-white">Post Event Reports</CardTitle>
          <p className="text-sm text-white/60">
            Administrative reports available after the final round is completed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-white/10 rounded-lg p-4 bg-white/5">
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-white">Team Logs Report</h3>
              <p className="text-sm text-white/70">
                Download team-wise participation, entry pass usage, and food pass usage logs.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void onDownloadTeamLogs()}
            >
              <span className="inline-flex items-center gap-2">
                <Download className="size-4 text-emerald-300" />
                Download
              </span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-white/10 rounded-lg p-4 bg-white/5">
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-white">Team Analytics</h3>
              <p className="text-sm text-white/70">
                Download team details including member names and project submission links.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void onDownloadTeamAnalytics()}
            >
              <span className="inline-flex items-center gap-2">
                <Download className="size-4 text-emerald-300" />
                Download
              </span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-white/10 rounded-lg p-4 bg-white/5">
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-white">Judge Analytics</h3>
              <p className="text-sm text-white/70">
                Download comprehensive judge evaluations and scoring breakdowns per team.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void onDownloadJudgeAnalytics()}
            >
              <span className="inline-flex items-center gap-2">
                <Download className="size-4 text-emerald-300" />
                Download
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
