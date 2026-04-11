"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck, Users } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { MultiEmailInput } from "@/components/multi-email-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/email-list";
import {
  fetchHackathonById,
  fetchHackathonRoles,
  updateHackathonRoles,
} from "@/api";

type ApiMessageResponse = {
  message?: string;
};

type HackathonResponse = {
  id: string;
  title: string;
};

type RolesResponse = {
  admins: string[];
  judges: string[];
  message?: string;
};

const hasMessage = (value: unknown): value is ApiMessageResponse =>
  typeof value === "object" && value !== null && "message" in value;

function PageGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-140px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-blue-500/20 blur-3xl opacity-70" />
      <div className="absolute left-[-180px] top-[440px] h-[440px] w-[440px] rounded-full bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-pink-500/15 blur-3xl opacity-70" />
      <div className="absolute right-[-100px] bottom-[-200px] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 blur-3xl opacity-70" />
    </div>
  );
}

export default function ManageHackathonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const hackathonId = React.use(params).id;
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [hackathonTitle, setHackathonTitle] = React.useState("Hackathon");
  const [admins, setAdmins] = React.useState<string[]>([]);
  const [judges, setJudges] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [status, setStatus] = React.useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setStatus(null);
    setAccessDenied(false);

    try {
      const [hackathonRes, rolesRes] = await Promise.all([
        fetchHackathonById(hackathonId),
        fetchHackathonRoles(hackathonId),
      ]);

      const hackathonData: unknown = await hackathonRes.json().catch(() => null);
      const rolesData: unknown = await rolesRes.json().catch(() => null);

      if (!hackathonRes.ok) {
        setStatus({
          kind: "error",
          message:
            hasMessage(hackathonData) && hackathonData.message
              ? hackathonData.message
              : "Failed to load hackathon details.",
        });
        return;
      }

      if (!rolesRes.ok) {
        setAccessDenied(rolesRes.status === 403);
        setStatus({
          kind: "error",
          message:
            hasMessage(rolesData) && rolesData.message
              ? rolesData.message
              : "Failed to load roles.",
        });
        return;
      }

      const hackathon = hackathonData as HackathonResponse;
      const roles = rolesData as RolesResponse;

      setHackathonTitle(hackathon.title);
      setAdmins(roles.admins ?? []);
      setJudges(roles.judges ?? []);
    } catch {
      setStatus({
        kind: "error",
        message: "Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  React.useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    loadData();
  }, [isSessionPending, loadData, router, session?.user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setIsSaving(true);

    const nextAdmins = Array.from(
      new Set(admins.map(normalizeEmail).filter(Boolean)),
    );
    const nextJudges = Array.from(
      new Set(judges.map(normalizeEmail).filter(Boolean)),
    ).filter((email) => !nextAdmins.includes(email));

    try {
      const res = await updateHackathonRoles(hackathonId, {
        admins: nextAdmins,
        judges: nextJudges,
      });

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus({
          kind: "error",
          message:
            hasMessage(data) && data.message
              ? data.message
              : "Failed to update roles.",
        });
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "admins" in data &&
        Array.isArray((data as { admins: unknown }).admins) &&
        "judges" in data &&
        Array.isArray((data as { judges: unknown }).judges)
      ) {
        setAdmins((data as RolesResponse).admins);
        setJudges((data as RolesResponse).judges);
      } else {
        setAdmins(nextAdmins);
        setJudges(nextJudges);
      }

      setStatus({
        kind: "success",
        message: "Roles updated successfully.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Please check your connection and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen pb-20">
      <PageGlow />
      <Navbar />

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 transition hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <div className="mb-10">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-blue-500/25 ring-1 ring-white/10 shadow-[0_0_30px_rgba(168,85,247,0.15)] mb-6">
            <ShieldCheck className="size-6 text-purple-200" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Manage Hackathon
          </h1>
          <p className="mt-3 text-lg text-white/60">{hackathonTitle}</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-white/70">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                Loading role settings...
              </span>
            </CardContent>
          </Card>
        ) : accessDenied ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Access denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/70">
                Only hackathon admins can manage judges and admins.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/hackathons/${hackathonId}`)}
              >
                Back
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-white inline-flex items-center gap-2">
                  <Users className="size-5 text-white/70" />
                  Role Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <MultiEmailInput
                  label="Admins"
                  emails={admins}
                  onChange={setAdmins}
                  placeholder="Add admin email and press Enter"
                  helperText="Admins can manage roles. The hackathon creator stays admin automatically."
                />

                <MultiEmailInput
                  label="Judges"
                  emails={judges}
                  onChange={setJudges}
                  placeholder="Add judge email and press Enter"
                  helperText="Judges are removed from this list if they are also admins."
                />

                {status ? (
                  <p
                    className={
                      status.kind === "success"
                        ? "text-sm text-emerald-300"
                        : "text-sm text-rose-300"
                    }
                  >
                    {status.message}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/hackathons/${hackathonId}`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    {isSaving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
