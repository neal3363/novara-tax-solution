# External AppSec / Penetration Test — Engagement Package

**Internal automated scans do not substitute for this engagement.**  
Tracker: `EXT-APPSEC` remains **BLOCKED** until a third-party report exists.

## Testing environment to provide the firm

| Item | Guidance |
|------|----------|
| Synthetic public demo URL | Current Tax OS host (synthetic only) |
| Staging credentials | Owner-issued temporary TC / TP / Office / Admin accounts |
| API surfaces | `api/session.ts`, `api/demo-safety.ts`, future Workers stubs |
| Out of scope | Live IRS, live banking, real taxpayer PII, destructive DoS |
| Data | Synthetic fixtures only — never production taxpayer data |

Full technical scope: `APPSEC_PENTEST_SCOPE.md`  
Controls map: `src/engine/security/assessment/pub4557FtcSafeguards.ts`

## Suggested firm shortlist (obtain quotes)

| Firm | Typical band (USD) | Site |
|------|--------------------|------|
| Cobalt | 8k–25k | https://www.cobalt.io/ |
| Bugcrowd managed pentest | 5k–20k+ | https://www.bugcrowd.com/ |
| Bishop Fox | 15k–45k+ | https://bishopfox.com/ |
| NCC Group | 15k–40k+ | https://www.nccgroup.com/ |
| Trail of Bits | 20k–50k+ | https://www.trailofbits.com/ |

Budget planning: initial 5k–40k+; retest 1.5k–5k.

## Owner actions

1. Select firm; sign SOW  
2. Issue staging access; confirm synthetic-only data  
3. Receive report; prioritize Critical/High  
4. Developer remediates; firm retests  
5. Store PDF evidence against `EXT-APPSEC`  

## Internal pre-engagement scans (not independent)

Run: `npm run test:security-assessment`  
Produces automated suite results under `docs/security-assessment/` artifacts when generated.
