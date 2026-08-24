// Web loads the current catalogue from the API and keeps fetched recipes in
// SQLite. Omitting the bundled mobile seed keeps the initial browser download
// smaller and avoids seeding stale catalogue data on first load.
export const RECIPE_SEED_VERSION = "web-api-cache-v1";
export const recipeSeedJson: unknown[] = [];
