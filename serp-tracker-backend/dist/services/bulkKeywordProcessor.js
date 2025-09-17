"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkKeywordProcessor = void 0;
const serpApiPoolManager_1 = require("./serpApiPoolManager");
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
class BulkKeywordProcessor {
    constructor() {
        this.serpApiManager = serpApiPoolManager_1.SerpApiPoolManager.getInstance();
        this.processedCount = 0;
        this.failedKeywords = [];
        this.successfulResults = [];
        this.startTime = 0;
        this.config = {
            batchSize: parseInt(process.env.BULK_PROCESSING_BATCH_SIZE || '5'),
            delayBetweenBatches: parseInt(process.env.BULK_PROCESSING_DELAY || '1000'),
            maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3'),
            retryFailedKeywords: true,
            maxRetries: 2
        };
    }
    async processBulkKeywords(keywords, options, onProgress) {
        this.startTime = Date.now();
        this.processedCount = 0;
        this.failedKeywords = [];
        this.successfulResults = [];
        const totalKeywords = keywords.length;
        logger_1.logger.info(`Starting bulk processing of ${totalKeywords} keywords for domain: ${options.domain}`);
        const batches = this.createBatches(keywords, this.config.batchSize);
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            logger_1.logger.info(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} keywords)`);
            try {
                const batchResults = await this.processBatch(batch, options);
                this.successfulResults.push(...batchResults);
                this.processedCount += batch.length;
                if (onProgress) {
                    onProgress({
                        total: totalKeywords,
                        processed: this.processedCount,
                        successful: this.successfulResults.length,
                        failed: this.failedKeywords.length,
                        currentBatch: batchIndex + 1,
                        totalBatches: batches.length,
                        keyStats: this.serpApiManager.getKeyStats()
                    });
                }
                if (batchIndex < batches.length - 1) {
                    await (0, helpers_1.delay)(this.config.delayBetweenBatches);
                }
            }
            catch (error) {
                logger_1.logger.error(`Batch ${batchIndex + 1} failed:`, error);
                if (this.config.retryFailedKeywords) {
                    this.failedKeywords.push(...batch);
                }
                continue;
            }
        }
        if (this.config.retryFailedKeywords && this.failedKeywords.length > 0) {
            logger_1.logger.info(`Retrying ${this.failedKeywords.length} failed keywords...`);
            await this.retryFailedKeywords(options, onProgress);
        }
        const processingTime = Date.now() - this.startTime;
        logger_1.logger.info(`Bulk processing completed: ${this.successfulResults.length}/${totalKeywords} successful (${processingTime}ms)`);
        return {
            totalProcessed: this.processedCount,
            successful: this.successfulResults,
            failed: this.failedKeywords,
            processingTime,
            keyUsageStats: this.serpApiManager.getKeyStats()
        };
    }
    async processBatch(keywords, options) {
        const results = [];
        const semaphore = new Semaphore(this.config.maxConcurrentRequests);
        const promises = keywords.map(async (keyword) => {
            return semaphore.acquire(async () => {
                try {
                    logger_1.logger.debug(`Processing: "${keyword}"`);
                    const result = await this.serpApiManager.trackKeyword(keyword, options);
                    logger_1.logger.debug(`Completed: "${keyword}" - Position: ${result.position || 'Not Found'}`);
                    return result;
                }
                catch (error) {
                    logger_1.logger.error(`Failed: "${keyword}" - ${error.message}`);
                    throw error;
                }
            });
        });
        const settledResults = await Promise.allSettled(promises);
        settledResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            else {
                logger_1.logger.error(`Keyword "${keywords[index]}" failed:`, result.reason);
                this.failedKeywords.push(keywords[index]);
            }
        });
        return results;
    }
    async retryFailedKeywords(options, onProgress) {
        let retryAttempt = 1;
        let keywordsToRetry = [...this.failedKeywords];
        while (keywordsToRetry.length > 0 && retryAttempt <= this.config.maxRetries) {
            logger_1.logger.info(`Retry attempt ${retryAttempt}/${this.config.maxRetries} for ${keywordsToRetry.length} keywords`);
            const retryResults = [];
            for (const keyword of keywordsToRetry) {
                try {
                    await (0, helpers_1.delay)(2000);
                    const result = await this.serpApiManager.trackKeyword(keyword, options);
                    this.successfulResults.push(result);
                    this.failedKeywords = this.failedKeywords.filter(k => k !== keyword);
                    logger_1.logger.info(`Retry successful: "${keyword}" - Position: ${result.position || 'Not Found'}`);
                }
                catch (error) {
                    logger_1.logger.error(`Retry failed: "${keyword}" - ${error.message}`);
                    retryResults.push(keyword);
                }
                if (onProgress) {
                    onProgress({
                        total: this.processedCount,
                        processed: this.processedCount,
                        successful: this.successfulResults.length,
                        failed: this.failedKeywords.length,
                        currentBatch: -1,
                        totalBatches: -1,
                        keyStats: this.serpApiManager.getKeyStats(),
                        retryAttempt
                    });
                }
            }
            keywordsToRetry = retryResults;
            retryAttempt++;
        }
    }
    createBatches(keywords, batchSize) {
        const batches = [];
        for (let i = 0; i < keywords.length; i += batchSize) {
            batches.push(keywords.slice(i, i + batchSize));
        }
        return batches;
    }
}
exports.BulkKeywordProcessor = BulkKeywordProcessor;
class Semaphore {
    constructor(permits) {
        this.waiting = [];
        this.permits = permits;
    }
    async acquire(task) {
        await this.waitForPermit();
        try {
            return await task();
        }
        finally {
            this.release();
        }
    }
    async waitForPermit() {
        return new Promise((resolve) => {
            if (this.permits > 0) {
                this.permits--;
                resolve();
            }
            else {
                this.waiting.push(resolve);
            }
        });
    }
    release() {
        this.permits++;
        if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            this.permits--;
            next();
        }
    }
}
//# sourceMappingURL=bulkKeywordProcessor.js.map