import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
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
import { LOGO_PATH_D } from "./Logo";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LOGO_DASH_LENGTH = 1000;

type Props = {
  variant?: "screen" | "inline";
};

export function ProgressLoader({ variant = "inline" }: Props) {
  const progress = useSharedValue(0);
  const logoDraw = useSharedValue(0);
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
      accessibilityLabel="Loading"
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
            stroke={theme.colors.navy}
            strokeWidth={isScreen ? 12 : 13}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[LOGO_DASH_LENGTH, LOGO_DASH_LENGTH]}
          />
        </Svg>
      </View>

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
