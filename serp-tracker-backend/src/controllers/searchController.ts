// Endpoint to get API key stats
export const getApiKeyStats = async (req: Request, res: Response) => {
  try {
    const pool = SerpApiPoolManager.getInstance();
    const stats = pool.getKeyStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error in getApiKeyStats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch API key stats.' });
  }
};
import { Request, Response, NextFunction } from 'express';
import { SerpApiPoolManager } from '../services/serpApiPoolManager';
import { BulkKeywordProcessor } from '../services/bulkKeywordProcessor';
import { validateBulkSearchRequest, validateSearchRequest } from '../utils/validators';
import { logger } from '../utils/logger';
import { SearchResultModel } from '../models/SearchResult';
import type { ApiResponse } from '../types/api.types';

interface GetSerpAnalysisInput {
  keywords: string;
  url: string;
  location?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  apiKey?: string;
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

export const getSerpAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = validateBulkSearchRequest(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        message: error.details.map(d => d.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }
    let serpData: any[] = [];
    let aiInsights = '';
    const keywords = Array.isArray(value.keywords) ? value.keywords : [value.keywords];
    if (keywords.length === 1) {
      // Single keyword: use /track endpoint
      const payload = {
        keyword: keywords[0],
        domain: value.url,
        country: value.location,
        city: value.city,
        state: value.state,
        postalCode: value.postalCode
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (value.apiKey) headers['x-api-key'] = value.apiKey;
      const response = await fetch('http://localhost:5000/api/search/track', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
  const result: any = await response.json();
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
        domain: value.url,
        country: value.location,
        city: value.city,
        state: value.state,
        postalCode: value.postalCode
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (value.apiKey) headers['x-api-key'] = value.apiKey;
      const response = await fetch('http://localhost:5000/api/search/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
  const result: any = await response.json();
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
    res.status(200).json({ success: true, data: { serpData, aiInsights } });
  } catch (e) {
    logger.error('Backend API failed:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch rankings from backend.' });
  }
};

export const getKeywordAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { domain, days = 30 } = req.query;

    if (!domain) {
      const response: ApiResponse = {
        success: false,
        message: 'Domain parameter is required'
      };
      res.status(400).json(response);
      return;
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - Number(days));

    const pipeline = [
      {
        $match: {
          domain: domain as string,
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: {
            keyword: '$keyword',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          position: { $first: '$position' },
          found: { $first: '$found' },
          url: { $first: '$url' },
          title: { $first: '$title' }
        }
      },
      {
        $group: {
          _id: '$_id.keyword',
          positions: {
            $push: {
              date: '$_id.date',
              position: '$position',
              found: '$found'
            }
          },
          avgPosition: { 
            $avg: { 
              $cond: [{ $ne: ['$position', null] }, '$position', null] 
            } 
          },
          foundCount: { $sum: { $cond: ['$found', 1, 0] } },
          totalChecks: { $sum: 1 },
          bestPosition: { 
            $min: { 
              $cond: [{ $ne: ['$position', null] }, '$position', 999] 
            } 
          },
          latestUrl: { $last: '$url' },
          latestTitle: { $last: '$title' }
        }
      },
      {
        $addFields: {
          visibilityRate: { 
            $round: [{ $multiply: [{ $divide: ['$foundCount', '$totalChecks'] }, 100] }, 2] 
          }
        }
      },
      {
        $sort: { avgPosition: 1 }
      }
    ];

    // Fix: ensure pipeline is an array and $sort uses 1/-1
    const fixedPipeline = pipeline.map(stage => {
      if (stage.$sort) {
        // Convert all sort values to 1/-1
        const newSort: Record<string, 1 | -1> = {};
        Object.entries(stage.$sort as Record<string, number>).forEach(([key, value]) => {
          newSort[key] = value >= 0 ? 1 : -1;
        });
        return { $sort: newSort };
      }
      return stage;
    });
    const analytics = await SearchResultModel.aggregate(fixedPipeline);

    // Calculate summary statistics
    const summary = {
      totalKeywords: analytics.length,
      foundKeywords: analytics.filter(a => a.foundCount > 0).length,
      avgVisibilityRate: analytics.length > 0 
        ? Math.round(analytics.reduce((sum, a) => sum + a.visibilityRate, 0) / analytics.length * 100) / 100
        : 0,
      topKeywords: analytics.slice(0, 5),
      improvementOpportunities: analytics.filter(a => a.foundCount === 0 || a.avgPosition > 50).slice(0, 10)
    };

    const response: ApiResponse = {
      success: true,
      data: {
        summary,
        keywords: analytics,
        period: `${days} days`
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getKeywordAnalytics:', error);
    next(error);
  }
};

export const exportResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { domain, format = 'csv', dateFrom, dateTo, found } = req.query;

    const query: any = {};
    if (domain) query.domain = domain;
    if (found !== undefined) query.found = found === 'true';
    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom as string);
      if (dateTo) query.timestamp.$lte = new Date(dateTo as string);
    }

    const results = await SearchResultModel.find(query).sort({ timestamp: -1 }).lean();

    if (format === 'csv') {
      const csv = generateCSV(results);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="serp-results-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="serp-results-${Date.now()}.json"`);
      res.json({
        success: true,
        data: results,
        exportedAt: new Date().toISOString(),
        totalRecords: results.length
      });
    }

  } catch (error) {
    logger.error('Error in exportResults:', error);
    next(error);
  }
};

export const getKeywordTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { domain, keyword, days = 30 } = req.query;

    if (!domain || !keyword) {
      const response: ApiResponse = {
        success: false,
        message: 'Domain and keyword parameters are required'
      };
      res.status(400).json(response);
      return;
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - Number(days));

    const trends = await SearchResultModel
      .find({
        domain: domain as string,
        keyword: keyword as string,
        timestamp: { $gte: dateFrom }
      })
      .sort({ timestamp: 1 })
      .select('position found timestamp totalResults')
      .lean();

    const response: ApiResponse = {
      success: true,
      data: {
        keyword,
        domain,
        trends,
        period: `${days} days`,
        dataPoints: trends.length
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getKeywordTrends:', error);
    next(error);
  }
};

// Standalone CSV helpers
function escapeCSV(str: string): string {
  if (!str) return '';
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function generateCSV(results: any[]): string {
  const headers = [
    'Keyword', 'Domain', 'Position', 'URL', 'Title', 'Description',
    'Country', 'City', 'State', 'Postal Code', 'Total Results',
    'Searched Results', 'Found', 'Processing Time', 'Timestamp'
  ];
  const csvRows = [headers.join(',')];
  for (const result of results) {
    const row = [
      escapeCSV(result.keyword),
      escapeCSV(result.domain),
      result.position || 'Not Found',
      escapeCSV(result.url),
      escapeCSV(result.title),
      escapeCSV(result.description),
      escapeCSV(result.country),
      escapeCSV(result.city),
      escapeCSV(result.state),
      escapeCSV(result.postalCode),
      result.totalResults,
      result.searchedResults,
      result.found ? 'Yes' : 'No',
      result.processingTime || 'N/A',
      result.timestamp?.toISOString() || ''
    ];
    csvRows.push(row.join(','));
  }
  return csvRows.join('\n');
}

// End of file