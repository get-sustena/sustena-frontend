import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { LOGO_PATH_D } from "./Logo";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LOGO_DASH_LENGTH = 1000;

export const MEAL_PLAN_LOADING_MESSAGES = [
  "Creating your personalized meal plan...",
  "Understanding your preferences...",
  "Finding the best meal combinations...",
  "Balancing nutrition and budget...",
  "Selecting delicious recipes...",
  "Organizing your weekly plan...",
  "Putting the finishing touches on your plan...",
  "Almost ready...",
] as const;

type Props = {
  message?: string;
  messages?: readonly string[];
  variant?: "screen" | "inline";
};

export function ProgressLoader({
  message = "Loading...",
  messages,
  variant = "inline",
}: Props) {
  const progress = useSharedValue(0);
  const logoDraw = useSharedValue(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const activeMessages = messages?.length ? messages : [message];
  const activeMessage = activeMessages[messageIndex % activeMessages.length];
  const isScreen = variant === "screen";

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2400,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      false
    );
    logoDraw.value = 0;
    logoDraw.value = withRepeat(
      withTiming(1, {
        duration: 2800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, [logoDraw, progress]);

  useEffect(() => {
    setMessageIndex(0);

    if (!messages || messages.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 625);

    return () => clearInterval(timer);
  }, [messages]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: -100 + progress.value * 320,
      },
    ],
  }));
  const logoAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(
      logoDraw.value,
      [0, 0.45, 0.65, 1],
      [LOGO_DASH_LENGTH, 0, 0, -LOGO_DASH_LENGTH]
    ),
    opacity: interpolate(
      logoDraw.value,
      [0, 0.45, 0.65, 1],
      [0.4, 1, 1, 0.4]
    ),
  }));

  return (
    <View
      style={[styles.container, isScreen ? styles.screen : styles.inline]}
      accessibilityRole="progressbar"
      accessibilityLabel={activeMessage}
    >
      <View
        style={[
          styles.logo,
          isScreen ? styles.screenLogo : styles.inlineLogo,
        ]}
      >
        <Svg
          width={isScreen ? 76 : 48}
          height={isScreen ? 76 : 48}
          viewBox="0 0 240 240"
        >
          <AnimatedPath
            animatedProps={logoAnimatedProps}
            d={LOGO_PATH_D}
            fill="none"
            stroke={theme.colors.linkGreen}
            strokeWidth={isScreen ? 12 : 13}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[LOGO_DASH_LENGTH, LOGO_DASH_LENGTH]}
          />
        </Svg>
      </View>

      <AppText
        style={[
          styles.message,
          isScreen ? styles.screenMessage : styles.inlineMessage,
        ]}
      >
        {activeMessage}
      </AppText>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]}>
          <LinearGradient
            colors={[theme.colors.green, theme.colors.orange]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  inline: {
    minHeight: 180,
    paddingVertical: 28,
  },
  logo: {
    alignItems: "center",
    justifyContent: "center",
  },
  screenLogo: {
    marginBottom: 30,
  },
  inlineLogo: {
    marginBottom: 18,
  },
  message: {
    fontFamily: theme.fontFamily.bodySemiBold,
    color: theme.colors.navy,
    textAlign: "center",
  },
  screenMessage: {
    minHeight: 44,
    marginBottom: 26,
    fontSize: 16,
    lineHeight: 22,
  },
  inlineMessage: {
    minHeight: 20,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
  },
  track: {
    width: "100%",
    maxWidth: 220,
    height: 6,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#EDF2E3",
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
    borderRadius: 999,
    overflow: "hidden",
  },
});
