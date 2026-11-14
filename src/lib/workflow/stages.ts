import type { OpportunityStage } from "@/lib/types";

export const ORDERED_STAGES: OpportunityStage[] = [
  "DISCOVER",
  "CONNECT",
  "VERIFY",
  "VALUE",
  "LEGAL_GATE",
  "FIRST_LOOK",
  "KEEP",
  "PARTNER",
  "RELEASE",
  "WATCH",
  "REJECT",
  "ASSIGNED",
  "EXECUTE",
  "CLOSE",
  "ACCOUNT",
];

export function isTerminalDecision(stage: OpportunityStage): boolean {
  return stage === "KEEP" || stage === "PARTNER" || stage === "RELEASE" || stage === "WATCH" || stage === "REJECT";
}

export function requiresFirstLookBeforePartnerVisibility(stage: OpportunityStage): boolean {
  return !["PARTNER", "ASSIGNED", "EXECUTE", "CLOSE", "ACCOUNT", "RELEASE"].includes(stage);
}
