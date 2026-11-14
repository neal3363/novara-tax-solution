import { Panel } from "@/components/ui/Panel";
import { WorkflowRail } from "@/components/portals/WorkflowRail";

export const metadata = { title: "Claim Status" };

export default function OwnerClaimsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Claim status</h1>
      <WorkflowRail activeIndex={2} />
      <Panel gold>
        <div className="font-display text-2xl text-white">Ellis claim path</div>
        <ul className="mt-3 space-y-2 text-sm text-silver">
          <li>Status: Awaiting document vault upload</li>
          <li>Jurisdiction: TX (synthetic)</li>
          <li>Communications: approved channels only</li>
          <li>Disclaimer: NOVARA does not guarantee recovery</li>
        </ul>
      </Panel>
    </div>
  );
}
