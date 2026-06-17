import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { PhotoFrame } from "@/types/photobooth";
import { db, storage } from "./firebase";

// Helper to convert dataURL (base64) to Blob
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
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

// 2. Upload frame image to Firebase Storage and save metadata to Firestore
export async function saveCustomFrame(frame: PhotoFrame): Promise<void> {
  try {
    let finalImageUrl = frame.imageUrl;
    let finalThumbnailUrl = frame.thumbnailUrl || frame.imageUrl;

    // Upload main image if it is a base64 data URL
    if (frame.imageUrl.startsWith("data:")) {
      const blob = dataURLtoBlob(frame.imageUrl);
      const storageRef = ref(storage, `custom-frames/${frame.id}`);
      await uploadBytes(storageRef, blob);
      finalImageUrl = await getDownloadURL(storageRef);
    }

    // Upload thumbnail image if it is a base64 data URL
    if (frame.thumbnailUrl && frame.thumbnailUrl.startsWith("data:")) {
      const blob = dataURLtoBlob(frame.thumbnailUrl);
      const storageRef = ref(storage, `custom-frames/${frame.id}-thumb`);
      await uploadBytes(storageRef, blob);
      finalThumbnailUrl = await getDownloadURL(storageRef);
    } else if (frame.imageUrl.startsWith("data:")) {
      // If imageUrl was uploaded, use it as thumbnailUrl too
      finalThumbnailUrl = finalImageUrl;
    }

    const updatedFrame: PhotoFrame = {
      ...frame,
      imageUrl: finalImageUrl,
      thumbnailUrl: finalThumbnailUrl,
    };

    // Save metadata to Firestore
    await setDoc(doc(db, "custom-frames", frame.id), updatedFrame);
  } catch (error) {
    console.error("Error saving custom frame to Firebase:", error);
    throw error;
  }
}

// 3. Delete frame metadata from Firestore and delete image from Storage
export async function deleteCustomFrame(id: string): Promise<void> {
  try {
    // Delete Firestore document
    await deleteDoc(doc(db, "custom-frames", id));

    // Delete image from Storage (ignore if not exists)
    const storageRef = ref(storage, `custom-frames/${id}`);
    await deleteObject(storageRef).catch((err) => {
      console.warn("Storage deletion warning (might not exist):", err);
    });

    // Delete thumbnail from Storage (ignore if not exists)
    const thumbRef = ref(storage, `custom-frames/${id}-thumb`);
    await deleteObject(thumbRef).catch((err) => {
      // Ignored
    });
  } catch (error) {
    console.error("Error deleting custom frame from Firebase:", error);
    throw error;
  }
}

// 4. Save a captured photobooth session (photos and composed strip) to Firebase
export async function saveCapturedSession(
  mode: "single" | "strip",
  photos: string[], // Base64 data URLs
  stripUrl: string | null // Base64 data URL
): Promise<string> {
  try {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Upload individual photos to Firebase Storage
    const uploadedPhotoUrls = await Promise.all(
      photos.map(async (photo, idx) => {
        if (!photo.startsWith("data:")) return photo;
        const blob = dataURLtoBlob(photo);
        const photoRef = ref(storage, `sessions/${sessionId}/photo-${idx}.jpg`);
        await uploadBytes(photoRef, blob);
        return await getDownloadURL(photoRef);
      })
    );

    // Upload composed strip if in strip mode
    let uploadedStripUrl = "";
    if (mode === "strip" && stripUrl && stripUrl.startsWith("data:")) {
      const blob = dataURLtoBlob(stripUrl);
      const stripRef = ref(storage, `sessions/${sessionId}/strip.png`);
      await uploadBytes(stripRef, blob);
      uploadedStripUrl = await getDownloadURL(stripRef);
    } else {
      // For single photo mode, the main URL is the first captured photo
      uploadedStripUrl = uploadedPhotoUrls[0] || "";
    }

    // Save session metadata to Firestore
    await setDoc(doc(db, "sessions", sessionId), {
      id: sessionId,
      mode,
      stripUrl: uploadedStripUrl,
      photoUrls: uploadedPhotoUrls,
      createdAt: new Date().toISOString(),
    });

    return sessionId;
  } catch (error) {
    console.error("Error saving captured session to Firebase:", error);
    throw error;
  }
}
