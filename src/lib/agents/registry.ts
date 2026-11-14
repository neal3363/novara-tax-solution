import { agents } from "@/lib/synthetic/data";
import { aiMayFinalizeLegalDetermination } from "@/lib/rbac/policy";

export function getAgentRegistry() {
  return agents.map((agent) => ({
    ...agent,
    legalFinalizationAllowed: aiMayFinalizeLegalDetermination(),
  }));
}

export function getPartnerAssistantScope(organizationId: string) {
  return {
    organizationId,
    allowed: ["assigned_cases", "milestones", "approved_economics", "vaulted_docs_for_assignment"],
    denied: ["master_pool", "other_partners", "unreleased_first_look", "source_contracts"],
  };
}
