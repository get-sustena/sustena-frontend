import { Share } from "react-native";

export type ShareOutcome = "shared" | "copied" | "dismissed" | "failed";

// Opens the phone's share sheet for a link.
export async function shareLink(title: string, url: string): Promise<ShareOutcome> {
  try {
    const result = await Share.share({ title, message: url, url });
    return result.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch {
    return "failed";
  }
}
