import assert from "node:assert/strict";
import { test } from "node:test";

const production = "https://api.getsustena.com/api/v1";
let sequence = 0;

async function configuredUrl(value, development = false) {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  const previousDevelopment = globalThis.__DEV__;
  globalThis.__DEV__ = development;
  if (value === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = value;
  try {
    const module = await import(`../src/lib/api/config.ts?config-case=${sequence++}`);
    return module.API_BASE_URL;
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
    if (previousDevelopment === undefined) delete globalThis.__DEV__;
    else globalThis.__DEV__ = previousDevelopment;
  }
}

test("release API configuration rejects insecure, malformed and private addresses", async () => {
  for (const url of [
    "http://api.example.com/api/v1", "not-a-url", "//api.example.com/api/v1",
    "https://user:password@api.example.com/api/v1", "https://api.example.com/api/v1?token=secret",
    "https://api.example.com/api/v1#fragment", "https://192.168.1.20/api/v1",
    "https://127.0.0.2/api/v1", "https://[::1]/api/v1", "https://[::ffff:127.0.0.1]/api/v1",
    "https://172.20.0.1/api/v1", "https://10.0.0.1/api/v1", "https://localhost/api/v1",
    "https://169.254.169.254/api/v1", "https://[fc00::1]/api/v1",
  ]) {
    assert.equal(await configuredUrl(url), production, url);
  }
});

test("release API configuration preserves a valid HTTPS deployment and normalizes its final slash", async () => {
  assert.equal(await configuredUrl(" https://staging.example.com/api/v1/ "), "https://staging.example.com/api/v1");
  assert.equal(await configuredUrl(undefined), production);
  assert.equal(await configuredUrl(" "), production);
});

test("development can still reach a local HTTP backend", async () => {
  assert.equal(await configuredUrl("http://localhost:9000/api/v1/", true), "http://localhost:9000/api/v1");
});
