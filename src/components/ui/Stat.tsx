import { Panel } from "./Panel";

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Panel className="!p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-silver-muted">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-silver-muted">{hint}</div> : null}
    </Panel>
  );
}
