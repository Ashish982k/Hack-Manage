"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Crown } from "lucide-react";

import { fetchJudgeAccess } from "@/api";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { authClient } from "@/lib/auth-client";

type HackathonAccess = {
  isJudge: boolean;
  isAdmin: boolean;
};

type NavItem = {
  label: string;
  href: string;
};

const readHackathonAccess = (value: unknown): HackathonAccess | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("isJudge" in value) ||
    typeof (value as { isJudge?: unknown }).isJudge !== "boolean"
  ) {
    return null;
  }

  return {
    isJudge: (value as { isJudge: boolean }).isJudge,
    isAdmin:
      "isAdmin" in value && typeof (value as { isAdmin?: unknown }).isAdmin === "boolean"
        ? (value as { isAdmin: boolean }).isAdmin
        : false,
  };
};

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [access, setAccess] = React.useState<HackathonAccess | null>(null);

  const hackathonId = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] !== "hackathons" || !segments[1] || segments[1] === "create") {
      return null;
    }

    return segments[1];
  }, [pathname]);

  React.useEffect(() => {
    if (!hackathonId || !session?.user?.id) {
      setAccess(null);
      return;
    }

    let active = true;

    const loadAccess = async () => {
      try {
        const res = await fetchJudgeAccess(hackathonId);
        const data: unknown = await res.json().catch(() => null);

        if (!active || !res.ok) {
          if (active) setAccess(null);
          return;
        }

        setAccess(readHackathonAccess(data));
      } catch {
        if (active) setAccess(null);
      }
    };

    loadAccess();

    return () => {
      active = false;
    };
  }, [hackathonId, session?.user?.id]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  const handleCheck = () => {
    if (session) {
      router.push(`/hackathons`);
      return;
    }
    router.push("/login");
  };

  const links = React.useMemo<NavItem[]>(() => {
    if (!hackathonId) {
      return [{ label: "Hackathons", href: "/hackathons" }];
    }

    if (access?.isJudge) {
      return [
        { label: "Scan QR", href: `/hackathons/${hackathonId}/scan` },
        { label: "Evaluate", href: `/hackathons/${hackathonId}/judge` },
      ];
    }

    if (access?.isAdmin) {
      return [
        { label: "Leaderboard", href: `/hackathons/${hackathonId}/leaderboard` },
        { label: "Scan QR", href: `/hackathons/${hackathonId}/scan` },
      ];
    }

    return [{ label: "Leaderboard", href: `/hackathons/${hackathonId}/leaderboard` }];
  }, [access, hackathonId]);

  return (
    <div className="sticky top-4 z-40 px-4 sm:px-6">
      <div className="premium-nav-glass mx-auto w-full max-w-[1100px] rounded-2xl border border-white/12">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/60 via-pink-500/40 to-blue-500/50 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]">
              <Crown className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-[0.18em]">
              HackathonX
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-xs tracking-[0.14em] transition-colors ${
                  pathname.startsWith(l.href)
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!session && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => router.push("/login")}
              >
                Login
              </Button>
            )}

            {session ? (
              <>
                <Icon session={session} />

                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </>
            ) : null}

            <Button
              variant="primary"
              size="sm"
              className="px-5"
              onClick={handleCheck}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
