# NOVARA vs Filed.com (AI Tax Prep)

Honest capability map for Unit 01 — Functionality reference.

## What NOVARA already mirrors (demo / prototype)

| Filed capability | NOVARA status |
| --- | --- |
| Read / classify / extract uploaded docs | Yes — simulated pipeline |
| Show proposed values with source doc/box/page | Yes — Entry Plan + Binder Forms |
| Preparer approves / corrects / removes before write | Yes — Entry Plan |
| Enter fields only after approval | Yes — simulated “enter + verify” |
| Pre-Entry Notes (severity issues / missing docs) | Yes — Notes tab + Entry Plan sidebar |
| Binder-style Docs / Forms / Notes | Yes — Binder workspace |
| Click a figure → see source provenance | Yes — Binder source panel |
| Human / tax pro keeps final sign-off | Yes — product rule + UI copy |
| Personal AI assistant on return context | Yes — Tax AI panel |
| Client return inbox / pipeline states | Yes — Preparer inbox + office pipeline |

## What is missing vs Filed (important)

| Filed capability | NOVARA status |
| --- | --- |
| Live connectors to CCH Axcess, Drake, Lacerte, ProConnect | Missing |
| Real data-entry bot that fills vendor tax software | Missing (simulated only) |
| Split multi-form PDFs into sub-documents | Missing |
| Prior-year tax-software backup reconciliation | Missing |
| Background batch processing across many returns | Missing (single-return demo) |
| Post-entry verify/retry against live software values | Missing (simulated message only) |
| AI Review leadsheets on a draft return PDF | Missing |
| Firm “protocols / playbook” rules engine | Missing |
| DMS connectors (Drive, SharePoint, Box, Dropbox, SmartVault) | Missing |
| SSO / SCIM / IP allow-list enterprise controls | Missing |
| Backups + revert of entered returns | Missing |
| Re-run after late docs with differential re-entry | Missing |
| Full form coverage (85+ 1040 schedules, 1041, 990, etc.) | Missing — V1 demo forms only |
| Real OCR / extraction accuracy at production scale | Missing — mocked classification |

## Bottom line

NOVARA now follows Filed’s **core operating loop** in the UI: **reads → shows plan → preparer approves → enters → pro signs off**, with binder provenance and pre-entry notes.

It is **not** yet a Filed-equivalent production system: no live tax-software integrations, no real extraction engine, no batch bot, no firm protocols, no AI Review leadsheets.
