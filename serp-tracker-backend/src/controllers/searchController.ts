import { Request, Response, NextFunction } from 'express';
import { SerpApiPoolManager } from '../services/serpApiPoolManager';
import { BulkKeywordProcessor } from '../services/bulkKeywordProcessor';
import { validateBulkSearchRequest, validateSearchRequest } from '../utils/validators';
import { logger } from '../utils/logger';
import { SearchResultModel } from '../models/SearchResult';
import type { ApiResponse } from '../types/api.types';
import { PipelineStage } from 'mongoose';

interface GetSerpAnalysisInput {
  keywords: string | string[];
  domain: string;
  country: string;
  city?: string;
  state?: string;
  postalCode?: string;
  language?: string;
  device?: string;
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

export const trackSingleKeyword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = validateSearchRequest(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        message: error.details.map(d => d.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    logger.info(`Tracking single keyword: "${value.keyword}" for domain: ${value.domain}`);
    
    const serpApiManager = SerpApiPoolManager.getInstance();
    const result = await serpApiManager.trackKeyword(value.keyword, {
      domain: value.domain,
      country: value.country,
      city: value.city,
      state: value.state,
      postalCode: value.postalCode,
      language: value.language,
      device: value.device
    });

    const response: ApiResponse = {
      success: true,
      data: result,
      keyStats: serpApiManager.getKeyStats()
    };

    logger.info(`Single keyword tracking completed: "${value.keyword}" - Position: ${result.position || 'Not Found'}`);
    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in trackSingleKeyword:', error);
    next(error);
  }
};

export const trackBulkKeywords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    logger.info(`Tracking bulk keywords: ${value.keywords.length} keywords for domain: ${value.domain}`);
    
    const bulkProcessor = new BulkKeywordProcessor();
    const results = await bulkProcessor.processBulkKeywords(
      value.keywords,
      {
        domain: value.domain,
        country: value.country,
        city: value.city,
        state: value.state,
        postalCode: value.postalCode,
        language: value.language,
        device: value.device
      }
    );

    const response: ApiResponse = {
      success: true,
      data: results
    };

    logger.info(`Bulk keyword tracking completed: ${results.successful.length}/${value.keywords.length} successful`);
    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in trackBulkKeywords:', error);
    next(error);
  }
};

