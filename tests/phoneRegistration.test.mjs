import assert from "node:assert/strict";
import { test } from "node:test";
import { createPhoneRegistration } from "../src/lib/notifications/phoneRegistration.ts";

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 5; i += 1) await nextTask();
};

// A fake of expo-notifications on Android: every fetch also reports the token
// to the token listener, the way PushTokenModule calls onNewToken.
function androidPhone(token, { accept = () => true } = {}) {
  const registered = [];
  let registration;
  registration = createPhoneRegistration({
    fetchDeviceToken: async () => {
      setTimeout(() => registration.onTokenReported({ data: token }, "db"), 0);
      return { data: token };
    },
    register: async (deviceToken) => {
      registered.push(deviceToken.data);
      return accept();
    },
  });
  return { registration, registered };
}

test("switching reminders on registers the phone once, though Android reports the token on every fetch", async () => {
  const { registration, registered } = androidPhone("fcm-token-1");

  // The Settings switch registers; then the app's start-up check runs because reminders are now on.
  assert.equal(await registration.register("db"), true);
  assert.equal(await registration.ensureRegistered("db"), true);
  await settle();

  assert.deepEqual(registered, ["fcm-token-1"]);
});

test("an app start registers the phone once however often the check runs", async () => {
  const { registration, registered } = androidPhone("fcm-token-1");

  await Promise.all([registration.ensureRegistered("db"), registration.ensureRegistered("db")]);
  await registration.ensureRegistered("db");
  await settle();

  assert.deepEqual(registered, ["fcm-token-1"]);
});

test("a token reported during a registration doesn't start a second one", async () => {
  const registered = [];
  let finishRegistration;
  const registration = createPhoneRegistration({
    fetchDeviceToken: async () => ({ data: "fcm-token-1" }),
    register: (deviceToken) => {
      registered.push(deviceToken.data);
      return new Promise((resolve) => {
        finishRegistration = resolve;
      });
    },
  });

  const first = registration.register("db");
  await nextTask();
  assert.equal(registration.onTokenReported({ data: "fcm-token-1" }, "db"), null);
  assert.equal(registration.register("db"), first);

  finishRegistration(true);
  await first;
  assert.deepEqual(registered, ["fcm-token-1"]);
});

test("a new token from the push service is registered once", async () => {
  const { registration, registered } = androidPhone("fcm-token-1");
  await registration.ensureRegistered("db");
  await settle();

  await registration.onTokenReported({ data: "fcm-token-2" }, "db");
  assert.equal(registration.onTokenReported({ data: "fcm-token-2" }, "db"), null);

  assert.deepEqual(registered, ["fcm-token-1", "fcm-token-2"]);
});

test("switching reminders off and on again registers again", async () => {
  const { registration, registered } = androidPhone("fcm-token-1");
  await registration.register("db");
  await settle();

  registration.forget();
  await registration.register("db");
  await registration.ensureRegistered("db");
  await settle();

  assert.deepEqual(registered, ["fcm-token-1", "fcm-token-1"]);
});

test("a failed registration is tried again on the next check", async () => {
  let online = false;
  const { registration, registered } = androidPhone("fcm-token-1", { accept: () => online });

  assert.equal(await registration.ensureRegistered("db"), false);
  await settle();
  online = true;
  assert.equal(await registration.ensureRegistered("db"), true);
  await settle();

  assert.deepEqual(registered, ["fcm-token-1", "fcm-token-1"]);
});
