import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SerpData } from '@/lib/types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { RankChart } from './rank-chart';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  data: SerpData;
}

function RankChangeIndicator({ change }: { change: number }) {
  if (change < 0) {
    return (
      <div className="flex items-center gap-1 text-emerald-500">
        <ArrowUp className="h-4 w-4" />
        <span className="font-semibold">{Math.abs(change)}</span>
      </div>
    );
  }
  if (change > 0) {
    return (
      <div className="flex items-center gap-1 text-red-500">
        <ArrowDown className="h-4 w-4" />
        <span className="font-semibold">{change}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      <span className="font-semibold">0</span>
    </div>
  );
}

export function ResultCard({ data }: ResultCardProps) {
  const rankChange = data.rank - data.previousRank;

  return (
    <Card className="glass-card flex flex-col">
      <CardHeader>
        <CardDescription>{data.url}</CardDescription>
        <CardTitle className="font-headline text-xl truncate">{data.keyword}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Rank</p>
            <p className="text-5xl font-bold text-primary">{data.rank}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Change</p>
            <RankChangeIndicator change={rankChange} />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Rank History (Last 8 Weeks)</p>
          <RankChart data={data.historical} />
        </div>
      </CardContent>
    </Card>
  );
}
