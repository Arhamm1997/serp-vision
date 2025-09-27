export interface ISerpApiKey {
  id: string;
  key: string;
  dailyLimit: number;
  monthlyLimit: number;
  usedToday: number;
  usedThisMonth: number;
  status: 'active' | 'exhausted' | 'error' | 'paused';
  priority: number;
  lastUsed: Date;
  errorCount: number;
  successRate: number;
  monthlyResetAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISearchOptions {
  domain: string;
  country: string;
  language?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  location?: string;
  apiKey?: string;
}

export interface ISearchResult {
  keyword: string;
  domain: string;
  position: number | null;
  url: string;
  title: string;
  description: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  totalResults: number;
  searchedResults: number;
  timestamp: Date;
  found: boolean;
  searchMetadata?: {
    searchTime?: string;
    searchId?: string;
    location?: string;
    device?: string;
  };
}

export interface IBulkSearchRequest {
  keywords: string[];
  domain: string;
  country: string;
  city?: string;
  state?: string;
  postalCode?: string;
  language?: string;
  device?: string;
}

export interface IBulkSearchResult {
  totalProcessed: number;
  successful: ISearchResult[];
  failed: string[];
  processingTime: number;
  keyUsageStats: {
    total: number;
    active: number;
    exhausted: number;
    totalUsageToday: number;
  };
}

export interface IProcessingProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  keyStats: {
    total: number;
    active: number;
    exhausted: number;
    totalUsageToday: number;
  };
  retryAttempt?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  keyStats?: {
    total: number;
    active: number;
    exhausted: number;
    totalUsageToday: number;
  };
}
