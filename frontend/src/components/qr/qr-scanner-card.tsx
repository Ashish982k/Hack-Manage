"use client";

import * as React from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BarcodeDetection = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (input: ImageBitmapSource) => Promise<BarcodeDetection[]>;
};
type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type FacingMode = "user" | "environment";

const CAMERA_CONSTRAINT_ERRORS = new Set([
  "NotFoundError",
  "DevicesNotFoundError",
  "OverconstrainedError",
  "ConstraintNotSatisfiedError",
]);

const isConstraintError = (error: unknown) =>
  error instanceof DOMException
    ? CAMERA_CONSTRAINT_ERRORS.has(error.name)
    : false;

const mapCameraError = (error: unknown) => {
  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError" ||
      error.name === "SecurityError"
    ) {
      return "Camera access is required to scan QR codes";
    }

    if (CAMERA_CONSTRAINT_ERRORS.has(error.name)) {
      return "No camera detected on this device";
    }
  }

  return "Unable to access the camera. Please allow camera permission and retry.";
};

type QrScannerCardProps = {
  title?: string;
  description?: string;
  onScan: (value: string) => Promise<void> | void;
  isBusy?: boolean;
  busyText?: string;
  className?: string;
  constraints?: {
    facingMode?: FacingMode;
  };
  onFacingModeResolved?: (mode: FacingMode | null) => void;
};

export function QrScannerCard({
  title = "QR Scanner",
  description = "Point the camera at a QR code to scan.",
  onScan,
  isBusy = false,
  busyText = "Processing scan...",
  className,
  constraints,
  onFacingModeResolved,
}: QrScannerCardProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const detectorRef = React.useRef<BarcodeDetectorInstance | null>(null);
  const scanIntervalRef = React.useRef<number | null>(null);
  const frameCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const frameContextRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const isDetectingRef = React.useRef(false);
  const lastScannedValueRef = React.useRef<string | null>(null);
  const lastScannedAtRef = React.useRef(0);
  const onScanRef = React.useRef(onScan);
  const isBusyRef = React.useRef(isBusy);
  const onFacingModeResolvedRef = React.useRef(onFacingModeResolved);

  const [isStarting, setIsStarting] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scannerError, setScannerError] = React.useState<string | null>(null);
  const [lastScannedValue, setLastScannedValue] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  React.useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  React.useEffect(() => {
    onFacingModeResolvedRef.current = onFacingModeResolved;
  }, [onFacingModeResolved]);

  const facingMode = constraints?.facingMode;

  const stopScanner = React.useCallback(() => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    streamRef.current = null;
    detectorRef.current = null;
    frameContextRef.current = null;
    isDetectingRef.current = false;
    setIsScanning(false);
  }, []);

  const startScanner = React.useCallback(async () => {
    setScannerError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Camera access is not supported in this browser.");
      return;
    }

    const DetectorCtor = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;

    try {
      setIsStarting(true);
      stopScanner();

      const getStream = (mode: FacingMode | null) =>
        navigator.mediaDevices.getUserMedia({
          video: mode ? { facingMode: { exact: mode } } : true,
          audio: false,
        });

      let stream: MediaStream;
      let resolvedFacingMode: FacingMode | null = null;

      if (facingMode) {
        try {
          stream = await getStream(facingMode);
          resolvedFacingMode = facingMode;
        } catch (error) {
          if (!isConstraintError(error)) {
            throw error;
          }

          const fallbackMode: FacingMode =
            facingMode === "environment" ? "user" : "environment";

          try {
            stream = await getStream(fallbackMode);
            resolvedFacingMode = fallbackMode;
          } catch (fallbackError) {
            if (!isConstraintError(fallbackError)) {
              throw fallbackError;
            }

            stream = await getStream(null);
            resolvedFacingMode = null;
          }
        }
      } else {
        stream = await getStream(null);
      }

      streamRef.current = stream;
      onFacingModeResolvedRef.current?.(resolvedFacingMode);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = DetectorCtor
        ? new DetectorCtor({ formats: ["qr_code"] })
        : null;
      if (!frameCanvasRef.current) {
        frameCanvasRef.current = document.createElement("canvas");
      }
      frameContextRef.current = frameCanvasRef.current.getContext("2d", {
        willReadFrequently: true,
      });
      setIsScanning(true);

      scanIntervalRef.current = window.setInterval(async () => {
        if (isDetectingRef.current || isBusyRef.current) return;

        const detector = detectorRef.current;
        const video = videoRef.current;
        if (!detector || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return;
        }

        isDetectingRef.current = true;
        try {
          let value = "";
          if (detector) {
            const detections = await detector.detect(video as unknown as ImageBitmapSource);
            value =
              detections
                .map((d) => (typeof d.rawValue === "string" ? d.rawValue.trim() : ""))
                .find(Boolean) ?? "";
          }

          if (!value) {
            const canvas = frameCanvasRef.current;
            const context = frameContextRef.current;
            const width = video.videoWidth;
            const height = video.videoHeight;
            if (canvas && context && width > 0 && height > 0) {
              if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
              }

              context.drawImage(video, 0, 0, width, height);
              const imageData = context.getImageData(0, 0, width, height);
              const decoded = jsQR(
                imageData.data,
                imageData.width,
                imageData.height,
              );
              value = decoded?.data?.trim() ?? "";
            }
          }

          if (!value) return;

          const now = Date.now();
          if (
            value === lastScannedValueRef.current &&
            now - lastScannedAtRef.current < 2500
          ) {
            return;
          }

          lastScannedValueRef.current = value;
          lastScannedAtRef.current = now;
          setLastScannedValue(value);
          await onScanRef.current(value);
        } catch {
          // Ignore per-frame detection errors and keep scanning.
        } finally {
          isDetectingRef.current = false;
        }
        }, 500);
    } catch (error) {
      stopScanner();
      setScannerError(mapCameraError(error));
    } finally {
      setIsStarting(false);
    }
  }, [facingMode, stopScanner]);

  React.useEffect(() => {
    void startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <Card className={cn("border-white/10 bg-black/20", className)}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            className="h-72 w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          {!isScanning ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-white/70">
              Camera is off
            </div>
          ) : null}
        </div>

        <p className="text-sm text-white/60">{description}</p>

        {scannerError ? <p className="text-sm text-rose-300">{scannerError}</p> : null}

        {lastScannedValue ? (
          <p className="text-xs text-white/50">Last scan: {lastScannedValue}</p>
        ) : null}

        {isBusy ? (
          <p className="inline-flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="size-4 animate-spin" />
            {busyText}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void startScanner()} disabled={isStarting || isScanning}>
            {isStarting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Starting...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Camera className="size-4" />
                Start Camera
              </span>
            )}
          </Button>

          <Button variant="outline" onClick={stopScanner} disabled={!isScanning}>
            <span className="inline-flex items-center gap-2">
              <CameraOff className="size-4" />
              Stop Camera
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
