// src/components/auth/AuthHeader.tsx

import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { Logo } from "../ui/Logo";

export function AuthHeader({ onBack }: { onBack: () => void }) {
  return (
    <>
      <StatusBar style="dark" backgroundColor="#FBFCFA" />
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
          <Icon name="chevronLeft" size={19} color={theme.colors.text} />
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
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    lineHeight: 19,
    letterSpacing: 0,
    color: theme.colors.linkGreen,
  },
});
