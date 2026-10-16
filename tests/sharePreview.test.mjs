import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import share from "../api/share.ts";

const SHELL = "<html><head><title>Sustena</title></head><body><div id=\"root\"></div></body></html>";
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// The deployment's own page, and the API's signed-out cards.
function serve(cards) {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/index.html")) return new Response(SHELL);
    const card = Object.entries(cards).find(([path]) => url.endsWith(path))?.[1];
    return card ? Response.json(card) : new Response("Not found", { status: 404 });
  };
}

const open = (path) => share.fetch(new Request(`https://app.getsustena.com/api/share?${path}`)).then((response) => response.text());

test("a creator link previews the name, the approved line and the photo, with the name escaped", async () => {
  serve({
    "/public/creators/ada": {
      handle: "ada",
      displayName: 'Ada "<script>" $& Co',
      avatarUrl: "https://res.cloudinary.com/rslnsqyc/image/upload/v1/ada.webp",
    },
  });
  const page = await open("kind=creator&key=ada");

  assert.ok(page.includes('<meta property="og:title" content="Ada &quot;&lt;script&gt;&quot; $&amp; Co" />'));
  assert.ok(page.includes('content="Follow Ada &quot;&lt;script&gt;&quot; $&amp; Co on Sustena and see their recipes"'));
  assert.ok(page.includes('content="https://res.cloudinary.com/rslnsqyc/image/upload/c_fill,g_face,w_600,h_600,f_jpg,q_auto/v1/ada.webp"'));
  assert.ok(page.includes('<meta property="og:url" content="https://app.getsustena.com/c/ada" />'));
  assert.ok(!page.includes("<script>"));
  assert.ok(page.includes('<div id="root"></div>'));
});

test("a recipe link previews its name and a wide photo only; an unknown one previews Sustena", async () => {
  serve({
    "/public/recipes/jollof-rice": {
      slug: "jollof-rice",
      name: "Jollof Rice",
      imageUrl: "https://res.cloudinary.com/rslnsqyc/image/upload/v1/jollof.webp",
    },
  });
  const page = await open("kind=recipe&key=jollof-rice");
  assert.ok(page.includes("<title>Jollof Rice</title>"));
  assert.ok(page.includes('content="https://res.cloudinary.com/rslnsqyc/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/jollof.webp"'));
  assert.ok(page.includes('<meta name="twitter:card" content="summary_large_image" />'));
  assert.ok(!page.includes("og:description"));

  const unknown = await open("kind=recipe&key=gone");
  assert.ok(unknown.includes('<meta property="og:title" content="Sustena" />'));
  assert.ok(unknown.includes('<meta property="og:image" content="https://app.getsustena.com/share/sustena.png" />'));
});
