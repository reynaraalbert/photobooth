"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CameraError,
  CameraFacing,
  CameraState,
  UseCameraOptions,
  UseCameraReturn,
} from "@/types/photobooth";

function parseMediaError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return {
          kind: "not-allowed",
          message:
            "Akses kamera ditolak. Izinkan akses kamera di pengaturan browser.",
        };
      case "NotFoundError":
      case "DevicesNotFoundError":
        return {
          kind: "not-found",
          message: "Tidak ada kamera yang terdeteksi pada perangkat ini.",
        };
      case "NotReadableError":
      case "TrackStartError":
        return {
          kind: "not-readable",
          message:
            "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.",
        };
      case "OverconstrainedError":
        return {
          kind: "overconstrained",
          message: "Kamera tidak mendukung resolusi yang diminta.",
        };
      default:
        return { kind: "unknown", message: err.message };
    }
  }
  return {
    kind: "unknown",
    message: "Terjadi kesalahan yang tidak diketahui saat mengakses kamera.",
  };
}

async function detectMultipleCameras(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === "videoinput");
    return videoInputs.length > 1;
  } catch {
    return false;
  }
}

function buildConstraints(facing: CameraFacing): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: facing,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
    },
  };
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(
    options.facing ?? "user"
  );
  const [state, setState] = useState<CameraState>({ status: "idle" });
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  
  // Zoom States
  const [zoom, setZoomState] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 3 });
  const [isNativeZoomSupported, setIsNativeZoomSupported] = useState(false);

  // Cleanup: stop all tracks and release stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState({ status: "idle" });
    setZoomState(1);
    setIsNativeZoomSupported(false);
  }, []);

  const startCamera = useCallback(
    async (facingOverride?: CameraFacing) => {
      const targetFacing = facingOverride ?? facing;

      // Stop any existing stream before starting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      setState({ status: "requesting" });

      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          buildConstraints(targetFacing)
        );

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) return reject(new Error("No video element"));
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(resolve).catch(reject);
            };
          });
        }

        setState({ status: "active" });

        // Detect multiple cameras after getting stream (needs permission first)
        detectMultipleCameras().then(setHasMultipleCameras);

        // Force simulated/digital zoom for 100% cross-device captured file consistency
        setIsNativeZoomSupported(false);
        setZoomRange({ min: 0.5, max: 3 });
        setZoomState(1);
      } catch (err) {
        const cameraError = parseMediaError(err);
        setState({ status: "error", error: cameraError });
        console.error("[useCamera] Error:", cameraError);
      }
    },
    [facing]
  );

  const switchCamera = useCallback(async () => {
    const newFacing: CameraFacing = facing === "user" ? "environment" : "user";
    setFacing(newFacing);
    await startCamera(newFacing);
  }, [facing, startCamera]);

  const setZoom = useCallback(
    async (level: number) => {
      const clamped = Math.max(zoomRange.min, Math.min(zoomRange.max, level));
      setZoomState(clamped);
    },
    [zoomRange]
  );

  const capturePhoto = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Mirror horizontally for front camera (selfie mirror effect)
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    if (!isNativeZoomSupported && zoom !== 1) {
      if (zoom > 1) {
        // Simulated zoom in
        const cropW = video.videoWidth / zoom;
        const cropH = video.videoHeight / zoom;
        const cropX = (video.videoWidth - cropW) / 2;
        const cropY = (video.videoHeight - cropH) / 2;
        ctx.drawImage(
          video,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          canvas.width,
          canvas.height
        );
      } else {
        // Simulated zoom out (< 1)
        const drawW = video.videoWidth * zoom;
        const drawH = video.videoHeight * zoom;
        const drawX = (video.videoWidth - drawW) / 2;
        const drawY = (video.videoHeight - drawH) / 2;
        ctx.fillStyle = "#0A0A0F";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          video,
          0,
          0,
          video.videoWidth,
          video.videoHeight,
          drawX,
          drawY,
          drawW,
          drawH
        );
      }
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    return canvas.toDataURL("image/jpeg", 0.92);
  }, [facing, isNativeZoomSupported, zoom]);

  // Cleanup on unmount — critical to prevent camera staying on
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    videoRef,
    state,
    facing,
    hasMultipleCameras,
    zoom,
    zoomRange,
    isNativeZoomSupported,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    setZoom,
  };
}
