# Count//Down

A private, pixel-retro Progressive Web App for deadlines, bills, birthdays, appointments, and important dates.

## Features

- Mobile-first dashboard, calendar, history, categories, and settings
- Recurring countdowns with virtual occurrences and per-occurrence completion history
- Local backup/import JSON, theme selection, and installable PWA shell
- Browser notification permission diagnostics (delivery is not configured)

## Tech stack

Next.js 14 App Router, TypeScript, Tailwind/CSS tokens, date-fns, Lucide, localStorage, and Vitest.

## Run locally

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

To test on an iPhone or Android phone, run the dev server on your LAN and open the displayed network URL. `localhost`, a LAN IP, and production HTTPS are separate browser origins, so they do not share data.

## PWA installation

Production builds include a manifest, PNG icons, and a small service worker for the app shell/offline fallback. Open the deployed HTTPS site in Safari and use **Add to Home Screen**, or use Chrome’s install prompt. The service worker intentionally does not register during development.

## Data and privacy

Countdowns, categories, and settings live in `localStorage` for the current browser origin only. They do not sync between devices. Clearing site data, deleting the installed PWA, or changing origin can make data unavailable. Export JSON regularly before clearing browser data.

## Recurrence model

Recurring countdowns are stored once as a series root. Calendar and Dashboard generate only the requested date range in memory. Completing an occurrence stores a small recurrence exception (`completed`, `skipped`, or `cancelled`) instead of creating unlimited future records. Stopping a series preserves past completion history and stops future generation.

## Notifications

The app can check/request browser permission only. It does not have push subscriptions, VAPID keys, a backend sender, or a scheduling service, so permission alone will not deliver deadline notifications. iOS web push also requires an installed Home Screen PWA and HTTPS.

## Browser support and deployment checklist

- Current Safari on iPhone/iPad, Chrome on Android, and modern desktop browsers
- Deploy over HTTPS
- Verify manifest/icons and Home Screen installation
- Export a backup before changing deployments or clearing storage
- Run lint, typecheck, tests, and build before release

## Known limitations

There is no account, cloud sync, or server-side reminder delivery in this version. Recurring edits apply to the series and future occurrences; historical completion exceptions remain.
