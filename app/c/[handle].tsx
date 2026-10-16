import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { useSharedLink } from "../../src/hooks/useSharedLink";

// A shared creator link, https://app.getsustena.com/c/{handle}.
export default function SharedCreatorLink() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const open = useCallback(() => {
    router.replace({ pathname: "/creators/[handle]", params: { handle } });
  }, [handle]);

  useSharedLink(`/c/${encodeURIComponent(handle)}`, open);
  return <ProgressLoader variant="screen" />;
}
