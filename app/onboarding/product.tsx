// app/onboarding/product.tsx
//
// 5-slide value-prop carousel shown before auth, matching the mockup's "ob"
// screen exactly: layered dark-to-white gradient background, a floating
// glass mock-UI card illustrating the feature, pill-shaped progress dots,
// and a Skip/Back/Next nav row that swaps to Create Account/Sign In on the
// final slide.

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { theme } from "../../src/theme/theme";

const SLIDE_COUNT = 5;

const GRADIENT_LOCATIONS: [number, number, number, number, number, number, number] = [
  0, 0.14, 0.26, 0.34, 0.4, 0.48, 1,
];
const LAST_GRADIENT_LOCATIONS: [number, number, number, number, number, number, number] = [
  0, 0.09, 0.17, 0.22, 0.26, 0.31, 1,
];

const SLIDE_GRADIENTS: string[][] = [
  ["#17291E", "#1C3223", "#2A4A35", "#6B8F78", "#B9D0BD", "#FFFFFF", "#FFFFFF"],
  ["#1A2A19", "#203420", "#304D33", "#7A9478", "#C3D4BB", "#FFFFFF", "#FFFFFF"],
  ["#202B17", "#28371F", "#3B542F", "#8A9C72", "#CDDAB8", "#FFFFFF", "#FFFFFF"],
  ["#1A2A19", "#203420", "#304D33", "#7A9478", "#C3D4BB", "#FFFFFF", "#FFFFFF"],
  ["#17291E", "#1C3223", "#2A4A35", "#6B8F78", "#B9D0BD", "#FFFFFF", "#FFFFFF"],
];

export default function ProductOnboardingScreen() {
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDE_COUNT - 1;

  function next() {
    if (slide < SLIDE_COUNT - 1) {
      setSlide((current) => current + 1);
    }
  }

  function back() {
    if (slide > 0) {
      setSlide((current) => current - 1);
    }
  }

  function skip() {
    router.push("/auth-signup");
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" backgroundColor={theme.colors.navy} />

      <LinearGradient
        colors={SLIDE_GRADIENTS[slide] as unknown as [string, string, ...string[]]}
        locations={isLast ? LAST_GRADIENT_LOCATIONS : GRADIENT_LOCATIONS}
        style={StyleSheet.absoluteFillObject}
      />

      <View
        style={[
          styles.topZone,
          slide === 1 && styles.topZoneCentered,
          isLast && styles.topZoneShort,
        ]}
      >
        <Animated.View
          key={`onboarding-card-${slide}`}
          entering={FadeInDown.duration(600)}
        >
          <SlideCard slide={slide} />
        </Animated.View>
      </View>

      <View style={styles.bottomZone}>
        <SlideCopy slide={slide} />
      </View>

      <Pressable onPress={skip} style={styles.skipButton} hitSlop={8}>
        <AppText style={styles.skipText}>Skip</AppText>
      </Pressable>

      <View style={styles.controlStack}>
        <View style={styles.markerRow}>
          {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
            <View
              key={index}
              style={[styles.marker, index === slide && styles.markerActive]}
            />
          ))}
        </View>

        {isLast ? (
          <View style={styles.authRow}>
            <Pressable
              onPress={() => router.push("/auth-signup")}
              style={({ pressed }) => [
                styles.createAccountButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.createAccountText}>
                Create Account
              </AppText>
            </Pressable>

            <Pressable onPress={() => router.push("/auth")}>
              <AppText style={styles.signInLinkText}>
                Already have an account?{" "}
                <AppText style={styles.signInLinkEmphasis}>Sign in</AppText>
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.navRow}>
            <Pressable
              onPress={back}
              hitSlop={8}
              style={slide === 0 && styles.hidden}
            >
              <AppText style={styles.backLabel}>Back</AppText>
            </Pressable>

            <Pressable
              onPress={next}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.nextText}>Next</AppText>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function SlideCopy({ slide }: { slide: number }) {
  if (slide === 3) {
    return (
      <>
        <AppText style={styles.headlineDisplay}>
          Never write a shopping list again.
        </AppText>
        <AppText style={styles.subtext}>
          Add a recipe, get the list, tick off what you&apos;ve got.
        </AppText>
      </>
    );
  }

  const headlines = [
    "Tell us what you can spend. We'll turn it into a full day of meals.",
    "Change the servings and every ingredient unit adjusts. We'll do the maths.",
    "Find recipes matching the ingredients you have in your kitchen.",
    "",
    "Order your groceries straight from your shopping list.",
  ];

  return <AppText style={styles.headline}>{headlines[slide]}</AppText>;
}

function GlassCard({
  width,
  children,
  style,
}: {
  width: number;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.glassCard, { width }, style]}>{children}</View>;
}

