# NOVARA Asset Intelligence™

Private AI operating system for national asset discovery, recovery, acquisition, and intelligence.

**This application is separate from NOVARA Tax OS.** It does not share product code, data models, or workflows with tax software.

## Preview (local)

Copy `.env.example` to `.env.local` and set:

- `AUTH_SECRET` — at least 32 characters (signs portal session cookies)
- `PREVIEW_AUTH_PASSWORD` — at least 12 characters (portal login password)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo portal emails

Password is whatever you set in `PREVIEW_AUTH_PASSWORD` (never commit real values).

| Role | Email | Path |
|------|-------|------|
| Executive | executive@novara.preview | `/app/executive` |
| Partner | partner@novara.preview | `/app/partner` |
| Attorney | attorney@novara.preview | `/app/attorney` |
| Owner/Heir | owner@novara.preview | `/app/owner` |

All operational data in this build is **synthetic** and labeled. No live official-source connectors are activated.

## Design system

- Midnight Navy `#0B1426`
- Deep Navy `#18263C`
- Champagne Gold `#D8B56A`
- White `#FFFFFF`
- Silver `#B7C3D5`

## Documentation

See `/docs` for audit, architecture, design system, competitor gap analysis, roadmap, progress, tests, and production readiness.

Blueprint addendum (does not overwrite v1.3): `docs/VERSION_1_4_ADDENDUM.md`

## Scripts

- `npm run dev` — local preview server
- `npm run build` — production build
- `npm test` — permission, isolation, workflow, and AI control tests

## Business model (preserved)

- Max 100 external partners
- Two partner seats per state
- Target $10,000/month partner subscription
- NOVARA First Look before external release
- Exclusive opportunity assignments
- 60/40 economics only when legally authorized for the specific transaction
- Separate attorney fee ledgers
