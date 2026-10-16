import { followState } from "../creators/followCommands";
import { queryClient } from "../query/queryClient";
import { queryKeys } from "../query/queryKeys";
import type { CreatorProfile, RecipeDetail } from "../../types/api";

// Once the server accepts a follow or a rating, the pages already loaded
// show it as the server's own state. A recipe page isn't asked for again:
// that would count as another open.

export function followSent(creatorId: string, following: boolean) {
  queryClient.setQueriesData<RecipeDetail>({ queryKey: ["recipes", "detail"] }, (recipe) =>
    recipe?.creator?.id === creatorId ? { ...recipe, creator: { ...recipe.creator, isFollowing: following } } : recipe
  );
  queryClient.setQueriesData<CreatorProfile>({ queryKey: ["creators", "handle"] }, (profile) => {
    if (profile?.id !== creatorId) return profile;
    const state = followState({ following: profile.isSaved, followerCount: profile.followerCount }, following);
    return { ...profile, isSaved: state.following, followerCount: state.followerCount ?? profile.followerCount };
  });
}

export function ratingSent(recipeId: string, rating: number) {
  queryClient.setQueryData<RecipeDetail>(queryKeys.recipes.detail(recipeId), (recipe) =>
    recipe ? { ...recipe, currentUserRating: rating } : recipe
  );
}
