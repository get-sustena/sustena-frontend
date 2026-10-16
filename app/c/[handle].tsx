import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { SharedCreatorScreen } from "../../src/components/shared/SharedCreatorScreen";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { useSharedLink } from "../../src/hooks/useSharedLink";
import { getPublicCreatorCard } from "../../src/lib/api/creators";
import { queryKeys } from "../../src/lib/query/queryKeys";

// A shared creator link, https://app.getsustena.com/c/{handle}.
export default function SharedCreatorLink() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const link = useMemo(() => ({ pathname: "/c/[handle]" as const, params: { handle } }), [handle]);
  const open = useCallback(() => {
    router.replace({ pathname: "/creators/[handle]", params: { handle } });
  }, [handle]);

  const { signedOut } = useSharedLink(link, open);
  const card = useQuery({
    queryKey: queryKeys.creators.publicCard(handle),
    queryFn: () => getPublicCreatorCard(handle),
    enabled: signedOut,
    retry: false,
  });

  // A profile that isn't public, or isn't there: the usual way in.
  useEffect(() => {
    if (signedOut && card.isError) router.replace("/");
  }, [card.isError, signedOut]);

  if (signedOut && card.data) {
    return (
      <SharedCreatorScreen
        link={link}
        displayName={card.data.displayName}
        handle={card.data.handle}
        avatarUrl={card.data.avatarUrl}
      />
    );
  }
  return <ProgressLoader variant="screen" />;
}
