"use client";
import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

gsap.registerPlugin(ScrollTrigger);

export default function LoginPage() {
  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray<Element>("[data-reveal]");
      elements.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              once: true,
            },
          },
        );
      });
    });
    return () => ctx.revert();
  }, []);

  const handleLogin = async (provider: "google" | "github") => {
    await authClient.signIn.social({
      provider,

      callbackURL: "/",
      errorCallbackURL: "/login",
      newUserCallbackURL: "/",
    });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center premium-page px-4">
      {/* Background gradient glows matching landing page */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/28 via-pink-500/18 to-blue-500/18 blur-3xl" />
        <div className="absolute right-[-140px] top-[220px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-blue-500/16 via-purple-500/16 to-pink-500/16 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-pink-500/16 via-purple-500/16 to-blue-500/12 blur-3xl" />
      </div>

      <div className="premium-card relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left side - Login form */}
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <div data-reveal>
              <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                Welcome back
              </h1>
              <p className="mb-8 text-[#a0a3ab]">
                Sign in to your HackathonX account to manage your hackathons
              </p>
            </div>

            <div className="space-y-4" data-reveal>
              <Button
                onClick={() => {
                  handleLogin("google");
                }}
                className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-6 py-3 text-white backdrop-blur-sm"
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                onClick={() => handleLogin("github")}
                className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-6 py-3 text-white backdrop-blur-sm"
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </Button>
            </div>

            <div className="mt-8 text-center" data-reveal>
              <p className="text-[#a0a3ab]">
                Don&apos;t have an account?{" "}
                <a
                  href="#"
                  className="text-violet-300/90 transition-colors hover:text-fuchsia-300/90"
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>

          {/* Right side - Hero content */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/16 via-pink-600/16 to-blue-600/16" />
            <div className="relative flex h-full flex-col justify-center p-12">
              <div data-reveal>
                <h2 className="mb-6 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                  Run Hackathons Without Chaos
                </h2>
                <p className="mb-8 text-lg text-white/70">
                  From registration to final evaluation — fully automated with
                  smart verification, QR entry, and real-time scoring. Join
                  thousands of organizers who trust HackathonX for seamless
                  event management.
                </p>
              </div>

              <div className="space-y-4" data-reveal>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/16">
                    <svg
                      className="h-5 w-5 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-white/72">
                    Smart student verification system
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/16">
                    <svg
                      className="h-5 w-5 text-pink-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-white/72">
                    QR-based entry management
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/16">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-white/72">
                    Real-time scoring & leaderboards
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
