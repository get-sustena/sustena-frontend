import { ingredientImageSources } from "../assets/ingredientImageSources";

const INGREDIENT_IMAGE_ALIASES: Record<string, string> = {
  "afang leaf": "afang-leaves",
  "red bell pepper": "bell-pepper",
  "cassava root": "cassava",
  "celery stalk": "celery",
  cod: "cod-fillet",
  "coriander leaf": "coriander",
  "fresh ginger": "ginger",
  "green bean": "green-beans",
  "green bell pepper": "green-pepper",
  "unripe plantain": "green-plantain",
  "fresh mint": "mint",
  "green pea": "peas",
  "irish potato": "potato",
  "african basil": "scent-leaf",
  "scotch bonnet pepper": "scotch-bonnet",
  "fresh thyme": "thyme",
  tuna: "tuna-steak",
  "fluted pumpkin leaf": "ugu-leaves",
  "utazi leaf": "utazi-leaves",
  "uziza leaf": "uziza-leaves",
  "white yam": "yam",
  "yellow bell pepper": "yellow-pepper",
  "bambara groundnut": "bambara-nut",
  "nigerian brown bean": "brown-bean",
  "cashew nut": "cashew",
  "coconut flake": "coconut-flakes",
  "chicken gizzard": "gizzard",
  "red kidney bean": "kidney-bean",
  "red lentil": "lentil",
  "minced beef": "minced-meat",
  oat: "oats",
  "african bush mango seed": "ogbono-seed",
  "cow skin": "ponmo",
  "beef tripe": "shaki",
  "brown beans oloyin": "brown-bean",
};

export function getIngredientImageSource(
  ingredientId?: string | null,
  ingredientName?: string | null
) {
  const directId = normalizeSlug(ingredientId ?? "");
  if (directId && ingredientImageSources[directId]) {
    return ingredientImageSources[directId];
  }

  const normalizedName = normalizeWords(ingredientName ?? "");
  const alias = INGREDIENT_IMAGE_ALIASES[normalizedName];
  if (alias && ingredientImageSources[alias]) {
    return ingredientImageSources[alias];
  }

  const slug = normalizeSlug(normalizedName);
  const candidates = [
    slug,
    slug.replace(/ies$/, "y"),
    slug.replace(/oes$/, "o"),
    slug.replace(/s$/, ""),
  ];
  for (const candidate of candidates) {
    if (ingredientImageSources[candidate]) {
      return ingredientImageSources[candidate];
    }
  }

  return ingredientImageSources[fallbackSlug(normalizedName)] ?? null;
}

function normalizeWords(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeSlug(value: string) {
  return normalizeWords(value).replace(/\s+/g, "-");
}

function fallbackSlug(value: string) {
  if (/brown bean|oloyin/.test(value)) return "brown-bean";
  if (/\brice\b/.test(value)) return "rice";
  if (/\begg\b/.test(value)) return "egg";
  if (/tomato/.test(value)) return "tomato";
  if (/onion/.test(value)) return "onion";
  if (/chicken/.test(value)) return "chicken";
  if (/salmon/.test(value)) return "salmon";
  if (/stockfish|dried fish/.test(value)) return "stockfish";
  if (/milk/.test(value)) return "milk";
  if (/soy sauce/.test(value)) return "soy-sauce";
  if (/groundnut|peanut/.test(value)) return "groundnut";
  if (/pepper|chilli|chili|paprika|cayenne/.test(value)) return "chilli-pepper";
  if (/plain flour/.test(value)) return "plain-flour";
  if (/wheat flour/.test(value)) return "wheat-flour";
  if (/egusi|melon seed/.test(value)) return "egusi";
  return "";
}
