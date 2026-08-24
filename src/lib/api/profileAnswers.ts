import { UserProfileAnswers, UserProfileAnswersUpdateRequest } from "../../types/api";
import { apiRequest } from "./client";

export function getProfileAnswers() {
  return apiRequest<UserProfileAnswers>({
    url: "/me/profile-answers",
    method: "GET",
  });
}

export function updateProfileAnswers(payload: UserProfileAnswersUpdateRequest) {
  return apiRequest<UserProfileAnswers>({
    url: "/me/profile-answers",
    method: "PUT",
    data: payload,
  });
}
