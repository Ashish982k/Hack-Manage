import { Crown } from "lucide-react";

import { Container } from "@/components/home/shared";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 py-12">
      <Container>
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/60 via-pink-500/40 to-blue-500/50 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]">
                <Crown className="size-4" />
              </span>
              <span className="text-sm font-semibold tracking-wide">
                HackathonX
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-white/60">
              A premium hackathon management system for colleges — verification,
              QR entry, evaluation, distribution, and live scoring.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-white">Product</p>
              <div className="mt-3 grid gap-2 text-sm">
                <a className="text-white/60 hover:text-white" href="#features">
                  Features
                </a>
                <a className="text-white/60 hover:text-white" href="#workflow">
                  Workflow
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Company</p>
              <div className="mt-3 grid gap-2 text-sm">
                <a className="text-white/60 hover:text-white" href="#contact">
                  Contact
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  Privacy
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  Terms
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Social</p>
              <div className="mt-3 grid gap-2 text-sm">
                <a className="text-white/60 hover:text-white" href="#">
                  X (Twitter)
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  GitHub
                </a>
                <a className="text-white/60 hover:text-white" href="#">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HackathonX. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-emerald-400/80" />
            Status: Operational
          </p>
        </div>
      </Container>
    </footer>
  );
}
