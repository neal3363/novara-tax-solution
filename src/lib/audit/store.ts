import type { AuditEvent } from "@/lib/types";
import { auditEvents as seedEvents } from "@/lib/synthetic/data";

/**
 * Preview immutable audit log.
 * Events can be appended but never mutated or deleted through this API.
 */
const events: AuditEvent[] = [...seedEvents];

export function listAuditEvents(): readonly AuditEvent[] {
  return Object.freeze([...events].sort((a, b) => (a.at < b.at ? 1 : -1)));
}

export function appendAuditEvent(input: {
  actor: string;
  action: string;
  resource: string;
  outcome: "allowed" | "denied";
}): AuditEvent {
  const event: AuditEvent = {
    id: `aud_${Date.now()}_${events.length + 1}`,
    at: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    resource: input.resource,
    outcome: input.outcome,
  };
  events.push(event);
  return event;
}

export function tryMutateAuditEvent(): never {
  throw new Error("Audit events are immutable and cannot be modified.");
}

export function tryDeleteAuditEvent(): never {
  throw new Error("Audit events are immutable and cannot be deleted.");
}