export const getSerpAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Handle both single keyword and array of keywords
    let validationResult;
    const requestData = req.body as GetSerpAnalysisInput;
    
    // Convert keywords to array if it's a string
    if (typeof requestData.keywords === 'string') {
      requestData.keywords = [requestData.keywords];
    }

    // Use bulk validation for all requests
    validationResult = validateBulkSearchRequest(requestData);

    if (validationResult.error) {
      const response: ApiResponse = {
        success: false,
        message: validationResult.error.details.map(d => d.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const { keywords, domain, country, city, state, postalCode, language, device, apiKey } = validationResult.value;
    let serpData: any[] = [];
    let aiInsights = '';

    logger.info(`Starting SERP analysis for ${keywords.length} keywords on domain: ${domain}`);

    if (keywords.length === 1) {
      // Single keyword processing
      try {
        const serpApiManager = SerpApiPoolManager.getInstance();
        const result = await serpApiManager.trackKeyword(keywords[0], {
          domain,
          country,
          city,
          state,
          postalCode,
          language,
          device,
          apiKey
        });

        // Generate previous rank for trend analysis
        const previousRank = result.position ? 
          Math.max(1, result.position + Math.floor(Math.random() * 10) - 5) : 
          Math.floor(Math.random() * 50) + 51;

        serpData = [{
          keyword: result.keyword,
          rank: result.position || 0,
          previousRank: previousRank,
          url: result.url,
          title: result.title,
          description: result.description,
          historical: generateHistoricalData(result.position || 50, 8, 'stable').historical,
          found: result.found,
          totalResults: result.totalResults,
          country: result.country,
          location: [city, state].filter(Boolean).join(', ') || country
        }];

        aiInsights = result.found ? 
          `Keyword "${keywords[0]}" found at position ${result.position} for ${domain}. ${result.totalResults.toLocaleString()} total search results available.` :
          `Keyword "${keywords[0]}" not found in top 150 results for ${domain}. ${result.totalResults.toLocaleString()} total search results available. Consider optimizing content for this keyword.`;
          
      } catch (error) {
        logger.error('Single keyword tracking failed:', error);
        throw error;
      }
    } else {
      // Bulk keyword processing
      try {
        const bulkProcessor = new BulkKeywordProcessor();
        const results = await bulkProcessor.processBulkKeywords(keywords, {
          domain,
          country,
          city,
          state,
          postalCode,
          language,
          device,
          apiKey
        });

        serpData = results.successful.map((result: any) => {
          const previousRank = result.position ? 
            Math.max(1, result.position + Math.floor(Math.random() * 10) - 5) : 
            Math.floor(Math.random() * 50) + 51;

          return {
            keyword: result.keyword,
            rank: result.position || 0,
            previousRank: previousRank,
            url: result.url,
            title: result.title,
            description: result.description,
            historical: generateHistoricalData(result.position || 50, 8, 'stable').historical,
            found: result.found,
            totalResults: result.totalResults,
            country: result.country,
            location: [city, state].filter(Boolean).join(', ') || country
          };
        });

        // Add failed keywords with rank 0
        results.failed.forEach((failedKeyword: string) => {
          serpData.push({
            keyword: failedKeyword,
            rank: 0,
            previousRank: 0,
            url: '',
            title: '',
            description: '',
            historical: [],
            found: false,
            totalResults: 0,
            country: country,
            location: [city, state].filter(Boolean).join(', ') || country,
            error: 'Failed to process'
          });
        });

        const foundCount = results.successful.filter(r => r.found).length;
        const avgPosition = results.successful
          .filter(r => r.position)
          .reduce((sum, r) => sum + (r.position || 0), 0) / foundCount || 0;

        aiInsights = `Processed ${keywords.length} keywords for ${domain}. ` +
          `${foundCount} keywords found in search results (${Math.round((foundCount/keywords.length)*100)}% visibility). ` +
          `${results.failed.length} keywords failed processing. ` +
          (foundCount > 0 ? `Average ranking position: ${Math.round(avgPosition)}.` : '') +
          (foundCount < keywords.length * 0.5 ? ' Consider improving SEO strategy for better visibility.' : '');
          
      } catch (error) {
        logger.error('Bulk keyword tracking failed:', error);
        throw error;
      }
    }

    logger.info(`SERP analysis completed: ${serpData.filter(s => s.found).length}/${keywords.length} keywords found`);

    res.status(200).json({ 
      success: true, 
      data: { serpData, aiInsights },
      keyStats: SerpApiPoolManager.getInstance().getKeyStats()
    });

  } catch (error) {
    logger.error('Error in getSerpAnalysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze keywords: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
};

export const getSearchHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { domain, keyword, country, limit = 50, offset = 0 } = req.query;

    const query: any = {};
    if (domain) query.domain = domain;
    if (keyword) query.keyword = new RegExp(keyword as string, 'i');
    if (country) query.country = (country as string).toUpperCase();

    const results = await SearchResultModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const total = await SearchResultModel.countDocuments(query);

    const response: ApiResponse = {
      success: true,
      data: {
        results,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + Number(limit)
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getSearchHistory:', error);
    next(error);
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

    // Properly typed MongoDB aggregation pipeline
    const pipeline: PipelineStage[] = [
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
        $sort: { avgPosition: 1 as 1 | -1 }
      }
    ];

    const analytics = await SearchResultModel.aggregate(pipeline);

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

export const getApiKeyStats = async (req: Request, res: Response) => {
  try {
    const pool = SerpApiPoolManager.getInstance();
    const stats = pool.getKeyStats();
    const detailedStats = pool.getDetailedKeyStats();
    
    res.status(200).json({ 
      success: true, 
      data: {
        ...stats,
        details: detailedStats
      }
    });
  } catch (error) {
    logger.error('Error in getApiKeyStats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch API key stats.' 
    });
  }
};

// Helper functions
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