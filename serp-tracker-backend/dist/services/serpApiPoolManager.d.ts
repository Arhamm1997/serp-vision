import { ISearchOptions, ISearchResult } from '../types/api.types';
export declare class SerpApiPoolManager {
    private static instance;
    private apiKeys;
    private currentKeyIndex;
    private rotationStrategy;
    private constructor();
    static getInstance(): SerpApiPoolManager;
    initialize(): Promise<void>;
    private loadApiKeys;
    trackKeyword(keyword: string, options: ISearchOptions): Promise<ISearchResult>;
    private getNextAvailableKey;
    private makeRequest;
    private parseSearchResults;
    private extractDomain;
    private domainsMatch;
    private updateKeyUsage;
    private markKeyExhausted;
    private pauseKey;
    private saveSearchResult;
    private isQuotaExceeded;
    private isRateLimited;
    getKeyStats(): {
        total: number;
        active: number;
        exhausted: number;
        totalUsageToday: number;
    };
    resetDailyUsage(): Promise<void>;
    getDetailedKeyStats(): {
        id: string;
        status: "error" | "active" | "exhausted" | "paused";
        usedToday: number;
        dailyLimit: number;
        successRate: number;
        lastUsed: Date;
    }[];
}
//# sourceMappingURL=serpApiPoolManager.d.ts.map