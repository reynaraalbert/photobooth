export type CameraFacing = "user" | "environment";

export type PhotoMode = "single" | "strip";

export type AppStage = "loading" | "welcome" | "frame-select" | "booth";

export type StripLayout = number;

export type StripOrientation = "portrait" | "landscape";

export type ZoomLevel = 0.5 | 1 | 2 | 3;

export type CameraError =
  | { kind: "not-allowed"; message: string }
  | { kind: "not-found"; message: string }
  | { kind: "not-readable"; message: string }
  | { kind: "overconstrained"; message: string }
  | { kind: "unknown"; message: string };

export type CameraState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "active" }
  | { status: "error"; error: CameraError };

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  capturedAt: Date;
}

export interface PhotoStrip {
  photos: CapturedPhoto[];
  createdAt: Date;
}

export interface PhotoFrame {
  id: string;
  name: string;
  imageUrl: string;
  hasChromaKey: boolean;
  chromaColor?: string;
  thumbnailUrl?: string;
  supportedOrientations?: ("portrait" | "landscape" | "both")[];
}

export interface UseCameraOptions {
  facing?: CameraFacing;
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  state: CameraState;
  facing: CameraFacing;
  hasMultipleCameras: boolean;
  zoom: number;
  zoomRange: { min: number; max: number };
  isNativeZoomSupported: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  capturePhoto: () => string | null;
  setZoom: (level: number) => void;
}

export interface CountdownState {
  isActive: boolean;
  value: number | null;
}
