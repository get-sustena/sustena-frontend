import { Redirect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ProgressLoader } from "../src/components/ui/ProgressLoader";
import {
  getHasSeenWelcome,
  markWelcomeSeen,
} from "../src/db/appMetadataRepository";
import { useAuthStore } from "../src/store/authStore";

export default function Index() {
  const db = useSQLiteContext();
  const isHydratingAuth = useAuthStore((state) => state.isHydratingAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const agreementRequired = useAuthStore((state) => Boolean(state.user?.agreementRequired));
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    getHasSeenWelcome(db)
      .then((hasSeen) => {
        if (isMounted) {
          setHasSeenWelcome(hasSeen);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasSeenWelcome(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [db]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void markWelcomeSeen(db).catch(() => undefined);
  }, [db, isAuthenticated]);

  if (isHydratingAuth || (!isAuthenticated && hasSeenWelcome === null)) {
    return <ProgressLoader variant="screen" />;
  }

  if (!isAuthenticated) {
    return <Redirect href={hasSeenWelcome ? "/auth" : "/welcome"} />;
  }

  if (agreementRequired) {
    return <Redirect href="/legal-agree" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
