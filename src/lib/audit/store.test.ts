import { beforeEach, describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  listAuditEvents,
  tryDeleteAuditEvent,
  tryMutateAuditEvent,
} from "@/lib/audit/store";

describe("immutable durable audit store", () => {
  beforeEach(async () => {
    // PGlite boots lazily on first sql call inside append/list.
    await listAuditEvents();
  });

  it("appends events without mutating prior entries", async () => {
    const before = await listAuditEvents();
    const firstId = before[0]?.id;
    const created = await appendAuditEvent({
      actor: "test",
      action: "unit_test_append",
      resource: "audit",
      outcome: "allowed",
    });
    const after = await listAuditEvents();
    expect(after.some((e) => e.id === created.id)).toBe(true);
    if (firstId) {
      expect(after.find((e) => e.id === firstId)?.action).toBe(
        before.find((e) => e.id === firstId)?.action,
      );
    }
  });

  it("rejects mutation and deletion APIs", () => {
    expect(() => tryMutateAuditEvent()).toThrow(/immutable/i);
    expect(() => tryDeleteAuditEvent()).toThrow(/immutable/i);
  });
});
