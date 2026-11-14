# Google Play Console — NOVARA Tax OS

**Status:** Materials prepared; submission blocked on owner Play Console + signed AAB.

## Owner prerequisites

1. Google Play Console enrollment ($25 one-time)  
2. Create application “NOVARA Tax OS”  
3. Create upload key / Play App Signing  
4. Complete Data safety form  
5. Privacy policy URL on owned domain  

## Listing draft

| Field | Value |
|-------|-------|
| Title | NOVARA Tax OS |
| Short description | AI tax prep for clients, preparers, and tax offices |
| Category | Finance |
| Free | Yes (in-app software fees per approved pricing) |

### Full description (draft)

NOVARA Tax OS is independent commercial tax software. Individuals, preparers, and tax offices can prepare returns, upload documents, review results, and track filing. Live IRS e-file and live payments remain disabled until authorizations complete.

## Data safety (draft)

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Personal info | Yes | No (except processors) | App functionality |
| Financial info | Yes | Payment processor / bank partner when authorized | App functionality |
| Tax documents | Yes | No (storage processor) | App functionality |
| App activity | Optional | No | Analytics when authorized |

Declare encryption in transit; user can request deletion.

## Signing

```bash
# Owner generates upload keystore offline — never commit keystore or passwords
# jarsigner / apksigner against release AAB after `npx cap build android`
```

## Testing tracks

1. Internal testing track with signed AAB  
2. Closed testing  
3. Production — only after owner go-live  

## Submission blockers (current)

- [ ] Play Console account  
- [ ] Signed AAB  
- [ ] Feature graphic + screenshots  
- [ ] Data safety form submitted  
- [ ] Privacy policy URL  
- [ ] Live tax features gated until IRS/AppSec approvals  
