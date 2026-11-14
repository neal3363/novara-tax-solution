import { workflowStages } from "@/lib/synthetic/data";
import { cn } from "@/lib/utils";

export function WorkflowRail({ activeIndex = 5 }: { activeIndex?: number }) {
  return (
    <div className="novara-panel p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-silver-muted">
        Core Workflow Visibility
      </div>
      <div className="flex flex-wrap gap-2">
        {workflowStages.map((stage, index) => (
          <div
            key={stage}
            className={cn(
              "rounded-[4px] border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
              index === activeIndex
                ? "border-champagne/50 bg-champagne/15 text-champagne"
                : index < activeIndex
                  ? "border-[rgba(61,155,122,0.35)] bg-[rgba(61,155,122,0.1)] text-[#8fd4bb]"
                  : "border-[rgba(183,195,213,0.14)] text-silver-muted",
            )}
          >
            {stage}
          </div>
        ))}
      </div>
    </div>
  );
}
