"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/utils/format";
import type { DailyVolumePoint } from "@/lib/queries/trends";

const CONCRETE_COLOR = "#2a78d6";
const AGGREGATES_COLOR = "#eb6834";

export function LoadCountChart({ data }: { data: DailyVolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e1e0d9" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatDate(value)}
          tick={{ fill: "#898781", fontSize: 12 }}
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#898781", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(value) => formatDate(String(value))}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e1e0d9",
            fontSize: 13,
          }}
          labelStyle={{ color: "#52514e" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, color: "#52514e" }}
          iconType="square"
        />
        <Bar
          dataKey="concreteLoads"
          name="Concrete"
          fill={CONCRETE_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
        <Bar
          dataKey="aggregatesLoads"
          name="Aggregates"
          fill={AGGREGATES_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
