import {
  CreatorHandleAvailability,
  CreatorProfile,
  CreatorProfileWriteRequest,
  CreatorRecipeListParams,
  CreatorReportRequest,
  PaginatedResponse,
  RecipeListItem,
  UUIDString,
} from "../../types/api";
import { apiRequest } from "./client";
import { isApiClientError } from "./errors";

export async function getMyCreatorProfile() {
  try {
    return await apiRequest<CreatorProfile>({
      url: "/me/creator-profile",
      method: "GET",
    });
  } catch (error) {
    if (isApiClientError(error) && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export function upsertMyCreatorProfile(payload: CreatorProfileWriteRequest) {
  return apiRequest<CreatorProfile>({
    url: "/me/creator-profile",
    method: "PUT",
    data: payload,
  });
}

export function getHandleAvailability(handle: string) {
  return apiRequest<CreatorHandleAvailability>({
    url: "/creators/handle-availability",
    method: "GET",
    params: { handle },
  });
}

export function getCreatorByHandle(handle: string) {
  return apiRequest<CreatorProfile>({
    url: `/creators/${encodeURIComponent(handle)}`,
    method: "GET",
  });
}

export function getCreatorRecipes(
  handle: string,
  params?: CreatorRecipeListParams
) {
  return apiRequest<PaginatedResponse<RecipeListItem>>({
    url: `/creators/${encodeURIComponent(handle)}/recipes`,
    method: "GET",
    params,
  });
}

export function getSavedCreators() {
  return apiRequest<CreatorProfile[]>({
    url: "/me/saved-creators",
    method: "GET",
  });
}

export function saveCreator(creatorId: UUIDString) {
  return apiRequest<{ success: boolean }>({
    url: `/creators/${creatorId}/save`,
    method: "POST",
  });
}

export function unsaveCreator(creatorId: UUIDString) {
  return apiRequest<{ success: boolean }>({
    url: `/creators/${creatorId}/save`,
    method: "DELETE",
  });
}

export function reportCreator(
  creatorId: UUIDString,
  payload: CreatorReportRequest
) {
  return apiRequest<{ id: UUIDString; success: true }>({
    url: `/creators/${creatorId}/reports`,
    method: "POST",
    data: payload,
  });
}
