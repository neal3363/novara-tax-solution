# Remediation WS7–8 — Mobile / A11y / Performance / Recovery

## WS7 Mobile, accessibility, performance

| Check | Status |
|-------|--------|
| Static aria/role/keyboard inventory (`test:a11y-static`) | PASS_STAGING |
| iPhone | NOT_TESTED |
| Android | NOT_TESTED |
| iPad | NOT_TESTED |
| Desktop browser E2E automation | NOT_TESTED |
| Screen reader (VoiceOver/TalkBack) | NOT_TESTED |
| axe / Lighthouse | NOT_TESTED |
| Controlled staging load test | NOT_TESTED |
| Homepage cinematic smoke (prior Master QA) | PASS |

Do not claim device or performance PASS without lab evidence.

## WS8 End-to-end recovery

| Check | Status |
|-------|--------|
| Backup/restore simulation | PASS_STAGING |
| Payment provider failure | PASS_STAGING |
| Banking disconnected | PASS_STAGING |
| Mock IRS transmitter unavailable | PASS_STAGING |
| Duplicate request idempotency | PASS_STAGING |
| Session invalidation | PASS_STAGING |
| Password reset single-use | PASS_STAGING |
| Production DB outage drill | NOT_TESTED |
| Interrupted upload UX | NOT_TESTED |
| Network interruption UX | NOT_TESTED |

Harness: `npm run test:recovery-remediation`
