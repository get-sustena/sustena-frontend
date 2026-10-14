import { LinearGradient } from "expo-linear-gradient";
import { createContext, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { learnColors } from "./learnColors";

// The card starts this far down its page, below the photo's title, and
// slides up over the photo when scrolled.
const CARD_TOP = 136;
const BODY_PADDING_TOP = 22;

// The card's "Time for the next step" reports where it ends, so its page can
// scroll it into view above Back and Next step.
export const ReadyLayoutContext = createContext<(bottom: number) => void>(() => undefined);

type Props = {
  width: number;
  height: number;
  bottomInset: number;
  label: string;
  isFirst: boolean;
  nextLabel: string;
  showNextIcon: boolean;
  centered?: boolean;
  // Scroll "Time for the next step" into view once it has been laid out.
  revealReady: boolean;
  onRevealed: () => void;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
};

// One page of Learn mode's sideways track (v6.8 .lm-page): the card scrolls,
// and Back and Next step stay in view at its foot.
export function LearnPage({
  width,
  height,
  bottomInset,
  label,
  isFirst,
  nextLabel,
  showNextIcon,
  centered = false,
  revealReady,
  onRevealed,
  onBack,
  onNext,
  children,
}: Props) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [footHeight, setFootHeight] = useState(0);

  function revealBottom(bottomInBody: number) {
    if (!revealReady) return;
    onRevealed();
    const bottom = CARD_TOP + BODY_PADDING_TOP + bottomInBody;
    const visibleBottom = scrollY.current + height - footHeight - 10;
    if (bottom > visibleBottom) {
      scrollRef.current?.scrollTo({
        y: scrollY.current + bottom - visibleBottom,
        animated: !reduceMotion,
      });
    }
  }

  return (
    <View style={{ width, height }} accessibilityLabel={label}>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
        }}
        contentContainerStyle={[styles.content, { paddingBottom: footHeight }]}
      >
        <View style={[styles.card, { minHeight: height - CARD_TOP - footHeight }]}>
          <View style={[styles.body, centered && styles.bodyCentered]}>
            <ReadyLayoutContext value={revealBottom}>{children}</ReadyLayoutContext>
          </View>
        </View>
      </ScrollView>

      <View
        style={[styles.foot, { paddingBottom: 14 + bottomInset }]}
        onLayout={(event) => setFootHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.footInner}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", learnColors.card]}
            style={styles.fade}
            pointerEvents="none"
          />
          <Pressable
            onPress={onBack}
            disabled={isFirst}
            style={({ pressed }) => [
              styles.back,
              isFirst && styles.backDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isFirst }}
          >
            <Icon name="chevronLeft" size={20} strokeWidth={2} color={theme.colors.navy} />
            <AppText style={styles.backText}>Back</AppText>
          </Pressable>
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [styles.next, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <AppText style={styles.nextText}>{nextLabel}</AppText>
            {showNextIcon ? (
              <Icon name="chevronRight" size={20} strokeWidth={2} color={theme.colors.white} />
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: CARD_TOP,
    paddingHorizontal: 12,
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: learnColors.card,
  },
  body: {
    flexGrow: 1,
    paddingTop: BODY_PADDING_TOP,
    paddingHorizontal: 22,
    paddingBottom: 6,
  },
  bodyCentered: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  foot: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: learnColors.background,
  },
  footInner: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: learnColors.card,
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -18,
    height: 18,
  },
  back: {
    flexBasis: "40%",
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.lineStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  backDisabled: {
    opacity: 0.4,
  },
  backText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.navy,
  },
  next: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: theme.colors.navy3,
  },
  nextText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
