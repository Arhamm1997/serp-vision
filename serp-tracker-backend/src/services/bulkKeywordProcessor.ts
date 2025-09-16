// src/services/bulkKeywordProcessor.ts
import { SerpApiPoolManager } from './serpApiPoolManager';
import { ISearchOptions, ISearchResult, IBulkSearchResult, IProcessingProgress } from '../types/api.types';
import { logger } from '../utils/logger';
import { delay } from '../utils/helpers';

interface BulkProcessingConfig {
  batchSize: number;
  delayBetweenBatches: number;
  maxConcurrentRequests: number;
  retryFailedKeywords: boolean;
  maxRetries: number;
}

export class BulkKeywordProcessor {
  private serpApiManager = SerpApiPoolManager.getInstance();
  private config: BulkProcessingConfig;
  private processedCount = 0;
  private failedKeywords: string[] = [];
  private successfulResults: ISearchResult[] = [];
  private startTime = 0;

  constructor() {
    this.config = {
      batchSize: parseInt(process.env.BULK_PROCESSING_BATCH_SIZE || '5'),
      delayBetweenBatches: parseInt(process.env.BULK_PROCESSING_DELAY || '1000'),
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3'),
      retryFailedKeywords: true,
      maxRetries: 2
    };
  }

  async processBulkKeywords(
    keywords: string[], 
    options: ISearchOptions,
    onProgress?: (progress: IProcessingProgress) => void
  ): Promise<IBulkSearchResult> {
    
    this.startTime = Date.now();
    this.processedCount = 0;
    this.failedKeywords = [];
    this.successfulResults = [];

    const totalKeywords = keywords.length;
    logger.info(`Starting bulk processing of ${totalKeywords} keywords for domain: ${options.domain}`);
    
    // Split keywords into batches
    const batches = this.createBatches(keywords, this.config.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} keywords)`);
      
      try {
        // Process batch with concurrent requests
        const batchResults = await this.processBatch(batch, options);
        this.successfulResults.push(...batchResults);
        this.processedCount += batch.length;
        
        // Update progress
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
        
        // Delay between batches to respect rate limits
        if (batchIndex < batches.length - 1) {
          await delay(this.config.delayBetweenBatches);
        }
        
      } catch (error) {
        logger.error(`Batch ${batchIndex + 1} failed:`, error);
        
        // Add failed keywords to retry queue
        if (this.config.retryFailedKeywords) {
          this.failedKeywords.push(...batch);
        }
        continue;
      }
    }
    
    // Retry failed keywords if enabled
    if (this.config.retryFailedKeywords && this.failedKeywords.length > 0) {
      logger.info(`Retrying ${this.failedKeywords.length} failed keywords...`);
      await this.retryFailedKeywords(options, onProgress);
    }
    
    const processingTime = Date.now() - this.startTime;
    
    logger.info(`Bulk processing completed: ${this.successfulResults.length}/${totalKeywords} successful (${processingTime}ms)`);
    
    return {
      totalProcessed: this.processedCount,
      successful: this.successfulResults,
      failed: this.failedKeywords,
      processingTime,
      keyUsageStats: this.serpApiManager.getKeyStats()
    };
  }

  private async processBatch(keywords: string[], options: ISearchOptions): Promise<ISearchResult[]> {
    const results: ISearchResult[] = [];
    const semaphore = new Semaphore(this.config.maxConcurrentRequests);
    
    const promises = keywords.map(async (keyword) => {
      return semaphore.acquire(async () => {
        try {
          logger.debug(`Processing: "${keyword}"`);
          const result = await this.serpApiManager.trackKeyword(keyword, options);
          logger.debug(`Completed: "${keyword}" - Position: ${result.position || 'Not Found'}`);
          return result;
        } catch (error) {
          logger.error(`Failed: "${keyword}" - ${(error as Error).message}`);
          throw error;
        }
      });
    });
    
    // Wait for all promises with individual error handling
    const settledResults = await Promise.allSettled(promises);
    
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        logger.error(`Keyword "${keywords[index]}" failed:`, result.reason);
        this.failedKeywords.push(keywords[index]);
      }
    });
    
    return results;
  }

  private async retryFailedKeywords(
    options: ISearchOptions, 
    onProgress?: (progress: IProcessingProgress) => void
  ): Promise<void> {
    let retryAttempt = 1;
    let keywordsToRetry = [...this.failedKeywords];
    
    while (keywordsToRetry.length > 0 && retryAttempt <= this.config.maxRetries) {
      logger.info(`Retry attempt ${retryAttempt}/${this.config.maxRetries} for ${keywordsToRetry.length} keywords`);
      
      const retryResults: string[] = [];
      
      for (const keyword of keywordsToRetry) {
        try {
          await delay(2000); // Longer delay for retries
          
          const result = await this.serpApiManager.trackKeyword(keyword, options);
          this.successfulResults.push(result);
          
          // Remove from failed list
          this.failedKeywords = this.failedKeywords.filter(k => k !== keyword);
          
          logger.info(`Retry successful: "${keyword}" - Position: ${result.position || 'Not Found'}`);
          
        } catch (error) {
          logger.error(`Retry failed: "${keyword}" - ${(error as Error).message}`);
          retryResults.push(keyword);
        }
        
        // Update progress during retries
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

  private createBatches(keywords: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < keywords.length; i += batchSize) {
      batches.push(keywords.slice(i, i + batchSize));
    }
    return batches;
  }
}

// Semaphore for concurrent request limiting
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    await this.waitForPermit();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async waitForPermit(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waiting.push(resolve);
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      this.permits--;
      next();
    }
  }
}