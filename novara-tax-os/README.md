# NOVARA Tax OS

Local V1 prototype of the **AI Tax Business Operating System** from the Master Blueprint + Addendum F.

**Pitch:** Upload your documents. Your Tax AI becomes the expert and handles the rest.

## What’s included

- Mobile-first responsive UI (phone, tablet, desktop)
- Role demos: taxpayer, preparer (TP), EFIN office owner, platform admin
- Five-screen Upload & Done flow (drop zone → verify → questions → result → sign)
- Tax Vault, Personal Tax AI, preparer workspace, office pipeline
- Addendum F fee catalog (approved TP fees + office floor + provisional consumer prices)
- Local persistence via `localStorage` (stays on this computer)

## Run locally

```bash
cd novara-tax-os
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Docs on this machine

Blueprints are saved at:

- `/workspace/docs/NOVARA_Tax_OS_Master_Blueprint_with_Addendum_F.pdf`
- `/workspace/docs/NOVARA_Tax_OS_Addendum_F.pdf`

## Notes

- This is a product/UX prototype with simulated document intelligence and e-file ACK — not production IRS transmission.
- No GitHub remote sync was configured for this build per request; keep work local until you’re ready.
