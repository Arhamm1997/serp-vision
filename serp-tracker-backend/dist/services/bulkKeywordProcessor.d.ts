import { ISearchOptions, IBulkSearchResult, IProcessingProgress } from '../types/api.types';
export declare class BulkKeywordProcessor {
    private serpApiManager;
    private config;
    private processedCount;
    private failedKeywords;
    private successfulResults;
    private startTime;
    constructor();
    processBulkKeywords(keywords: string[], options: ISearchOptions, onProgress?: (progress: IProcessingProgress) => void): Promise<IBulkSearchResult>;
    private processBatch;
    private retryFailedKeywords;
    private createBatches;
}
//# sourceMappingURL=bulkKeywordProcessor.d.ts.map