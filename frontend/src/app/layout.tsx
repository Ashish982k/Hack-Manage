import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HackathonX — Hackathon Management System",
  description:
    "Run hackathons without chaos — registration, verification, QR entry, and real-time scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="app-theme flex min-h-full flex-col bg-[#FFFBF1] text-[#4F453F] selection:bg-[#FFB2B2]/50">
        {children}
      </body>
    </html>
  );
}
