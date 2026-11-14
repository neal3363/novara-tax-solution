import { agents } from "@/lib/synthetic/data";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

export function AgentGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <Panel key={agent.id} className="!p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl text-white">{agent.name}</h3>
            <Badge tone={agent.status === "active" ? "success" : agent.status === "monitoring" ? "info" : "neutral"}>
              {agent.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-silver">{agent.purpose}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.1em] text-champagne">
            Cannot finalize legal determinations
          </p>
        </Panel>
      ))}
    </div>
  );
}
