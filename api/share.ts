// Link previews for shared recipe and creator links. vercel.json rewrites
// /r/{slug} and /c/{handle} here. Chat apps read a page's meta tags without
// running JavaScript, so this serves the web app's own page with the tags
// added; a person's browser then runs the app as usual (app/r, app/c).
// Outside the app a recipe shows its name and photo only.

const API_BASE_URL = process.env.SUSTENA_API_BASE_URL ?? "https://api.getsustena.com/api/v1";
const SITE_NAME = "Sustena";
// The app icon, for a link to something that isn't there or has no photo.
const BRAND_IMAGE_PATH = "/share/sustena.png";
// Chat apps give up on a slow preview, so a slow card shows the plain one.
const CARD_TIMEOUT_MS = 3_000;

type Preview = {
  title: string;
  description?: string;
  image: string;
  // A wide photo for a recipe, a square one for a creator or the brand.
  wide: boolean;
};

type RecipeCard = { slug: string; name: string; imageUrl: string | null };
type CreatorCard = { handle: string; displayName: string; avatarUrl: string | null };

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    const key = url.searchParams.get("key") ?? "";
    const brandImage = new URL(BRAND_IMAGE_PATH, url.origin).href;

    const [page, preview] = await Promise.all([
      fetch(new URL("/index.html", url.origin)).then((response) => response.text()),
      previewFor(kind, key, brandImage),
    ]);
    const pageUrl = `${url.origin}/${kind === "creator" ? "c" : "r"}/${encodeURIComponent(key)}`;

    return new Response(withPreviewTags(page, preview, pageUrl), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // A renamed recipe or a new photo shows within five minutes.
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  },
};

async function previewFor(kind: string | null, key: string, brandImage: string): Promise<Preview> {
  const plain = { title: SITE_NAME, image: brandImage, wide: false };
  if (!key) return plain;

  if (kind === "recipe") {
    const recipe = await publicCard<RecipeCard>(`/public/recipes/${encodeURIComponent(key)}`);
    if (!recipe) return plain;
    return recipe.imageUrl
      ? { title: recipe.name, image: sized(recipe.imageUrl, "c_fill,g_auto,w_1200,h_630"), wide: true }
      : { ...plain, title: recipe.name };
  }

  if (kind === "creator") {
    const creator = await publicCard<CreatorCard>(`/public/creators/${encodeURIComponent(key)}`);
    if (!creator) return plain;
    return {
      title: creator.displayName,
      // The founder's words, 16 October 2026.
      description: `Follow ${creator.displayName} on Sustena and see their recipes`,
      image: creator.avatarUrl ? sized(creator.avatarUrl, "c_fill,g_face,w_600,h_600") : brandImage,
      wide: false,
    };
  }

  return plain;
}

// Signed-out endpoints: a name and a photo, nothing else.
async function publicCard<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { signal: AbortSignal.timeout(CARD_TIMEOUT_MS) });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

// Cloudinary photos are cut to the preview's shape, as JPEG, which every chat
// app shows. Any other link is used as it is.
function sized(imageUrl: string, transform: string) {
  return imageUrl.replace(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/,
    `$1${transform},f_jpg,q_auto/`
  );
}

function withPreviewTags(page: string, preview: Preview, pageUrl: string) {
  const tags = [
    ["og:type", "website"],
    ["og:site_name", SITE_NAME],
    ["og:title", preview.title],
    ["og:description", preview.description],
    ["og:url", pageUrl],
    ["og:image", preview.image],
    ["twitter:card", preview.wide ? "summary_large_image" : "summary"],
    ["twitter:title", preview.title],
    ["twitter:description", preview.description],
    ["twitter:image", preview.image],
  ]
    .filter((tag): tag is [string, string] => Boolean(tag[1]))
    .map(([name, content]) =>
      name.startsWith("og:")
        ? `<meta property="${name}" content="${escapeHtml(content)}" />`
        : `<meta name="${name}" content="${escapeHtml(content)}" />`
    );
  if (preview.description) {
    tags.push(`<meta name="description" content="${escapeHtml(preview.description)}" />`);
  }

  // Replacer functions, so a "$&" in a recipe name is kept as written.
  return page
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(preview.title)}</title>`)
    .replace("</head>", () => `${tags.join("\n    ")}\n  </head>`);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
