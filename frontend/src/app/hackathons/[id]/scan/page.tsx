"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  QrCode,
  RotateCcw,
  ScanLine,
  SwitchCamera,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { QrScannerCard } from "@/components/qr/qr-scanner-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { fetchJudgeAccess, scanHackathonQr } from "@/api";

type ScanState = "scanning" | "success" | "error";

const readMessage = (value: unknown): string | null => {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  ) {
    return (value as { error: string }).error;
  }

  return null;
};

const readPayload = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) return null;

  if (
    "data" in value &&
    typeof (value as { data?: unknown }).data === "object" &&
    (value as { data?: unknown }).data !== null
  ) {
    return (value as { data: Record<string, unknown> }).data;
  }

  return value as Record<string, unknown>;
};

const readString = (value: unknown, key: string): string | null =>
  typeof value === "object" &&
  value !== null &&
  key in value &&
  typeof (value as Record<string, unknown>)[key] === "string"
    ? ((value as Record<string, unknown>)[key] as string)
    : null;

const readSuccess = (value: unknown): boolean | null =>
  typeof value === "object" &&
  value !== null &&
  "success" in value &&
  typeof (value as { success?: unknown }).success === "boolean"
    ? (value as { success: boolean }).success
    : null;

const normalizeJudgeFinalRedirect = (
  redirect: string,
  hackathonId: string,
  payload: Record<string, unknown> | null,
) => {
  const payloadTeamId = readString(payload, "teamId");
  const payloadStageId = readString(payload, "stageId");

  try {
    const url = new URL(redirect, "http://localhost");
    const pathParts = url.pathname.split("/").filter(Boolean);
    const evaluateIndex = pathParts.findIndex((part) => part === "evaluate");
    const teamIdFromPath =
      evaluateIndex >= 0 && evaluateIndex + 1 < pathParts.length
        ? pathParts[evaluateIndex + 1]
        : null;
    const stageIdFromQuery = url.searchParams.get("stageId");

    const teamId = payloadTeamId ?? teamIdFromPath;
    const stageId = payloadStageId ?? stageIdFromQuery;
    if (!teamId) return redirect;

    const finalPath = `/hackathons/${hackathonId}/judge/final/evaluate/${encodeURIComponent(teamId)}`;
    return stageId ? `${finalPath}?stageId=${encodeURIComponent(stageId)}` : finalPath;
  } catch {
    return redirect;
  }
};

const readAccess = (value: unknown): { isJudge: boolean; isAdmin: boolean } | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("isJudge" in value) ||
    typeof (value as { isJudge?: unknown }).isJudge !== "boolean"
  ) {
    return null;
  }

  return {
    isJudge: (value as { isJudge: boolean }).isJudge,
    isAdmin:
      "isAdmin" in value && typeof (value as { isAdmin?: unknown }).isAdmin === "boolean"
        ? (value as { isAdmin: boolean }).isAdmin
        : false,
  };
};

const extractToken = (rawValue: string) => {
  const raw = rawValue.trim();
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      if (
        "token" in parsed &&
        typeof (parsed as { token?: unknown }).token === "string"
      ) {
        return (parsed as { token: string }).token.trim();
      }
      if (
        "data" in parsed &&
        typeof (parsed as { data?: unknown }).data === "object" &&
        (parsed as { data?: unknown }).data !== null &&
        "token" in (parsed as { data: Record<string, unknown> }).data &&
        typeof (parsed as { data: Record<string, unknown> }).data.token === "string"
      ) {
        return (parsed as { data: { token: string } }).data.token.trim();
      }
    }
  } catch {
    // not JSON; treat scanned value as token
  }

  return raw;
};

const mapScanError = (status: number, message: string | null) => {
  const normalized = (message ?? "").toLowerCase();

  if (status === 401 || status === 403 || normalized.includes("unauthorized")) {
    return "Unauthorized user.";
  }
  if (normalized.includes("expired")) {
    return "Expired QR code.";
  }
  if (
    normalized.includes("already used") ||
    (normalized.includes("already") && normalized.includes("used"))
  ) {
    return "This QR code is already used.";
  }
  if (normalized.includes("invalid")) {
    return "Invalid QR code.";
  }

  return message ?? "Unable to process QR scan right now.";
};

