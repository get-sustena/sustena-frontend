import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo } from "react";
import { SharedRecipeScreen } from "../../src/components/shared/SharedRecipeScreen";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { getLocalRecipeIdBySlug } from "../../src/db/recipeRows";
import { useSharedLink } from "../../src/hooks/useSharedLink";
import { getPublicRecipeCard, getRecipeBySlug } from "../../src/lib/api/recipes";
import { queryKeys } from "../../src/lib/query/queryKeys";

// A shared recipe link, https://app.getsustena.com/r/{slug}.
export default function SharedRecipeLink() {
  const db = useSQLiteContext();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const link = useMemo(() => ({ pathname: "/r/[slug]" as const, params: { slug } }), [slug]);

  const open = useCallback(() => {
    void (async () => {
      // The phone's saved catalogue first, so the link opens offline too.
      const id =
        (await getLocalRecipeIdBySlug(db, slug).catch(() => null)) ??
        (await getRecipeBySlug(slug).then((recipe) => recipe.id, () => null));
      if (id) router.replace({ pathname: "/recipes/[id]", params: { id, source: "shared_link" } });
      else router.replace("/(tabs)/home");
    })();
  }, [db, slug]);

  const { signedOut } = useSharedLink(link, open);
  const card = useQuery({
    queryKey: queryKeys.recipes.publicCard(slug),
    queryFn: () => getPublicRecipeCard(slug),
    enabled: signedOut,
    retry: false,
  });

  // A recipe that isn't public, or isn't there: the usual way in.
  useEffect(() => {
    if (signedOut && card.isError) router.replace("/");
  }, [card.isError, signedOut]);

  if (signedOut && card.data) {
    return <SharedRecipeScreen link={link} name={card.data.name} imageUrl={card.data.imageUrl} />;
  }
  return <ProgressLoader variant="screen" />;
}
