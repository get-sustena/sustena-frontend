// src/components/ui/Icon.tsx
// Custom SVG icon set ported verbatim from redesign/CookEase App v2.html (IP map + iconSVG helper).

import { SvgXml } from "react-native-svg";
import { theme } from "../../theme/theme";

export type IconName = "discover" | "plan" | "cook" | "shop" | "profile" | "mail" | "lock" | "budget" | "ncd" | "bookmark" | "offline" | "timer" | "servings" | "market" | "notification" | "settings" | "help" | "swap" | "check" | "plus" | "minus" | "chevronDown" | "chevronRight" | "chevronLeft" | "close" | "spoon" | "chart" | "trash" | "home" | "moreH" | "pencil" | "share" | "star" | "chefHat" | "list" | "vegetarian" | "pantry" | "undecided" | "eye" | "eyeOff" | "image" | "alertTriangle" | "bulb";

const IP: Record<IconName, string> = {
  discover: "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><line x1=\"15.7\" y1=\"15.7\" x2=\"20\" y2=\"20\"/>",
  plan: "<rect x=\"4\" y=\"5\" width=\"16\" height=\"15\" rx=\"2.5\"/><line x1=\"4\" y1=\"9.5\" x2=\"20\" y2=\"9.5\"/><line x1=\"8.5\" y1=\"3\" x2=\"8.5\" y2=\"6.5\"/><line x1=\"15.5\" y1=\"3\" x2=\"15.5\" y2=\"6.5\"/>",
  cook: "<path d=\"M4.5 10.5 H19.5 V13.5 A4.5 4.5 0 0 1 15 18 H9 A4.5 4.5 0 0 1 4.5 13.5 Z\"/><line x1=\"3\" y1=\"10.5\" x2=\"21\" y2=\"10.5\"/><path d=\"M9 6.5 C9.8 5.4 8.2 4.6 9 3.5\"/><path d=\"M13.5 6.5 C14.3 5.4 12.7 4.6 13.5 3.5\"/>",
  shop: "<path d=\"M5 8.5 H19 L17.6 18.2 A1.4 1.4 0 0 1 16.2 19.4 H7.8 A1.4 1.4 0 0 1 6.4 18.2 Z\"/><path d=\"M8.5 8.5 L10.5 4.5\"/><path d=\"M15.5 8.5 L13.5 4.5\"/><line x1=\"10\" y1=\"12\" x2=\"10\" y2=\"16\"/><line x1=\"14\" y1=\"12\" x2=\"14\" y2=\"16\"/>",
  profile: "<circle cx=\"12\" cy=\"8\" r=\"3.5\"/><path d=\"M5.5 19.5 A6.5 6.5 0 0 1 18.5 19.5\"/>",
  mail: "<rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"13\" rx=\"2\"/><path d=\"M4 7 L12 13 L20 7\"/>",
  lock: "<rect x=\"5.5\" y=\"10.5\" width=\"13\" height=\"9\" rx=\"2\"/><path d=\"M8 10.5 V8 A4 4 0 0 1 16 8 V10.5\"/>",
  budget: "<rect x=\"3.5\" y=\"6.5\" width=\"17\" height=\"11.5\" rx=\"2.5\"/><path d=\"M3.5 10.5 H20.5\"/><line x1=\"16\" y1=\"14.5\" x2=\"18\" y2=\"14.5\"/>",
  ncd: "<path d=\"M12 20 C5 15 3 11.2 3 8.3 A4.4 4.4 0 0 1 12 6.6 A4.4 4.4 0 0 1 21 8.3 C21 11.2 19 15 12 20 Z\"/><path d=\"M6.5 11 H9 L10 9 L12 13 L13 11 H17.5\"/>",
  bookmark: "<path d=\"M7 4.5 H17 V19.5 L12 15.5 L7 19.5 Z\"/>",
  offline: "<path d=\"M4.5 9 A10 10 0 0 1 19.5 9\"/><path d=\"M7.8 12.3 A6 6 0 0 1 16.2 12.3\"/><path d=\"M10.8 15.4 A2 2 0 0 1 13.2 15.4\"/><line x1=\"4\" y1=\"4\" x2=\"20\" y2=\"20\"/>",
  timer: "<circle cx=\"12\" cy=\"13.5\" r=\"6.8\"/><line x1=\"12\" y1=\"13.5\" x2=\"12\" y2=\"9.5\"/><line x1=\"9.5\" y1=\"3\" x2=\"14.5\" y2=\"3\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"6.7\"/>",
  servings: "<circle cx=\"12\" cy=\"12\" r=\"7\"/><circle cx=\"12\" cy=\"12\" r=\"3.3\"/>",
  market: "<path d=\"M12 21 C7 15.5 5 12.3 5 9.3 A7 7 0 0 1 19 9.3 C19 12.3 17 15.5 12 21 Z\"/><circle cx=\"12\" cy=\"9.3\" r=\"2.5\"/>",
  notification: "<path d=\"M6 16.5 H18 L16.5 13.5 V10.5 A4.5 4.5 0 0 0 7.5 10.5 V13.5 Z\"/><path d=\"M10 19.5 A2 2 0 0 0 14 19.5\"/><line x1=\"12\" y1=\"4.2\" x2=\"12\" y2=\"3\"/>",
  settings: "<line x1=\"4\" y1=\"8.5\" x2=\"20\" y2=\"8.5\"/><line x1=\"4\" y1=\"15.5\" x2=\"20\" y2=\"15.5\"/><circle cx=\"9\" cy=\"8.5\" r=\"2.1\" fill=\"#FBFBF7\"/><circle cx=\"15\" cy=\"15.5\" r=\"2.1\" fill=\"#FBFBF7\"/>",
  help: "<circle cx=\"12\" cy=\"12\" r=\"8.3\"/><path d=\"M9.3 9.6 A2.7 2.7 0 1 1 13.2 13.3 C12.5 13.7 12 14.3 12 15.3\"/><circle cx=\"12\" cy=\"18.3\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/>",
  swap: "<path d=\"M4 8.5 H17 L14 5.5\"/><path d=\"M20 15.5 H7 L10 18.5\"/>",
  check: "<path d=\"M5 12.5 L9.5 17 L19 7\"/>",
  plus: "<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>",
  minus: "<line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>",
  chevronDown: "<path d=\"M6 9.5 L12 15.5 L18 9.5\"/>",
  chevronRight: "<path d=\"M9.5 6 L15.5 12 L9.5 18\"/>",
  chevronLeft: "<path d=\"M14.5 6 L8.5 12 L14.5 18\"/>",
  close: "<line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/>",
  spoon: "<ellipse cx=\"12\" cy=\"7.5\" rx=\"3\" ry=\"4.6\"/><line x1=\"12\" y1=\"12\" x2=\"12\" y2=\"20\"/>",
  chart: "<line x1=\"4\" y1=\"20\" x2=\"20\" y2=\"20\"/><line x1=\"7.5\" y1=\"20\" x2=\"7.5\" y2=\"13\"/><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"8\"/><line x1=\"16.5\" y1=\"20\" x2=\"16.5\" y2=\"15\"/>",
  trash: "<line x1=\"5\" y1=\"7\" x2=\"19\" y2=\"7\"/><path d=\"M9 7 V5.2 A1.2 1.2 0 0 1 10.2 4 H13.8 A1.2 1.2 0 0 1 15 5.2 V7\"/><path d=\"M7 7 L8 18.8 A1.4 1.4 0 0 0 9.4 20 H14.6 A1.4 1.4 0 0 0 16 18.8 L17 7\"/><line x1=\"10.5\" y1=\"10.5\" x2=\"10.5\" y2=\"16.5\"/><line x1=\"13.5\" y1=\"10.5\" x2=\"13.5\" y2=\"16.5\"/>",
  home: "<path d=\"M4 11.5 L12 4.5 L20 11.5\"/><path d=\"M6 10 V19.5 H18 V10\"/><rect x=\"9.8\" y=\"13.3\" width=\"4.4\" height=\"6.2\" rx=\"0.6\"/>",
  moreH: "<circle cx=\"5\" cy=\"12\" r=\"1.9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"12\" r=\"1.9\" fill=\"currentColor\" stroke=\"none\"/>",
  pencil: "<path d=\"M4.5 19.5 L5.3 16 L15.8 5.5 A1.8 1.8 0 0 1 18.3 5.5 L19 6.2 A1.8 1.8 0 0 1 19 8.7 L8.5 19.2 Z\"/><line x1=\"14\" y1=\"7.3\" x2=\"17.2\" y2=\"10.5\"/>",
  share: "<circle cx=\"18\" cy=\"6\" r=\"2.3\"/><circle cx=\"6\" cy=\"12\" r=\"2.3\"/><circle cx=\"18\" cy=\"18\" r=\"2.3\"/><line x1=\"8.1\" y1=\"10.8\" x2=\"15.9\" y2=\"7.2\"/><line x1=\"8.1\" y1=\"13.2\" x2=\"15.9\" y2=\"16.8\"/>",
  star: "<path d=\"M12 3.5 L14.2 9.4 L20.5 9.7 L15.6 13.7 L17.3 19.8 L12 16.3 L6.7 19.8 L8.4 13.7 L3.5 9.7 L9.8 9.4 Z\" fill=\"currentColor\" stroke=\"none\"/>",
  chefHat: "<path d=\"M7 11.5 A3 3 0 0 1 8.3 5.6 A3.4 3.4 0 0 1 12 3.6 A3.4 3.4 0 0 1 15.7 5.6 A3 3 0 0 1 17 11.5 Z\"/><rect x=\"7.3\" y=\"11.5\" width=\"9.4\" height=\"2.8\" rx=\"0.6\"/><path d=\"M8 14.3 V19.5 H16 V14.3\"/>",
  list: "<line x1=\"9\" y1=\"7\" x2=\"20\" y2=\"7\"/><line x1=\"9\" y1=\"12\" x2=\"20\" y2=\"12\"/><line x1=\"9\" y1=\"17\" x2=\"20\" y2=\"17\"/><circle cx=\"4.5\" cy=\"7\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"12\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"17\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/>",
  vegetarian: "<path d=\"M6 18.5 C6 9.5 12 5 19 5 C19 13.5 14 18.5 6 18.5 Z\"/><path d=\"M6.5 18 C9.5 15 12.5 12.5 16 10.5\"/>",
  pantry: "<rect x=\"5\" y=\"3.5\" width=\"14\" height=\"17\" rx=\"2\"/><line x1=\"5\" y1=\"11.5\" x2=\"19\" y2=\"11.5\"/><circle cx=\"9.5\" cy=\"7.5\" r=\"0.9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"9.5\" cy=\"15.5\" r=\"0.9\" fill=\"currentColor\" stroke=\"none\"/>",
  undecided: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.3 9.8 A2.7 2.7 0 0 1 12 7.3 A2.7 2.7 0 0 1 13.6 12.2 C12.6 12.9 12 13.4 12 14.6\"/><circle cx=\"12\" cy=\"17.3\" r=\"0.9\" fill=\"currentColor\" stroke=\"none\"/>",
  eye: "<path d=\"M2.5 12 C5 6.5 9 4 12 4 C15 4 19 6.5 21.5 12 C19 17.5 15 20 12 20 C9 20 5 17.5 2.5 12 Z\"/><circle cx=\"12\" cy=\"12\" r=\"3.2\"/>",
  eyeOff: "<path d=\"M2.5 12 C5 6.5 9 4 12 4 C15 4 19 6.5 21.5 12 C19 17.5 15 20 12 20 C9 20 5 17.5 2.5 12 Z\"/><circle cx=\"12\" cy=\"12\" r=\"3.2\"/><line x1=\"3.5\" y1=\"20.5\" x2=\"20.5\" y2=\"3.5\"/>",
  image: "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><path d=\"m21 15-5-5L5 21\"/>",
  alertTriangle: "<path d=\"M12 3 L21 20 H3 Z\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"14\"/><circle cx=\"12\" cy=\"17\" r=\"0.8\" fill=\"currentColor\" stroke=\"none\"/>",
  bulb: "<path d=\"M8.5 15.5 C6.8 14.3 6 12.8 6 10.8 A6 6 0 0 1 18 10.8 C18 12.8 17.2 14.3 15.5 15.5 L15 17 H9 Z\"/><line x1=\"9.5\" y1=\"20\" x2=\"14.5\" y2=\"20\"/>",
};

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Fills closed-path icons (e.g. bookmark, star) with `color` instead of leaving them outline-only. */
  filled?: boolean;
};

export function Icon({
  name,
  size = 24,
  color = theme.colors.text,
  strokeWidth = 1.5,
  filled = false,
}: IconProps) {
  const inner = (IP[name] ?? IP.discover).split("currentColor").join(color);
  const fill = filled ? color : "none";
  const xml =
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  return <SvgXml xml={xml} width={size} height={size} />;
}
