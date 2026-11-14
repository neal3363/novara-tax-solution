import { AgentGrid } from "@/components/portals/AgentGrid";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

const monitors = [
  { name: "Publication-window watch", status: "Nominal", tone: "success" as const },
  { name: "Detection latency (TX pilot)", status: "9 min avg", tone: "gold" as const },
  { name: "Stale feed alerts", status: "None open", tone: "success" as const },
  { name: "Cross-partner access attempts", status: "1 denied", tone: "warning" as const },
  { name: "Backup verification", status: "Last restore drill OK", tone: "info" as const },
  { name: "Legal memo expiry", status: "2 reviews due", tone: "warning" as const },
];

export const metadata = { title: "Guardian AI" };

export default function GuardianPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Guardian AI monitoring</h1>
        <p className="mt-2 text-sm text-silver">
          Guardian measures health and freshness without changing legal or data-rights decisions.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {monitors.map((item) => (
          <Panel key={item.name}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-white">{item.name}</div>
              <Badge tone={item.tone}>{item.status}</Badge>
            </div>
          </Panel>
        ))}
      </div>
      <div>
        <h2 className="mb-4 font-display text-3xl text-white">Agent fleet</h2>
        <AgentGrid />
      </div>
    </div>
  );
}
