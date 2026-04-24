import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/home/shared";
import { authClient } from "@/lib/auth-client";

gsap.registerPlugin(ScrollTrigger);

export default function CTA() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        {
          y: 60,
          opacity: 0,
          scale: 0.95,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  

  const handleRoute = async () => {
    const {data : session} = await authClient.getSession();
    if (!session?.user?.id){
      window.location.href = "/login";
    }
    else {
      window.location.href = "/hackathons";
    }
  }
  return (
    <section ref={sectionRef} className="py-24 sm:py-32">
      <Container>
        <div ref={contentRef}>
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-blue-500/20 p-10 sm:p-16">
            <div className="absolute inset-0 bg-white/[0.07]" />

            <div className="absolute -left-32 -top-32 size-[450px] rounded-full bg-purple-500/30 blur-[100px] animate-pulse-slow" />
            <div
              className="absolute -right-32 -bottom-32 size-[450px] rounded-full bg-blue-500/25 blur-[100px] animate-pulse-slow"
              style={{ animationDelay: "1s" }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[300px] rounded-full bg-pink-500/15 blur-[80px]" />

            <div className="relative mx-auto max-w-2xl text-center">
              <Badge variant="glow" className="mx-auto inline-flex">
                <Sparkles className="mr-2 size-4" />
                Ready to launch
              </Badge>
              <h3 className="mt-6 text-balance text-4xl font-bold text-white sm:text-5xl">
                Launch your hackathon in minutes
              </h3>
              <p className="mt-5 text-lg text-white/70">
                Get a streamlined registration flow, secure QR check-ins, and a
                real-time leaderboard — all in one system.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  className="group relative overflow-hidden text-base px-8 py-4"
                >
                  <span className="relative z-10" onClick = {handleRoute}>Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 py-4 backdrop-blur-sm"
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
