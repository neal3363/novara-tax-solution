# NOVARA Tax OS — V1 Architecture Decision Record (local)

## Stack
- React 19 + TypeScript + Vite
- React Router for role portals
- CSS design system (Syne + Figtree), mobile-first responsive
- Client-side store with `localStorage` persistence (no remote backend yet)

## Why
Ship a production-quality **narrow V1 UX** that proves Upload & Done, Tax Vault, role portals, and Addendum F fee rules before wiring licensed tax/e-file vendors.

## V1 scope in this prototype
- Taxpayer five-screen flow
- Preparer inbox/workspace + business return fee lock ($239.98)
- EFIN office dashboard/pipeline/staff
- Platform admin + fee catalog
- Simulated document pipeline + ACK

## Explicit non-goals (still architected for later)
- Live IRS MeF transmission
- Real bank-product settlement
- Multi-tenant API enforcement
- Full Resolution Center UI (hooks/notes only)

## Data location
All demo state: browser `localStorage` key `novara-tax-os-v1` on this computer.
