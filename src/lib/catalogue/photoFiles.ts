import { Directory, File, Paths } from "expo-file-system";
import type { PhotoStore } from "./photoCache";

// Kept in the app's documents folder: the system doesn't clear it to free
// space, unlike the cache folder.
const folder = new Directory(Paths.document, "recipe-photos");

export const photoStore: PhotoStore = {
  async list() {
    if (!folder.exists) return [];
    return folder.list().flatMap((entry) => (entry instanceof File ? [entry.name] : []));
  },
  // Android writes a download straight into its file, and a failed one can
  // leave part of it, so it lands under a temporary name and is moved into
  // place only when complete.
  async download(url, fileName) {
    folder.create({ idempotent: true, intermediates: true });
    const partial = new File(folder, `${fileName}.part`);
    await File.downloadFileAsync(url, partial, { idempotent: true });
    await partial.move(new File(folder, fileName), { overwrite: true });
  },
  async remove(fileName) {
    const file = new File(folder, fileName);
    if (file.exists) file.delete();
  },
};

export function photoFileUri(fileName: string) {
  return new File(folder, fileName).uri;
}
