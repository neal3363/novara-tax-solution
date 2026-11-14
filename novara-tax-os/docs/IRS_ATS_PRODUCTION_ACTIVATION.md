# Official IRS ATS & Production Activation

**Status:** Preparation only — official ATS **not** completed  
**Mock MeF acknowledgments are not official IRS testing.**

## Credentials required (owner)

1. NOVARA EFIN  
2. Software Developer Test ETIN  
3. Software Identification Number(s)  
4. A2A Application System ID (if A2A)  
5. Later: Transmitter Production ETIN after communication test  

## Submission steps (code: `officialAtsSubmissionSteps`)

1. Obtain Test ETIN / Software ID / EFIN  
2. Confirm ATS window on IRS.gov  
3. Select Pub 1436 scenarios; map official IDs  
4. Prepare synthetic packs (`buildAllSyntheticAtsPacks`)  
5. Validate against season schema packs  
6. Enroll A2A if applicable  
7. Transmit to **official** IRS ATS (not `sandboxAdapter`)  
8. Record results with `liveIrs=true`, `simulated=false` only  
9. Complete Transmitter communication test  
10. Owner authorizes production activation  

## Recording results

`recordAtsScenarioResult({ source: 'official_irs', ... })` **rejects** simulated ACKs.  
`claimOfficialAtsComplete()` fails if only mock accepts exist.

## Production activation checklist (all required)

- [ ] Official ATS acceptances documented for required scenarios  
- [ ] Transmitter Production status confirmed by IRS  
- [ ] Independent AppSec critical/high remediations closed  
- [ ] Pub 4557 / FTC safeguards owner program acknowledged  
- [ ] `liveProductionTransmit` remains false until written owner go-live  
- [ ] No real taxpayer returns until production security enforcement authorized  

## Related

- `docs/IRS_EFILE_AUTHORIZATION_PATHWAY.md`  
- `src/engine/irs/mef/ats/*`  
