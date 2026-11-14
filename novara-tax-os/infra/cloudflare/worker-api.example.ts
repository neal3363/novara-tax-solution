/**
 * EXAMPLE Cloudflare Worker — refuses live MeF / payments.
 * Copy and wire only after owner authorization + secrets.
 */

/** Bindings are typed loosely so this example compiles without Workers types installed. */
export interface Env {
  DB?: unknown
  VAULT?: unknown
  MEF_QUEUE?: unknown
  LIVE_IRS_TRANSMIT: string
  LIVE_PAYMENTS: string
  LIVE_REFUND_SETTLEMENT: string
  ENVIRONMENT: string
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return json({
        ok: true,
        environment: env.ENVIRONMENT ?? 'scaffold',
        liveIrsTransmit: env.LIVE_IRS_TRANSMIT === 'true',
        livePayments: env.LIVE_PAYMENTS === 'true',
        liveRefundSettlement: env.LIVE_REFUND_SETTLEMENT === 'true',
      })
    }

    if (url.pathname.startsWith('/mef/transmit')) {
      if (env.LIVE_IRS_TRANSMIT !== 'true') {
        return json(
          {
            ok: false,
            error: 'production_locked',
            detail: 'Live IRS MeF transmit disabled until owner authorization and ATS approval',
          },
          403,
        )
      }
      return json({ ok: false, error: 'live_channel_not_wired' }, 501)
    }

    if (url.pathname.startsWith('/payments/charge')) {
      if (env.LIVE_PAYMENTS !== 'true') {
        return json({ ok: false, error: 'production_locked', detail: 'Live Stripe disabled' }, 403)
      }
      return json({ ok: false, error: 'live_channel_not_wired' }, 501)
    }

    if (url.pathname.startsWith('/refund-settlement')) {
      if (env.LIVE_REFUND_SETTLEMENT !== 'true') {
        return json(
          {
            ok: false,
            error: 'production_locked',
            detail: 'Refund settlement disabled until banking partner agreement',
          },
          403,
        )
      }
      return json({ ok: false, error: 'live_channel_not_wired' }, 501)
    }

    return json({ ok: false, error: 'not_found' }, 404)
  },
}
