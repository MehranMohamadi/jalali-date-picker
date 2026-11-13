# Budgetyar device privacy

The eye button in the mobile top bar, desktop toolbar, and Settings masks displayed amounts with `••••`. The device preference is `budgetyar-hide-amounts-v1`; it is independent of accounts and cloud snapshots. Money inputs are masked and disabled, monetary descriptions are masked, and chart canvases are hidden. Dates and financial calculations retain their original values. Backups and exported reports retain actual amounts. This is display privacy, not encryption of localStorage.

`usePrivacy.ts` owns the frontend preference and native capability detection. `useBudgetyar.ts` exposes masked display formatters while its internal formatters remain unchanged for reports and calculations. Older APKs and browsers keep amount masking but cannot enable the native app lock.

`BudgetyarPrivacyPlugin.java` stores the app-lock preference in Android private SharedPreferences. Enabling and disabling require AndroidX BiometricPrompt authentication; device PIN, pattern, or password provides recovery when biometrics cannot be used. Android 11+ uses strong biometrics or device credentials; older supported Android versions use the compatible weak-biometric/device-credential combination. See [Android authentication documentation](https://developer.android.com/identity/sign-in/biometric-auth).

The native opaque cover hides the WebView on cold start and every activity pause while locking is enabled. Unlock is explicit and cancellation leaves the cover in place. The WebView is hidden from accessibility until authentication succeeds. `FLAG_SECURE` restricts screenshots and recent-app previews while locking is enabled. This controls access through the app UI; it does not encrypt financial records or replace account authentication.

Native changes require a new APK; a hosted-content update alone cannot add this plugin. Build manually from the repository root in PowerShell:

```powershell
rtk npm run build:mobile
rtk npm exec -- cap sync android
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Android\SDK'
$env:ANDROID_SDK_ROOT = 'C:\Android\SDK'
Set-Location android
rtk proxy .\gradlew.bat :app:assembleDebug --no-daemon --max-workers=2 --console=plain
```

The first build may need network access to download AndroidX Biometric. Compilation without producing an APK uses `:app:compileDebugJavaWithJavac` instead of `:app:assembleDebug`.

Before distributing, test on a real device:

- Enable and disable locking; cancel each authentication and verify the preference stays unchanged.
- Verify biometric success, failed attempts, lockout, and device-credential fallback, including Android 10 and Android 11+ if supported devices are available.
- Verify cold launch, process death, Home/recent-app return, screen off/on, Back while locked, and cancellation/retry. No financial content should appear before authentication.
- Verify recent-app previews and screenshots are protected while locking is enabled.
- Verify masking persists after reload and covers dashboard widgets, transactions, goal amounts, input values, amounts in words, analytics charts, and generated advice. Toggle it back and verify values are restored.
- Verify exports/backups and cloud data contain the original values and account switching does not disable device privacy.
- Verify browsers and older APKs can mask amounts without offering an unusable native lock.

Automated checks: `rtk npm test`; after `rtk npm run build:app`, run `rtk proxy node scripts/test-privacy.mjs` for Chrome checks of mobile layout, toggle persistence, masked inputs/tooltips/charts, and preservation of original data. Chrome and Playwright must be installed for the browser check.
