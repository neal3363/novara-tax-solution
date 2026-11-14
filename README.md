# NOVARA Asset Intelligence™

Private AI operating system for national asset discovery, recovery, acquisition, and intelligence.

**This application is separate from NOVARA Tax OS.** See `docs/SEPARATION_EVIDENCE.md` for repository isolation status and required human steps.

## Preview (local)

Copy `.env.example` to `.env.local` and configure authentication secrets (see `docs/AUTH_CONFIGURATION.md`).

Required for password mode:

- `AUTH_SECRET`
- `AUTH_MODE=password`
- `AUTH_USERS_JSON` (per-user scrypt hashes + TOTP secrets — never commit)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo portal emails

| Role | Email | Path |
|------|-------|------|
| Executive | executive@novara.preview | `/app/executive` |
| Partner | partner@novara.preview | `/app/partner` |
| Attorney | attorney@novara.preview | `/app/attorney` |
| Owner/Heir | owner@novara.preview | `/app/owner` |

Passwords/TOTP come only from configured secrets. Shared demo passwords are removed.

All operational data in this build is **synthetic** and labeled.

## Scripts

- `npm run dev` — local preview server
- `npm run build` — production build (+ migrate when `DATABASE_URL` is set)
- `npm test` — security, isolation, workflow, and AI control tests
- `npm run export:ai` — secrets-free export pack for transfer to `neal3363/novara-asset-intelligence`

## Authentication vs live data

Configuring the nine auth variables (see `docs/AUTH_CONFIGURATION.md`) enables portal login only.
It does **not** enable live asset connectors. Synthetic data remains labeled until connectors are separately approved.
