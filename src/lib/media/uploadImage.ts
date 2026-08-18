import * as Crypto from "expo-crypto";
import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";
import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { mediaApi } from "../api";

type MediaPurpose = "creator_avatar" | "creator_cover" | "recipe_cover";

export type UploadedImage = {
  assetId: string;
  publicUrl: string;
  localUri: string;
  width: number;
  height: number;
};

const MAX_IMAGE_EDGE = 1800;
const MAX_IMAGE_BYTES = 10_000_000;

export async function pickAndUploadImage(
  purpose: MediaPurpose,
  aspect: [number, number],
  source: "library" | "camera" = "library"
): Promise<UploadedImage | null> {
  const permission = source === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(source === "camera" ? "Allow camera access to take a photo." : "Allow photo-library access to choose an image.");
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 1,
  };
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const selected = result.assets[0];
  const context = ImageManipulator.manipulate(selected.uri);
  if (Math.max(selected.width, selected.height) > MAX_IMAGE_EDGE) {
    if (selected.width >= selected.height) {
      context.resize({ width: MAX_IMAGE_EDGE, height: null });
    } else {
      context.resize({ width: null, height: MAX_IMAGE_EDGE });
    }
  }
  const rendered = await context.renderAsync();
  const normalized = await rendered.saveAsync({
    compress: 0.86,
    format: SaveFormat.JPEG,
  });

  const file = new File(normalized.uri);
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Choose an image smaller than 10 MB.");
  }
  const bytes = await file.bytes();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const checksumSha256 = arrayBufferToHex(digest);
  const pending = await mediaApi.createMediaUpload({
    purpose,
    contentType: "image/jpeg",
    originalFilename: selected.fileName ?? `${purpose}.jpg`,
    byteSize: file.size,
    checksumSha256,
  });
  if (!pending.uploadUrl) {
    throw new Error("The image upload could not be started.");
  }

  const uploadResponse = await expoFetch(pending.uploadUrl, {
    method: "PUT",
    headers: pending.uploadHeaders,
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error("The image could not be uploaded. Please try again.");
  }

  const completed = await mediaApi.completeMediaUpload(pending.id, {
    width: normalized.width,
    height: normalized.height,
  });
  if (!completed.publicUrl) {
    throw new Error("The image upload could not be verified.");
  }

  return {
    assetId: completed.id,
    publicUrl: completed.publicUrl,
    localUri: normalized.uri,
    width: normalized.width,
    height: normalized.height,
  };
}

function arrayBufferToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
