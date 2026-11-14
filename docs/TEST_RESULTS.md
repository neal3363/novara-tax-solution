# TEST_RESULTS.md

## Command

```bash
npm test
npm run build
```

## Latest results (security isolation branch)

- Vitest: **10 files, 29 tests, all passed**
- `next build`: success (56 routes + middleware)

### Security-focused suites

| Suite | Coverage |
|-------|----------|
| `auth/session.test.ts` | Per-user passwords; fail-closed without config |
| `auth/cookies.test.ts` | Signed v2 sessions; MFA flag not forged unsigned |
| `auth/totp.test.ts` | TOTP accept/reject |
| `auth/rate-limit.test.ts` | Lockout after repeated failures |
| `rbac/documents.test.ts` | Attorney cannot see owner ID; partner isolation |
| `rbac/policy.test.ts` | Portal/master-pool isolation |
| `rbac/abac.test.ts` | Territory / export watermarking |
