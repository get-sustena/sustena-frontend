// Links people share outside the app. They open the web app, or the installed
// Android app (App Links in app.json), and chat apps show a preview of them
// (api/share.ts). The app's own screens for them are app/r and app/c.
const WEB_APP_ORIGIN = "https://app.getsustena.com";

export function creatorShareUrl(handle: string) {
  return `${WEB_APP_ORIGIN}/c/${encodeURIComponent(handle)}`;
}

export function recipeShareUrl(slug: string) {
  return `${WEB_APP_ORIGIN}/r/${encodeURIComponent(slug)}`;
}
