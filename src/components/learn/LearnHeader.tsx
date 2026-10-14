import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { SavedPhoto } from "../ui/SavedPhoto";
import { learnColors } from "./learnColors";

type Props = {
  top: number;
  recipeName: string;
  subtitle: string;
  stepCount: number;
  current: number;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
};

// Behind the cards (v6.8 .lm-photo): the recipe photo, darker at the top so
// the title reads, fading into the page. A recipe without one shows a plain
// green top.
export function LearnPhoto({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <View style={styles.photo} accessible={false}>
      {imageUrl ? (
        <SavedPhoto url={imageUrl} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : null}
      <LinearGradient
        colors={["rgba(10,20,14,0.6)", "rgba(10,20,14,0.12)", "rgba(10,20,14,0)", learnColors.background]}
        locations={[0, 0.3, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// On the photo (v6.8 .lm-top and .lm-progress): Close, the recipe name,
// "Step 2 of 4", Save, and a bar per step.
export function LearnHeader({
  top,
  recipeName,
  subtitle,
  stepCount,
  current,
  isSaved,
  onClose,
  onToggleSave,
}: Props) {
  return (
    <>
      <View style={[styles.bar, { top }]}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close learn mode"
        >
          <BlurView intensity={50} tint="default" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.roundTint]} />
          {/* A View, so the icon stacks above the two layers on the web too. */}
          <View>
            <Icon name="close" size={22} color={theme.colors.white} />
          </View>
        </Pressable>

        <View style={styles.head}>
          <AppText style={styles.title} numberOfLines={1} accessibilityRole="header">
            {recipeName}
          </AppText>
          <AppText style={styles.subtitle}>{subtitle}</AppText>
        </View>

        <Pressable
          onPress={onToggleSave}
          style={({ pressed }) => [styles.round, styles.save, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? "Saved" : "Save recipe"}
          accessibilityState={{ selected: isSaved }}
        >
          <Icon
            name="bookmark"
            size={20}
            strokeWidth={2}
            color={isSaved ? theme.colors.navy3 : theme.colors.navy}
            filled={isSaved}
          />
        </Pressable>
      </View>

      <View style={[styles.progress, { top: top + 56 }]} accessible={false}>
        {Array.from({ length: stepCount }, (_, index) => (
          <View key={index} style={[styles.segment, index <= current && styles.segmentOn]} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  photo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 430,
    backgroundColor: learnColors.photo,
  },
  bar: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  roundTint: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  save: {
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  head: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    lineHeight: 21.6,
    letterSpacing: -0.18,
    color: theme.colors.white,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  subtitle: {
    marginTop: 3,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 18.2,
    color: theme.colors.white,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  progress: {
    position: "absolute",
    left: 66,
    right: 66,
    zIndex: 8,
    flexDirection: "row",
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  segmentOn: {
    backgroundColor: theme.colors.linkGreen,
  },
  pressed: {
    opacity: 0.85,
  },
});
