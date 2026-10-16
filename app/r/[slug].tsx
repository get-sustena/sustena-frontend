import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback } from "react";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { getLocalRecipeIdBySlug } from "../../src/db/recipeRows";
import { useSharedLink } from "../../src/hooks/useSharedLink";
import { getRecipeBySlug } from "../../src/lib/api/recipes";

// A shared recipe link, https://app.getsustena.com/r/{slug}.
export default function SharedRecipeLink() {
  const db = useSQLiteContext();
  const { slug } = useLocalSearchParams<{ slug: string }>();

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

  useSharedLink(`/r/${encodeURIComponent(slug)}`, open);
  return <ProgressLoader variant="screen" />;
}
