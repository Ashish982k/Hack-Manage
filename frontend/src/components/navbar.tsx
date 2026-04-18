"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { authClient } from "@/lib/auth-client";

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
  );
}

export function Navbar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

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

  const links = [
    { label: "Features", href: "#features" },
    { label: "Workflow", href: "#workflow" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <div className="sticky top-0 font-bold z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/60 via-pink-500/40 to-blue-500/50 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]">
              <Crown className="size-4" />
            </span>
            <span className="text-sm font-bold tracking-wide">
              HackathonX
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!session && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex font-bold"
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
              className="px-5 font-bold"
              onClick={handleCheck}
            >
              Get Started
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
