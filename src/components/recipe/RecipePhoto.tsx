// src/components/recipe/RecipePhoto.tsx
// Recipe "photo" surface used by every card that shows a recipe image.
// When there's no real photo, the mockup falls back to a diagonal two-tone
// stripe texture (never a giant emoji) with an optional dark gradient scrim
// for text legibility — ported verbatim from the mockup's `stripe` /
// `photoScrim` / `photoScrimCompact` constants.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { AppText } from "../ui/AppText";
import { theme } from "../../theme/theme";

const STRIPE_COLOR_A = "#ECF3DF";
const STRIPE_COLOR_B = "#DFEACE";

const SCRIM_FULL_COLORS = [
  "rgba(23,41,30,0)",
  "rgba(23,41,30,0)",
  "rgba(23,41,30,0.55)",
  "rgba(23,41,30,0.94)",
] as const;
const SCRIM_FULL_LOCATIONS = [0, 0.52, 0.72, 1] as const;

const SCRIM_COMPACT_COLORS = [
  "rgba(23,41,30,0)",
  "rgba(23,41,30,0)",
  "rgba(23,41,30,0.5)",
  "rgba(23,41,30,0.9)",
  "rgba(23,41,30,0.95)",
] as const;
const SCRIM_COMPACT_LOCATIONS = [0, 0.4, 0.58, 0.75, 1] as const;

type Props = {
  imageUrl?: string | null;
  scrim?: "full" | "compact" | "none";
  style?: ViewStyle;
  children?: ReactNode;
  fallbackLabel?: string;
  fallbackLabelVariant?: "default" | "compact";
};

const STRIPE_COUNT = 48;

export function RecipePhoto({
  imageUrl,
  scrim = "none",
  style,
  children,
  fallbackLabel,
  fallbackLabelVariant = "default",
}: Props) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;

  return (
    <View style={[styles.container, style]}>
      <RecipeStripe />

      {showImage ? (
        <Image
          source={{ uri: imageUrl ?? undefined }}
          style={[StyleSheet.absoluteFill, styles.imageLayer]}
          contentFit="cover"
          transition={150}
          onError={() => setFailedImageUrl(imageUrl ?? null)}
        />
      ) : null}

      {scrim !== "none" ? (
        <LinearGradient
          colors={scrim === "compact" ? SCRIM_COMPACT_COLORS : SCRIM_FULL_COLORS}
          locations={scrim === "compact" ? SCRIM_COMPACT_LOCATIONS : SCRIM_FULL_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.scrimLayer]}
          pointerEvents="none"
        />
      ) : null}

      {!showImage && fallbackLabel ? (
        <View
          style={[
            styles.fallbackLabel,
            fallbackLabelVariant === "compact" &&
              styles.fallbackLabelCompact,
          ]}
        >
          <AppText
            style={[
              styles.fallbackLabelText,
              fallbackLabelVariant === "compact" &&
                styles.fallbackLabelTextCompact,
            ]}
          >
            {fallbackLabel}
          </AppText>
        </View>
      ) : null}

      {children ? (
        <View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, styles.contentLayer]}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

function RecipeStripe() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.fallbackLayer]}>
      <View style={styles.stripeCanvas}>
        {Array.from({ length: STRIPE_COUNT }, (_, index) => (
          <View
            key={index}
            style={[
              styles.stripe,
              {
                backgroundColor:
                  index % 2 === 0 ? STRIPE_COLOR_A : STRIPE_COLOR_B,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.stripeTone} />
    </View>
  );
}

// Small pill badge floating on a photo — tags, time/cost/difficulty chips.
// Matches the mockup's heroChip() helper exactly (7px radius, not fully
// rounded like the app's other Chip component).
export function PhotoChip({
  label,
  color = theme.colors.text,
  background = "rgba(251,251,247,0.88)",
}: {
  label: string;
  color?: string;
  background?: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <AppText style={[styles.chipText, { color }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#ECF3DF",
  },
  fallbackLayer: {
    zIndex: 0,
    overflow: "hidden",
  },
  stripeCanvas: {
    position: "absolute",
    width: 528,
    height: 620,
    left: -82,
    top: -190,
    flexDirection: "row",
    transform: [{ rotate: "45deg" }],
  },
  stripe: {
    width: 11,
    height: "100%",
  },
  stripeTone: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(23,41,30,0.035)",
  },
  imageLayer: {
    zIndex: 1,
  },
  scrimLayer: {
    zIndex: 2,
  },
  contentLayer: {
    zIndex: 3,
    justifyContent: "flex-end",
  },
  fallbackLabel: {
    position: "absolute",
    zIndex: 3,
    left: 20,
    bottom: 12,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(251,251,247,0.8)",
  },
  fallbackLabelText: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: theme.colors.textMutedAlt,
    textTransform: "lowercase",
  },
  fallbackLabelCompact: {
    left: 8,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fallbackLabelTextCompact: {
    fontSize: 11,
  },
  chip: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  chipText: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
  },
});
