"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { checkUserByEmail, createTeam } from "@/api";

function PageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-[-140px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/35 via-pink-500/25 to-blue-500/25 blur-3xl" />
      <div className="absolute right-[-180px] top-[240px] h-[440px] w-[440px] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
    </div>
  );
}

export default function CreateTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const hackathonId = React.use(params).id;

  const [teamName, setTeamName] = React.useState("");
  const [members, setMembers] = React.useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    const validMembers = [
      ...new Set(
        members.map((m) => m.trim()).filter((m) => m && isValidEmail(m)),
      ),
    ];

    setIsSubmitting(true);

    try {
      // Only validate emails if members are provided
      if (validMembers.length > 0) {
        for (const email of validMembers) {
          const res = await checkUserByEmail(email);

          const data = await res.json();

          if (!data.exists) {
            setError(`User with email ${email} is not registered or verified. Please ask them to sign up first.`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      const res = await createTeam({
        hackathonId,
        teamName,
        members: validMembers,
      });

      if (res.ok) {
        router.push(`/hackathons/${hackathonId}`);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Failed to create team.");
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMember = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const addMember = () => {
    if (members.length < 5) {
      setMembers([...members, ""]);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <PageGlow />
      <Navbar />

      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-6 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-blue-500/25 ring-1 ring-white/10">
                <Users className="size-5 text-white/80" />
              </span>
              <div>
                <CardTitle className="text-xl text-white">
                  Create a Team
                </CardTitle>
                <p className="mt-1 text-sm text-white/60">
                  Assemble your crew and prepare to build.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/90">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Neon Debuggers"
                  disabled={isSubmitting}
                  className="bg-black/20"
                />
                <p className="text-xs text-white/50">
                  You will be assigned as the team leader
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <label className="text-sm font-semibold text-white/90">
                    Team Members (Optional)
                  </label>
                  <span className="text-xs text-white/50">
                    {members.length}/5
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Add team members by their registered email addresses
                </p>

                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={member}
                        onChange={(e) => updateMember(index, e.target.value)}
                        placeholder="member@example.com"
                        type="email"
                        disabled={isSubmitting}
                        className="bg-black/20"
                      />

                      {members.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeMember(index)}
                          disabled={isSubmitting}
                          className="px-3 text-white/50 hover:text-rose-200"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {members.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMember}
                    disabled={isSubmitting}
                    className="w-full border-dashed text-white/70"
                  >
                    <Plus className="mr-2 size-4" />
                    Add Another Member
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !teamName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating Team...
                  </>
                ) : (
                  "Create Team"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
