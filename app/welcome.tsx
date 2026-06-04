import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "../src/components/ui/AppText";
import { Button } from "../src/components/ui/Button";
import { Screen } from "../src/components/ui/Screen";
import { theme } from "../src/theme/theme";

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Decorations />

        <View style={styles.content}>
          <View style={styles.logoIcon}>
            <AppText style={styles.logoEmoji}>🍲</AppText>
          </View>

          <AppText style={styles.logoText}>
            Cook<AppText style={styles.logoEmphasis}>Ease</AppText>
          </AppText>

          <AppText style={styles.tagline}>
            The operating system of the kitchen
          </AppText>

          <AppText style={styles.subtitle}>
            We do the thinking.{"\n"}You do the cooking.
          </AppText>

          <View style={styles.actions}>
            <Button
              title="Get Started →"
              variant="primary"
              onPress={() =>
                router.push({
                  pathname: "/auth",
                  params: { mode: "signup" },
                })
              }
            />

            <Button
              title="I already have an account"
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: "/auth",
                  params: { mode: "signin" },
                })
              }
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoTomato]}>🍅</AppText>
      <AppText style={[styles.deco, styles.decoHerb]}>🌿</AppText>
      <AppText style={[styles.deco, styles.decoPepper]}>🌶️</AppText>
      <AppText style={[styles.deco, styles.decoOnion]}>🧅</AppText>
      <AppText style={[styles.deco, styles.decoLemon]}>🍋</AppText>
      <AppText style={[styles.deco, styles.decoPlantain]}>🍌</AppText>
      <AppText style={[styles.deco, styles.decoBroccoli]}>🥦</AppText>
      <AppText style={[styles.deco, styles.decoGrain]}>🌾</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  logoIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoText: {
    fontFamily: theme.fontFamily.display,
    fontSize: 46,
    color: theme.colors.navy,
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  logoEmphasis: {
    fontFamily: theme.fontFamily.display,
    fontSize: 46,
    color: theme.colors.orange,
    fontStyle: "italic",
  },
  tagline: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 48,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textMedium,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 48,
  },
  actions: {
    width: "100%",
    gap: theme.spacing.md,
  },
  deco: {
    position: "absolute",
    opacity: 0.14,
  },
  decoTomato: {
    top: "6%",
    left: "4%",
    fontSize: 44,
    transform: [{ rotate: "-15deg" }],
  },
  decoHerb: {
    top: "12%",
    right: "5%",
    fontSize: 36,
    transform: [{ rotate: "20deg" }],
  },
  decoPepper: {
    top: "28%",
    left: -8,
    fontSize: 52,
    transform: [{ rotate: "-25deg" }],
  },
  decoOnion: {
    top: "55%",
    left: "6%",
    fontSize: 38,
    transform: [{ rotate: "12deg" }],
  },
  decoLemon: {
    top: "62%",
    right: "4%",
    fontSize: 40,
    transform: [{ rotate: "-18deg" }],
  },
  decoPlantain: {
    bottom: "18%",
    left: "3%",
    fontSize: 46,
    transform: [{ rotate: "-22deg" }],
  },
  decoBroccoli: {
    bottom: "12%",
    right: "6%",
    fontSize: 42,
    transform: [{ rotate: "16deg" }],
  },
  decoGrain: {
    top: "50%",
    left: "44%",
    fontSize: 30,
    opacity: 0.1,
    transform: [{ rotate: "8deg" }],
  },
});
