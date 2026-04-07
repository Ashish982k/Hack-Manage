export type Hackathon = {
  id: string;
  title: string;
  description: string;
  date: string;
  image: string;
  rules: string[];
};

export const HACKATHONS: Hackathon[] = [
  {
    id: "ai-campus",
    title: "AI for Campus Automation",
    description:
      "Build AI-powered tools that streamline student services, verification, and campus workflows.",
    date: "Apr 10, 2026",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80",
    rules: [
      "Teams of 2–4 participants.",
      "Submission must include a PPT/PDF and a GitHub repository link.",
      "No plagiarism. Cite external assets/libraries.",
      "Your demo should be functional and explainable in under 5 minutes.",
    ],
  },
  {
    id: "web3-trust",
    title: "Web3 Trust & Identity",
    description:
      "Design secure identity flows and anti-fraud systems for events and communities.",
    date: "Apr 14, 2026",
    image:
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1400&q=80",
    rules: [
      "Teams of 1–4 participants.",
      "Open-source your code repository.",
      "Include architecture diagram in the deck.",
      "No private keys or secrets committed to the repository.",
    ],
  },
  {
    id: "devtools-speedrun",
    title: "DevTools Speedrun",
    description:
      "Ship a product-quality developer tool with delightful UX and clean APIs.",
    date: "Apr 20, 2026",
    image:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1400&q=80",
    rules: [
      "Teams of 2–5 participants.",
      "Provide docs/README with setup steps.",
      "Include a short demo video link (optional).",
      "Scoring prioritizes usability + reliability.",
    ],
  },
];
