# Backend Requirements — CookEase Redesign Follow-Up

## Purpose

This is a implementation prompt for the CookEase backend (`cookease-backend`, FastAPI +
PostgreSQL + SQLAlchemy 2.x + Alembic + Pydantic v2). The mobile app just went through a full
visual + feature redesign. Most of it was pure UI reskinning with zero backend impact, but three
areas of new/changed UI have a backend dependency:

1. **Forgot-password (OTP reset)** — brand new UI, **zero backend support exists**. Currently
   non-functional on the client, clearly marked as a preview.
2. **"Complete Profile" personalization** — brand new UI (12 gated questions), **zero backend
   support exists**. Currently persisted only in local SQLite on-device.
3. **Multi-list shopping ("Your Lists")** — brand new UI. **Mostly already supported** by the
   existing `/shopping-lists` collection endpoints, which the mobile client isn't using yet (it
   only calls the legacy singular `/me/shopping-list/*` endpoints). One real gap: no way to
   delete a list.

Read all three sections before starting — sections 1 and 2 are full net-new builds, section 3 is
a small, scoped addition plus a heads-up about a frontend migration that will follow.

This document assumes familiarity with the existing codebase conventions: layered
`models/ → repositories/ → services/ → api/v1/endpoints/` structure, `CamelModel` base (Pydantic
schemas are written in snake_case, auto-exposed as camelCase JSON), the `{"detail": ..., "code":
...}` error envelope used in `auth.py`/`me.py`, JWT access + refresh token auth via
`get_current_user`, and Alembic migrations under `alembic/versions/`. Match those patterns
exactly — don't introduce a new convention for any of this.

---

## 1. Forgot-password (OTP) flow

### Current state

`app/api/v1/endpoints/auth.py` has `signup`, `login`, `refresh`, `logout`, `logout-all`, `me`.
There is no password-reset endpoint, no OTP model, and no email-sending infrastructure anywhere
in the codebase (`app/core/config.py` has no mail-provider settings).

### What the client already does

`app/auth-forgot.tsx` in the mobile app implements a 3-step flow entirely client-side today:

1. **Email step** — user enters their email, taps "Send Reset Code".
2. **Code step** — 6-digit OTP entry (6 separate digit boxes), taps "Verify Code", can "Resend
   code".
3. **Password step** — "New Password" + "Confirm New Password" fields, taps "Reset Password".

Right now all three steps just transition local UI state and a banner tells the user this is a
preview — no network calls happen. This section is what's needed to make it real.

### Endpoints to add

All under `/api/v1/auth` (existing router), following the same request/response and error-code
style as `login`/`signup` in `auth.py`.

**`POST /auth/forgot-password`**
- Request: `{ email: string }`
- Behavior: if a user with that email exists, generate a 6-digit numeric OTP, store it
  (hashed, like refresh tokens are — see `hash_refresh_token` for the pattern), with a short
  expiry (suggest 10 minutes) and send it by email.
- **Always return 200 with the same generic response regardless of whether the email exists** —
  do not leak account existence. Response: `{ success: true }`.
- Rate-limit this per email/IP (a fixed cooldown, e.g. 60s between requests for the same email,
  is enough to start — reuse whatever pattern feels closest to existing conventions; if there's no
  rate-limiting middleware yet, a simple last-sent-at column check is fine for v1).

**`POST /auth/verify-reset-code`**
- Request: `{ email: string, code: string }`
- Behavior: validate the code against the stored (hashed) OTP for that email — check it matches,
  hasn't expired, and hasn't already been consumed.
