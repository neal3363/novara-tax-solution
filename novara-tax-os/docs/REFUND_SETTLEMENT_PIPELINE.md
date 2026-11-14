# Refund settlement pipeline (sandbox)

**Live payments / banking partners remain OFF.**

## Flow

1. IRS/government wires the tax refund into NOVARA’s **virtual settlement account**
2. Operator/backend **verifies** the deposited amount (no taxpayer email yet)
3. Authorized prep / settlement **fees are withheld automatically**
4. Remaining balance is paid to the client via:
   - **ACH** to their bank (routing + account), or
   - **Debit rail** (Chime / Cash App / other prepaid — sandbox destinations)
5. After the client deposit is **confirmed**, the **transactional email** notifies them that the remaining balance was deposited

Email is blocked until step 5 (`email_blocked_until_disbursement_confirmed`).

## UI

Taxpayer / preparer → **Refund tracking** → **Refund settlement & client deposit**

## Tests

`npm run test:refund-settlement`
