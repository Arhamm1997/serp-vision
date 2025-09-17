'use client';

import type { SerpAnalysisResult } from '@/lib/types';
import { AiInsights } from '@/components/ai-insights';
import { ResultCard } from '@/components/result-card';
import { DownloadButton } from './download-button';
import { CardTitle, CardHeader, Card } from './ui/card';
import { Sparkles } from 'lucide-react';

interface ResultsDisplayProps {
  analysis: SerpAnalysisResult;
}

export function ResultsDisplay({ analysis }: ResultsDisplayProps) {
  if (!analysis || !analysis.serpData || !analysis.aiInsights) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-8 duration-500">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
            {analysis.serpData.length > 0 && <DownloadButton data={analysis.serpData} />}
        </CardHeader>
        <AiInsights insights={analysis.aiInsights} />
      </Card>
      {analysis.serpData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analysis.serpData.map((data, index) => (
            <ResultCard key={data.keyword || index} data={data} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          No search results available
        </div>
      )}
    </div>
  );
}
