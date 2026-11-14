"use client";

import { useMemo, useState } from "react";
import { assetGraphEdges, assetGraphNodes, type GraphNode } from "@/lib/synthetic/graph";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

const typeTone: Record<GraphNode["type"], "gold" | "info" | "success" | "neutral" | "warning"> = {
  person: "info",
  estate: "gold",
  property: "success",
  unclaimed: "warning",
  business: "neutral",
  evidence: "gold",
};

export function AssetGraphCanvas() {
  const [selectedId, setSelectedId] = useState("estate_dallas");
  const selected = useMemo(
    () => assetGraphNodes.find((n) => n.id === selectedId) ?? assetGraphNodes[0],
    [selectedId],
  );
  const related = assetGraphEdges.filter(
    (e) => e.from === selectedId || e.to === selectedId,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Panel className="relative min-h-[420px] overflow-hidden !p-0">
        <div className="absolute inset-0 novara-grid opacity-40" />
        <svg viewBox="0 0 100 100" className="relative h-[420px] w-full">
          {assetGraphEdges.map((edge) => {
            const from = assetGraphNodes.find((n) => n.id === edge.from)!;
            const to = assetGraphNodes.find((n) => n.id === edge.to)!;
            const active = edge.from === selectedId || edge.to === selectedId;
            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? "#D8B56A" : "rgba(183,195,213,0.28)"}
                strokeWidth={active ? 0.45 : 0.25}
              />
            );
          })}
          {assetGraphNodes.map((node) => (
            <g
              key={node.id}
              onClick={() => setSelectedId(node.id)}
              className="cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={selectedId === node.id ? 4.2 : 3.4}
                fill={selectedId === node.id ? "#D8B56A" : "#18263C"}
                stroke="#D8B56A"
                strokeWidth={0.35}
                className={cn(selectedId === node.id && "animate-pulse-gold")}
              />
              <text
                x={node.x}
                y={node.y + 7}
                textAnchor="middle"
                fill="#B7C3D5"
                fontSize="2.4"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="absolute left-4 top-4 synthetic-badge">Synthetic graph</div>
      </Panel>

      <Panel gold>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-3xl text-white">{selected.label}</div>
            <div className="mt-1 text-sm text-silver">{selected.type}</div>
          </div>
          <Badge tone={typeTone[selected.type]}>{Math.round(selected.confidence * 100)}%</Badge>
        </div>
        <div className="novara-gold-rule my-4" />
        <div className="space-y-3 text-sm text-silver">
          <p>Confidence is advisory. AI cannot finalize ownership, heirship, title, or entitlement.</p>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-champagne">
            Related edges
          </div>
          {related.map((edge) => (
            <div key={edge.id} className="rounded-md border border-[rgba(183,195,213,0.14)] px-3 py-2">
              {edge.relation}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
