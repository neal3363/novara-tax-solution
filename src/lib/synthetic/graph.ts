export type GraphNode = {
  id: string;
  label: string;
  type: "person" | "estate" | "property" | "unclaimed" | "business" | "evidence";
  x: number;
  y: number;
  confidence: number;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
};

/** Synthetic Asset Graph for Dallas probate pilot preview */
export const assetGraphNodes: GraphNode[] = [
  { id: "person_ellis", label: "Jordan Ellis", type: "person", x: 18, y: 42, confidence: 0.91 },
  { id: "person_decedent", label: "R. Ellis (decedent)", type: "person", x: 42, y: 18, confidence: 0.96 },
  { id: "estate_dallas", label: "Dallas Probate Estate", type: "estate", x: 50, y: 48, confidence: 0.88 },
  { id: "property_travis", label: "Travis Parcel Candidate", type: "property", x: 78, y: 28, confidence: 0.74 },
  { id: "unclaimed_harris", label: "Harris Unclaimed Cluster", type: "unclaimed", x: 78, y: 68, confidence: 0.86 },
  { id: "business_dba", label: "Historical DBA Chain", type: "business", x: 28, y: 78, confidence: 0.67 },
  { id: "evidence_packet", label: "Evidence Packet", type: "evidence", x: 58, y: 82, confidence: 0.9 },
];

export const assetGraphEdges: GraphEdge[] = [
  { id: "e1", from: "person_ellis", to: "person_decedent", relation: "probable heir (advisory)" },
  { id: "e2", from: "person_decedent", to: "estate_dallas", relation: "estate of" },
  { id: "e3", from: "estate_dallas", to: "property_travis", relation: "potential interest" },
  { id: "e4", from: "estate_dallas", to: "unclaimed_harris", relation: "linked funds" },
  { id: "e5", from: "person_decedent", to: "business_dba", relation: "officer/historical" },
  { id: "e6", from: "estate_dallas", to: "evidence_packet", relation: "supported by" },
  { id: "e7", from: "person_ellis", to: "evidence_packet", relation: "claimant docs" },
];
