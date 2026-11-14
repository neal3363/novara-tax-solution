import { describe, expect, it } from "vitest";
import { getAgentRegistry, getPartnerAssistantScope } from "@/lib/agents/registry";

describe("AI agent controls", () => {
  it("registers blueprint agents without legal finalization authority", () => {
    const registry = getAgentRegistry();
    expect(registry.length).toBeGreaterThanOrEqual(20);
    expect(registry.every((agent) => agent.legalFinalizationAllowed === false)).toBe(true);
  });

  it("scopes partner assistants away from the master pool", () => {
    const scope = getPartnerAssistantScope("org_partner_tx_01");
    expect(scope.denied).toContain("master_pool");
    expect(scope.denied).toContain("other_partners");
    expect(scope.allowed).toContain("assigned_cases");
  });
});
