'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SerpData } from '@/lib/types';
import { Trophy, TrendingUp, Target, BarChart3, Award, Crown } from 'lucide-react';

interface RankingStatisticsProps {
  data: SerpData[];
}

interface RankingRange {
  label: string;
  range: string;
  count: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  description: string;
}

export function RankingStatistics({ data }: RankingStatisticsProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ranking Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available for ranking analysis</p>
        </CardContent>
      </Card>
    );
  }

  const totalKeywords = data.length;
  const foundKeywords = data.filter(item => item.found && item.rank > 0);
  
  // Calculate ranking distributions
  const top1to3 = foundKeywords.filter(item => item.rank >= 1 && item.rank <= 3).length;
  const top4to10 = foundKeywords.filter(item => item.rank >= 4 && item.rank <= 10).length;
  const top11to20 = foundKeywords.filter(item => item.rank >= 11 && item.rank <= 20).length;
  const top21to100 = foundKeywords.filter(item => item.rank >= 21 && item.rank <= 100).length;
  const top101to200 = foundKeywords.filter(item => item.rank >= 101 && item.rank <= 200).length;
  const notFound = data.filter(item => !item.found || item.rank === 0).length;

  const rankings: RankingRange[] = [
    {
      label: 'Top 1-3',
      range: 'Positions 1-3',
      count: top1to3,
      percentage: Math.round((top1to3 / totalKeywords) * 100),
      color: 'bg-green-500',
      icon: <Crown className="h-4 w-4" />,
      description: 'Premium positions with highest visibility'
    },
    {
      label: 'Top 4-10',
      range: 'Positions 4-10',
      count: top4to10,
      percentage: Math.round((top4to10 / totalKeywords) * 100),
      color: 'bg-blue-500',
      icon: <Trophy className="h-4 w-4" />,
      description: 'First page results with good visibility'
    },
    {
      label: 'Top 11-20',
      range: 'Positions 11-20',
      count: top11to20,
      percentage: Math.round((top11to20 / totalKeywords) * 100),
      color: 'bg-yellow-500',
      icon: <Award className="h-4 w-4" />,
      description: 'First two pages, decent visibility'
    },
    {
      label: 'Top 21-100',
      range: 'Positions 21-100',
      count: top21to100,
      percentage: Math.round((top21to100 / totalKeywords) * 100),
      color: 'bg-orange-500',
      icon: <Target className="h-4 w-4" />,
      description: 'Pages 3-10, room for improvement'
    },
    {
      label: 'Top 101-200',
      range: 'Positions 101-200',
      count: top101to200,
      percentage: Math.round((top101to200 / totalKeywords) * 100),
      color: 'bg-red-500',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Pages 11-20, needs optimization'
    },
    {
      label: 'Not Found',
      range: 'Beyond 200',
      count: notFound,
      percentage: Math.round((notFound / totalKeywords) * 100),
      color: 'bg-gray-500',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Not ranking in top 200 results'
    }
  ];

  // Calculate summary stats
  const averageRank = foundKeywords.length > 0 
    ? Math.round(foundKeywords.reduce((sum, item) => sum + item.rank, 0) / foundKeywords.length)
    : 0;
  
  const visibilityScore = Math.round(
    ((top1to3 * 100) + (top4to10 * 80) + (top11to20 * 60) + (top21to100 * 40) + (top101to200 * 20)) 
    / totalKeywords
  );

  const firstPageKeywords = top1to3 + top4to10;
  const firstPagePercentage = Math.round((firstPageKeywords / totalKeywords) * 100);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Keywords</p>
                <p className="text-2xl font-bold">{totalKeywords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">First Page (1-10)</p>
                <p className="text-2xl font-bold text-green-600">{firstPageKeywords}</p>
                <p className="text-xs text-muted-foreground">{firstPagePercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Average Rank</p>
                <p className="text-2xl font-bold text-blue-600">
                  {averageRank > 0 ? averageRank : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Visibility Score</p>
                <p className="text-2xl font-bold text-purple-600">{visibilityScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Rankings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Ranking Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {rankings.map((ranking, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${ranking.color} text-white`}>
                      {ranking.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{ranking.label}</h3>
                        <Badge variant="outline" className="text-xs">
                          {ranking.range}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{ranking.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{ranking.count}</p>
                    <p className="text-sm text-muted-foreground">{ranking.percentage}%</p>
                  </div>
                </div>
                <Progress 
                  value={ranking.percentage} 
                  className="h-2"
                  style={
                    {
                      '--progress-background': ranking.color.replace('bg-', ''),
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Strengths</h4>
              <ul className="space-y-1 text-sm">
                {firstPageKeywords > 0 && (
                  <li>✅ {firstPageKeywords} keywords on first page ({firstPagePercentage}%)</li>
                )}
                {top1to3 > 0 && (
                  <li>🏆 {top1to3} keywords in top 3 positions</li>
                )}
                {foundKeywords.length > 0 && (
                  <li>📊 {foundKeywords.length} keywords found in search results</li>
                )}
                {visibilityScore >= 50 && (
                  <li>📈 Good visibility score of {visibilityScore}/100</li>
                )}
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">Opportunities</h4>
              <ul className="space-y-1 text-sm">
                {notFound > 0 && (
                  <li>🎯 {notFound} keywords not found - optimize content</li>
                )}
                {top101to200 > 0 && (
                  <li>📊 {top101to200} keywords beyond page 10 - need SEO work</li>
                )}
                {top21to100 > 0 && (
                  <li>⬆️ {top21to100} keywords on pages 3-10 - potential for improvement</li>
                )}
                {firstPagePercentage < 50 && (
                  <li>📈 Opportunity to get more keywords on first page</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}