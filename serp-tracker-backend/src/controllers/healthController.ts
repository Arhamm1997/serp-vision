import { Request, Response } from 'express';
import { SerpApiPoolManager } from '../services/serpApiPoolManager';
import { checkDatabaseHealth } from '../config/database';
import { SearchResultModel } from '../models/SearchResult';
import { ApiKeyModel } from '../models/ApiKey';

export class HealthController {
  public checkHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const keyStats = SerpApiPoolManager.getInstance().getKeyStats();
      const dbHealth = await checkDatabaseHealth();
      
      // Get some basic stats
      const totalSearches = await SearchResultModel.countDocuments();
      const todaySearches = await SearchResultModel.countDocuments({
        timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      });

      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbHealth,
        apiKeys: {
          ...keyStats,
          details: SerpApiPoolManager.getInstance().getDetailedKeyStats()
        },
        statistics: {
          totalSearches,
          todaySearches
        },
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      };

      res.status(200).json(healthData);

    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public getApiKeyStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const keyStats = SerpApiPoolManager.getInstance().getKeyStats();
      const detailedStats = SerpApiPoolManager.getInstance().getDetailedKeyStats();
      // Get usage from database
      const keyUsageFromDb = await ApiKeyModel.find({}).lean();

      res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        apiKeys: {
          ...keyStats,
          details: detailedStats,
          historical: keyUsageFromDb
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get API key stats',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}