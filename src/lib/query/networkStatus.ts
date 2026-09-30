
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

export function setupNetworkStatusListener() {
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(isConnectedState(state));
    });
  });
}

export function isConnectedState(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}) {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
