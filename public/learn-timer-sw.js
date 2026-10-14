// Learn mode timer notifications on the web (src/lib/learnMode/timerAlerts.web.ts).
// This worker only handles a tapped notification. It has no fetch handler, so
// it never caches or touches the app's requests.

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const open = windows[0];
        if (open) {
          return open.focus().then(() => open.postMessage({ type: "learn-timer-opened", target }));
        }
        return self.clients.openWindow(target.url);
      })
  );
});