function MockThumb({ size = 34 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[
        "rgba(255,255,255,0.10)",
        "rgba(255,255,255,0.10)",
        "rgba(255,255,255,0.16)",
        "rgba(255,255,255,0.16)",
        "rgba(255,255,255,0.10)",
        "rgba(255,255,255,0.10)",
        "rgba(255,255,255,0.16)",
      ]}
      locations={[0, 0.18, 0.19, 0.38, 0.39, 0.58, 0.59]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.mockThumb, { width: size, height: size }]}
    />
  );
}

function SlideCard({ slide }: { slide: number }) {
  if (slide === 0) {
    return (
      <GlassCard width={250}>
        <View style={styles.dayTabRow}>
          <View style={styles.dayTabActive}>
            <AppText style={styles.dayTabActiveText}>Day 1</AppText>
          </View>
          <View style={styles.dayTabInactive}>
            <AppText style={styles.dayTabInactiveText}>Day 2</AppText>
          </View>
          <View style={styles.dayTabInactive}>
            <AppText style={styles.dayTabInactiveText}>Day 3</AppText>
          </View>
        </View>

        <View style={styles.glassRow}>
          <MockThumb />
          <View style={styles.glassRowInfo}>
            <AppText style={styles.glassEyebrow}>Lunch</AppText>
            <AppText style={styles.glassRowTitle}>
              Jollof Rice & Chicken
            </AppText>
          </View>
        </View>
        <View style={[styles.glassRow, styles.glassRowLast]}>
          <MockThumb />
          <View style={styles.glassRowInfo}>
            <AppText style={styles.glassEyebrow}>Dinner</AppText>
            <AppText style={styles.glassRowTitle}>Grilled Tilapia</AppText>
          </View>
        </View>

        <View style={styles.glassFooterRow}>
          <AppText style={styles.glassFooterLabel}>TOTAL BUDGET</AppText>
          <AppText style={styles.glassFooterValue}>₦15,000</AppText>
        </View>
      </GlassCard>
    );
  }

  if (slide === 1) {
    return (
      <GlassCard width={230} style={styles.servingsCard}>
        <AppText style={styles.glassCardTitle}>
          Jollof Rice & Chicken
        </AppText>

        <View style={styles.stepperRow}>
          <View style={styles.stepperButton}>
            <Icon name="minus" size={12} color={theme.colors.onDark} />
          </View>
          <AppText style={styles.stepperValue}>8 Servings</AppText>
          <View style={[styles.stepperButton, styles.stepperButtonActive]}>
            <Icon name="plus" size={12} color={theme.colors.text} />
          </View>
        </View>

        <View style={styles.glassKvRow}>
          <AppText style={styles.glassKvLabel}>Rice</AppText>
          <AppText style={styles.glassKvValue}>8 cups</AppText>
        </View>
        <View style={styles.glassKvRow}>
          <AppText style={styles.glassKvLabel}>Chicken</AppText>
          <AppText style={styles.glassKvValue}>2 kg</AppText>
        </View>
      </GlassCard>
    );
  }

  if (slide === 2) {
    return (
      <GlassCard width={240}>
        <View style={styles.ingredientChipRow}>
          <View style={styles.ingredientChipSelected}>
            <AppText style={styles.ingredientChipSelectedText}>Rice</AppText>
          </View>
          <View style={styles.ingredientChipSelected}>
            <AppText style={styles.ingredientChipSelectedText}>
              Chicken
            </AppText>
          </View>
          <View style={styles.ingredientChip}>
            <AppText style={styles.ingredientChipText}>Tomatoes</AppText>
          </View>
        </View>

        <View style={styles.matchResultRow}>
          <MockThumb size={32} />
          <View style={styles.glassRowInfo}>
            <AppText style={styles.glassEyebrow}>92% Match</AppText>
            <AppText style={styles.glassRowTitle}>
              Jollof Rice & Chicken
            </AppText>
          </View>
        </View>
      </GlassCard>
    );
  }

  if (slide === 3) {
    return (
      <GlassCard width={224} style={styles.checklistCard}>
        <ChecklistRow label="Long Grain Rice" qty="2 cups" checked />
        <ChecklistRow label="Chicken Pieces" qty="500g" />
        <ChecklistRow label="Fresh Tomatoes" qty="400g" checked />
        <ChecklistRow label="Bell Peppers" qty="200g" />
      </GlassCard>
    );
  }

  return (
    <View style={[styles.glassCard, styles.checkoutCard, { width: 220 }]}>
      <View>
        <AppText style={styles.glassEyebrow}>2 items missing</AppText>
        <AppText style={styles.glassRowTitle}>₦1,200 total</AppText>
      </View>

      <View style={styles.checkoutPill}>
        <AppText style={styles.checkoutPillText}>Checkout</AppText>
      </View>
    </View>
  );
}

