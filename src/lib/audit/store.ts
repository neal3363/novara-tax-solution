import type { AuditEvent } from "@/lib/types";
import { auditEvents as seedEvents } from "@/lib/synthetic/data";
import { sql } from "@/lib/db";

let seeded = false;

async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const existing = await sql<{ count: string }>(
    "select count(*)::text as count from security_audit_events",
  );
  if (Number(existing[0]?.count ?? 0) === 0) {
    for (const event of seedEvents) {
      await sql(
        `insert into security_audit_events (id, at, actor, action, resource, outcome)
         values ($1, $2::timestamptz, $3, $4, $5, $6)
         on conflict (id) do nothing`,
        [event.id, event.at, event.actor, event.action, event.resource, event.outcome],
      );
    }
  }
  seeded = true;
}

export async function listAuditEvents(): Promise<readonly AuditEvent[]> {
  await ensureSeeded();
  const rows = await sql<{
    id: string;
    at: string | Date;
    actor: string;
    action: string;
    resource: string;
    outcome: "allowed" | "denied";
  }>("select id, at, actor, action, resource, outcome from security_audit_events order by at desc");

  return Object.freeze(
    rows.map((row) => ({
      id: row.id,
      at: new Date(row.at).toISOString(),
      actor: row.actor,
      action: row.action,
      resource: row.resource,
      outcome: row.outcome,
    })),
  );
}

export async function appendAuditEvent(input: {
  actor: string;
  action: string;
  resource: string;
  outcome: "allowed" | "denied";
}): Promise<AuditEvent> {
  await ensureSeeded();
  const event: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    resource: input.resource,
    outcome: input.outcome,
  };
  await sql(
    `insert into security_audit_events (id, at, actor, action, resource, outcome)
     values ($1, $2::timestamptz, $3, $4, $5, $6)`,
    [event.id, event.at, event.actor, event.action, event.resource, event.outcome],
  );
  return event;
}

export function tryMutateAuditEvent(): never {
  throw new Error("Audit events are immutable and cannot be modified.");
}

export function tryDeleteAuditEvent(): never {
  throw new Error("Audit events are immutable and cannot be deleted.");
}
