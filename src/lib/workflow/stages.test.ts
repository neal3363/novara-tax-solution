import { describe, expect, it } from "vitest";
import {
  ORDERED_STAGES,
  isTerminalDecision,
  requiresFirstLookBeforePartnerVisibility,
} from "@/lib/workflow/stages";
import { opportunities } from "@/lib/synthetic/data";

describe("core workflow", () => {
  it("includes the full auditable stage sequence", () => {
    expect(ORDERED_STAGES).toContain("DISCOVER");
    expect(ORDERED_STAGES).toContain("FIRST_LOOK");
    expect(ORDERED_STAGES).toContain("ACCOUNT");
  });

  it("treats First Look outcomes as terminal decisions", () => {
    expect(isTerminalDecision("KEEP")).toBe(true);
    expect(isTerminalDecision("WATCH")).toBe(true);
    expect(isTerminalDecision("VERIFY")).toBe(false);
  });

  it("keeps unreleased opportunities out of partner visibility rules", () => {
    expect(requiresFirstLookBeforePartnerVisibility("FIRST_LOOK")).toBe(true);
    expect(requiresFirstLookBeforePartnerVisibility("ASSIGNED")).toBe(false);
  });

  it("marks all preview opportunities as synthetic", () => {
    expect(opportunities.every((o) => o.synthetic === true)).toBe(true);
  });
});
