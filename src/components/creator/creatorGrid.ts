import { Platform, useWindowDimensions } from "react-native";
import { WEB_APP_MAX_WIDTH } from "../layout/WebAppFrame";

const PAGE_PADDING = 20;
export const CREATOR_GRID_GAP = 10;

// Width of one card in the Profile tab's three-across recipe grid. Worked out
// from the screen width (the web app frame caps it at 480) rather than
// measured, so the grid and its loading skeleton always match.
export function useCreatorGridCardWidth() {
  const { width } = useWindowDimensions();
  const screenWidth = Platform.OS === "web" ? Math.min(width, WEB_APP_MAX_WIDTH) : width;
  return (screenWidth - PAGE_PADDING * 2 - CREATOR_GRID_GAP * 2) / 3;
}
