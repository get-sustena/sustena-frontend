# Sustena Expo web deployment

The web app is generated from the same Expo Router project used by iOS and Android.
It is a single-page application, so the host must return `index.html` for application
routes such as `/recipes/abc`.

## 1. Configure the production API

Set this value in the web host's build environment:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.getsustena.com/api/v1
```

The value is compiled into the public JavaScript bundle and must not contain a secret.
A trailing slash is accepted and removed by the app.

The tracked `.env` also uses this production address so a local export cannot
accidentally embed a private LAN address. To run the app against a backend on
your computer, create an ignored `.env.development.local` file and put the local
address there. Do not use a private `192.168.x.x`, `10.x.x.x`, localhost, or
loopback address in a production web build.

On Elastic Beanstalk, add the deployed web origin to `BACKEND_CORS_ORIGINS`:

```text
BACKEND_CORS_ORIGINS=https://app.getsustena.com
```

Use comma-separated values when more than one browser origin is required. Origins do
not include `/api/v1`, another path, or a trailing slash.

## 2. Configure S3 uploads for browsers

Direct browser uploads use the presigned URL returned by the API. Add the deployed
web origin to the media bucket CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedOrigins": ["https://app.getsustena.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add the local preview origin only while testing locally:

```text
http://localhost:4173
```

## 3. Build

From `cookease-frontend`:

```bash
npm ci
npm run web:export
```

The deployable output is written to `dist/`.

## 4. Host the output

Deploy the `dist/` directory to a static host. The repository includes:

- `vercel.json` for Vercel rewrites and required SQLite/WASM response headers.
- `public/_redirects` and `public/_headers` for hosts that support Netlify-style files.

For a local production preview:

```bash
npm run web:preview
```

The preview is available at `http://localhost:4173`.

## 5. Release checks

Before directing production traffic to the web app, verify:

- Sign up, login, logout, refresh-token recovery, password reset and email links.
- Direct page refreshes on nested routes.
- Recipe images and profile images from the S3 media domain.
- Profile and recipe image upload from a browser.
- Recipe creation, draft recovery and publishing.
- Planner generation, saved recipes and shopping lists.
- Layout and keyboard navigation at phone, tablet and desktop widths.
- Privacy policy, terms, support contact and production analytics settings.
