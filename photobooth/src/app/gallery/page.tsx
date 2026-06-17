"use client";

import { useEffect, useState, Suspense } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface GallerySession {
  id: string;
  mode: "single" | "strip";
  stripUrl: string;
  photoUrls: string[];
  createdAt: string;
}

function GalleryContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [session, setSession] = useState<GallerySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const docRef = doc(db, "sessions", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSession(docSnap.data() as GallerySession);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Gagal memuat galeri:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  const handleDownload = async () => {
    if (!session) return;
    try {
      const response = await fetch(session.stripUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photobooth-${session.mode}-${session.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengunduh gambar:", err);
      alert("Gagal mengunduh gambar secara langsung. Silakan tekan lama pada gambar untuk menyimpannya.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-booth-black flex flex-col items-center justify-center gap-4 text-booth-warm px-4">
        <div className="w-10 h-10 rounded-full border-4 border-booth-accent border-t-transparent animate-spin" />
        <p className="font-mono text-sm tracking-widest uppercase text-booth-muted">Memuat galeri foto...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-booth-black flex flex-col items-center justify-center gap-6 text-booth-warm px-4 text-center">
        <div className="w-16 h-16 rounded-full border border-booth-border flex items-center justify-center text-red-400 text-3xl">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-wider text-booth-warm">Sesi Foto Tidak Ditemukan</h1>
          <p className="text-sm font-mono text-booth-muted">Tautan mungkin tidak valid atau foto telah kedaluwarsa.</p>
        </div>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-booth-accent text-booth-black font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(200,169,110,0.3)]"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const dateFormatted = new Date(session.createdAt).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="min-h-screen bg-booth-black text-booth-warm flex flex-col items-center justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative Grid bg */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(#C8A96E 1px,transparent 1px),linear-gradient(90deg,#C8A96E 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Decorative gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-booth-accent/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-booth-accent/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-lg flex flex-col items-center text-center gap-1.5 z-10 pt-4 pb-6">
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-booth-accent bg-booth-accent/10 px-3 py-1 rounded-full border border-booth-accent/20">
          Memori Photobooth 📸
        </span>
        <h1 className="text-2xl font-semibold font-display tracking-wide text-booth-warm">Sesi Foto Bersama</h1>
        <p className="text-xs font-mono text-booth-muted">{dateFormatted}</p>
      </header>

      {/* Main Image Display */}
      <main className="w-full max-w-lg flex-1 flex flex-col items-center justify-center z-10 px-2">
        <div className="relative rounded-2xl overflow-hidden border border-booth-border bg-booth-dark shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[60vh] flex items-center justify-center p-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={session.stripUrl}
            alt="Photobooth output"
            className="max-h-[55vh] w-auto object-contain rounded-lg"
          />
        </div>
      </main>

      {/* Action Buttons */}
      <footer className="w-full max-w-lg flex flex-col gap-3 z-10 pt-8 pb-4">
        <button
          onClick={handleDownload}
          className="w-full py-4 rounded-xl bg-booth-accent text-booth-black font-mono text-xs font-bold tracking-widest uppercase hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,169,110,0.3)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Unduh Hasil Foto
        </button>

        <Link
          href="/"
          className="w-full py-3.5 rounded-xl border border-booth-border text-booth-muted hover:text-booth-warm hover:border-booth-muted font-mono text-xs tracking-widest uppercase text-center transition-all duration-200"
        >
          Buka Photobooth Baru
        </Link>
        <p className="text-[9px] font-mono text-booth-muted text-center tracking-wide">
          Tautan ini dapat dibagikan kepada teman atau keluarga untuk mengunduh foto ini.
        </p>
      </footer>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-booth-black flex flex-col items-center justify-center gap-4 text-booth-warm px-4">
        <div className="w-10 h-10 rounded-full border-4 border-booth-accent border-t-transparent animate-spin" />
        <p className="font-mono text-sm tracking-widest uppercase text-booth-muted">Memuat...</p>
      </div>
    }>
      <GalleryContent />
    </Suspense>
  );
}
