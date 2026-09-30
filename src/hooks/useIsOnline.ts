
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { isConnectedState } from "../lib/query/networkStatus";

export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOnline(isConnectedState(state));
    });
  }, []);

  return isOnline;
}
