# TEST_RESULTS.md

## Command

```bash
npm test
```

## Coverage focus (foundation)

- Portal role isolation
- Partner cannot read master discovery pool
- Cross-partner opportunity leak prevention
- First Look decision authority
- AI cannot finalize legal determinations
- Workflow stage sequence integrity
- Partner assistant scope denylist
- Synthetic labeling of opportunities

## Results

Executed 2026-11-14 (UTC) via `npm test` (Vitest 3.2.7): **3 files, 12 tests, all passed.**

| Suite | Intent | Result |
|-------|--------|--------|
| `src/lib/rbac/policy.test.ts` | Permissions / partner isolation | Pass (6) |
| `src/lib/workflow/stages.test.ts` | Core workflow + synthetic flag | Pass (4) |
| `src/lib/agents/registry.test.ts` | AI limits + assistant scope | Pass (2) |

Production build (`npm run build`) also succeeded (40 static routes).

## Not yet automated

- End-to-end browser flows
- Connector idempotency / dedupe under replay
- Compensation approval guards with real ledgers
- MFA enrollment

Modules are not marked production-complete until their acceptance tests pass.
