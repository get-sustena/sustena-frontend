# Sustena frontend architecture

As read from the `testing` branch on 13 October 2026, first at commit `a8259b3` and updated for the changes in the change log at the end.

One Expo project builds the iOS app, the Android app and the web app at app.getsustena.com.

| Piece | Version / choice |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, React 19.2 |
| Routing | expo-router (file-based), typed routes on |
| Compiler | React Compiler on (`experiments.reactCompiler`) |
| Server data | TanStack Query 5 over axios |
| App state | Zustand 5 |
| Local storage | expo-sqlite (`cookeasev2.db`), SecureStore for tokens (localStorage on web) |
| Animation | Reanimated 4 |
| Long lists | FlashList 2 (`@shopify/flash-list`, JavaScript only) |
| Icons | lucide-react-native, wrapped by `src/components/ui/Icon.tsx` |
| Language | TypeScript 6, `tsc --noEmit` passes clean |

Installed but unused today: `react-hook-form`, `zod`, the Playfair Display and Plus Jakarta Sans fonts.

## Folder map

```text
app/                 Screens. Every file is a route.
  _layout.tsx        Root: providers, database, startup gate, stack
  index.tsx          Entry redirect: /welcome, /auth or /(tabs)/home
  (tabs)/            Bottom tabs: home, planner (labelled Pantry), recipes, shopping, profile
  recipes/[id].tsx   Recipe detail
  shopping/[id].tsx  One shopping list
  creator/...        Recipe creator: editor, saved, profile, pickers
  creators/[handle]  Public creator profile
  onboarding/...     Onboarding steps
  auth*.tsx, welcome, profile-complete, settings, support, subscription, ...
src/
  components/ui/     Shared building blocks (AppText, Button, SearchInput, FilterChip, BottomSheet, Toast, ...)
  components/<area>/ Pieces for one area: recipe, pantry, planner, shopping, profile, creator, auth, home
  components/bootstrap/  Startup gate and background effects
  lib/api/           Backend connection: client, config, errors, one file per resource, adapters
  lib/query/         Query client, query keys, network status
  lib/sync/          Offline write queue processor
  lib/navigation/    routeAccess.ts: which routes are public and which need sign-in
  lib/...            Pure helpers: unit conversion, scaling, shopping list building, formatters
  hooks/api/         One React Query hook file per resource
  hooks/             App-level hooks: startup, auth restore, persistence, sync
  db/                SQLite migrations and one repository file per table group
  store/             Zustand stores
  theme/             Colour, spacing, radius and type tokens
  types/             API types (api.ts) and app types
  data/              Static lists (filters, preference options) and the bundled recipe seed
tests/               node:test files for pure helpers
docs/                Notes and backend handoffs (.gitignore lists /docs, so add new files with `git add -f`)
```

## Startup order

`app/_layout.tsx` wraps the app in this order:

1. Loads fonts (Inter, Bricolage Grotesque, Geist Mono) and holds the splash screen until they're ready.
2. `QueryClientProvider` gives every screen the shared query cache.
3. `SQLiteProvider` opens `cookeasev2.db` and runs `migrateDbIfNeeded` (schema version 13).
4. `WebAppFrame` centres the app in a 480px phone-width column on web only.
5. `AppBootstrapGate` shows a loader until both of these finish:
   - `useAuthBootstrap` reads stored tokens and calls `GET /auth/me`. A 401 signs the user out. Any other failure, such as no network, keeps the user signed in offline.
   - `useAppBootstrap` loads saved data from SQLite into the stores, then pulls preferences, profile answers, planner settings, pantry and shopping lists from the API and saves them back to SQLite.
6. `PersistenceEffects` starts the background jobs: saving preferences and profile answers, the offline sync queue and creator draft sync.
7. `RootNavigator` renders the `Stack`, with `ToastHost` and `BottomSheetHost` on top.

`app/index.tsx` sends a new visitor to `/welcome`, a returning signed-out visitor to `/auth`, and a signed-in user to `/(tabs)/home`.

## Who can open what

`RootNavigator` in `app/_layout.tsx` wraps every signed-in screen in `Stack.Protected`, guarded by `isAuthenticated` from `authStore`.

- `src/lib/navigation/routeAccess.ts` lists every route as either public or signed-in.
  - Public: `index`, `welcome`, `onboarding/product`, `auth`, `auth-signup` and `auth-forgot`.
  - Signed-in: everything else, including `(tabs)`, `recipes/[id]`, `creators/[handle]`, `support` and the creator screens.
