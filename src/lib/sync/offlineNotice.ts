import { onlineManager } from "@tanstack/react-query";
import { socialCopy } from "../socialCopy";
import { showToast } from "../../store/uiStore";

// The first follow, save or rating made offline says it will sync later;
// the rest of that offline spell says nothing (PRD v6.9 section 20).
let notedThisSpell = false;
onlineManager.subscribe((online) => {
  if (online) notedThisSpell = false;
});

export function noteOfflineChange() {
  if (onlineManager.isOnline() || notedThisSpell) return;
  notedThisSpell = true;
  showToast(socialCopy.offlineChanges, "offline");
}
