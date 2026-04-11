import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Card, CardContent } from "@/components/ui/card";
import { Container, SectionHeading } from "@/components/home/shared";

gsap.registerPlugin(ScrollTrigger);

export default function Workflow() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const stepsRef = React.useRef<HTMLDivElement>(null);

  const steps = [
    { name: "Register", desc: "Start sign-ups" },
    { name: "Verify", desc: "Auto + admin checks" },
    { name: "Form Team", desc: "Invite & lock teams" },
    { name: "Submit", desc: "PPT/project upload" },
    { name: "Shortlist", desc: "Shortlist rules" },
    { name: "QR Entry", desc: "Scan & mark entry" },
    { name: "Final Evaluation", desc: "Judge scoring" },
  ];

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      const stepElements = stepsRef.current?.querySelectorAll(".workflow-step");

      if (stepElements) {
        gsap.fromTo(
          stepElements,
          {
            opacity: 0,
            x: -30,
            scale: 0.8,
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.6,
            stagger: {
              amount: 1,
              from: "start",
            },
            ease: "power3.out",
            scrollTrigger: {
              trigger: stepsRef.current,
              start: "top 75%",
              toggleActions: "play none none reverse",
            },
          },
        );

        const lines = stepsRef.current?.querySelectorAll(".workflow-line");
        if (lines) {
          gsap.fromTo(
            lines,
            { scaleX: 0, transformOrigin: "left center" },
            {
              scaleX: 1,
              duration: 0.4,
              stagger: 0.15,
              ease: "power2.out",
              scrollTrigger: {
                trigger: stepsRef.current,
                start: "top 70%",
                toggleActions: "play none none reverse",
              },
            },
          );
        }
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="workflow" className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Workflow"
          title="A smooth flow from registration to results"
          subtitle="A step-based pipeline designed to minimize queues, avoid manual errors, and keep judges focused."
        />

        <div className="mt-14" data-reveal="up">
          <Card className="rounded-3xl overflow-hidden">
            <CardContent className="pt-8 pb-8">
              <div ref={stepsRef} className="grid gap-4 md:grid-cols-7">
                {steps.map((s, idx) => (
                  <div key={s.name} className="workflow-step relative">
                    <div className="flex items-center gap-3 md:flex-col md:items-start">
                      <div className="flex items-center gap-3 md:w-full">
                        <div
                          className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/10 text-sm font-semibold text-white shadow-lg shadow-purple-500/10 hover:scale-110 transition-transform duration-300"
                          style={{ transform: `translateZ(${10 + idx * 3}px)` }}
                        >
                          {idx + 1}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="workflow-line h-[2px] flex-1 bg-gradient-to-r from-purple-500/30 via-pink-500/20 to-transparent md:hidden" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-white/90 md:mt-3">
                        {s.name}
                      </p>
                      <p className="mt-1 hidden text-xs text-white/60 md:block">
                        {s.desc}
                      </p>
                    </div>

                    {idx < steps.length - 1 && (
                      <div className="workflow-line mt-4 hidden h-[2px] w-full bg-gradient-to-r from-purple-500/30 via-pink-500/20 to-transparent md:block" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}