- A signed-out visitor sent to a signed-in URL lands on `index`, which forwards them to welcome or sign-in. Signing out removes the signed-in screens from history and lands on sign-in.
- `tests/routeAccess.test.mjs` fails when a file in `app/` is in neither list, so a new screen can't go public by accident. Add every new screen to one of the lists.
- `RootNavigator` reads the session itself because it sits inside `AppBootstrapGate`. Don't pass the guard down from `RootLayout`: that value can be a render behind on start-up and sends signed-in users to a blank screen.
- The guard only stops the app from showing screens. `GET /recipes` and the detail endpoints still answer anyone. On 13 October 2026 the founder decided not to lock the API down (relayed by the backend chat), so anyone calling the API directly can still read recipes.

## Navigation

The tab bar in `app/(tabs)/_layout.tsx` is a custom `FloatingTabBar`: a blurred dark bar with an animated highlight and a badge for unchecked shopping items. Each screen sits under it, so lists add about 110px of bottom padding.

Screens move with `router.push` / `router.replace` from expo-router, using typed `pathname` + `params` for dynamic routes. Sheets don't use routes. Any screen calls `openSheet(<Content />)` from `src/store/uiStore.ts`, and `BottomSheetHost` renders it. Toasts work the same way through `showToast`.

## Connection to the backend

Every backend call goes through the same layers, in this order:

```text
screen  →  hooks/api/useX.ts  →  lib/api/x.ts  →  lib/api/client.ts (axios)  →  API
          (React Query)          (one function     (token, refresh,
                                  per endpoint)      error shape)
```

**Address (`lib/api/config.ts`).** `EXPO_PUBLIC_API_BASE_URL`, which the tracked `.env` and `eas.json` set to `https://api.getsustena.com/api/v1`. Without it, development builds fall back to a LAN address (`192.168.0.177:9000`). A release build refuses any private-network address and uses production instead. Requests time out after 60 seconds.

**Client (`lib/api/client.ts`).**
- It adds `Authorization: Bearer <access token>` to every request. Tokens come from `tokenStorage.ts` (SecureStore on phones, `tokenStorage.web.ts` uses localStorage on web).
- On a 401 it calls `POST /auth/refresh` once, shared by every request that failed at the same moment, saves the new tokens and retries the original request.
- If the refresh fails, it clears the tokens and calls `notifyAuthFailure()`. `AppBootstrapGate` then cancels queries, waits for background work, clears local account data and sends the user to `/auth`.
- All errors become `ApiClientError` with `status`, `code` and `payload` (`lib/api/errors.ts`). Screens show `getApiErrorMessage(error)`. Forms can map server validation errors to fields with `getApiValidationFieldErrors`.

**Endpoints (`lib/api/*.ts`).** One small file per backend resource: auth, recipes, creators, creatorRecipes, favorites, ingredients, media, mealPlans, pantry, planner, preferences, profileAnswers, recommendations, shoppingList, shoppingLists, units, health. `lib/api/index.ts` re-exports them as namespaces (`recipesApi.getRecipes(...)`). Request and response types live in `src/types/api.ts`.

**Adapters (`lib/api/adapters.ts`).** These turn API shapes into the shapes screens use, for example `apiRecipeToLocalRecipe` and `apiShoppingItemToLocalItem`.

**Hooks (`hooks/api/*.ts`).** These wrap the endpoints in `useQuery` / `useMutation`. Query keys come from `lib/query/queryKeys.ts`. Mutations update or invalidate the related keys on success (for example rating a recipe updates the detail cache and invalidates recipe lists).

**Query defaults (`lib/query/queryClient.ts`).** Queries retry twice with backoff, stay fresh for 60 seconds, are kept in memory for 5 minutes, don't refetch on window focus, and do refetch when the connection comes back. `networkStatus.ts` feeds NetInfo into React Query's online manager.

**Media uploads (`lib/media/uploadImage*.ts`).** These ask the API for a presigned S3 URL, then upload straight to S3. Web has its own version.

## Offline and local data

The app keeps working without a connection. Three mechanisms do this.

**Local database.** `src/db/migrations.ts` creates 19 tables: recipes and their ingredients, instructions, tags, allergens and notes; favourites; pantry; shopping lists and items; preferences; profile answers; planner settings; creator drafts; the sync queue and ID mappings; metadata; and account snapshots. Each area has a repository file (`recipeRepository.ts`, `pantryRepository.ts`, ...). Writes to one database run one at a time through `writeQueue.ts`. Phones ship with 112 published recipes bundled in `src/data/mobile_seed_recipes_published.json` (1.4 MB). Web ships none (`recipeSeed.web.ts`).

**Reads fall back to SQLite.** Recipe lists and recipe details try the API first and read SQLite if it fails (`useInfiniteRecipesWithLocalFallback`, `useRecipeDetailWithLocalFallback`). Opening a recipe also caches it locally.

