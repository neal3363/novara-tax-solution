# Environment Configuration Checklist (Public Demo)

| Variable / item | Required for synthetic demo | Notes |
|-----------------|----------------------------|-------|
| `VITE_NOVARA_PUBLIC_DEMO=true` | Yes | Defaults true; set false only for non-demo hosts |
| Live IRS / MeF credentials | No | Must remain absent |
| Live Stripe / payment keys | No | Must remain absent |
| Banking partner credentials | No | Must remain absent |
| Production KMS keys | No | Not for demo |
| Database URL | No | SPA demo uses browser session storage |
| Error reporting DSN | Optional | Recommended before broad public traffic |
| Custom domain | Owner decision | Do not change DNS without approval |

Template: `.env.public-demo.example`
