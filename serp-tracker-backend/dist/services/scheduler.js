"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCleanupJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const serpApiPoolManager_1 = require("./serpApiPoolManager");
const SearchResult_1 = require("../models/SearchResult");
const logger_1 = require("../utils/logger");
const scheduleCleanupJobs = () => {
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            await serpApiPoolManager_1.SerpApiPoolManager.getInstance().resetDailyUsage();
            logger_1.logger.info('Daily API key usage reset completed');
        }
        catch (error) {
            logger_1.logger.error('Failed to reset daily API key usage:', error);
        }
    });
    node_cron_1.default.schedule('0 2 * * 0', async () => {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const result = await SearchResult_1.SearchResultModel.deleteMany({
                timestamp: { $lt: ninetyDaysAgo }
            });
            logger_1.logger.info(`Cleaned up ${result.deletedCount} old search results`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old search results:', error);
        }
    });
    node_cron_1.default.schedule('0 * * * *', () => {
        const memUsage = process.memoryUsage();
        const keyStats = serpApiPoolManager_1.SerpApiPoolManager.getInstance().getKeyStats();
        logger_1.logger.info('System stats:', {
            uptime: process.uptime(),
            memory: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024),
                total: Math.round(memUsage.heapTotal / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            apiKeys: keyStats
        });
    });
    logger_1.logger.info('Scheduled jobs initialized');
};
exports.scheduleCleanupJobs = scheduleCleanupJobs;
//# sourceMappingURL=scheduler.js.map