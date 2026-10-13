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

type UploadedImage = {
  assetId: string;
  publicUrl: string;
  localUri: string;
  width: number;
  height: number;
};

const MAX_IMAGE_EDGE = 1800;
const MAX_IMAGE_BYTES = 10_000_000;
const UPLOAD_ATTEMPTS = 3;
const UPLOAD_RETRY_DELAYS_MS = [400, 1_000];

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

  await uploadFileWithRetry(
    pending.uploadUrl,
    pending.uploadHeaders,
    normalized.uri
  );

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

async function uploadFileWithRetry(
  uploadUrl: string,
  uploadHeaders: Record<string, string>,
  fileUri: string
) {
  for (let attempt = 0; attempt < UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await expoFetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: new File(fileUri),
      });
      if (response.ok) {
        return;
      }
      if (!isRetryableUploadStatus(response.status)) {
        throw new ImageUploadError(
          "The image could not be uploaded. Please try again."
        );
      }
    } catch (error) {
      if (error instanceof ImageUploadError) {
        throw error;
      }
      if (attempt === UPLOAD_ATTEMPTS - 1) {
        throw new ImageUploadError(
          "We couldn't reach image storage. Check your connection and try again."
        );
      }
    }

    if (attempt < UPLOAD_RETRY_DELAYS_MS.length) {
      await wait(UPLOAD_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new ImageUploadError(
    "We couldn't reach image storage. Check your connection and try again."
  );
}

function isRetryableUploadStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

function arrayBufferToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
