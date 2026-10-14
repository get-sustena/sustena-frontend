import assert from "node:assert/strict";
import { test } from "node:test";
import { getCachedPhotos, photoFileName, syncPhotos } from "../src/lib/catalogue/photoCache.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

const PAP = "https://res.cloudinary.com/rslnsqyc/image/upload/v1/sustena-recipes/pap.webp";
const JOLLOF = "https://res.cloudinary.com/rslnsqyc/image/upload/v1/sustena-recipes/jollof.webp";
const JOLLOF_NEW = "https://res.cloudinary.com/rslnsqyc/image/upload/v2/sustena-recipes/jollof.webp";
const AVATAR = "https://media.getsustena.com/avatars/kitchen.jpg";

// A folder of files, like the phone's: a download can fail, and on Android a
// failed one may leave part of a file behind.
function fakeStore({ failOn = new Set(), offlineAfter = Infinity } = {}) {
  const files = new Map();
  const downloads = [];
  return {
    files,
    downloads,
    async list() {
      return [...files.keys()];
    },
    async download(url, fileName) {
      downloads.push(url);
      if (downloads.length > offlineAfter || failOn.has(url)) {
        files.set(`${fileName}.part`, "half");
        throw Object.assign(new Error("Network request failed"), { status: 0 });
      }
      files.set(fileName, url);
    },
    async remove(fileName) {
      files.delete(fileName);
    },
  };
}

test("OFF-01: every recipe photo and avatar is saved once, and the saved file is used", async () => {
  const { db } = await openTestDatabase();
  const store = fakeStore();

  const result = await syncPhotos({ db, store, now: () => "now" }, [PAP, JOLLOF, AVATAR, PAP]);
  assert.deepEqual(result, { downloaded: 3, failed: 0 });
  assert.deepEqual(store.downloads.sort(), [AVATAR, JOLLOF, PAP].sort());

  const cached = await getCachedPhotos(db);
  assert.equal(cached.get(PAP), photoFileName(PAP));
  assert.equal(store.files.get(photoFileName(PAP)), PAP);
});

test("OFF-01: photos already saved aren't downloaded again", async () => {
  const { db } = await openTestDatabase();
  const store = fakeStore();
  await syncPhotos({ db, store, now: () => "now" }, [PAP, JOLLOF]);
  store.downloads.length = 0;

  assert.deepEqual(await syncPhotos({ db, store, now: () => "now" }, [PAP, JOLLOF]), { downloaded: 0, failed: 0 });
  assert.deepEqual(store.downloads, []);
});

test("OFF-01: a changed photo link downloads only that photo, and the old file goes", async () => {
  const { db } = await openTestDatabase();
  const store = fakeStore();
  await syncPhotos({ db, store, now: () => "now" }, [PAP, JOLLOF]);
  store.downloads.length = 0;

  await syncPhotos({ db, store, now: () => "now" }, [PAP, JOLLOF_NEW]);
  assert.deepEqual(store.downloads, [JOLLOF_NEW]);
  assert.equal(store.files.has(photoFileName(JOLLOF)), false);
  assert.equal((await getCachedPhotos(db)).has(JOLLOF), false);
});

test("OFF-01: an interrupted download picks up where it stopped, and half files are replaced", async () => {
  const path = testDatabasePath();
  const first = await openTestDatabase(path);
  const store = fakeStore({ offlineAfter: 1 });
  const result = await syncPhotos({ db: first.db, store, now: () => "now" }, [PAP, JOLLOF, AVATAR]);
  assert.equal(result.downloaded, 1);
  first.db.close();

  // Back online after a restart.
  const restarted = await openTestDatabase(path);
  const online = { ...fakeStore(), files: store.files };
  online.list = async () => [...store.files.keys()];
  online.download = async (url, fileName) => {
    online.downloads.push(url);
    store.files.set(fileName, url);
  };
  online.remove = async (fileName) => {
    store.files.delete(fileName);
  };
  await syncPhotos({ db: restarted.db, store: online, now: () => "now" }, [PAP, JOLLOF, AVATAR]);

  assert.deepEqual(online.downloads.sort(), [AVATAR, JOLLOF].sort());
  assert.deepEqual([...store.files.keys()].sort(), [PAP, JOLLOF, AVATAR].map(photoFileName).sort());
  assert.equal((await getCachedPhotos(restarted.db)).size, 3);
});

test("OFF-01: a photo that fails is skipped for now; the rest still download", async () => {
  const { db } = await openTestDatabase();
  const store = fakeStore({ failOn: new Set([JOLLOF]) });

  assert.deepEqual(await syncPhotos({ db, store, now: () => "now" }, [PAP, JOLLOF, AVATAR]), { downloaded: 2, failed: 1 });
  assert.equal((await getCachedPhotos(db)).has(JOLLOF), false);
});

test("OFF-01: a saved photo whose file is missing is downloaded again", async () => {
  const { db } = await openTestDatabase();
  const store = fakeStore();
  await syncPhotos({ db, store, now: () => "now" }, [PAP]);
  store.files.clear();
  store.downloads.length = 0;

  await syncPhotos({ db, store, now: () => "now" }, [PAP]);
  assert.deepEqual(store.downloads, [PAP]);
});

test("OFF-01: photo file names are stable and keep the picture's type", () => {
  assert.equal(photoFileName(PAP), photoFileName(PAP));
  assert.notEqual(photoFileName(JOLLOF), photoFileName(JOLLOF_NEW));
  assert.match(photoFileName(PAP), /^[0-9a-f]{16}\.webp$/);
  assert.match(photoFileName(AVATAR), /\.jpg$/);
  assert.match(photoFileName("https://example.com/photo?id=1"), /^[0-9a-f]{16}\.img$/);
});

test("OFF-01: the photos to keep are every saved recipe's photo and its creator's avatar", async () => {
  const { getCataloguePhotoUrls } = await import("../src/db/recipeRows.ts");
  const { db } = await openTestDatabase();
  const insert = (id, imageUrl, avatarUrl) =>
    db.runAsync(
      "INSERT INTO recipes (id, name, image_url, review_status, quality_warnings_json, raw_json, updated_at) VALUES (?, ?, ?, 'published', '[]', ?, 'now')",
      [id, id, imageUrl, JSON.stringify({ id, creator: avatarUrl === undefined ? null : { avatarUrl } })]
    );
  await insert("pap", PAP, AVATAR);
  await insert("jollof", JOLLOF, null);
  await insert("no-photo", null, undefined);

  assert.deepEqual((await getCataloguePhotoUrls(db)).sort(), [AVATAR, JOLLOF, PAP].sort());
});
