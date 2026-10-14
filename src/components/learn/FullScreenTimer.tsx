import { Pressable, StyleSheet, View } from "react-native";
import type { LearnTimer } from "../../lib/learnMode/learnSteps";
import {
  checkAfter,
  formatClock,
  formatTimerLength,
  secondsLeft,
  upTo,
  type StartedTimer,
} from "../../lib/learnMode/learnTimers";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { TimerRing } from "./TimerRing";

type Props = {
  stepName: string;
  timer: LearnTimer;
  started: StartedTimer;
  now: number;
  top: number;
  bottom: number;
  width: number;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onMinimize: () => void;
};

// v6.8 .lm-full: the same countdown, much bigger, on brand green, with Pause
// and Cancel at the bottom. Learn mode closes it when the timer ends.
export function FullScreenTimer({
  stepName,
  timer,
  started,
  now,
  top,
  bottom,
  width,
  onPause,
  onResume,
  onCancel,
  onMinimize,
}: Props) {
  const paused = started.status === "paused";
  const left = secondsLeft(started, now);
  const clockSize = Math.min(300, width - 40);
  const of = paused
    ? "Paused"
    : timer.maxSeconds
      ? checkAfter(timer.minSeconds, timer.maxSeconds)
      : `${formatTimerLength(timer.minSeconds, null)} timer`;

  return (
    <View
      style={[styles.full, { paddingTop: top + 4, paddingBottom: bottom + 24 }]}
      accessibilityViewIsModal
    >
      <View style={styles.top}>
        <View style={styles.topText}>
          <AppText style={styles.step}>{`Step ${started.step + 1}`}</AppText>
          <AppText style={styles.name} accessibilityRole="header">
            {stepName}
          </AppText>
        </View>
        <Pressable
          onPress={onMinimize}
          style={({ pressed }) => [styles.minimize, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Make timer smaller"
        >
          <Icon name="minimize" size={22} strokeWidth={2} color={theme.colors.white} />
        </Pressable>
      </View>

      <View style={styles.middle}>
        <View style={{ width: clockSize, height: clockSize }}>
          <TimerRing
            size={clockSize}
            strokeWidth={2.6}
            leftFraction={left / started.totalSeconds}
            trackColor="rgba(255,255,255,0.2)"
            color={theme.colors.white}
          />
          <View style={styles.read}>
            <AppText style={styles.count} accessibilityRole="timer">
              {formatClock(left)}
            </AppText>
            <AppText style={styles.of}>{of}</AppText>
          </View>
        </View>
        {timer.maxSeconds && !paused ? (
          <AppText style={styles.note}>{upTo(timer.maxSeconds)}</AppText>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={paused ? onResume : onPause}
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Icon
            name={paused ? "play" : "pause"}
            size={20}
            strokeWidth={2}
            color={theme.colors.navy3}
          />
          <AppText style={[styles.buttonText, styles.primaryText]}>
            {paused ? "Resume" : "Pause"}
          </AppText>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <AppText style={[styles.buttonText, styles.secondaryText]}>Cancel</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    ...StyleSheet.absoluteFill,
    zIndex: 15,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.navy3,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  topText: {
    flex: 1,
  },
  step: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 19.5,
    color: "rgba(255,255,255,0.78)",
  },
  name: {
    marginTop: 4,
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    lineHeight: 28.6,
    letterSpacing: -0.52,
    color: theme.colors.white,
  },
  minimize: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  middle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  read: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontFamily: theme.fontFamily.display,
    fontSize: 84,
    lineHeight: 84,
    letterSpacing: -1.68,
    fontVariant: ["tabular-nums"],
    color: theme.colors.white,
  },
  of: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 21.6,
    color: "rgba(255,255,255,0.8)",
  },
  note: {
    fontSize: 15,
    lineHeight: 21,
    color: "rgba(255,255,255,0.8)",
  },
  controls: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 56,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primary: {
    backgroundColor: theme.colors.white,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  buttonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 17,
  },
  primaryText: {
    color: theme.colors.navy3,
  },
  secondaryText: {
    color: theme.colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
