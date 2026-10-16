import type { ReportedEvent } from "../activity/activityQueue";
import { apiRequest } from "./client";

// Activity only the phone sees. Sending the same clientEventId again
// stores it once.
export function reportEvents(events: ReportedEvent[]) {
  return apiRequest<{ accepted: number; duplicates: number }>({
    url: "/me/events",
    method: "POST",
    data: { events },
  });
}
