import { StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

const RADIUS = 28;
const RING = 2 * Math.PI * RADIUS;

type Props = {
  size: number;
  // In the ring's own 64-unit box, so it scales with size.
  strokeWidth: number;
  leftFraction: number;
  trackColor: string;
  color: string;
};

// The countdown ring: the arc shrinks as time runs out, starting from the top.
export function TimerRing({ size, strokeWidth, leftFraction, trackColor, color }: Props) {
  const offset = RING * (1 - Math.min(1, Math.max(0, leftFraction)));

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={styles.ring}>
      <Circle cx={32} cy={32} r={RADIUS} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <Circle
        cx={32}
        cy={32}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={RING}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  ring: {
    transform: [{ rotate: "-90deg" }],
  },
});
