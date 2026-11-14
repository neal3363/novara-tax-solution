# Staging security APIs (local only)

These handlers are **not** part of the publishable `novara-tax-os/api` tree.

- Used by local Vite when `NOVARA_STAGING_SECURITY_API=1`
- Imported directly by staging/integration test scripts
- Refuse to run unless `NOVARA_STAGING_SECURITY_API=1`
- Do not accept client-controlled filesystem roots over HTTP

Public demo hosts must never expose this directory as serverless routes.