- On success, return a short-lived **reset token** (not the user's normal access token) that
  scopes the next call to "may reset this one user's password", e.g.
  `{ resetToken: string, expiresIn: number }`. This avoids trusting the client to resubmit the
  raw OTP on the final step.
- On failure: `401` with `{ detail: "Invalid or expired code", code: "INVALID_RESET_CODE" }`.
- Consider capping attempts (e.g. 5 wrong tries invalidates the OTP and forces a resend) to
  prevent brute-forcing a 6-digit code.

**`POST /auth/reset-password`**
- Request: `{ resetToken: string, newPassword: string }` (reuse the same length validation as
  `SignupRequest.password`, `min_length=8, max_length=72`)
- Behavior: validate the reset token (not expired, not already used), hash the new password with
  `get_password_hash`, update the user's `password_hash`, mark the reset token consumed, and
  **revoke all existing refresh tokens for that user** (reuse the `_revoke_all_active_tokens`
  helper from `auth.py` — a password reset should force re-login everywhere, same as the existing
  `logout-all` behavior).
- Response: `{ success: true }`.
- Error cases: expired/invalid/already-used token → `401` with
  `{ detail: "Invalid or expired reset token", code: "INVALID_RESET_TOKEN" }`.

### Data model

New table, e.g. `password_reset_codes` (naming up to you, follow the existing `RefreshToken`
model in `app/models/user.py` as the closest analog):

- `id` (UUID PK)
- `user_id` (FK → `users.id`, `ondelete=CASCADE`)
- `code_hash` (hashed OTP, same hashing approach as `hash_refresh_token`)
- `reset_token_hash` (hashed reset token, issued after successful OTP verification — nullable
  until verified)
- `attempts` (int, default 0 — for the brute-force cap above)
- `expires_at` (timestamptz)
- `consumed_at` (timestamptz, nullable)
- `created_at` (via `TimestampMixin`)

Add an Alembic migration for this table.

### Email delivery

There's no email provider wired up yet. Pick one (Resend, SendGrid, Postmark, SES — whatever's
easiest to stand up with the existing infra/hosting) and add:
- Config settings in `app/core/config.py` (API key, from-address) — follow the existing
  `Settings` pattern, pull from `.env`.
- A small `app/services/email_service.py` with a `send_password_reset_code(email, code)`
  function. Keep the email itself minimal (plain code + short expiry note) — no need for a
  branded HTML template for v1 unless that's trivial with the chosen provider.
- If a transactional email provider is a bigger lift than expected for this pass, flag it back
  rather than silently stubbing email send with a `print()`/log statement — the mobile team needs
  to know honestly whether this is live or not before wiring the client up to it.

### Client integration note (not part of this backend task)

Once these three endpoints exist, the mobile team will wire `app/auth-forgot.tsx` to call them
and remove the "preview only" banner. No action needed from backend beyond exposing the
endpoints and confirming the exact response shapes above (adjust naming if it conflicts with
existing conventions — camelCase JSON either way).

---

## 2. "Complete Profile" personalization fields

### Current state

`app/models/user.py` has `UserProfile` (`daily_calorie_goal`, `protein_goal`, `carb_goal`,
`fat_goal`, `household_size`, `state`, `city`) — none of these map to the new gated-question
fields below. There is no `nickname`, `gender`, `birthday`, `lifestyle`, `experience`, `goals`,
`challenges`, cooking-habit, or "how did you hear about us" data anywhere in the schema.

### What the client already does

`app/profile-complete.tsx` in the mobile app is a fully built 12-question flow (nickname →
gender → birthday → lifestyle → [conditional: remote/hybrid/on-site if "Working Professional"]
→ cooking experience → goals (multi-select) → challenges (multi-select) → who they cook for →
cooking frequency → cooking time-of-day → how they heard about CookEase → [conditional: free-text
if "Other"]). It's currently backed by a local-only SQLite table
(`local_profile_answers` on-device) via `src/db/localProfileAnswersRepository.ts` — **answers
never leave the device today.** This section is what's needed to make them sync to the account.

Exact field list and value shapes the client already uses (see
`src/types/profileAnswers.ts` and the option lists in `app/profile-complete.tsx` for the
authoritative source):

