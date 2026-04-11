import * as React from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type CharType = "lowerCase" | "upperCase" | "numbers" | "XO" | string;

export function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-200px] h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-600/30 via-pink-500/20 to-blue-600/20 blur-[120px] animate-pulse-slow" />
      <div className="absolute right-[-200px] top-[150px] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-blue-500/25 via-purple-500/20 to-pink-500/15 blur-[100px]" />
      <div className="absolute bottom-[-300px] left-[-200px] h-[700px] w-[700px] rounded-full bg-gradient-to-br from-pink-500/25 via-purple-500/20 to-blue-500/20 blur-[100px]" />
      <div className="absolute left-[20%] top-[40%] h-[300px] w-[300px] rounded-full bg-purple-500/15 blur-[80px]" />
      <div className="absolute right-[15%] bottom-[20%] h-[250px] w-[250px] rounded-full bg-blue-500/15 blur-[70px]" />
    </div>
  );
}

export function FloatingParticles() {
  const [particles, setParticles] = React.useState<
    {
      width: string;
      height: string;
      left: string;
      top: string;
      animationDelay: string;
      animationDuration: string;
    }[]
  >([]);

  React.useEffect(() => {
    setParticles(
      [...Array(20)].map(() => ({
        width: `${Math.random() * 4 + 2}px`,
        height: `${Math.random() * 4 + 2}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${Math.random() * 10 + 10}s`,
      })),
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-5 overflow-hidden"
    >
      {particles.map((style, i) => (
        <div
          key={i}
          className="floating-particle absolute rounded-full bg-white/10"
          style={style}
        />
      ))}
    </div>
  );
}

function ScrambleText({
  text,
  duration = 800,
  delay = 0,
  chars = "!<>-_\\\\/[]{}—=+*^?#________",
  className,
  onComplete,
}: {
  text: string;
  duration?: number;
  delay?: number;
  chars?: CharType;
  className?: string;
  onComplete?: () => void;
}) {
  const [displayText, setDisplayText] = React.useState("");
  const [isFinished, setIsFinished] = React.useState(false);

  React.useEffect(() => {
    let charSet = chars;
    if (chars === "lowerCase") charSet = "abcdefghijklmnopqrstuvwxyz";
    if (chars === "upperCase") charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (chars === "numbers") charSet = "0123456789";
    if (chars === "XO") charSet = "XO";

    const startTimeout = setTimeout(() => {
      let frame = 0;
      const totalFrames = Math.floor((duration / 1000) * 60);
      const queue: {
        from: string;
        to: string;
        start: number;
        end: number;
        char?: string;
      }[] = [];

      for (let i = 0; i < text.length; i++) {
        const from = charSet[Math.floor(Math.random() * charSet.length)];
        const start = Math.floor(Math.random() * (totalFrames * 0.4));
        const end = start + Math.floor(Math.random() * (totalFrames * 0.6));
        queue.push({ from, to: text[i], start, end });
      }

      let animationFrameId: number;

      const update = () => {
        let output = "";
        let complete = 0;

        for (let i = 0; i < queue.length; i++) {
          const { from, to, start, end } = queue[i];
          let char = queue[i].char;
          if (frame >= end) {
            complete++;
            output += to;
          } else if (frame >= start) {
            if (!char || Math.random() < 0.28) {
              char = charSet[Math.floor(Math.random() * charSet.length)];
              queue[i].char = char;
            }
            output += `<span class="opacity-50 font-mono">${char}</span>`;
          } else {
            output += `<span class="opacity-0">${from}</span>`;
          }
        }

        setDisplayText(output);

        if (complete === queue.length) {
          setDisplayText(text);
          setIsFinished(true);
          if (onComplete) onComplete();
        } else {
          frame++;
          animationFrameId = requestAnimationFrame(update);
        }
      };

      update();

      return () => cancelAnimationFrame(animationFrameId);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, duration, delay, chars, onComplete]);

  if (!displayText && !isFinished) {
    return (
      <span className={className} style={{ opacity: 0 }}>
        {text}
      </span>
    );
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: displayText }}
    />
  );
}

export function AnimatedHeadline() {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    // Empty useEffect or remove if not needed.
  }, []);

  return (
    <div>
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
        <span className="hx-headline-line">
          <ScrambleText
            text="FORGE THE FUTURE"
            chars="upperCase"
            duration={2000}
            onComplete={() => setStep((s) => Math.max(s, 1))}
          />
        </span>
        <br />
        <span className="hx-headline-line flex flex-wrap items-center gap-x-3 mt-2">
          {step >= 1 ? (
            <ScrambleText
              text="IN CODE"
              chars="XO"
              duration={1500}
              onComplete={() => setStep((s) => Math.max(s, 2))}
            />
          ) : (
            <span className="opacity-0">IN CODE</span>
          )}
        </span>
      </h1>
    </div>
  );
}

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div data-reveal="up">
        <Badge variant="glow" className="mx-auto inline-flex">
          <Sparkles className="mr-2 size-4" />
          {eyebrow}
        </Badge>
      </div>
      <h2
        data-reveal="up"
        className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl"
      >
        {title}
      </h2>
      <p data-reveal="up" className="mt-3 text-balance text-white/70">
        {subtitle}
      </p>
    </div>
  );
}

export function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 15;
    const rotateX = (0.5 - py) * 12;
    el.style.setProperty("--hx-rx", `${rotateX.toFixed(2)}deg`);
    el.style.setProperty("--hx-ry", `${rotateY.toFixed(2)}deg`);
    el.style.setProperty("--hx-gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--hx-gy", `${(py * 100).toFixed(1)}%`);
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--hx-rx", `0deg`);
    el.style.setProperty("--hx-ry", `0deg`);
    el.style.setProperty("--hx-gx", `50%`);
    el.style.setProperty("--hx-gy", `50%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`hx-tilt ${className}`}
    >
      <div className="hx-tilt__card">{children}</div>
      <div className="hx-tilt__glare" aria-hidden />
    </div>
  );
}
