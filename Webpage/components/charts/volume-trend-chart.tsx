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
import { formatDate } from "@/lib/utils/format";

type Point = { date: string; value: number };

export function VolumeTrendChart({
  data,
  color,
  unitLabel,
}: {
  data: Point[];
  color: string;
  unitLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          stroke="#e1e0d9"
          strokeDasharray="0"
          vertical={false}
        />
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
          width={48}
        />
        <Tooltip
          labelFormatter={(value) => formatDate(String(value))}
          formatter={(value) => [
            `${Number(value).toLocaleString()} ${unitLabel}`,
            "",
          ]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e1e0d9",
            fontSize: 13,
          }}
          labelStyle={{ color: "#52514e" }}
          itemStyle={{ color: "#0b0b0b" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
