-- Idempotent security persistence for rate limits and audit events.
-- Does not enable live asset connectors.

create table if not exists login_rate_limits (
  rate_key text primary key,
  failure_count integer not null default 0,
  window_started_at timestamptz not null,
  locked_until timestamptz
);

create table if not exists security_audit_events (
  id text primary key,
  at timestamptz not null,
  actor text not null,
  action text not null,
  resource text not null,
  outcome text not null check (outcome in ('allowed', 'denied'))
);

create index if not exists security_audit_events_at_idx
  on security_audit_events (at desc);
