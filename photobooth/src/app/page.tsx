"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppStage, PhotoFrame } from "@/types/photobooth";
import { LoadingScreen } from "@/components/photobooth/LoadingScreen";
import { WelcomeScreen } from "@/components/photobooth/WelcomeScreen";
import { FrameSelector } from "@/components/photobooth/FrameSelector";
import { Photobooth } from "@/components/photobooth/Photobooth";
import { getCustomFrames, saveCustomFrame, deleteCustomFrame } from "@/lib/db";

export default function Home() {
  const [stage, setStage] = useState<AppStage>("loading");
  const [selectedFrame, setSelectedFrame] = useState<PhotoFrame | null>(null);
  const [customFrames, setCustomFrames] = useState<PhotoFrame[]>([]);

  // Load custom frames from IndexedDB on mount
  useEffect(() => {
    getCustomFrames()
      .then((frames) => {
        setCustomFrames(frames);
      })
      .catch((err) => {
        console.error("Gagal memuat frame custom:", err);
      });
  }, []);

  const handleAddCustomFrame = useCallback(async (frame: PhotoFrame) => {
    setCustomFrames((prev) => {
      const filtered = prev.filter((f) => f.id !== frame.id);
      return [...filtered, frame];
    });
    await saveCustomFrame(frame).catch((err) => {
      console.error("Gagal menyimpan frame custom ke IndexedDB:", err);
    });
  }, []);

  const handleDeleteCustomFrame = useCallback(async (id: string) => {
    setCustomFrames((prev) => prev.filter((f) => f.id !== id));
    setSelectedFrame((prev) => (prev && prev.id === id ? null : prev));
    await deleteCustomFrame(id).catch((err) => {
      console.error("Gagal menghapus frame custom dari IndexedDB:", err);
    });
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setStage("welcome");
  }, []);

  const handleStart = useCallback(() => {
    setStage("frame-select");
  }, []);

  const handleFrameSelect = useCallback((frame: PhotoFrame | null) => {
    setSelectedFrame(frame);
    setStage("booth");
  }, []);

  const handleChangeFrame = useCallback(() => {
    setStage("frame-select");
  }, []);

  return (
    <>
      {/* Loading screen — always mounted initially, auto-advances */}
      {stage === "loading" && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      {/* Welcome / landing screen */}
      {stage === "welcome" && (
        <WelcomeScreen onStart={handleStart} />
      )}

      {/* Frame selector */}
      {stage === "frame-select" && (
        <FrameSelector
          customFrames={customFrames}
          onAddCustomFrame={handleAddCustomFrame}
          onDeleteCustomFrame={handleDeleteCustomFrame}
          onSelectFrame={handleFrameSelect}
          onBack={() => setStage("welcome")}
        />
      )}

      {/* Main photobooth */}
      {stage === "booth" && (
        <Photobooth
          frame={selectedFrame}
          onChangeFrame={handleChangeFrame}
          onBack={() => setStage("frame-select")}
          onUpdateFrame={setSelectedFrame}
          customFrames={customFrames}
          onAddCustomFrame={handleAddCustomFrame}
          onDeleteCustomFrame={handleDeleteCustomFrame}
        />
      )}
    </>
  );
}
