import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import type { PhotoFrame } from "@/types/photobooth";
import { db } from "./firebase";

// Helper to compress base64 images on the client side before saving to Firestore (1MB limit)
function compressBase64Image(
  dataUrl: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      // Resize if exceeds boundaries
      if (w > maxWidth || h > maxHeight) {
        if (w > h) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        } else {
          w = Math.round((w * maxHeight) / h);
          h = maxHeight;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      // Keep PNG format for frames to preserve transparency, use JPEG for photos to reduce size
      const isPng = dataUrl.includes("image/png");
      const format = isPng ? "image/png" : "image/jpeg";
      resolve(canvas.toDataURL(format, isPng ? undefined : quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// 1. Get all custom frames from Firestore
export async function getCustomFrames(): Promise<PhotoFrame[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "custom-frames"));
    const frames: PhotoFrame[] = [];
    querySnapshot.forEach((doc) => {
      frames.push(doc.data() as PhotoFrame);
    });
    return frames;
  } catch (error) {
    console.error("Error fetching custom frames from Firestore:", error);
    return [];
  }
}

// 2. Save custom frame directly to Firestore as compressed Base64 text
export async function saveCustomFrame(frame: PhotoFrame): Promise<void> {
  try {
    // Compress main image (keep PNG for transparency, but limit size)
    const compressedImageUrl = await compressBase64Image(frame.imageUrl, 800, 800, 0.7);
    
    let compressedThumbnailUrl = compressedImageUrl;
    if (frame.thumbnailUrl) {
      compressedThumbnailUrl = await compressBase64Image(frame.thumbnailUrl, 200, 200, 0.6);
    }

    const updatedFrame: PhotoFrame = {
      ...frame,
      imageUrl: compressedImageUrl,
      thumbnailUrl: compressedThumbnailUrl,
    };

    // Save directly to Firestore as text (no Storage needed!)
    await setDoc(doc(db, "custom-frames", frame.id), updatedFrame);
  } catch (error) {
    console.error("Error saving custom frame to Firestore:", error);
    throw error;
  }
}

// 3. Delete frame metadata from Firestore
export async function deleteCustomFrame(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "custom-frames", id));
  } catch (error) {
    console.error("Error deleting custom frame from Firestore:", error);
    throw error;
  }
}

// 4. Save captured photos and photostrip directly to Firestore as compressed Base64 text
export async function saveCapturedSession(
  mode: "single" | "strip",
  photos: string[], // Base64 data URLs
  stripUrl: string | null // Base64 data URL
): Promise<string> {
  try {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Compress individual photos to small JPEGs to fit Firestore 1MB limit
    const compressedPhotos = await Promise.all(
      photos.map((photo) => compressBase64Image(photo, 600, 450, 0.6))
    );

    // Compress finalized photostrip to a small JPEG
    let compressedStripUrl = "";
    if (mode === "strip" && stripUrl) {
      compressedStripUrl = await compressBase64Image(stripUrl, 600, 1000, 0.6);
    } else {
      compressedStripUrl = compressedPhotos[0] || "";
    }

    // Save session directly to Firestore (no Storage needed!)
    await setDoc(doc(db, "sessions", sessionId), {
      id: sessionId,
      mode,
      stripUrl: compressedStripUrl,
      photoUrls: compressedPhotos,
      createdAt: new Date().toISOString(),
    });

    return sessionId;
  } catch (error) {
    console.error("Error saving captured session to Firestore:", error);
    throw error;
  }
}
