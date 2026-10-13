import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export type BannerMessage = {
  id: number;
  title: string;
  body: string;
  openStep: number;
};

type Props = {
  message: BannerMessage | null;
  top: number;
  onPress: (message: BannerMessage) => void;
  onHide: () => void;
};

const SHOWN_FOR_MS = 6000;

// v6.8 .lm-banner: when a timer ends with Learn mode on screen, a banner like
// a phone notification drops in for six seconds. Tapping it opens the step.
export function LearnBanner({ message, top, onPress, onHide }: Props) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(0);
  const visible = useSharedValue(0);

  useEffect(() => {
    if (!message) {
      shown.value = 0;
      visible.value = 0;
      return;
    }
    const duration = reduceMotion ? 0 : 350;
    shown.value = withTiming(1, { duration, easing: Easing.bezier(0.2, 0, 0, 1) });
    visible.value = withTiming(1, { duration: reduceMotion ? 0 : 200 });

    const slideOut = setTimeout(() => {
      shown.value = withTiming(0, { duration, easing: Easing.bezier(0.2, 0, 0, 1) });
      visible.value = withTiming(0, { duration: reduceMotion ? 0 : 200 });
    }, SHOWN_FOR_MS);
    const hide = setTimeout(onHide, SHOWN_FOR_MS + duration);
    return () => {
      clearTimeout(slideOut);
      clearTimeout(hide);
    };
  }, [message, onHide, reduceMotion, shown, visible]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateY: (1 - shown.value) * -120 }],
  }));

  return (
    <Animated.View
      style={[styles.banner, { top }, bannerStyle]}
      pointerEvents={message ? "auto" : "none"}
      accessibilityLiveRegion="assertive"
    >
      {message ? (
        <Pressable
          onPress={() => onPress(message)}
          style={styles.press}
          accessibilityRole="button"
          accessibilityLabel={`${message.title}. ${message.body}`}
        >
          <View style={styles.icon}>
            <Icon name="timer" size={18} color={theme.colors.white} />
          </View>
          <View style={styles.text}>
            <AppText style={styles.title}>{message.title}</AppText>
            <AppText style={styles.body}>{message.body}</AppText>
          </View>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 20,
    borderRadius: 18,
    backgroundColor: theme.colors.navy,
    boxShadow: "0px 10px 30px rgba(0,0,0,0.18)",
  },
  press: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.navy3,
  },
  text: {
    flex: 1,
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  title: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 18.2,
    color: theme.colors.white,
  },
  body: {
    fontSize: 13,
    lineHeight: 17.5,
    color: theme.colors.white,
  },
});
