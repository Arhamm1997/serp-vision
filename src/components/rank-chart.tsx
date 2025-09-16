'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { HistoricalData } from '@/lib/types';

interface RankChartProps {
  data: HistoricalData[];
}

const chartConfig = {
  rank: {
    label: 'Rank',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function RankChart({ data }: RankChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: -20,
          right: 10,
          top: 10,
          bottom: 0,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
        />
        <YAxis
          reversed
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <Tooltip cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} content={<ChartTooltipContent indicator="dot" />} />
        <defs>
            <linearGradient id="fillRank" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-rank)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-rank)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
        <Area
          dataKey="rank"
          type="natural"
          fill="url(#fillRank)"
          stroke="var(--color-rank)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
}
