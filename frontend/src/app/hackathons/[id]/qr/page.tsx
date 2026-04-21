"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, QrCode, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { fetchHackathonQrCodes } from "@/api";

type QrType = "entry" | "breakfast" | "lunch" | "dinner";

type QrCodeItem = {
  type: QrType;
  token: string;
  expiresAt?: string | null;
};

const TYPE_LABELS: Record<QrType, string> = {
  entry: "Entry",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const TYPE_STYLES: Record<QrType, { card: string; badge: string }> = {
  entry: {
    card: "border-emerald-400/30 bg-emerald-500/5",
    badge: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
  },
  breakfast: {
    card: "border-amber-400/30 bg-amber-500/5",
    badge: "border-amber-400/40 bg-amber-500/15 text-amber-300",
  },
  lunch: {
    card: "border-sky-400/30 bg-sky-500/5",
    badge: "border-sky-400/40 bg-sky-500/15 text-sky-300",
  },
  dinner: {
    card: "border-fuchsia-400/30 bg-fuchsia-500/5",
    badge: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-300",
  },
};

const TYPE_ORDER: Record<QrType, number> = {
  entry: 0,
  breakfast: 1,
  lunch: 2,
  dinner: 3,
};

const GENERIC_ERROR_MESSAGE = "Unable to load QR codes right now.";
const NOT_SHORTLISTED_MESSAGE = "Your team is not shortlisted for the final round.";

const isQrType = (value: unknown): value is QrType =>
  value === "entry" ||
  value === "breakfast" ||
  value === "lunch" ||
  value === "dinner";

const readQrCodes = (value: unknown): QrCodeItem[] => {
  const rows =
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
      ? (value as { data: unknown[] }).data
      : [];

  const parsed: QrCodeItem[] = [];

  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;

    const qr = row as Record<string, unknown>;
    if (!isQrType(qr.type) || typeof qr.token !== "string") continue;

    parsed.push({
      type: qr.type,
      token: qr.token,
      expiresAt: typeof qr.expiresAt === "string" ? qr.expiresAt : null,
    });
  }

  return parsed.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
};

const formatExpiry = (expiresAt?: string | null) => {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function HackathonQrPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [qrCodes, setQrCodes] = React.useState<QrCodeItem[]>([]);

  React.useEffect(() => {
    if (isSessionPending) return;
    if (!session?.user?.id) {
      router.push("/login");
    }
  }, [isSessionPending, router, session?.user?.id]);

  React.useEffect(() => {
    if (!hackathonId || !session?.user?.id || isSessionPending) return;

    let active = true;

    const loadQrCodes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetchHackathonQrCodes(hackathonId);
        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          if (!active) return;
          setError(res.status === 403 ? NOT_SHORTLISTED_MESSAGE : GENERIC_ERROR_MESSAGE);
          setQrCodes([]);
          return;
        }

        if (!active) return;
        setQrCodes(readQrCodes(data));
      } catch {
        if (!active) return;
        setError(GENERIC_ERROR_MESSAGE);
        setQrCodes([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadQrCodes();

    return () => {
      active = false;
    };
  }, [hackathonId, isSessionPending, session?.user?.id]);

  return (
    <div className="min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <button
          onClick={() =>
            router.push(hackathonId ? `/hackathons/${hackathonId}` : "/hackathons")
          }
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your Final Round QR Codes
          </h1>
          <p className="text-sm text-white/60 sm:text-base">
            Show these QR codes at the venue.
          </p>
        </div>

        {isLoading ? (
          <Card className="border-white/10 bg-black/30">
            <CardContent className="flex items-center gap-3 py-10 text-white/70">
              <Loader2 className="size-5 animate-spin text-purple-300" />
              Loading your QR codes...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-rose-400/30 bg-rose-500/10">
            <CardContent className="flex items-center gap-3 py-10 text-rose-200">
              <TriangleAlert className="size-5 shrink-0" />
              {error}
            </CardContent>
          </Card>
        ) : qrCodes.length === 0 ? (
          <Card className="border-white/10 bg-black/30">
            <CardContent className="py-12 text-center">
              <p className="text-base text-white/80">
                No QR codes available yet. Please contact the admin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {qrCodes.map((qr) => {
              const style = TYPE_STYLES[qr.type];
              const formattedExpiry = formatExpiry(qr.expiresAt);

              return (
                <Card
                  key={`${qr.type}:${qr.token}`}
                  className={`border ${style.card} backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-white">
                      <span className="inline-flex items-center gap-2 text-lg">
                        <QrCode className="size-5 text-white/80" />
                        {TYPE_LABELS[qr.type]} QR
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${style.badge}`}
                      >
                        {TYPE_LABELS[qr.type]}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-lg shadow-black/30">
                      <QRCodeSVG
                        value={qr.token}
                        size={220}
                        level="M"
                        includeMargin
                      />
                    </div>

                    {formattedExpiry ? (
                      <p className="text-sm text-white/75">
                        Valid till:{" "}
                        <span className="font-medium text-white/90">
                          {formattedExpiry}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-white/60">No expiry provided.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