**Writes go through a sync queue.** Favourites, shopping list changes, profile answers and planner settings change the Zustand store and SQLite first, so the screen updates at once. Then they call the API. If the call fails, the change goes into the `sync_queue` table. `useSyncQueueProcessor` replays the queue when the app starts, when the connection returns and when the app comes back to the foreground. A queued change is dropped after 8 failed tries, or straight away on a permanent 4xx error. Items created offline get a temporary ID, which `sync_id_mappings` swaps for the server ID once synced.

**Local data belongs to one account.** `accountDataRepository.ts` records which user owns the local data. Signing out, or an expired session, clears it and resets the stores (`lib/accountSession.ts`).

## State

| Kind | Where it lives | Examples |
| --- | --- | --- |
| Server data | React Query cache | Recipe lists and details, creators, recommendations, planner results |
| User data that must work offline | Zustand store + SQLite, synced to the API | Preferences, profile answers, pantry, favourites, shopping lists, planner settings |
| Session | `authStore` | Signed-in user, hydrating, signing out |
| Global UI | `uiStore` | Open sheet, toast |
| Picker hand-offs | Small stores | `recipeUnitPickerStore`, `recipeVocabularyPickerStore`, `creatorProfileEditStore` |
| Screen-only | `useState` in the screen | Search text, active filter, dismissed cards |

Components read stores with selectors (`useAuthStore((s) => s.user)`), not by taking the whole store.

## Look and layout

- Tokens are in `src/theme/`: colours (`colors.ts`), spacing 4–32, radius 10–22 plus full, and font families and sizes. Screens import `theme` and use `theme.colors.navy`, `theme.spacing.lg` and so on. Some screens still have hard-coded numbers for padding and sizes.
- Styles use `StyleSheet.create` at the bottom of each file.
- Text goes through `AppText`, icons through `Icon`, both in `components/ui`.
- Long lists use FlashList: the Recipes grid, Saved recipes and the pantry ingredient picker. FlashList has no `columnWrapperStyle`, and its `contentContainerStyle` takes only padding and background, so each cell carries its own spacing. Both recipe grids use `src/components/recipe/RecipeGridItem.tsx`, which adds the 20px page gutter and half of the 12px column gap. Cards in a row match heights because FlashList gives every cell in a row the tallest cell's height.
- Typed search waits 300 ms after the last keystroke before querying (`src/hooks/useDebouncedValue.ts`).
- Screens pad the top with `useSafeAreaInsets()` because the stack has no native header.

## Build, release and branches

| Target | How |
| --- | --- |
| Web | Vercel runs `npx expo export --platform web` and serves `dist/` as a single-page app (`vercel.json` rewrites every path to `index.html` and sets the COOP/COEP headers that SQLite on web needs). See `docs/WEB_DEPLOYMENT.md`. |
| Android / iOS | EAS Build. Profiles in `eas.json`: `development` (dev client), `preview` (internal, Android APK), `production` (store, build number auto-increments). Expo owner `cookease-org`, bundle ID `com.getsustena.app`. |
| Over-the-air updates | `expo-updates` with one channel per profile. `runtimeVersion` uses the fingerprint policy, so a native change forces a new build. |

Branches: `testing` is for local work. `main` is the deployment branch on GitHub.

## Checks

| Check | Command |
| --- | --- |
| Types | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit tests | `node --test tests/*.test.mjs` (21 tests; passing `tests/` as a folder fails on Windows) |
| Web preview | `npm run web`, then open http://localhost:8081 |

## Rules for changes

1. Screens stay in `app/`. Logic that more than one screen needs goes in `src/hooks` or `src/lib`.
2. Backend calls go through `src/lib/api/<resource>.ts` and a hook in `src/hooks/api/`. Screens never call axios directly.
3. New query keys go in `src/lib/query/queryKeys.ts`.
4. Data the user must see offline goes in a store plus SQLite, and its writes go through the sync queue.
5. A new or changed table needs a new migration step and a `DATABASE_VERSION` bump in `src/db/migrations.ts`.
6. Colours, spacing, radius and fonts come from `src/theme`.
7. Every new screen goes into `PUBLIC_ROUTES` or `SIGNED_IN_ROUTES` in `src/lib/navigation/routeAccess.ts`.
8. Long or growing lists use FlashList, with spacing inside each cell.
9. Work on `testing`. Nothing goes to `main` without the founder's yes. Commits use Conventional Commit messages (`feat(scope): ...`, `fix(scope): ...`), one logical change each.

## Open gaps

Found while reading the code against the frontend skills. None of these is fixed yet.

