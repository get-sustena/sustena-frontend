import { showToast } from "../store/uiStore";
import { shareLink } from "./shareLink";
import { socialCopy } from "./socialCopy";

type Options = {
  title: string;
  url: string;
  // Shown when the browser has no share sheet and the link was copied.
  copiedMessage: string;
  // Called once the link was shared or copied, not when the sheet is closed.
  onShared?: () => void;
};

// Shares a link (PRD v6.9 section 20): closing the share sheet says nothing,
// and a copy that fails offers Try again. The link is built on the phone, so
// this works offline.
export async function shareWithFeedback(options: Options): Promise<void> {
  const outcome = await shareLink(options.title, options.url);
  if (outcome === "shared" || outcome === "copied") options.onShared?.();
  if (outcome === "copied") showToast(options.copiedMessage, "success");
  if (outcome === "failed") {
    showToast(socialCopy.couldNotCopyLink, "danger", {
      label: socialCopy.tryAgain,
      onPress: () => void shareWithFeedback(options),
    });
  }
}
