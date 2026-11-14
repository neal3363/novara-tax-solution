import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";

const routes = [
  { region: "United Kingdom", status: "Researcher shortlist", note: "Letter lead from 1998" },
  { region: "Canada", status: "Idle", note: "No active lead" },
  { region: "Mexico", status: "Rights review", note: "Awaiting data-rights gate" },
];

export const metadata = { title: "International Heir Routing" };

export default function InternationalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">International heir research routing</h1>
        <p className="mt-2 text-sm text-silver">
          Competitive expansion #7 — scaffolded handoffs to approved researchers under jurisdiction controls.
        </p>
      </div>
      {routes.map((route) => (
        <Panel key={route.region}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-2xl text-white">{route.region}</div>
              <div className="mt-1 text-sm text-silver">{route.note}</div>
            </div>
            <Badge tone="info">{route.status}</Badge>
          </div>
        </Panel>
      ))}
    </div>
  );
}
