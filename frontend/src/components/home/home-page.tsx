"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Navbar } from "@/components/navbar";
import Hero from "@/components/home/hero";
import Features from "@/components/home/features";
import Workflow from "@/components/home/workflow";
import QRHighlight from "@/components/home/qr-highlight";
import AdminPreview from "@/components/home/admin-preview";
import Benefits from "@/components/home/benefits";
import CTA from "@/components/home/cta";
import Footer from "@/components/home/footer";

gsap.registerPlugin(ScrollTrigger);

export function HomePage() {
  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>("[data-reveal='up']");

      els.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-full bg-black text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <Workflow />
      <QRHighlight />
      <AdminPreview />
      <Benefits />
      <CTA />
      <Footer />
    </main>
  );
}
