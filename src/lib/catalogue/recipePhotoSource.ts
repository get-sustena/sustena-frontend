import { useSyncExternalStore } from "react";
import type { SQLiteDatabase } from "expo-sqlite";
import { getCachedPhotos } from "./photoCache";
import { photoFileUri } from "./photoFiles";

// Which photos are saved on the phone (link → file), for screens to show the
// saved file instead of downloading the photo again (OFF-01).
let savedPhotos = new Map<string, string>();
const listeners = new Set<() => void>();

export async function loadSavedPhotos(db: SQLiteDatabase) {
  savedPhotos = await getCachedPhotos(db);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The saved file when there is one, otherwise the link.
export function useRecipePhotoUri(url: string | null | undefined) {
  const photos = useSyncExternalStore(subscribe, () => savedPhotos);
  if (!url) return url;
  const fileName = photos.get(url);
  return fileName ? photoFileUri(fileName) : url;
}
