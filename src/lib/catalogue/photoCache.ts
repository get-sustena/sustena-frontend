// Recipe photos and creator avatars kept on the phone (OFF-01), so recipes
// show their pictures with no connection. Photos change, so they're
// downloaded rather than bundled: each one once, again when its link
// changes. Shared by the app and its tests, so nothing here imports React
// Native; the files themselves are reached through a PhotoStore.
import type { SQLiteDatabase } from "expo-sqlite";

// The folder the photos live in.
export type PhotoStore = {
  list: () => Promise<string[]>;
  // Leaves `fileName` complete or not there at all.
  download: (url: string, fileName: string) => Promise<void>;
  remove: (fileName: string) => Promise<void>;
};

type Dependencies = {
  db: SQLiteDatabase;
  store: PhotoStore;
  now: () => string;
};

const PICTURE_TYPES = new Set(["webp", "jpg", "jpeg", "png", "gif", "avif"]);

// FNV-1a, 64 bits: a short, stable name for a link. A changed link gets a
// new name, so an old file is never shown for a new photo.
function hashLink(url: string) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(url)) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

export function photoFileName(url: string) {
  const extension = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  return `${hashLink(url)}.${PICTURE_TYPES.has(extension) ? extension : "img"}`;
}

// Link → file name, for every photo saved complete.
export async function getCachedPhotos(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ url: string; file_name: string }>(
    "SELECT url, file_name FROM cached_photos"
  );
  return new Map(rows.map((row) => [row.url, row.file_name]));
}

// Saves every photo in `urls` that isn't saved yet, and removes files no
// longer needed. Safe to stop at any point: the next run carries on.
export async function syncPhotos({ db, store, now }: Dependencies, urls: string[]) {
  const wanted = new Map([...new Set(urls)].map((url) => [url, photoFileName(url)]));
  const saved = await getCachedPhotos(db);
  const onDisk = new Set(await store.list());

  // Files for links no longer used, and anything a failed download left.
  const keep = new Set([...saved].filter(([url]) => wanted.has(url)).map(([, fileName]) => fileName));
  for (const fileName of onDisk) {
    if (!keep.has(fileName)) await store.remove(fileName);
  }
  for (const url of saved.keys()) {
    if (!wanted.has(url)) await db.runAsync("DELETE FROM cached_photos WHERE url = ?", [url]);
  }

  let downloaded = 0;
  let failed = 0;
  for (const [url, fileName] of wanted) {
    if (saved.get(url) === fileName && onDisk.has(fileName)) continue;
    try {
      await store.download(url, fileName);
      await db.runAsync(
        `
        INSERT INTO cached_photos (url, file_name, saved_at) VALUES (?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET file_name = excluded.file_name, saved_at = excluded.saved_at
        `,
        [url, fileName, now()]
      );
      downloaded += 1;
    } catch {
      failed += 1;
    }
  }
  return { downloaded, failed };
}
