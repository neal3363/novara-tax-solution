import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

const checks = [
  { matter: "Dallas Probate — Estate asset graph", result: "Clear", tone: "success" as const },
  { matter: "Harris County unclaimed cluster", result: "Not assigned", tone: "neutral" as const },
];

export const metadata = { title: "Conflict Checks" };

export default function ConflictsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Conflict checks</h1>
      <p className="text-sm text-silver">
        Conflict screening runs before legal case material is released to counsel.
      </p>
      {checks.map((check) => (
        <Panel key={check.matter}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-white">{check.matter}</div>
            <Badge tone={check.tone}>{check.result}</Badge>
          </div>
        </Panel>
      ))}
    </div>
  );
}