| Gap | Where | Why it matters |
| --- | --- | --- |
| The API serves recipes to signed-out callers | Backend | The founder decided on 13 October 2026 not to lock it down. Recorded here so it stays a known choice. |
| The offline cache needs `qualityScore`, `qualityWarnings` and `source*` | `src/db/recipeRepository.ts` (`quality_warnings_json` is NOT NULL) | The backend keeps the fields. If it ever empties them, `qualityWarnings` must stay `[]`, never null or missing. |
| The bundled recipe seed is out of date | `src/data/mobile_seed_recipes_published.json` (June 2026, 112 recipes, no meal tags or categories) | Offline phones relying on the seed can't filter recommendations by meal and get the unfiltered list. |
| The featured card's chip shows the recipe's first tag | `src/components/recipe/FeaturedRecipeCard.tsx` | At lunch it can read "Dinner" beside "Cook This for Lunch". Needs a wording decision. |
| The greeting never updates while the app stays open | `getGreeting()` in `app/(tabs)/home.tsx` | It takes no inputs, so the React Compiler caches the first result. "Good morning" stays until Home remounts. |
| Rating a recipe leaves the Recipes grid showing the old rating | The infinite list key `["recipes", "infinite-list", ...]` isn't invalidated after rating | Tiles show the average rating. It updates only when the query goes stale. |
| No error boundary anywhere | `app/` | One crashing screen takes down the whole app. |
| The search field has no accessible label and no clear button | `src/components/ui/SearchInput.tsx` | Screen readers only get the placeholder, and clearing a search means deleting each character. |
| Search placeholder contrast is about 1.7:1 | `theme.colors.textDim` (#BCCBB6) on white | Well below the 4.5:1 text minimum. Hard to read outdoors. |
| Filter pills don't tell screen readers which one is selected | `src/components/ui/FilterChip.tsx` | The selected state is only shown by colour. |
| The tab bar animation ignores the reduce-motion setting | `app/(tabs)/_layout.tsx` | The overshoot animation runs even when the phone asks for less motion. |
| The tab bar doesn't tell screen readers which tab is open | `app/(tabs)/_layout.tsx` | The five tabs are plain buttons with no selected state, so the current tab is only shown by colour. |
| Connection errors show developer text to users | `src/lib/api/errors.ts` (the network-error message) | Offline, Pantry reads "Could not reach the API at https://... Check that the backend is running, the port is correct...", with no "Try again" button. |
| Saved Recipes shows an empty box in the header | `app/saved-recipes.tsx` (`<View style={styles.headerButton} />`) | The spacer that balances the back button reuses the button style, so its border and fill show. |
| Web console deprecation warnings | The `pointerEvents` prop (14 uses in 9 files) and `shadow*` styles (14 files) | react-native-web wants `style.pointerEvents` and `boxShadow`. Web only; nothing breaks yet. |
| Web has no recipes offline until it has reached the API once | `src/db/recipeSeed.web.ts` leaves out the bundled seed on purpose | A first web visit with no connection shows "0 Recipes" and "No recipes ready". Phones have the seed. |
| Long cook times wrap badly on recipe tiles | `src/components/recipe/RecipeTile.tsx` (seen on Afang Soup: "135 MIN · ₦10,000") | The time and price break across lines. |
| `AGENTS.md` points to the Expo v54 docs | `AGENTS.md` | The project is on SDK 57. |
| "cookease" names remain | App slug, URL scheme, token keys, database name | Renaming any of them needs a plan: the slug links EAS builds, and the token keys and database name would sign everyone out and empty local data. |
| Unused dependencies | `react-hook-form`, `zod`, Playfair Display and Plus Jakarta Sans fonts | Extra install weight. |

## Change log

All on 13 October 2026, on `testing`:

- `e1f72e3` Recipes tab: the search bar and filter pills stay pinned under the title while the recipes scroll. A new search or filter scrolls back to the first result. The "How do you feel in the kitchen?" card still scrolls with the list.
- `ece9241` The npm package is now `sustena-frontend`. The Expo slug stays `cookease-frontend` because EAS links to it.
- `6e4af16` Every query key now comes from `queryKeys.ts`. Values are unchanged.
- `1552f03` Recipe search waits 300 ms after the last keystroke: one request for "jollof" instead of six.
- `b342855` FlashList for the Recipes grid, Saved recipes and the pantry picker, with the shared `RecipeGridItem`.
- `903aad4` Every signed-in screen is guarded by `Stack.Protected`, with the route lists and their test.
- `bb1265b` Home recommendations follow the time of day: breakfast from 6:00 to 10:59, lunch from 11:00 to 15:59, dinner from 16:00 and overnight. `src/lib/mealTime.ts` holds the clock rule and the meal rule (the meal's own tag, plus `main-meal` for lunch and dinner). `useMealTime` rechecks every minute and on return to the foreground. The request sends `mealTime`, the offline fallback filters by meal, and the button reads "Cook This Morning", "Cook This for Lunch" or "Cook This Tonight".
- `312946a` Home's kitchen card no longer wraps the Proteins, Produce and Grains pills in its own button. The card's button sits behind the content, so the pills are separate buttons. This clears the two "button inside a button" errors in the web dev overlay and lets VoiceOver reach the pills on iOS. Tapping anywhere else on the card still opens the planner.
