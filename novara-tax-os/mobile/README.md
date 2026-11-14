# NOVARA Tax OS — Mobile Applications (iOS & Android)

**Approach:** Capacitor shell around the existing NOVARA Tax OS web platform so TC / TP / Office share one backend and business logic.  
**Signed store builds:** Require owner Apple Developer + Google Play accounts and (for iOS) a macOS/Xcode host.  
**Live payments / IRS / banking:** Remain disabled until authorized — same locks as web.

## Features (parity targets)

| Feature | Status in scaffold |
|---------|-------------------|
| TC / TP / Office login & dashboards | Via existing web routes in WebView |
| Document scanning & uploads | Bridge stub → Camera / Filesystem plugins |
| AI tax prep workflow | Existing web interview |
| Review & e-signature (8879) | Existing web + native confirm sheet stub |
| Subscriptions / payments | Sandbox Stripe; Apple IAP policy notes in store docs |
| Filing status tracking | Existing web filing status |
| Push notifications | Bridge stub (APNs / FCM) — needs owner certs |
| Biometric auth | Bridge stub (Face ID / fingerprint) |
| Account management / deletion | Existing account UI + App Store deletion URL |
| NOVARA branding | Shared CSS/fonts from web + store assets checklist |

## Commands (after owner installs tooling)

```bash
cd mobile
npm install
npm run sync:web   # builds ../ and copies dist → www
npx cap sync
npx cap open ios     # macOS only
npx cap open android
```

## Store packages

- `store/ios/` — App Store Connect listing, privacy, TestFlight checklist  
- `store/android/` — Play Console listing, Data safety, signing checklist  
- `store/SHARED_PRIVACY_DISCLOSURES.md`

## Non-claims

- This folder does **not** mean apps are live on the App Store or Play Store.  
- TestFlight / internal testing require owner developer accounts.  
- A Linux CI agent cannot produce a signed IPA.  
