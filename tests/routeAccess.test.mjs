import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AGREEMENT_ROUTES,
  EMAIL_CODE_ROUTES,
  PUBLIC_ROUTES,
  SIGNED_IN_ROUTES,
} from "../src/lib/navigation/routeAccess.ts";

const appDir = fileURLToPath(new URL("../app", import.meta.url));

// Route names as the root stack sees them: a folder with its own _layout is
// one screen, any other folder contributes "folder/file" screens.
function collectRoutes(dir, prefix = "") {
  const routes = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const childDir = join(dir, entry.name);
      if (existsSync(join(childDir, "_layout.tsx"))) {
        routes.push(`${prefix}${entry.name}`);
      } else {
        routes.push(...collectRoutes(childDir, `${prefix}${entry.name}/`));
      }
    } else if (/\.tsx?$/.test(entry.name) && !/^[_+]/.test(entry.name)) {
      routes.push(`${prefix}${entry.name.replace(/\.tsx?$/, "")}`);
    }
  }
  return routes;
}

const routesOnDisk = collectRoutes(appDir).sort();
const listedRoutes = [...PUBLIC_ROUTES, ...SIGNED_IN_ROUTES, ...AGREEMENT_ROUTES, ...EMAIL_CODE_ROUTES].sort();

test("every screen in app/ is listed as public, signed-in, the agreement or the email code", () => {
  assert.deepEqual(listedRoutes, routesOnDisk);
});

test("no screen is both public and signed-in", () => {
  const overlap = PUBLIC_ROUTES.filter((route) =>
    SIGNED_IN_ROUTES.includes(route)
  );
  assert.deepEqual(overlap, []);
});

test("recipes are only reachable after sign-in", () => {
  assert.ok(SIGNED_IN_ROUTES.includes("(tabs)"));
  assert.ok(SIGNED_IN_ROUTES.includes("recipes/[id]"));
  assert.ok(SIGNED_IN_ROUTES.includes("creators/[handle]"));
});

test("the Terms and Privacy Policy open from sign-up, so they are public", () => {
  assert.ok(PUBLIC_ROUTES.includes("legal/[doc]"));
});

test("the agreement screen is its own list: shown only while the account must agree", () => {
  assert.deepEqual([...AGREEMENT_ROUTES], ["legal-agree"]);
  assert.ok(SIGNED_IN_ROUTES.includes("delete-account"));
});

test("the email code screen is its own list: shown only while a new account must enter its code", () => {
  assert.deepEqual([...EMAIL_CODE_ROUTES], ["verify-email"]);
  assert.ok(!PUBLIC_ROUTES.includes("verify-email"));
  assert.ok(!SIGNED_IN_ROUTES.includes("verify-email"));
});
