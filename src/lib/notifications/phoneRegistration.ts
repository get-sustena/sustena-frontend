// Shared by the app and its tests, so nothing here imports React Native.

type DeviceToken = { data: unknown };

type Dependencies<Token extends DeviceToken, Context> = {
  fetchDeviceToken: () => Promise<Token>;
  register: (deviceToken: Token, context: Context) => Promise<boolean>;
};

// Registers this phone for push: once per app session, once per switch-on,
// and once per new token.
//
// On Android, expo-notifications reports the token to its token listener every
// time the token is fetched, not only when it changes (PushTokenModule calls
// onNewToken after each getDevicePushTokenAsync). Registering fetches the
// token, so re-registering on every report looped: one phone sent 100
// registrations in 7 seconds on 13 October 2026. Reports of the registered
// token are ignored, and only one registration runs at a time.
export function createPhoneRegistration<Token extends DeviceToken, Context>({
  fetchDeviceToken,
  register,
}: Dependencies<Token, Context>) {
  // The token the last registration used, whether or not it worked: reports
  // of it come from our own fetches, so they never start a registration.
  let lastToken: string | null = null;
  let registered = false;
  let running: Promise<boolean> | null = null;

  function run(getToken: () => Promise<Token>, context: Context) {
    if (!running) {
      // Starting from a resolved promise marks the run as busy before the
      // token is fetched, so a report the fetch causes can't start another.
      running = Promise.resolve()
        .then(getToken)
        .then(async (deviceToken) => {
          lastToken = getTokenKey(deviceToken);
          // A failed registration is tried again on the next app start.
          registered = await register(deviceToken, context);
          return registered;
        })
        .finally(() => {
          running = null;
        });
    }
    return running;
  }

  return {
    // Switching reminders on: always registers, because switching them off
    // removed the token from the backend.
    register: (context: Context) => run(fetchDeviceToken, context),
    // App start: registers once per app session.
    ensureRegistered: (context: Context) =>
      registered && !running ? Promise.resolve(true) : run(fetchDeviceToken, context),
    // For the token listener. Only a token this phone hasn't used yet starts
    // a registration.
    onTokenReported: (deviceToken: Token, context: Context) =>
      running || getTokenKey(deviceToken) === lastToken
        ? null
        : run(async () => deviceToken, context),
    // Switched off or signed out: the next start or switch-on registers again.
    forget: () => {
      registered = false;
    },
  };
}

function getTokenKey({ data }: DeviceToken) {
  return typeof data === "string" ? data : JSON.stringify(data);
}
