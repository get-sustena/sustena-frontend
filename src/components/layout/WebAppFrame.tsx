import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";

export const WEB_APP_MAX_WIDTH = 480;

export function WebAppFrame({ children }: PropsWithChildren) {
  if (Platform.OS !== "web") {
    return children;
  }

  return (
    <View style={styles.viewport}>
      <View style={styles.app}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#E7EBE1",
  },
  app: {
    flex: 1,
    width: "100%",
    maxWidth: WEB_APP_MAX_WIDTH,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    shadowColor: "#101B14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
  },
});