const stateStyles: Record<ScanState, string> = {
  scanning: "bg-sky-500/10 text-sky-300 ring-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  error: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
};

export default function HackathonScanPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [isAuthorizing, setIsAuthorizing] = React.useState(true);
  const [canScan, setCanScan] = React.useState(false);
  const [isScannerActive, setIsScannerActive] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scanState, setScanState] = React.useState<ScanState>("scanning");
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [qrType, setQrType] = React.useState<string | null>(null);
  const [manualToken, setManualToken] = React.useState("");
  const [manualInputError, setManualInputError] = React.useState<string | null>(null);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">(
    "environment",
  );

  const processedTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    if (!hackathonId) {
      setCanScan(false);
      setIsAuthorizing(false);
      setScanState("error");
      setFeedback("Hackathon not found.");
      return;
    }

    const verifyAccess = async () => {
      setIsAuthorizing(true);
      setScanState("scanning");
      setFeedback(null);

      try {
        const res = await fetchJudgeAccess(hackathonId);
        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          setCanScan(false);
          setScanState("error");
          setFeedback(readMessage(data) ?? "Unable to verify scanner access.");
          return;
        }

        const access = readAccess(data);
        if (!access || (!access.isAdmin && !access.isJudge)) {
          setCanScan(false);
          setScanState("error");
          setFeedback("Unauthorized user.");
          return;
        }

        setCanScan(true);
      } catch {
        setCanScan(false);
        setScanState("error");
        setFeedback("Network/API failure. Please try again.");
      } finally {
        setIsAuthorizing(false);
      }
    };

    void verifyAccess();
  }, [hackathonId, isSessionPending, router, session?.user?.id]);

  React.useEffect(() => {
    if (scanState !== "success") return;
    setManualToken("");
    setManualInputError(null);
  }, [scanState]);

  const handleScan = React.useCallback(
    async (rawValue: string) => {
      if (!hackathonId || !canScan || !isScannerActive || isSubmitting) return;

      const token = extractToken(rawValue);
      if (!token) {
        setScanState("error");
        setFeedback("Invalid QR code.");
        setIsScannerActive(false);
        return;
      }

      if (processedTokenRef.current === token) return;
      processedTokenRef.current = token;

      setIsSubmitting(true);
      setFeedback(null);
      setQrType(null);
      setScanState("scanning");

      try {
        const res = await scanHackathonQr(hackathonId, { token });
        const data: unknown = await res.json().catch(() => null);
        const payload = readPayload(data);
        const success = readSuccess(data) ?? readSuccess(payload) ?? res.ok;
        const redirect = readString(data, "redirect") ?? readString(payload, "redirect");

        if (!success) {
          setScanState("error");
          setFeedback(mapScanError(res.status, readMessage(data) ?? readMessage(payload)));
          setIsScannerActive(false);
          return;
        }

        if (redirect) {
          router.push(normalizeJudgeFinalRedirect(redirect, hackathonId, payload));
          return;
        }

        const role = readString(payload, "role")?.toLowerCase();
        const teamId = readString(payload, "teamId");
        const stageId = readString(payload, "stageId");

        if (role === "judge") {
          if (!teamId) {
            setScanState("error");
            setFeedback("Judge scan succeeded, but team ID was not returned.");
            setIsScannerActive(false);
            return;
          }

          if (!stageId) {
            setScanState("error");
            setFeedback("Judge scan succeeded, but stage ID was not returned.");
            setIsScannerActive(false);
            return;
          }

          setScanState("success");
          setFeedback("Team verified. Redirecting to final evaluation...");
          setIsScannerActive(false);
          router.push(
            `/hackathons/${hackathonId}/judge/final/evaluate/${teamId}?stageId=${encodeURIComponent(stageId)}`,
          );
          return;
        }

        const type = readString(payload, "type")?.toLowerCase() ?? null;
        setQrType(type);
        setScanState("success");
        setIsScannerActive(false);

        if (type === "entry") {
          setFeedback("QR marked as used • Entry allowed");
          return;
        }

        if (type === "breakfast" || type === "lunch" || type === "dinner") {
          setFeedback("QR marked as used • Food allowed");
          return;
        }

        setFeedback(readMessage(data) ?? "QR marked as used");
      } catch {
        setScanState("error");
        setFeedback("Network/API failure. Please try again.");
        setIsScannerActive(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canScan, hackathonId, isScannerActive, isSubmitting, router],
  );

  const handleScanAgain = () => {
    processedTokenRef.current = null;
    setQrType(null);
    setFeedback(null);
    setScanState("scanning");
    setIsScannerActive(true);
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleFacingModeResolved = (mode: "user" | "environment" | null) => {
    if (!mode) return;
    setFacingMode((prev) => (prev === mode ? prev : mode));
  };

  const handleManualSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const token = manualToken.trim();
      if (!token) {
        setManualInputError("Please enter a token");
        return;
      }

      setManualInputError(null);
      await handleScan(token);
    },
    [handleScan, manualToken],
  );

  return (
    <div className="min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <div className="mb-6 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Scan QR Code</h1>
          <p className="text-sm text-white/60 sm:text-base">
            Admins and judges can scan hackathon QR codes from this page.
          </p>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${stateStyles[scanState]}`}
          >
            {scanState === "scanning"
              ? "Scanning"
              : scanState === "success"
                ? "Success"
                : "Error"}
          </span>
        </div>

        {isAuthorizing ? (
          <Card className="border-white/10 bg-black/20">
            <CardContent className="flex items-center gap-3 py-10 text-white/70">
              <Loader2 className="size-5 animate-spin" />
              Verifying access...
            </CardContent>
          </Card>
        ) : !canScan ? (
          <Card className="border-rose-500/20 bg-rose-500/10">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-rose-200">
                <QrCode className="size-5" />
                Scanner unavailable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rose-200">{feedback ?? "Unauthorized user."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {isScannerActive ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs text-white/70 sm:text-sm">
                    Using {facingMode === "environment" ? "Back" : "Front"} Camera
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchCamera}
                    disabled={isSubmitting}
                  >
                    <SwitchCamera className="size-4" />
                    Switch Camera
                  </Button>
                </div>

                <QrScannerCard
                  title="Live Scanner"
                  description="Keep the QR inside the frame until it is detected."
                  constraints={{ facingMode }}
                  onFacingModeResolved={handleFacingModeResolved}
                  onScan={handleScan}
                  isBusy={isSubmitting}
                  busyText="Validating QR..."
                  className="border-white/10 bg-black/20"
                />
              </>
            ) : (
              <Card className="border-white/10 bg-black/20">
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2 text-white">
                    <ScanLine className="size-5 text-cyan-300" />
                    Scan Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p
                    className={
                      scanState === "success" ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {feedback ??
                      (scanState === "success"
                        ? "QR processed successfully."
                        : "Unable to process QR.")}
                  </p>

                  {qrType ? (
                    <p className="text-sm text-white/70">
                      QR type: <span className="font-semibold uppercase">{qrType}</span>
                    </p>
                  ) : null}

                  <Button variant="outline" onClick={handleScanAgain}>
                    <RotateCcw className="size-4" />
                    Scan Again
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle className="text-base text-white">Or enter token manually</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  onSubmit={handleManualSubmit}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Input
                    value={manualToken}
                    onChange={(event) => {
                      setManualToken(event.target.value);
                      if (manualInputError) setManualInputError(null);
                    }}
                    placeholder="Enter QR token"
                    className="w-full border-white/15 bg-black/40 text-white placeholder:text-white/40"
                    disabled={isSubmitting || !isScannerActive}
                  />
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={isSubmitting || !isScannerActive}
                  >
                    Submit
                  </Button>
                </form>

                {manualInputError ? (
                  <p className="text-sm text-rose-300">{manualInputError}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


