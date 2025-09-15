'use server';

import { analyzeKeywordTrends } from '@/ai/flows/analyze-keyword-trends';
import type { SerpAnalysisResult, SerpData } from '@/lib/types';

interface GetSerpAnalysisInput {
  keywords: string;
  url: string;
  location: string;
}

function generateHistoricalData(
  endRank: number,
  weeks: number,
  trend: 'up' | 'down' | 'stable'
): { rank: number; previousRank: number; historical: { date: string; rank: number }[] } {
  const historical: { date: string; rank: number }[] = [];
  let currentRank = endRank;

  if (trend === 'up') {
    currentRank = endRank + Math.floor(Math.random() * 5) + weeks;
  } else if (trend === 'down') {
    currentRank = endRank - Math.floor(Math.random() * 5) - weeks;
  }
  
  currentRank = Math.max(1, currentRank);

  for (let i = 0; i < weeks; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks - 1 - i) * 7);
    historical.push({
      date: date.toISOString().split('T')[0],
      rank: Math.max(1, currentRank),
    });

    if (trend === 'up') {
      currentRank -= Math.floor(Math.random() * 3) + (i > weeks / 2 ? 1 : 0);
    } else if (trend === 'down') {
      currentRank += Math.floor(Math.random() * 3) + (i > weeks / 2 ? 1 : 0);
    } else {
      currentRank += Math.floor(Math.random() * 3) - 1;
    }
  }

  const finalRank = Math.max(1, trend === 'stable' ? endRank : currentRank);
  historical[weeks - 1].rank = finalRank;

  return {
    rank: finalRank,
    previousRank: historical[weeks - 2]?.rank || finalRank,
    historical,
  };
}


export async function getSerpAnalysis(input: GetSerpAnalysisInput): Promise<SerpAnalysisResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const keywords = input.keywords.split(',').map(k => k.trim()).filter(Boolean);

  const mockSerpData: SerpData[] = keywords.map((keyword, index) => {
    const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
    const trend = trends[index % trends.length];
    const baseRank = (index * 5) + 3;
    const { rank, previousRank, historical } = generateHistoricalData(baseRank, 8, trend);

    return {
      keyword,
      rank,
      previousRank,
      url: input.url,
      historical,
    };
  });

  try {
    const aiResult = await analyzeKeywordTrends({ serpData: JSON.stringify(mockSerpData) });
    return {
      serpData: mockSerpData,
      aiInsights: aiResult.insights,
    };
  } catch (e) {
    console.error('AI flow failed:', e);
    // Return mock data with a fallback AI insight
    return {
      serpData: mockSerpData,
      aiInsights: `AI analysis is currently unavailable. Based on the data, here are some potential insights:
- Keywords trending upwards represent strong content-market fit. Consider doubling down on these topics.
- For keywords with declining ranks, a content refresh or backlink audit may be necessary to regain position.
- Stable keywords indicate consistent performance, but keep an eye on competitors to maintain your rank.`,
    };
  }
}
