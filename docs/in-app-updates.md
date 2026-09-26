# Budgetyar in-app updates

Android shell version 2 opens the hosted HTTPS app at `/`. Web and Android use the same release and worker scope; no separate `/_hybrid/` bundle is needed here. The reference document describes another application's Webpack/ZIP implementation. Budgetyar uses Nuxt output with individual SHA-256 verified assets, not MP4/ZIP files or a Capacitor dependency patch.

## Build and release

- `npm run build:app` generates Nuxt output and then `sw.js`, `version.json`, and `application-shell.json` with one build ID. Do not deploy raw `nuxi generate` output.
- `npm run build:vercel` runs the same build and copies it to the configured `public/` output. Deploy the entire release together. Never edit only `version.json`.
- Update `playground/version.ts` for a visible version change. The build ID changes every build, even for the same app version.
- For the native shell, run `npm run build:mobile`, `npx cap sync android`, then the documented PowerShell APK commands in the root README. `build:mobile` only creates the bootstrap; it does not build an APK.
- `BUDGETYAR_MOBILE_API_URL` selects a trusted HTTPS origin at Capacitor sync time. Its default is the production frontend. No wildcard navigation is allowed.

## Runtime and data

The local bootstrap keeps the existing `https://localhost` origin long enough to copy allowlisted finance keys into private native preferences. The remote app restores them before initializing finance state, then acknowledges completion. Original localStorage is retained; stale source data is not replayed on later starts. Legacy browser passwords/tokens are excluded; cloud settings retain account ownership but reset to local mode and cloud version zero. Conflicting remote data blocks migration instead of merging accounts. Interrupted writes can resume. If migration remains blocked, preserve app data and investigate the two datasets; uninstalling or clearing WebView storage can destroy local records.

`MainActivity` uses AndroidX WebKit document-start injection for the registered native plugins on the exact trusted remote origin. This runs even when HTML comes from Cache Storage. Keep its plugin list aligned with `registerPlugin`. A WebView lacking document-start support is blocked with an update message. The native Java sources compile against Capacitor 8; no changes to node_modules are needed. Old local service workers are unregistered before opening the new bootstrap; financial localStorage is not cleared. A separate local error page provides a manual retry without a navigation loop.

`update-bootstrap.js` registers the worker independently of Vue, checks every three minutes while running, and checks again on foreground/pageshow/online. Install waits for every successful response, hash verification, and cache write; failed installs delete only their incomplete shell. Network errors, HTML fallback, or mixed deployment files cannot mark an incomplete release ready. API requests and off-origin resources are never runtime-cached.

The app displays a waiting release and activates it only through the user's action. An open transaction modal blocks activation; other edited forms ask before reloading. Other tabs with edited forms defer their reload when the controller changes. Cached routes and hashed assets serve offline. The previous healthy shell is retained, but automatic local rollback is not implemented.

Health metadata records activation and confirms the matching build only after app mount. If a build has remained unhealthy for two minutes, a later fully downloaded release may activate without the broken UI. This is corrective-release recovery, not guaranteed recovery or rollback. There is no automatic force/pause policy in this app.

## Tests and limits

`npm test` includes migration tests for account ownership, credential exclusion, conflicts, and interrupted imports. `scripts/test-updates.mjs` runs the generated production build in Chrome via Playwright, simulates Vercel clean-URL redirects, and tests A → B activation, localStorage retention, offline restart, rejected corrupt release C, and preservation of unrelated caches. Install Playwright separately or set `BUDGETYAR_PLAYWRIGHT` to its `index.mjs`. The screenshot is written to `.output/update-demo.png`.

Native compilation without an APK: `:app:compileDebugJavaWithJavac`. Browser emulation does not prove Android bridge behavior. Before distributing the new APK, test on a real device: upgrade an existing install with the same signing key, verify finance data, account login, bank notification access, foreground update, cold offline start, and bridge calls after an update. Do not claim these device tests passed without a connected device and evidence.

The Settings demo clearly says it is a simulation. A real on-device A → B acceptance test requires installing shell v2 first and publishing a second complete web release while the app is open. The current release adds the update UI and demo; it does not remotely modify an already installed v1 APK.
