import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { WEB_APP_MAX_WIDTH } from "../src/components/layout/WebAppFrame";
import { AppText } from "../src/components/ui/AppText";
import { LOGO_PATH_D } from "../src/components/ui/Logo";
import { ProgressLoader } from "../src/components/ui/ProgressLoader";
import {
  getHasSeenWelcome,
  markWelcomeSeen,
} from "../src/db/appMetadataRepository";
import { theme } from "../src/theme/theme";

const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function WelcomeScreen() {
  const db = useSQLiteContext();
  const { width, height } = useWindowDimensions();
  const logoProgress = useSharedValue(0);
  const drawProgress = useSharedValue(0);
  const wordProgress = useSharedValue(0);
  const missionProgress = useSharedValue(0);
  const ctaProgress = useSharedValue(0);
  const [canShowWelcome, setCanShowWelcome] = useState<boolean | null>(null);
  const contentWidth =
    Platform.OS === "web" ? Math.min(width, WEB_APP_MAX_WIDTH) : width;
  const scaleX = contentWidth / REFERENCE_WIDTH;
  const scaleY = height / REFERENCE_HEIGHT;

  async function handleGetStarted() {
    await markWelcomeSeen(db).catch(() => undefined);
    router.push("/onboarding/product");
  }

  useEffect(() => {
    let isMounted = true;

    getHasSeenWelcome(db)
      .then((hasSeen) => {
        if (!isMounted) {
          return;
        }

        if (hasSeen) {
          router.replace("/auth");
          return;
        }

        setCanShowWelcome(true);
      })
      .catch(() => {
        if (isMounted) {
          setCanShowWelcome(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [db]);

  useEffect(() => {
    if (!canShowWelcome) {
      return;
    }

    const designEase = Easing.bezier(0.2, 0, 0, 1);

    drawProgress.value = withTiming(1, {
      duration: 1300,
      easing: Easing.linear,
    });
    logoProgress.value = withDelay(
      1292,
      withTiming(1, { duration: 608, easing: designEase })
    );
    wordProgress.value = withDelay(
      1900,
      withTiming(1, { duration: 700, easing: designEase })
    );
    missionProgress.value = withDelay(
      2600,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    ctaProgress.value = withDelay(
      3200,
      withTiming(1, { duration: 400, easing: designEase })
    );
  }, [
    ctaProgress,
    canShowWelcome,
    drawProgress,
    logoProgress,
    missionProgress,
    wordProgress,
  ]);

  const logoStyle = useAnimatedStyle(() => ({
    left:
      interpolate(logoProgress.value, [0, 1], [65.49, 85.64]) * scaleX,
    top: interpolate(logoProgress.value, [0, 1], [285, 343]) * scaleY,
    width:
      interpolate(logoProgress.value, [0, 1], [259.02, 58.71]) * scaleX,
    height: interpolate(logoProgress.value, [0, 1], [150, 34]) * scaleY,
  }));

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: 5000 * (1 - drawProgress.value),
  }));

  const wordRevealStyle = useAnimatedStyle(() => ({
    width: 150 * scaleX * wordProgress.value,
  }));

  const missionStyle = useAnimatedStyle(() => ({
    opacity: missionProgress.value,
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaProgress.value,
    transform: [{ translateY: (1 - ctaProgress.value) * 14 }],
  }));

  if (!canShowWelcome) {
    return <ProgressLoader variant="screen" />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <Animated.View pointerEvents="none" style={[styles.logo, logoStyle]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="30.497 68.843 153.503 88.893"
        >
          <AnimatedPath
            animatedProps={pathProps}
            d={LOGO_PATH_D}
            fill="none"
            stroke={theme.colors.navy}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5000 5000"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.wordReveal,
          {
            left: 154.35 * scaleX,
            top: 343 * scaleY,
            height: 34 * scaleY,
          },
          wordRevealStyle,
        ]}
      >
        <AppText
          numberOfLines={1}
          style={[styles.wordmark, { width: 150 * scaleX }]}
        >
          Sustena
        </AppText>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.missionWrap,
          {
            left: 34 * scaleX,
            right: 34 * scaleX,
            top: 404 * scaleY,
          },
          missionStyle,
        ]}
      >
        <AppText style={styles.mission}>
          The easiest answer to &apos;what&apos;s for dinner?&apos;
        </AppText>
      </Animated.View>

      <Animated.View
        style={[
          styles.ctaWrap,
          {
            left: 34 * scaleX,
            right: 34 * scaleX,
            bottom: 56 * scaleY,
          },
          ctaStyle,
        ]}
      >
        <Pressable
          onPress={handleGetStarted}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
          ]}
        >
          <AppText style={styles.ctaText}>Get Started</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.card,
  },
  logo: {
    position: "absolute",
  },
  wordReveal: {
    position: "absolute",
    justifyContent: "center",
    overflow: "hidden",
  },
  wordmark: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 29,
    lineHeight: 34,
    letterSpacing: 0,
    color: theme.colors.navy,
  },
  missionWrap: {
    position: "absolute",
  },
  mission: {
    fontFamily: theme.fontFamily.body,
    fontStyle: "italic",
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  ctaWrap: {
    position: "absolute",
  },
  ctaButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
});
