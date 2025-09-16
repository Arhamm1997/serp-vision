'use server';

import { analyzeKeywordTrends } from '@/ai/flows/analyze-keyword-trends';
import type { SerpAnalysisResult, SerpData } from '@/lib/types';

interface GetSerpAnalysisInput {
  keywords: string;
  url: string;
  location?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  apiKey?: string;
  businessName?: string;
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

  let serpData: SerpData[] = [];
  let aiInsights = '';
  const keywords = Array.isArray(input.keywords)
    ? input.keywords
    : [...new Set(input.keywords.split(/\r?\n/).map(k => k.trim()).filter(Boolean))];
  try {
    if (keywords.length === 1) {
      // Single keyword: use /track endpoint
      const payload = {
        keyword: keywords[0],
        domain: input.url,
        country: input.location,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        businessName: input.businessName
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (input.apiKey) headers['x-api-key'] = input.apiKey;
      const response = await fetch('http://localhost:5000/api/search/track', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        const item = result.data;
        serpData = [{
          keyword: item.keyword,
          rank: item.position ?? 0,
          previousRank: item.previousRank ?? 0,
          url: item.url,
          historical: item.historical ?? []
        }];
        aiInsights = 'Exact ranking fetched from backend.';
      } else {
        throw new Error('Unexpected backend response');
      }
    } else {
      // Multiple keywords: use /bulk endpoint
      const payload = {
        keywords,
        domain: input.url,
        country: input.location,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        businessName: input.businessName
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (input.apiKey) headers['x-api-key'] = input.apiKey;
      const response = await fetch('http://localhost:5000/api/search/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      const result = await response.json();
      if (result.success && result.data && result.data.results) {
        serpData = result.data.results.map((item: any) => ({
          keyword: item.keyword,
          rank: item.position ?? 0,
          previousRank: item.previousRank ?? 0,
          url: item.url,
          historical: item.historical ?? []
        }));
        aiInsights = 'Exact rankings fetched from backend.';
      } else {
        throw new Error('Unexpected backend response');
      }
    }
    return { serpData, aiInsights };
  } catch (e) {
    console.error('Backend API failed:', e);
    return {
      serpData: [],
      aiInsights: 'Failed to fetch rankings from backend.'
    };
  }
}