| Field | Type | Notes |
|---|---|---|
| `nickname` | `string \| null` | free text |
| `gender` | `string \| null` | one of: `female`, `male`, `other`, `prefer_not_to_say` |
| `birthdayMonth` | `number \| null` | 1–12 |
| `birthdayDay` | `number \| null` | 1–31 |
| `lifestyle` | `string \| null` | one of: `student`, `working_professional`, `stay_at_home`, `retired`, `other` |
| `remoteFlex` | `string \| null` | one of: `remote`, `hybrid`, `on_site` — only meaningful when `lifestyle === "working_professional"` |
| `experience` | `string \| null` | one of: `beginner`, `intermediate`, `advanced`, `chef_level` |
| `goals` | `string[]` | multi-select from: `eat_healthier`, `save_money`, `save_time`, `learn_cuisines`, `reduce_waste`, `meal_prep` |
| `challenges` | `string[]` | multi-select from: `time`, `budget`, `skills`, `motivation`, `picky_eaters`, `equipment` |
| `habitWho` | `string \| null` | one of: `just_me`, `partner`, `family`, `roommates` |
| `habitFreq` | `string \| null` | one of: `daily`, `few_times_week`, `weekly`, `rarely` |
| `habitTime` | `string \| null` | one of: `morning`, `afternoon`, `evening`, `late_night` |
| `heard` | `string \| null` | one of: `social_media`, `friend_family`, `app_store`, `search`, `other` |
| `heardOther` | `string \| null` | free text — only meaningful when `heard === "other"` |

These option value strings were chosen on the frontend without backend input — if any should be
enums with stricter validation, or renamed to match an existing naming convention elsewhere in
the schema, that's fine to adjust, just confirm the final values back so the client's option
lists stay in sync.

### Endpoints to add

Under `/api/v1/me` (existing router, alongside `/me/preferences`):

**`GET /me/profile-answers`**
- Returns the current user's answers, or all-null/empty defaults if none saved yet (don't 404 —
  match the "get-or-create" pattern already used for `get_or_create_preferences` in
  `UserRepository`).

**`PUT /me/profile-answers`**
- Full-replace update (same pattern as `PUT /me/preferences` in `me.py`), body is all fields
  above (optional/nullable, client always sends the full current answer set).
- Response: the saved record.

### Data model

New table `user_profile_answers`, one row per user (`user_id` FK, unique, `ondelete=CASCADE`),
following the `UserPreferences` model shape in `app/models/user.py` as the closest analog:

- `id` (UUID PK)
- `user_id` (FK → `users.id`, unique, `ondelete=CASCADE`)
- `nickname` (nullable string)
- `gender` (nullable string)
- `birthday_month` (nullable int)
- `birthday_day` (nullable int)
- `lifestyle` (nullable string)
- `remote_flex` (nullable string)
- `experience` (nullable string)
- `goals_json` (JSON array of strings, default `[]`)
- `challenges_json` (JSON array of strings, default `[]`)
- `habit_who` (nullable string)
- `habit_freq` (nullable string)
- `habit_time` (nullable string)
- `heard` (nullable string)
- `heard_other` (nullable string)
- `created_at` / `updated_at` (via `TimestampMixin`)

Add an Alembic migration for this table and a relationship on `User` (mirroring
`preferences`/`profile` relationships already on the model).

### Client integration note (not part of this backend task)

Once this exists, the mobile team will swap `src/store/profileAnswersStore.ts` /
`localProfileAnswersRepository.ts` from local-only storage to calling these two endpoints (kept
local-first: still cached in SQLite, but now also synced), and remove the "won't sync across
devices yet" caveat currently shown in the codebase comments.

---

## 3. Multi-list shopping ("Your Lists")

### Current state — good news, this is mostly already built

`app/api/v1/endpoints/shopping_lists.py`, mounted at `/api/v1/shopping-lists`, already supports
real multi-list CRUD:

- `GET /shopping-lists` — list all of the current user's lists
- `POST /shopping-lists` — create a new list (`{ name, isActive }`)
- `GET /shopping-lists/{id}` — fetch one list with items
- `PATCH /shopping-lists/{id}` — rename / toggle active
- `POST /shopping-lists/{id}/items`, `PATCH .../items/{itemId}`, `DELETE .../items/{itemId}` —
  full item CRUD scoped to a specific list

