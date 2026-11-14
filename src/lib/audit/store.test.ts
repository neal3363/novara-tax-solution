import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  listAuditEvents,
  tryDeleteAuditEvent,
  tryMutateAuditEvent,
} from "@/lib/audit/store";

describe("immutable audit store", () => {
  it("appends events without mutating prior entries", () => {
    const before = listAuditEvents();
    const firstId = before[0]?.id;
    const created = appendAuditEvent({
      actor: "test",
      action: "unit_test_append",
      resource: "audit",
      outcome: "allowed",
    });
    const after = listAuditEvents();
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