function ChecklistRow({
  label,
  qty,
  checked,
}: {
  label: string;
  qty: string;
  checked?: boolean;
}) {
  return (
    <View style={styles.checklistRow}>
      <View style={[styles.checklistBox, checked && styles.checklistBoxChecked]}>
        {checked ? (
          <Icon name="check" size={10} color="#17291E" strokeWidth={3} />
        ) : null}
      </View>

      <AppText
        style={[
          styles.checklistLabel,
          checked && styles.checklistLabelChecked,
        ]}
      >
        {label}
      </AppText>

      <AppText
        style={[
          styles.checklistQty,
          checked && styles.checklistQtyChecked,
        ]}
      >
        {qty}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.navy,
  },
  topZone: {
    height: "42%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 44,
  },
  topZoneShort: {
    height: "27%",
    paddingTop: 20,
  },
  topZoneCentered: {
    paddingTop: 0,
  },
  bottomZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 40,
    paddingTop: 26,
    paddingBottom: 150,
  },
  skipButton: {
    position: "absolute",
    top: 52,
    right: 24,
  },
  skipText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: "rgba(251,251,247,0.65)",
  },
  headline: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 22,
    lineHeight: 30,
    color: theme.colors.navy,
    textAlign: "center",
    maxWidth: 270,
  },
  headlineDisplay: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 29,
    letterSpacing: -0.2,
    color: theme.colors.navy,
    textAlign: "center",
    maxWidth: 270,
    marginBottom: 10,
  },
  subtext: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
    lineHeight: 23,
    color: theme.colors.textMedium,
    textAlign: "center",
    maxWidth: 270,
  },
  controlStack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 34,
    paddingBottom: 40,
    gap: 24,
  },
  markerRow: {
    flexDirection: "row",
    gap: 7,
  },
  marker: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(23,41,30,0.18)",
  },
  markerActive: {
    width: 28,
    backgroundColor: theme.colors.accent,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hidden: {
    opacity: 0,
  },
  backLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12.5,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(23,41,30,0.55)",
  },
  nextButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  pressed: {
    opacity: 0.9,
  },
  nextText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  authRow: {
    alignItems: "center",
    gap: 14,
  },
  createAccountButton: {
    width: "100%",
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  createAccountText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15.5,
    color: theme.colors.text,
  },
  signInLinkText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: "rgba(23,41,30,0.55)",
  },
  signInLinkEmphasis: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.navy,
  },
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 16,
  },
  servingsCard: {
    padding: 16,
  },
  checklistCard: {
    borderRadius: 14,
  },
  mockThumb: {
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dayTabRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  dayTabActive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  dayTabActiveText: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.text,
  },
  dayTabInactive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dayTabInactiveText: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "rgba(251,251,247,0.5)",
  },
  glassRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  glassRowLast: {
    borderBottomWidth: 0,
  },
  glassRowInfo: {
    flex: 1,
  },
  glassEyebrow: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.accent,
    marginBottom: 2,
  },
  glassRowTitle: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.onDark,
  },
  glassFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  glassFooterLabel: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "rgba(251,251,247,0.5)",
  },
  glassFooterValue: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.accent,
  },
  glassCardTitle: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.onDark,
    marginBottom: 12,
    textAlign: "center",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginBottom: 12,
  },
  stepperButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  stepperValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    color: theme.colors.onDark,
  },
  glassKvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  glassKvLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: "rgba(251,251,247,0.75)",
  },
  glassKvValue: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: theme.colors.accent,
  },
  ingredientChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  ingredientChipSelected: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  ingredientChipSelectedText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.text,
  },
  ingredientChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  ingredientChipText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    color: "rgba(251,251,247,0.5)",
  },
  matchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
  },
  checklistBox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.3,
    borderColor: "rgba(251,251,247,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  checklistBoxChecked: {
    borderWidth: 0,
    backgroundColor: theme.colors.accent,
  },
  checklistLabel: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: "rgba(251,251,247,0.85)",
  },
  checklistLabelChecked: {
    color: "rgba(251,251,247,0.55)",
    textDecorationLine: "line-through",
  },
  checklistQty: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12.5,
    color: "rgba(251,251,247,0.4)",
  },
  checklistQtyChecked: {
    color: "rgba(251,251,247,0.4)",
  },
  checkoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  checkoutPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  checkoutPillText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.text,
  },
});
