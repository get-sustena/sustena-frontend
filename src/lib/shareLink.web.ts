import type { ShareOutcome } from "./shareLink";

// The browser's share sheet where it has one; otherwise the link is copied.
export async function shareLink(title: string, url: string): Promise<ShareOutcome> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return "dismissed";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
