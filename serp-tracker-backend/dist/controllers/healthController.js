"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const serpApiPoolManager_1 = require("../services/serpApiPoolManager");
const database_1 = require("../config/database");
const SearchResult_1 = require("../models/SearchResult");
const ApiKey_1 = require("../models/ApiKey");
class HealthController {
    constructor() {
        this.checkHealth = async (req, res) => {
            try {
                const keyStats = serpApiPoolManager_1.SerpApiPoolManager.getInstance().getKeyStats();
                const dbHealth = await (0, database_1.checkDatabaseHealth)();
                const totalSearches = await SearchResult_1.SearchResultModel.countDocuments();
                const todaySearches = await SearchResult_1.SearchResultModel.countDocuments({
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
                        details: serpApiPoolManager_1.SerpApiPoolManager.getInstance().getDetailedKeyStats()
                    },
                    statistics: {
                        totalSearches,
                        todaySearches
                    },
                    environment: process.env.NODE_ENV,
                    version: process.env.npm_package_version || '1.0.0'
                };
                res.status(200).json(healthData);
            }
            catch (error) {
                res.status(500).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        };
        this.getApiKeyStats = async (req, res) => {
            try {
                const keyStats = serpApiPoolManager_1.SerpApiPoolManager.getInstance().getKeyStats();
                const detailedStats = serpApiPoolManager_1.SerpApiPoolManager.getInstance().getDetailedKeyStats();
                const keyUsageFromDb = await ApiKey_1.ApiKeyModel.find({}).lean();
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to get API key stats',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        };
    }
}
exports.HealthController = HealthController;
//# sourceMappingURL=healthController.js.map