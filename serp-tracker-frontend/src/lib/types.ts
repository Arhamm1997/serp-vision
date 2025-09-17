export type HistoricalData = {
  date: string;
  rank: number;
};

export type SerpData = {
  keyword: string;
  title?: string;
  description?: string;
  rank: number;
  previousRank: number;
  url: string;
  historical: HistoricalData[];
  found?: boolean;
  totalResults?: number;
  country?: string;
  location?: string;
  error?: string;
};

export type SerpAnalysisResult = {
  serpData: SerpData[];
  aiInsights: string;
};

// Backend API Response Types
export type BackendApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  keyStats?: {
    total: number;
    active: number;
    exhausted: number;
    paused?: number;
    totalUsageToday: number;
    totalCapacity?: number;
  };
};

export type BackendSearchResult = {
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
  processingTime?: number;
  apiKeyUsed?: string;
};

export type BackendBulkResult = {
  totalProcessed: number;
  successful: BackendSearchResult[];
  failed: string[];
  processingTime: number;
  keyUsageStats: {
    total: number;
    active: number;
    exhausted: number;
    totalUsageToday: number;
  };
};

export type BackendAnalyzeResult = {
  serpData: Array<{
    keyword: string;
    rank: number;
    previousRank: number;
    url: string;
    title?: string;
    description?: string;
    historical: HistoricalData[];
    found?: boolean;
    totalResults?: number;
    country?: string;
    location?: string;
  }>;
  aiInsights: string;
};

export type BackendHealthResponse = {
  status: string;
  timestamp: string;
  uptime: number;
  uptimeFormatted?: string;
  responseTime?: string;
  system?: {
    memory: {
      used: string;
      total: string;
      external: string;
      usagePercentage: number;
    };
    process: {
      pid: number;
      nodeVersion: string;
      platform: string;
      architecture: string;
    };
  };
  database: {
    status: string;
    details?: any;
    collections?: {
      searchResults: number;
      apiKeys: number;
    };
  };
  apiKeys: {
    total: number;
    active: number;
    exhausted: number;
    paused?: number;
    usagePercentage: number;
    details: Array<{
      id: string;
      status: string;
      usedToday: number;
      dailyLimit: number;
      usagePercentage: number;
      successRate: number;
      errorCount: number;
      lastUsed: Date;
      priority: number;
    }>;
    healthStatus: string;
  };
  statistics: {
    total: {
      searches: number;
      successful: number;
      successRate: string;
    };
    today: {
      searches: number;
      remaining: number;
      capacity: number;
    };
  };
  application: {
    name: string;
    version: string;
    environment: string;
    timezone: string;
  };
  alerts: string[];
};