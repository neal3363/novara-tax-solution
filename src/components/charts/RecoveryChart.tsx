"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Jun", pipeline: 820000, recovered: 120000 },
  { month: "Jul", pipeline: 980000, recovered: 165000 },
  { month: "Aug", pipeline: 1120000, recovered: 190000 },
  { month: "Sep", pipeline: 1410000, recovered: 210000 },
  { month: "Oct", pipeline: 1630000, recovered: 245000 },
  { month: "Nov", pipeline: 1867400, recovered: 268000 },
];

export function RecoveryChart() {
  return (
    <div className="novara-panel h-72 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-silver-muted">
            Recovery Performance
          </div>
          <div className="font-display text-2xl text-white">Pipeline vs closed value</div>
        </div>
        <span className="synthetic-badge">Synthetic</span>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="pipeline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D8B56A" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#D8B56A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="recovered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5B8FBF" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#5B8FBF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(183,195,213,0.08)" vertical={false} />
          <XAxis dataKey="month" stroke="#8A9BB0" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#8A9BB0"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#18263C",
              border: "1px solid rgba(216,181,106,0.35)",
              borderRadius: 8,
              color: "#fff",
            }}
          />
          <Area type="monotone" dataKey="pipeline" stroke="#D8B56A" fill="url(#pipeline)" />
          <Area type="monotone" dataKey="recovered" stroke="#5B8FBF" fill="url(#recovered)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
