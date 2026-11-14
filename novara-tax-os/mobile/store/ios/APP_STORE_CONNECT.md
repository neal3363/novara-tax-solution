# Apple App Store Connect — NOVARA Tax OS

**Status:** Materials prepared; submission blocked on owner Apple Developer account + signed build (macOS/Xcode).

## Owner prerequisites

1. Enroll in Apple Developer Program ($99/yr)  
2. Create App ID `com.novara.taxos`  
3. Create App Store Connect record “NOVARA Tax OS”  
4. Configure certificates, provisioning profiles, push (APNs) if enabling notifications  
5. Provide privacy policy URL on owned domain  

## Listing draft

| Field | Value |
|-------|-------|
| Name | NOVARA Tax OS |
| Subtitle | AI tax prep for clients & offices |
| Category | Finance |
| Content rights | NOVARA proprietary |
| Age rating | 4+ (no unrestricted web; confirm questionnaire) |
| Price | Free (software fees via approved billing model) |

### Description (draft)

NOVARA Tax OS is independent tax preparation software for individuals, tax preparers, and tax offices. Prepare returns with AI-assisted interview, upload documents, review calculations, and track filing status. Electronic filing and payments activate only after required authorizations.

### Keywords (draft)

tax, taxes, tax preparer, 1040, e-file, tax office, AI tax

## Privacy Nutrition Labels (draft)

| Data type | Linked to identity | Used for tracking | Purpose |
|-----------|--------------------|-------------------|---------|
| Contact info | Yes | No | Account |
| Financial info | Yes | No | App functionality |
| Sensitive tax info | Yes | No | App functionality |
| Identifiers | Yes | No | App functionality |
| Diagnostics | No | No | Analytics (when GA authorized) |

Full text: `../SHARED_PRIVACY_DISCLOSURES.md`

## TestFlight

1. Archive signed build on macOS  
2. Upload to App Store Connect  
3. Add internal testers (owner + QA)  
4. External TestFlight only after beta compliance review  

## Apple IAP note

Confirm with counsel whether subscriptions must use IAP when purchased in-app. Sandbox Stripe on web does not authorize IAP bypass.

## Submission blockers (current)

- [ ] Owner Apple Developer enrollment  
- [ ] macOS signed IPA / archive  
- [ ] Privacy policy on production domain  
- [ ] Screenshots (6.7", 6.1", iPad if supporting)  
- [ ] App icon 1024×1024  
- [ ] Independent AppSec / IRS gates as required for live tax features  
