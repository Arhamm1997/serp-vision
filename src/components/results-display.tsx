'use client';

import type { SerpAnalysisResult } from '@/lib/types';
import { AiInsights } from '@/components/ai-insights';
import { ResultCard } from '@/components/result-card';

interface ResultsDisplayProps {
  analysis: SerpAnalysisResult;
}

export function ResultsDisplay({ analysis }: ResultsDisplayProps) {
  return (
    <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-8 duration-500">
      <AiInsights insights={analysis.aiInsights} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analysis.serpData.map((data, index) => (
          <ResultCard key={data.keyword} data={data} />
        ))}
      </div>
    </div>
  );
}