`ShoppingList.is_active` already functions as the "this is the one default list" flag —
`ShoppingListRepository.get_active_for_user` auto-creates one if the user has none, which is
exactly the "default synced list" concept the mobile redesign needed.

**The mobile app doesn't call any of this yet.** The current "Your Lists" UI
(`app/(tabs)/shopping.tsx`, `app/shopping/[id].tsx`) was built against this backend gap
assumption and, for this redesign pass, was deliberately scoped as **local-only**: exactly one
list (matching the legacy `/me/shopping-list/*` singular endpoints) stays wired to the real API;
every other list a user creates lives only in on-device SQLite and never syncs. That was the
correct call at the time — this section exists so the one real gap gets closed and so backend
knows a frontend follow-up (switching the client from `/me/shopping-list/*` to
`/shopping-lists/*`) is coming and shouldn't be surprising.

### The one actual gap: deleting a list

There's no `DELETE /shopping-lists/{id}`. Add it:

**`DELETE /shopping-lists/{shopping_list_id}`**
- Auth + ownership check identical to the existing `_owned_shopping_list` helper in
  `shopping_lists.py`.
- Should cascade-delete the list's items (the `ShoppingList.items` relationship already has
  `cascade="all, delete-orphan"`, so this should fall out naturally from an ORM delete).
- **Reject deleting a user's only remaining list, or their currently-active (`is_active=true`)
  list** — return `409` with `{ detail: "Cannot delete your active list", code:
  "CANNOT_DELETE_ACTIVE_LIST" }`. The mobile UI already enforces "the default list can't be
  deleted" locally; mirror that server-side so the API is safe to call directly too.
- Response: `204 No Content` on success (matching `delete_shopping_list_item`'s status code
  convention).

### Client integration note (not part of this backend task)

No other backend changes are needed for this feature. Once the `DELETE` endpoint above ships,
the mobile team will do a follow-up pass to point `app/(tabs)/shopping.tsx` /
`app/shopping/[id].tsx` at `/shopping-lists/*` instead of the local-only SQLite path, so
non-default lists start actually syncing. That's frontend work, not backend — flagging only so
it's not a surprise when it lands.

---

## Out of scope (do not build)

- **"Continue with Google" sign-in** — shown in the original design mockup but intentionally
  **not** built into the redesigned auth screen (no backend OAuth support exists, and it wasn't
  part of the agreed scope for this pass). Don't add Google OAuth as part of this work.
- **GoLemon checkout** — still an explicit placeholder ("Coming Soon") on both the shopping list
  and recipe-detail "Helpful Tools" sections, unchanged from before this redesign. Not part of
  this backend request.
- **Calorie planner** — still disabled/hidden in the planner tab, pending its own backend work
  from an earlier pass. Not part of this request.

## Suggested order of work

1. Multi-list `DELETE` endpoint (small, isolated, unblocks a frontend follow-up quickly).
2. Complete Profile fields (single new table, no external dependencies, straightforward CRUD).
3. Forgot-password/OTP (largest lift — needs an email provider decision and integration before
   the endpoints are meaningfully testable end-to-end).

## Acceptance checklist

- [ ] `DELETE /shopping-lists/{id}` added, rejects deleting the active/only list, cascades items.
- [ ] `user_profile_answers` table + migration + `GET`/`PUT /me/profile-answers` endpoints,
      matching the field list and value shapes in section 2.
- [ ] Password-reset table + migration + `POST /auth/forgot-password`,
      `POST /auth/verify-reset-code`, `POST /auth/reset-password`, with rate-limiting and
      attempt-capping as described.
- [ ] An email provider is actually wired up and sending — not stubbed — before calling the OTP
      flow done, and the mobile team is told which provider/sender address is in use.
- [ ] All new endpoints follow existing conventions: `CamelModel` schemas, `{"detail", "code"}`
      error bodies, `get_current_user` auth dependency, repository/service layering.
- [ ] All new response field names are confirmed back to the mobile team before they wire up
      the client (the field names above are the client's current assumption, not a locked
      contract).
