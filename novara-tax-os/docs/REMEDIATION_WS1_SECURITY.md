# Remediation Workstream 1 — Security & Account Recovery

**Branch:** `cursor/prod-remediation-security-4bf9`  
**Checkpoint:** `checkpoint/pre-prod-remediation-4bf9`  
**Status:** Staging complete — **productionEnforcement=false**

## Completed in code (synthetic / staging)

| Item | Status | Evidence |
|------|--------|----------|
| Password recovery + hashed single-use tokens | PASS_STAGING | `passwordReset.ts` + `test:security-remediation` |
| Anti-enumeration on reset request | PASS_STAGING | Unknown email returns accepted without token |
| MFA enroll / recovery / admin revoke | PASS_STAGING | Phase 7 workflows + remediation tests |
| Session revoke + TTL expiration | PASS_STAGING | `sessionHardening.ts` |
| Rate limit / brute-force lockout | PASS_STAGING | `rateLimit.ts` |
| CSRF double-submit tokens | PASS_STAGING | `csrf.ts` |
| XSS escape / dangerous markup reject | PASS_STAGING | `xssSanitize.ts` |
| SQL-meta / path-traversal guards | PASS_STAGING | `injectionGuard.ts` |
| Sensitive redaction | PASS_STAGING | SSN/PAN patterns |
| Secure upload / malware | PASS_STAGING | Existing Phase 7 (regression) |
| Backup/restore simulation | PASS_STAGING | Durable store sim — **not** production drill |
| TC/TP/Office isolation | PASS_STAGING | Cross-tenant deny re-verified |
| Automated negative security tests | PASS_STAGING | `npm run test:security-remediation` |

## Still BLOCKED (external / infra)

- Independent application security assessment  
- Production secrets manager + cloud KMS verification  
- Production backup restore drill on real infrastructure  
- Production enforcement enablement (requires human approval)  

## Pricing / UI

Unchanged: TC $300/$399; homepage/branding/Maximizer untouched.
