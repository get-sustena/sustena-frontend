// src/components/onboarding/OnboardingLayout.tsx

import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Screen } from "../ui/Screen";

type Props = {
  stepLabel: string;
  title: string;
  subtitle: string;
  heroEmoji: string;
  heroIcon: string;
  children: ReactNode;
  footer: ReactNode;
  activeStep: 1 | 2;
};

export function OnboardingLayout({
  stepLabel,
  title,
  subtitle,
  heroEmoji,
  heroIcon,
  children,
  footer,
  activeStep,
}: Props) {
  return (
    <Screen>
      <View style={styles.hero}>
        <AppText style={styles.heroEmoji}>{heroEmoji}</AppText>
        <View style={styles.heroIcon}>
          <AppText style={styles.heroIconText}>{heroIcon}</AppText>
        </View>
      </View>

      <View style={styles.body}>
        <AppText style={styles.step}>{stepLabel}</AppText>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.subtitle}>{subtitle}</AppText>

        <View style={styles.content}>{children}</View>

        <View style={styles.dots}>
          <View style={[styles.dot, activeStep === 1 && styles.activeDot]} />
          <View style={[styles.dot, activeStep === 2 && styles.activeDot]} />
        </View>

        {footer}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 220,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroEmoji: {
    position: "absolute",
    fontSize: 90,
    opacity: 0.15,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    fontSize: 36,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing["2xl"],
    paddingTop: theme.spacing["3xl"],
    paddingBottom: theme.spacing["2xl"],
  },
  step: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 28,
    lineHeight: 34,
    color: theme.colors.cream,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing["3xl"],
  },
  content: {
    flex: 1,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginBottom: theme.spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  activeDot: {
    width: 20,
    backgroundColor: theme.colors.primary,
  },
});
