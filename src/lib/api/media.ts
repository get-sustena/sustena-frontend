import {
  MediaAsset,
  MediaUploadCompleteRequest,
  MediaUploadCreateRequest,
  UUIDString,
} from "../../types/api";
import { apiRequest } from "./client";

export function createMediaUpload(payload: MediaUploadCreateRequest) {
  return apiRequest<MediaAsset>({
    url: "/me/media/uploads",
    method: "POST",
    data: payload,
  });
}

export function completeMediaUpload(
  assetId: UUIDString,
  payload: MediaUploadCompleteRequest
) {
  return apiRequest<MediaAsset>({
    url: `/me/media/uploads/${assetId}/complete`,
    method: "POST",
    data: payload,
  });
}

export function deleteMedia(assetId: UUIDString) {
  return apiRequest<void>({
    url: `/me/media/${assetId}`,
    method: "DELETE",
  });
}
