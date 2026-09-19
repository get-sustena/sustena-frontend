// src/components/auth/AuthHeader.tsx

import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { Logo } from "../ui/Logo";

export function AuthHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: Math.max(52, insets.top) }]}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
          <Icon name="chevronLeft" size={19} color={theme.colors.navy} />
        </Pressable>

        <View style={styles.logoRow}>
          <Logo
            width={31}
            height={18}
            color={theme.colors.navy}
            tight
          />
          <AppText style={styles.logoText}>Sustena</AppText>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  logoText: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 19,
    lineHeight: 18,
    letterSpacing: -0.285,
    color: theme.colors.navy,
  },
});
