import * as Crypto from "expo-crypto";
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

type NormalizedWebImage = {
  blob: Blob;
  localUri: string;
  width: number;
  height: number;
};

export async function pickAndUploadImage(
  purpose: MediaPurpose,
  aspect: [number, number],
  source: "library" | "camera" = "library"
): Promise<UploadedImage | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  };
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const selected = result.assets[0];
  const normalized = await normalizeWebImage(selected, aspect);
  const imageBlob = normalized.blob;

  if (imageBlob.size > MAX_IMAGE_BYTES) {
    throw new Error("Choose an image smaller than 10 MB.");
  }

  const bytes = await imageBlob.arrayBuffer();
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes
  );
  const checksumSha256 = arrayBufferToHex(digest);
  const pending = await mediaApi.createMediaUpload({
    purpose,
    contentType: "image/jpeg",
    originalFilename: selected.fileName ?? `${purpose}.jpg`,
    byteSize: imageBlob.size,
    checksumSha256,
  });

  if (!pending.uploadUrl) {
    throw new Error("The image upload could not be started.");
  }

  await uploadBlobWithRetry(
    pending.uploadUrl,
    pending.uploadHeaders,
    imageBlob
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
    localUri: normalized.localUri,
    width: normalized.width,
    height: normalized.height,
  };
}

async function normalizeWebImage(
  selected: ImagePicker.ImagePickerAsset,
  aspect: [number, number]
): Promise<NormalizedWebImage> {
  const sourceBlob = selected.file ?? await fetchImageBlob(selected.uri);
  if (sourceBlob.type && !sourceBlob.type.startsWith("image/")) {
    throw new ImageUploadError("Choose a valid image file.");
  }

  const sourceUrl = URL.createObjectURL(sourceBlob);
  try {
    const image = await loadBrowserImage(sourceUrl);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!isValidDimension(sourceWidth) || !isValidDimension(sourceHeight)) {
      throw new ImageUploadError(
        "This image could not be read. Choose a JPEG, PNG, or WebP image."
      );
    }

    const crop = getCenteredCrop(sourceWidth, sourceHeight, aspect);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(crop.width, crop.height));
    const outputWidth = Math.max(1, Math.round(crop.width * scale));
    const outputHeight = Math.max(1, Math.round(crop.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImageUploadError("This browser could not prepare the image.");
    }

    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const blob = await canvasToJpegBlob(canvas);
    return {
      blob,
      localUri: URL.createObjectURL(blob),
      width: outputWidth,
      height: outputHeight,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function fetchImageBlob(uri: string) {
  try {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Image fetch failed");
    return await response.blob();
  } catch {
    throw new ImageUploadError("This image could not be opened.");
  }
}

function loadBrowserImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      reject(
        new ImageUploadError(
          "This image format is not supported. Choose a JPEG, PNG, or WebP image."
        )
      );
    };
    image.src = sourceUrl;
  });
}

function getCenteredCrop(
  width: number,
  height: number,
  aspect: [number, number]
) {
  const aspectWidth = isValidDimension(aspect[0]) ? aspect[0] : width;
  const aspectHeight = isValidDimension(aspect[1]) ? aspect[1] : height;
  const targetRatio = aspectWidth / aspectHeight;
  const sourceRatio = width / height;

  if (sourceRatio > targetRatio) {
    const cropWidth = height * targetRatio;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }

  const cropHeight = width / targetRatio;
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new ImageUploadError("This browser could not prepare the image."));
      },
      "image/jpeg",
      0.86
    );
  });
}

function isValidDimension(value: number) {
  return Number.isFinite(value) && value > 0;
}

async function uploadBlobWithRetry(
  uploadUrl: string,
  uploadHeaders: Record<string, string>,
  imageBlob: Blob
) {
  for (let attempt = 0; attempt < UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: imageBlob,
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

    await wait(UPLOAD_RETRY_DELAYS_MS[attempt] ?? 1_000);
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
