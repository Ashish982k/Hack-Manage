"use client";

import { useRouter } from "next/navigation";
import { Clock, Gavel, QrCode, ScanLine, Settings, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { HackathonViewModel, SubmissionStatus } from "../_lib/types";
import { ToneBadge } from "./shared-ui";

type HeroSectionProps = {
  hackathonId: string;
  hackathon: HackathonViewModel;
  submissionStatus: SubmissionStatus;
  isParticipantRole: boolean;
  isSubmissionEvaluated: boolean;
  registrationDeadlineDate: string;
  registrationDeadlineTime: string;
  roleLabel: string;
  isJoined: boolean;
  canJudge: boolean;
  evaluateUrl: string;
  judgeLeaderboardUrl: string | null;
  shortlistedTeamsUrl: string | null;
  isHackathonAdmin: boolean;
  canViewQrCodes: boolean;
  canManageRoles: boolean;
  onJoin: () => Promise<void>;
  onDeleteHackathon: () => Promise<void>;
  onShare: () => void;
};

export function HeroSection({
  hackathonId,
  hackathon,
  submissionStatus,
  isParticipantRole,
  isSubmissionEvaluated,
  registrationDeadlineDate,
  registrationDeadlineTime,
  roleLabel,
  isJoined,
  canJudge,
  evaluateUrl,
  judgeLeaderboardUrl,
  shortlistedTeamsUrl,
  isHackathonAdmin,
  canViewQrCodes,
  canManageRoles,
  onJoin,
  onDeleteHackathon,
  onShare,
}: HeroSectionProps) {
  const router = useRouter();

  return (
    <section data-reveal="up">
      <div className="flex flex-wrap items-center gap-3">
        <ToneBadge
          tone={hackathon.status === "Open" ? "success" : "danger"}
        >
          {hackathon.status}
        </ToneBadge>
        <ToneBadge
          tone={
            submissionStatus === "Submitted"
              ? "success"
              : submissionStatus === "Under review"
                ? "warning"
                : "neutral"
          }
        >
          {isParticipantRole ? submissionStatus : roleLabel.replace("You are ", "")}
        </ToneBadge>
        {isParticipantRole && isSubmissionEvaluated ? (
          <ToneBadge tone="success">Evaluated</ToneBadge>
        ) : null}
        <ToneBadge tone="warning">
          <span className="inline-flex items-center gap-2">
            <Clock className="size-3.5" />
            Registration: {registrationDeadlineDate} {registrationDeadlineTime}
          </span>
        </ToneBadge>
      </div>

      <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
        {hackathon.title}
      </h1>
      <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
        {hackathon.shortDescription.substring(0, 150) + "....."}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {hackathon.tags?.map((tag) => (
          <Badge
            key={tag}
            className="bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10 transition"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <ToneBadge tone="neutral">{roleLabel}</ToneBadge>

        {isParticipantRole ? (
          <Button
            variant={isJoined ? "outline" : "primary"}
            onClick={() => void onJoin()}
          >
            {isJoined ? "Leave Hackathon" : "Join Hackathon"}
          </Button>
        ) : null}

        {(isParticipantRole || isHackathonAdmin) && (
          <Button
            variant="outline"
            onClick={() => router.push(`/hackathons/${hackathonId}/results`)}
          >
            <span className="inline-flex items-center gap-2">
              <Trophy className="size-4 text-purple-300" />
              View Results
            </span>
          </Button>
        )}

        {canJudge && (
          <Button variant="outline" onClick={() => router.push(evaluateUrl)}>
            <span className="inline-flex items-center gap-2">
              <Gavel className="size-4" />
              Evaluate
            </span>
          </Button>
        )}

        {canJudge && judgeLeaderboardUrl ? (
          <Button
            variant="outline"
            onClick={() => router.push(judgeLeaderboardUrl)}
          >
            <span className="inline-flex items-center gap-2">
              <Trophy className="size-4 text-amber-300" />
              Leaderboard (Shortlist Teams)
            </span>
          </Button>
        ) : null}

        {(isParticipantRole || isHackathonAdmin) && shortlistedTeamsUrl ? (
          <Button
            variant="outline"
            onClick={() => router.push(shortlistedTeamsUrl)}
          >
            <span className="inline-flex items-center gap-2">
              <Trophy className="size-4 text-emerald-300" />
              View Shortlisted Teams
            </span>
          </Button>
        ) : null}

        {(isHackathonAdmin || canJudge) && (
          <Button
            variant="outline"
            onClick={() => router.push(`/hackathons/${hackathonId}/scan`)}
          >
            <span className="inline-flex items-center gap-2">
              <ScanLine className="size-4 text-cyan-300" />
              Scan QR
            </span>
          </Button>
        )}

        {isHackathonAdmin && (
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/hackathons/${hackathonId}/admin/attendance`)
            }
          >
            <span className="inline-flex items-center gap-2">
              <Users className="size-4 text-emerald-300" />
              Attendance
            </span>
          </Button>
        )}

        {canViewQrCodes && (
          <Button
            variant="outline"
            onClick={() => router.push(`/hackathons/${hackathonId}/qr`)}
          >
            <span className="inline-flex items-center gap-2">
              <QrCode className="size-4 text-emerald-300" />
              View QR Codes
            </span>
          </Button>
        )}

        <Button variant="ghost" onClick={onShare}>
          Share
        </Button>

        {canManageRoles && (
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/hackathons/${hackathonId}/manage`)
            }
          >
            <span className="inline-flex items-center gap-2">
              <Settings className="size-4" />
              Manage Hackathon
            </span>
          </Button>
        )}

        {canManageRoles && (
          <Button
            variant="outline"
            onClick={() => void onDeleteHackathon()}
            className="ml-auto text-red-500 border-red-500/50 hover:bg-red-500/10"
          >
            Delete Hackathon
          </Button>
        )}
      </div>
    </section>
  );
}
