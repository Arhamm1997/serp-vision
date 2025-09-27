'use client';

import { useState } from 'react';
import type { SerpAnalysisResult } from '@/lib/types';
import { AiInsights } from '@/components/ai-insights';
import { ResultCard } from '@/components/result-card';
import { RankingStatistics } from '@/components/ranking-statistics';
import { ApiKeyStatsDisplay } from '@/components/api-key-stats-display';
import { DownloadButton } from './download-button';
import { CardTitle, CardHeader, Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sparkles, Grid3X3, BarChart3, Trophy } from 'lucide-react';

interface ResultsDisplayProps {
  analysis: SerpAnalysisResult;
}

export function ResultsDisplay({ analysis }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState('insights');

  if (!analysis || !analysis.serpData || !analysis.aiInsights) {
    return null;
  }

  const sortedData = analysis.serpData.sort((a, b) => {
    // Sort by rank: found keywords first (by rank), then not found
    if (a.found && b.found) {
      return a.rank - b.rank; // Lower rank number = better position
    }
    if (a.found && !b.found) return -1;
    if (!a.found && b.found) return 1;
    return a.keyword.localeCompare(b.keyword); // Alphabetical for not found
  });

  const topRankings = sortedData.filter(d => d.found && d.rank <= 10);
  const foundCount = sortedData.filter(d => d.found).length;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-8 duration-500">
      {/* Header with Summary Stats */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold">Search Results Analysis</h2>
            {analysis.serpData.length > 0 && (
              <DownloadButton data={analysis.serpData} />
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {foundCount} keywords found
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              {topRankings.length} in top 10
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              {analysis.serpData.length - foundCount} not found
            </span>
          </div>
        </div>
        <div className="w-full lg:w-80">
          <ApiKeyStatsDisplay keyStats={analysis.keyStats} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Keyword Results
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <AiInsights insights={analysis.aiInsights} />
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {analysis.serpData.length > 0 ? (
            <>
              {/* Top Rankings Highlight */}
              {topRankings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top 10 Rankings ({topRankings.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {topRankings.slice(0, 4).map((data, index) => (
                      <div key={data.keyword} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {data.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{data.keyword}</p>
                          <p className="text-xs text-muted-foreground truncate">{data.url}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* All Results Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">All Keywords ({analysis.serpData.length})</h3>
                  <div className="text-sm text-muted-foreground">
                    Sorted by ranking position
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedData.map((data, index) => (
                    <ResultCard key={data.keyword || index} data={data} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card className="glass-card">
              <div className="p-8 text-center text-muted-foreground">
                No search results available
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <RankingStatistics data={analysis.serpData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
