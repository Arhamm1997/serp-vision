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

const BACKEND_BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 1000));

  let serpData: SerpData[] = [];
  let aiInsights = '';
  
  // Parse keywords - handle both string and array input
  const keywords = Array.isArray(input.keywords)
    ? input.keywords
    : [...new Set(input.keywords.split(/\r?\n/).map(k => k.trim()).filter(Boolean))];

  console.log(`Processing ${keywords.length} keywords for ${input.url}`);
  
  try {
    // Prepare the payload for the backend
    const payload = {
      keywords: keywords,  // Send as array always
      domain: input.url,
      country: input.location || 'US',
      city: input.city || '',
      state: input.state || '',
      postalCode: input.postalCode || '',
      language: 'en',
      device: 'desktop',
      businessName: input.businessName || '',
      apiKey: input.apiKey?.trim() || ''
    };

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add API key if provided
    if (input.apiKey && input.apiKey.trim() !== '') {
      payload.apiKey = input.apiKey.trim();
    }

    // Use the analyze endpoint for better AI insights
    const endpoint = `${BACKEND_BASE_URL}/api/search/analyze`;
    console.log(`Making request to: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-cache'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error ${response.status}: ${errorText}`);
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Backend response received:', result);

    if (result.success && result.data) {
      const { serpData: backendSerpData, aiInsights: backendAiInsights } = result.data;
      
      if (Array.isArray(backendSerpData)) {
        serpData = backendSerpData.map((item: any) => ({
          keyword: item.keyword || '',
          title: item.title || '',
          description: item.description || '',
          rank: item.rank || item.position || 0,
          previousRank: item.previousRank || (item.rank ? Math.max(1, item.rank + Math.floor(Math.random() * 6) - 3) : 0),
          url: item.url || '',
          historical: item.historical || generateHistoricalData(item.rank || item.position || 50, 8, 'stable').historical
        }));
        
        aiInsights = backendAiInsights || `Successfully analyzed ${serpData.length} keywords for ${input.url}. ${serpData.filter(s => s.rank > 0).length} keywords found in search results.`;
      } else {
        console.warn('Backend response does not contain serpData array');
        throw new Error('Invalid backend response structure');
      }
    } else {
      console.error('Backend response indicates failure:', result);
      throw new Error(result.message || 'Backend processing failed');
    }

    console.log(`Successfully processed ${serpData.length} keywords`);
    return { serpData, aiInsights };

  } catch (error: any) {
    console.error('API call failed:', error);
    
    // Fallback: generate mock data for demo purposes when backend fails
    const mockSerpData: SerpData[] = keywords.map((keyword, index) => {
      const rank = Math.floor(Math.random() * 50) + 1;
      const trend: 'up' | 'down' | 'stable' = ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any;
      const historicalData = generateHistoricalData(rank, 8, trend);
      
      return {
        keyword,
        title: `${keyword} - Best Results | ${input.businessName || 'Your Business'}`,
        description: `Find the best ${keyword} results and information. Comprehensive guide and resources.`,
        rank,
        previousRank: historicalData.previousRank,
        url: `${input.url}/${keyword.replace(/\s+/g, '-').toLowerCase()}`,
        historical: historicalData.historical
      };
    });

    return {
      serpData: mockSerpData,
      aiInsights: `⚠️ Backend connection failed (${error.message}). Showing demo data for ${keywords.length} keywords. Please check if the backend server is running on port 5000 and API keys are configured properly.`
    };
  }
}

// Health check function to verify backend connectivity
export async function checkBackendHealth(): Promise<{ connected: boolean; message: string }> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/health`, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        message: `Backend is ${data.status}. API Keys: ${data.apiKeys?.active || 0}/${data.apiKeys?.total || 0} active.`
      };
    } else {
      return {
        connected: false,
        message: `Backend returned ${response.status}: ${response.statusText}`
      };
    }
  } catch (error: any) {
    return {
      connected: false,
      message: `Cannot connect to backend: ${error.message}`
    };
  }
}