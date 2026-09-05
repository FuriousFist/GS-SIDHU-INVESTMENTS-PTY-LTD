"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BUCKETS = [
  { label: "0-30m", max: 30 },
  { label: "30-60m", max: 60 },
  { label: "1-2h", max: 120 },
  { label: "2-4h", max: 240 },
  { label: "4h+", max: Infinity },
];

export function TurnaroundHistogram({ minutes }: { minutes: number[] }) {
  const data = BUCKETS.map((bucket, i) => {
    const min = i === 0 ? 0 : BUCKETS[i - 1].max;
    const count = minutes.filter((m) => m > min && m <= bucket.max).length;
    return { label: bucket.label, count };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e1e0d9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#898781", fontSize: 12 }}
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#898781", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value) => [`${value} dockets`, ""]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e1e0d9",
            fontSize: 13,
          }}
          labelStyle={{ color: "#52514e" }}
        />
        <Bar
          dataKey="count"
          fill="#2a78d6"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
