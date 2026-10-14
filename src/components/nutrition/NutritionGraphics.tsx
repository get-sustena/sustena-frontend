import { StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { nutritionColors } from "./nutritionColors";

// A share of a day as a ring that fills clockwise from the top (v6.8 nuRing).
export function NutrientRing({
  percent,
  color,
  size,
  strokeWidth,
}: {
  percent: number;
  color: string;
  size: number;
  strokeWidth: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(Math.max(percent, 0), 100) / 100;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.ring}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        stroke={nutritionColors.track}
      />
      {filled ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * filled} ${circumference}`}
          stroke={color}
        />
      ) : null}
    </Svg>
  );
}

// A plate seen from above, full or half full (v6.8 nuPlateSvg).
export function PlatePicture({ fill }: { fill: number }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={12} fill={nutritionColors.chip} stroke={nutritionColors.edge} />
      <Circle cx={13} cy={13} r={9.5} fill="none" stroke={nutritionColors.well} />
      {fill >= 1 ? (
        <Circle cx={13} cy={13} r={7.5} fill={nutritionColors.carbs} />
      ) : (
        <Path d="M13 5.5a7.5 7.5 0 0 1 0 15z" fill={nutritionColors.carbs} />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  ring: {
    transform: [{ rotate: "-90deg" }],
  },
});
