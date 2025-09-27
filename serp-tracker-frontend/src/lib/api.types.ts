import type { SerpData } from './types';

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
    totalUsageThisMonth?: number;
    totalMonthlyCapacity?: number;
    monthlyUsagePercentage?: number;
  };
}

export interface SerpAnalysisResponse {
  success: boolean;
  data?: {
    serpData: SerpData[];
    aiInsights: string;
  };
  keyStats?: {
    total: number;
    active: number;
    exhausted: number;
    totalUsageToday: number;
    totalUsageThisMonth?: number;
    totalMonthlyCapacity?: number;
    monthlyUsagePercentage?: number;
  };
  message?: string;
  errors?: string[];
}