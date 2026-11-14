import { listAuditEvents } from "@/lib/audit/store";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Audit Log" };

export default function AuditPage() {
  const events = listAuditEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Immutable audit log</h1>
        <p className="mt-2 text-sm text-silver">
          Append-only preview store. Events cannot be edited or deleted through application APIs.
        </p>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <Panel key={event.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-white">{event.action}</div>
                <div className="mt-1 text-xs text-silver-muted">
                  {event.actor} · {event.resource} · {formatDate(event.at)}
                </div>
              </div>
              <Badge tone={event.outcome === "denied" ? "danger" : "success"}>
                {event.outcome}
              </Badge>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
