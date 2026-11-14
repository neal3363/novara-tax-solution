# TEST_RESULTS.md

## Command

```bash
npm test
```

## Coverage focus

- Portal role isolation
- Partner cannot read master discovery pool
- Cross-partner opportunity leak prevention
- First Look decision authority
- AI cannot finalize legal determinations
- Workflow stage sequence integrity
- Partner assistant scope denylist
- Synthetic labeling of opportunities
- Session cookie encode/decode + portal path mapping
- ABAC territory / sensitivity / export watermarking
- Immutable audit append + mutation rejection

## Results

Executed via `npm test` (Vitest 3.2.7): **6 files, 21 tests, all passed.**  
Production build succeeded (52 routes + middleware).

| Suite | Intent | Result |
|-------|--------|--------|
| `src/lib/rbac/policy.test.ts` | Permissions / partner isolation | Pass (6) |
| `src/lib/rbac/abac.test.ts` | ABAC territory/docs/exports | Pass (4) |
| `src/lib/workflow/stages.test.ts` | Core workflow + synthetic flag | Pass (4) |
| `src/lib/agents/registry.test.ts` | AI limits + assistant scope | Pass (2) |
| `src/lib/auth/cookies.test.ts` | Session cookie integrity | Pass (3) |
| `src/lib/audit/store.test.ts` | Immutable audit store | Pass (2) |

## Not yet automated

- End-to-end browser flows with middleware cookies
- Connector idempotency / dedupe under replay
- Compensation approval guards with real ledgers
- Production MFA enrollment
