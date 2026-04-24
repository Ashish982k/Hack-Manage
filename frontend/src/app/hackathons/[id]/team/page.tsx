"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, UserMinus, UserPlus, X } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  addTeamMember,
  fetchHackathonTeamState,
  removeTeamMember,
  renameTeam,
  reviewTeamMember,
} from "@/api";

type TeamMember = {
  id: string;
  userId: string;
  status: "pending" | "approved";
  name: string;
  role: "Leader" | "Member";
};

type TeamInfo = {
  id: string;
  name: string;
  leaderId: string;
  members: TeamMember[];
};

type TeamStateResponse = {
  joined: boolean;
  team: {
    id: string;
    name: string;
    leaderId: string;
    members: Array<{
      id: string;
      userId: string;
      status: "pending" | "approved";
      user?: {
        id: string;
        name: string;
      };
    }>;
  } | null;
};

export default function TeamManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const hackathonId = React.use(params).id;
  const { data: session } = authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [joined, setJoined] = React.useState(false);
  const [team, setTeam] = React.useState<TeamInfo | null>(null);
  const [nameDraft, setNameDraft] = React.useState("");
  const [memberEmailDraft, setMemberEmailDraft] = React.useState("");
  const [isSavingName, setIsSavingName] = React.useState(false);
  const [isAddingMember, setIsAddingMember] = React.useState(false);
  const [processingMemberId, setProcessingMemberId] = React.useState<
    string | null
  >(null);
  const [message, setMessage] = React.useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const userId = session?.user?.id ?? "";
  const isLeader = !!team && team.leaderId === userId;
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const fetchTeamState = React.useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetchHackathonTeamState(hackathonId);
      const data = (await res.json()) as TeamStateResponse;
      if (!res.ok) throw new Error("Unable to load team details");

      setJoined(Boolean(data.joined));
      const teamState = data.team;
      if (!teamState) {
        setTeam(null);
        setNameDraft("");
        return;
      }

      const nextTeam: TeamInfo = {
        id: teamState.id,
        name: teamState.name,
        leaderId: teamState.leaderId,
        members: teamState.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          status: m.status,
          name: m.user?.name || "Unknown Member",
          role: m.userId === teamState.leaderId ? "Leader" : "Member",
        })),
      };

      setTeam(nextTeam);
      setNameDraft(nextTeam.name);
    } catch {
      setMessage({
        kind: "error",
        text: "Failed to load team details.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  React.useEffect(() => {
    fetchTeamState();
  }, [fetchTeamState]);

  const handleRenameTeam = async () => {
    if (!team) return;
    const name = nameDraft.trim();
    if (!name) {
      setMessage({ kind: "error", text: "Team name cannot be empty." });
      return;
    }

    setIsSavingName(true);
    setMessage(null);
    try {
      const res = await renameTeam(team.id, name);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data?.message || "Failed to rename team.",
        });
        return;
      }
      setMessage({ kind: "success", text: "Team renamed successfully." });
      await fetchTeamState();
    } catch {
      setMessage({ kind: "error", text: "Failed to rename team." });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAddMember = async () => {
    if (!team) return;
    const email = memberEmailDraft.trim().toLowerCase();
    if (!email) {
      setMessage({ kind: "error", text: "Member email is required." });
      return;
    }

    if (!isValidEmail(email)) {
      setMessage({ kind: "error", text: "Please enter a valid email address." });
      return;
    }

    setIsAddingMember(true);
    setMessage(null);
    try {
      const res = await addTeamMember(team.id, email);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data?.message || "Failed to add member.",
        });
        return;
      }

      setMessage({
        kind: "success",
        text: data?.message || "Member invited successfully.",
      });
      setMemberEmailDraft("");
      await fetchTeamState();
    } catch {
      setMessage({ kind: "error", text: "Failed to add member." });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleReviewMember = async (
    memberUserId: string,
    action: "approve" | "reject",
  ) => {
    if (!team) return;
    setProcessingMemberId(memberUserId);
    setMessage(null);
    try {
      const res = await reviewTeamMember(team.id, memberUserId, action);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data?.message || "Failed to update member.",
        });
        return;
      }
      setMessage({
        kind: "success",
        text: action === "approve" ? "Member approved." : "Member rejected.",
      });
      await fetchTeamState();
    } catch {
      setMessage({ kind: "error", text: "Failed to update member." });
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!team) return;
    setProcessingMemberId(memberUserId);
    setMessage(null);
    try {
      const res = await removeTeamMember(team.id, memberUserId);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data?.message || "Failed to update team member.",
        });
        return;
      }
      if (memberUserId === userId) {
        router.push(`/hackathons/${hackathonId}`);
        return;
      }
      setMessage({ kind: "success", text: "Member removed." });
      await fetchTeamState();
    } catch {
      setMessage({ kind: "error", text: "Failed to update team member." });
    } finally {
      setProcessingMemberId(null);
    }
  };

  return (
    <div className="min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-6 flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Manage Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {message ? (
              <div
                className={
                  "rounded-xl border p-3 text-sm " +
                  (message.kind === "success"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-200")
                }
              >
                {message.text}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-white/70" />
              </div>
            ) : !joined ? (
              <div className="space-y-3 text-center">
                <p className="text-white/90">You have not joined this hackathon.</p>
                <Button onClick={() => router.push(`/hackathons/${hackathonId}`)}>
                  Go to Hackathon
                </Button>
              </div>
            ) : !team ? (
              <div className="space-y-3 text-center">
                <p className="text-white/90">You are joined, but not in a team.</p>
                <Button
                  onClick={() =>
                    router.push(`/hackathons/${hackathonId}/create-team`)
                  }
                >
                  Create Team
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white/90">Team Name</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      disabled={!isLeader || isSavingName}
                    />
                    <Button
                      onClick={handleRenameTeam}
                      disabled={!isLeader || isSavingName || !nameDraft.trim()}
                    >
                      {isSavingName ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  {!isLeader ? (
                    <p className="text-xs text-white/60">
                      Only the team leader can rename the team.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white/90">
                    Add Team Member
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={memberEmailDraft}
                      onChange={(e) => setMemberEmailDraft(e.target.value)}
                      placeholder="member@example.com"
                      disabled={!isLeader || isAddingMember}
                      type="email"
                    />
                    <Button
                      onClick={handleAddMember}
                      disabled={
                        !isLeader || isAddingMember || !memberEmailDraft.trim()
                      }
                    >
                      {isAddingMember ? (
                        "Adding..."
                      ) : (
                        <>
                          <UserPlus className="mr-1 size-4" />
                          Add Member
                        </>
                      )}
                    </Button>
                  </div>
                  {!isLeader ? (
                    <p className="text-xs text-white/60">
                      Only the team leader can add members.
                    </p>
                  ) : (
                    <p className="text-xs text-white/60">
                      Members are invited by email and added with pending status.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {team.members.map((member) => {
                    const busy = processingMemberId === member.userId;
                    return (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white/90">
                              {member.name}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge className="bg-white/10 text-white/80 ring-1 ring-white/10">
                                {member.role}
                              </Badge>
                              <Badge className="bg-white/10 text-white/80 ring-1 ring-white/10">
                                {member.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {isLeader &&
                            member.userId !== team.leaderId &&
                            member.status === "pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleReviewMember(member.userId, "approve")
                                  }
                                  disabled={busy}
                                >
                                  <Check className="mr-1 size-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleReviewMember(member.userId, "reject")
                                  }
                                  disabled={busy}
                                >
                                  <X className="mr-1 size-4" />
                                  Reject
                                </Button>
                              </>
                            ) : null}

                            {isLeader &&
                            member.userId !== team.leaderId &&
                            member.status === "approved" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={busy}
                              >
                                <UserMinus className="mr-1 size-4" />
                                Remove
                              </Button>
                            ) : null}

                            {!isLeader &&
                            member.userId === userId &&
                            member.userId !== team.leaderId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={busy}
                              >
                                Leave Team
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

