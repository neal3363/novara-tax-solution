import { OpportunityTable } from "@/components/portals/OpportunityTable";
import { WorkflowRail } from "@/components/portals/WorkflowRail";
import { opportunities } from "@/lib/synthetic/data";

export const metadata = { title: "Opportunity Pipeline" };

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Opportunity pipeline</h1>
        <p className="mt-2 text-sm text-silver">
          Every stage from DISCOVER through ACCOUNT remains visible and auditable.
        </p>
      </div>
      <WorkflowRail activeIndex={5} />
      <OpportunityTable rows={opportunities} showAssignment />
    </div>
  );
}
