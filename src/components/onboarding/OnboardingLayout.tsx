// src/components/onboarding/OnboardingLayout.tsx

import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon, IconName } from "../ui/Icon";
import { Screen } from "../ui/Screen";

type Props = {
  stepLabel: string;
  title: string;
  subtitle: string;
  heroIcon: IconName;
  children: ReactNode;
  footer: ReactNode;
  activeStep: 1 | 2;
};

export function OnboardingLayout({
  stepLabel,
  title,
  subtitle,
  heroIcon,
  children,
  footer,
  activeStep,
}: Props) {
  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.heroIconWrap}>
          <Icon name={heroIcon} size={26} color={theme.colors.navy} />
        </View>

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
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: theme.spacing["2xl"],
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  step: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.3,
    color: theme.colors.navy,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: theme.colors.textMedium,
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
    backgroundColor: theme.colors.navy,
  },
});
