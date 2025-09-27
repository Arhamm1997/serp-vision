import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SerpData } from '@/lib/types';
import { ArrowUp, ArrowDown, Minus, ExternalLink, Trophy, TrendingUp, Globe, Calendar } from 'lucide-react';
import { RankChart } from './rank-chart';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  data: SerpData;
  displayIndex?: number;
}

function RankChangeIndicator({ change }: { change: number }) {
  if (change < 0) {
    return (
      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md">
        <ArrowUp className="h-3 w-3" />
        <span className="text-xs font-semibold">+{Math.abs(change)}</span>
      </div>
    );
  }
  if (change > 0) {
    return (
      <div className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-md">
        <ArrowDown className="h-3 w-3" />
        <span className="text-xs font-semibold">-{change}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
      <Minus className="h-3 w-3" />
      <span className="text-xs font-semibold">0</span>
    </div>
  );
}

function getRankColor(rank: number) {
  if (rank === 0) return 'text-gray-500';
  if (rank <= 3) return 'text-green-600';
  if (rank <= 10) return 'text-blue-600';
  if (rank <= 20) return 'text-yellow-600';
  if (rank <= 100) return 'text-orange-600';
  return 'text-red-600';
}

function getRankBadgeVariant(rank: number): "default" | "secondary" | "destructive" | "outline" {
  if (rank === 0) return 'outline';
  if (rank <= 3) return 'default';
  if (rank <= 10) return 'secondary';
  return 'outline';
}

function getPageInfo(rank: number) {
  if (rank === 0) return { page: 0, position: 0 };
  return {
    page: Math.ceil(rank / 10),
    position: ((rank - 1) % 10) + 1
  };
}

export function ResultCard({ data, displayIndex }: ResultCardProps) {
  const rankChange = data.rank - data.previousRank;
  const isFound = data.found && data.rank > 0;
  const pageInfo = getPageInfo(data.rank);

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header Section with Rank */}
        <div className="relative">
          {/* Rank Display */}
          <div className={cn(
            "absolute top-0 right-0 px-4 py-2 rounded-bl-xl font-bold text-lg",
            isFound ? getRankColor(data.rank) : "text-gray-400",
            isFound && data.rank <= 3 ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" :
            isFound && data.rank <= 10 ? "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20" :
            isFound ? "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20" :
            "bg-gray-50 dark:bg-gray-900"
          )}>
            {isFound ? `#${data.rank}` : 'NF'}
          </div>
          
          {/* Top Performer Badge */}
          {isFound && data.rank <= 3 && (
            <div className="absolute top-2 left-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
          )}
          
          {/* Keyword Title */}
          <div className="pt-6 pb-4 px-4">
            <h3 className="font-bold text-lg leading-tight mb-2 pr-16">
              {data.keyword}
            </h3>
            
            {/* Page & Position Info */}
            {isFound && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>Page {pageInfo.page}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Position {pageInfo.position}</span>
                </div>
                <RankChangeIndicator change={rankChange} />
              </div>
            )}
            
            {!isFound && (
              <Badge variant="outline" className="text-xs">
                Not found in top 200 results
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {/* Title from SERP */}
          {data.title && (
            <div>
              <h4 className="font-medium text-sm text-blue-700 dark:text-blue-400 line-clamp-2 leading-relaxed">
                {data.title}
              </h4>
            </div>
          )}

          {/* Meta Description */}
          {data.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}

          {/* URL */}
          {data.url && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group-hover:bg-muted/50 transition-colors">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate flex-1 font-mono">
                {data.url}
              </p>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60" />
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-muted/30">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>
                {data.totalResults ? 
                  `${(data.totalResults / 1000000).toFixed(1)}M results` : 
                  'N/A results'
                }
              </span>
            </div>
            {data.location && (
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>{data.location}</span>
              </div>
            )}
          </div>

          {/* Historical Chart */}
          {data.historical && data.historical.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">8-week trend</span>
              </div>
              <RankChart data={data.historical} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
