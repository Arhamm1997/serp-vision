// src/services/serpApiPoolManager.ts
import fetch from 'node-fetch';
import { logger } from '../utils/logger';
import { ApiKeyModel } from '../models/ApiKey';
import { SearchResultModel } from '../models/SearchResult';
import { ISerpApiKey, ISearchOptions, ISearchResult } from '../types/api.types';

export class SerpApiPoolManager {
  private static instance: SerpApiPoolManager;
  private apiKeys: ISerpApiKey[] = [];
  private currentKeyIndex = 0;
  private rotationStrategy: 'round-robin' | 'priority' | 'least-used' = 'priority';
  private isInitialized = false;
  private keyUsageLock = new Map<string, boolean>();

  private constructor() {}

  public static getInstance(): SerpApiPoolManager {
    if (!SerpApiPoolManager.instance) {
      SerpApiPoolManager.instance = new SerpApiPoolManager();
    }
    return SerpApiPoolManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('SerpApi Pool Manager already initialized');
      return;
    }

    await this.loadApiKeys();
    await this.checkAndResetMonthlyUsage();
    this.rotationStrategy = (process.env.SERPAPI_ROTATION_STRATEGY as any) || 'priority';
    this.isInitialized = true;
    
    logger.info(`SerpApi Pool Manager initialized with ${this.apiKeys.length} keys using ${this.rotationStrategy} strategy`);
    
    // Log detailed key status
    this.apiKeys.forEach(key => {
      logger.info(`API Key ${key.id}: Status=${key.status}, UsedToday=${key.usedToday}/${key.dailyLimit}, Priority=${key.priority}`);
    });
  }

  private async loadApiKeys(): Promise<void> {
    const keys: ISerpApiKey[] = [];
    let keyIndex = 1;

    // Load keys from environment variables (SERPAPI_KEY_1, SERPAPI_KEY_2, etc.)
    while (process.env[`SERPAPI_KEY_${keyIndex}`] || keyIndex === 1) {
      const key = process.env[`SERPAPI_KEY_${keyIndex}`] || (process.env.SERPAPI_KEY || '').trim();
      // Skip placeholder values
      if (key && key.length > 10 && 
          key !== 'your_serpapi_key_here' && 
          !key.includes('your_second_serpapi_key_here') &&
          !key.includes('your_third_serpapi_key_here') &&
          !key.includes('CHANGE_ME')) { // Better validation
        keys.push({
          id: `serpapi_${keyIndex}`,
          key,
          dailyLimit: parseInt(process.env[`SERPAPI_DAILY_LIMIT_${keyIndex}`] || process.env.SERPAPI_DAILY_LIMIT || '5000'),
          monthlyLimit: parseInt(process.env[`SERPAPI_MONTHLY_LIMIT_${keyIndex}`] || process.env.SERPAPI_MONTHLY_LIMIT || '100000'),
          usedToday: 0,
          usedThisMonth: 0,
          status: 'active',
          priority: keyIndex,
          lastUsed: new Date(),
          errorCount: 0,
          successRate: 100,
          monthlyResetAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        logger.info(`Loaded API key ${keyIndex} with daily limit: ${keys[keys.length - 1].dailyLimit}`);
      }
      keyIndex++;
    }

    if (keys.length === 0) {
      throw new Error('No valid SerpApi keys found in environment variables. Please set SERPAPI_KEY_1, SERPAPI_KEY_2, etc.');
    }

    // Load existing usage data from database
    for (const keyConfig of keys) {
      try {
        const existingKey = await ApiKeyModel.findOne({ keyId: keyConfig.id });
        if (existingKey) {
          keyConfig.usedToday = existingKey.usedToday;
          keyConfig.usedThisMonth = existingKey.usedThisMonth;
          keyConfig.status = existingKey.status === 'exhausted' ? 'active' : existingKey.status; // Reset exhausted keys on startup
          keyConfig.errorCount = existingKey.errorCount;
          keyConfig.successRate = existingKey.successRate;
          keyConfig.lastUsed = existingKey.lastUsed;
          logger.debug(`Restored usage data for key ${keyConfig.id}: ${keyConfig.usedToday}/${keyConfig.dailyLimit}`);
        } else {
          // Create new database entry
          await ApiKeyModel.create({
            keyId: keyConfig.id,
            dailyLimit: keyConfig.dailyLimit,
            monthlyLimit: keyConfig.monthlyLimit,
            usedToday: 0,
            usedThisMonth: 0,
            status: 'active',
            priority: keyConfig.priority,
            errorCount: 0,
            successRate: 100,
            monthlyResetAt: new Date()
          });
        }
      } catch (error) {
        logger.warn(`Failed to load existing data for key ${keyConfig.id}:`, error);
      }
    }

    this.apiKeys = keys;
    const totalCapacity = keys.reduce((sum, k) => sum + k.dailyLimit, 0);
    logger.info(`Loaded ${keys.length} SerpApi keys with total daily capacity: ${totalCapacity.toLocaleString()}`);
  }

  public async trackKeyword(keyword: string, options: ISearchOptions & { apiKey?: string }): Promise<ISearchResult> {
    if (!this.isInitialized) {
      throw new Error('SerpApi Pool Manager not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    // If a specific API key is provided, use it directly
    if (options.apiKey) {
      const tempKeyConfig: ISerpApiKey = {
        id: 'user-provided-key',
        key: options.apiKey,
        dailyLimit: 100,
        monthlyLimit: 1000,
        usedToday: 0,
        usedThisMonth: 0,
        status: 'active',
        priority: 0,
        lastUsed: new Date(),
        errorCount: 0,
        successRate: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        logger.debug(`Using provided API key for keyword: "${keyword}"`);
        const result = await this.makeRequest(tempKeyConfig, keyword, options);
        (result as any).processingTime = Date.now() - startTime;
        return result;
      } catch (error) {
        throw new Error(`Failed to use provided API key: ${(error as Error).message}`);
      }
    }

    let lastError: Error | null = null;
    const maxRetries = Math.min(this.apiKeys.length, parseInt(process.env.SERPAPI_MAX_RETRIES || '3'));

    logger.debug(`Starting keyword tracking: "${keyword}" for domain: ${options.domain}`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const keyConfig = await this.getNextAvailableKey();

      if (!keyConfig) {
        throw new Error('All SerpApi keys exhausted or unavailable. Please check your API key limits.');
      }

      // Lock this key during usage to prevent concurrent access issues
      if (this.keyUsageLock.get(keyConfig.id)) {
        logger.debug(`Key ${keyConfig.id} is locked, trying next available key`);
        continue;
      }

      this.keyUsageLock.set(keyConfig.id, true);

      try {
        logger.debug(`Using API key ${keyConfig.id} (attempt ${attempt + 1}/${maxRetries})`);
        const result = await this.makeRequest(keyConfig, keyword, options);
        
        // Add processing metadata
        (result as any).processingTime = Date.now() - startTime;
        (result as any).apiKeyUsed = keyConfig.id;

        // Update usage stats
        await this.updateKeyUsage(keyConfig.id, true);

        // Save result to database
        await this.saveSearchResult(result);

        logger.info(`✅ Keyword "${keyword}" tracked successfully with key ${keyConfig.id} in ${(result as any).processingTime}ms - Position: ${result.position || 'Not Found'}`);
        return result;

      } catch (error) {
        lastError = error as Error;
        logger.warn(`❌ Error with key ${keyConfig.id} for keyword "${keyword}": ${(error as Error).message}`);

        if (this.isQuotaExceeded(error)) {
          await this.markKeyExhausted(keyConfig.id);
          logger.warn(`Key ${keyConfig.id} quota exceeded, marking as exhausted`);
        } else if (this.isRateLimited(error)) {
          await this.pauseKey(keyConfig.id, 60000);
          logger.warn(`Key ${keyConfig.id} rate limited, pausing for 1 minute`);
        } else {
          await this.updateKeyUsage(keyConfig.id, false);
        }
      } finally {
        // Always release the lock
        this.keyUsageLock.delete(keyConfig.id);
      }
    }

    throw new Error(`Failed to track keyword "${keyword}" after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  private async getNextAvailableKey(): Promise<ISerpApiKey | null> {
    const availableKeys = this.apiKeys.filter(key =>
      key.status === 'active' &&
      key.usedToday < key.dailyLimit &&
      key.usedThisMonth < key.monthlyLimit &&
      !this.keyUsageLock.get(key.id) // Not currently locked
    );

    if (availableKeys.length === 0) {
      logger.warn('No available API keys found');
      return null;
    }

    let selectedKey: ISerpApiKey;

    switch (this.rotationStrategy) {
      case 'priority':
        selectedKey = availableKeys.sort((a, b) => a.priority - b.priority)[0];
        break;

      case 'least-used':
        selectedKey = availableKeys.sort((a, b) => a.usedToday - b.usedToday)[0];
        break;

      case 'round-robin':
      default:
        selectedKey = availableKeys[this.currentKeyIndex % availableKeys.length];
        this.currentKeyIndex = (this.currentKeyIndex + 1) % availableKeys.length;
        break;
    }

    logger.debug(`Selected key ${selectedKey.id} using ${this.rotationStrategy} strategy (${selectedKey.usedToday}/${selectedKey.dailyLimit} used)`);
    return selectedKey;
  }

  private async makeRequest(keyConfig: ISerpApiKey, keyword: string, options: ISearchOptions): Promise<ISearchResult> {
    const params = new URLSearchParams({
      engine: 'google',
      q: keyword.trim(),
      api_key: keyConfig.key,
      gl: options.country.toLowerCase(),
      hl: options.language || 'en',
      num: '200', // Search through 200 results (20 pages)
      device: options.device || 'desktop',
      safe: 'off',
      filter: '0', // Include duplicate results
      start: '0' // Start from first result
    });

    // Add location parameters with better formatting
    if (options.city && options.state) {
      params.append('location', `${options.city.trim()}, ${options.state.trim()}`);
    } else if (options.city) {
      params.append('location', options.city.trim());
    } else if (options.state) {
      params.append('location', options.state.trim());
    }

    if (options.postalCode) {
      const existingLocation = params.get('location');
      if (existingLocation) {
        params.set('location', `${existingLocation} ${options.postalCode.trim()}`);
      } else {
        params.set('location', options.postalCode.trim());
      }
    }

    const url = `https://serpapi.com/search?${params.toString()}`;
    const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      logger.debug(`Making SerpApi request: ${params.get('q')} in ${params.get('gl')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SERP-Tracker/2.0 (Professional SERP Tracking Tool)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();

      if ((data as any).error) {
        throw new Error(`SerpApi Error: ${(data as any).error}`);
      }

      // Check for search information
      if (!(data as any).search_information) {
        throw new Error('Invalid response from SerpApi: missing search information');
      }

      return this.parseSearchResults(keyword, data, options);

    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any).name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  private parseSearchResults(keyword: string, data: any, options: ISearchOptions): ISearchResult {
    const organicResults = data.organic_results || [];
    const cleanDomain = this.extractDomain(options.domain);
    const searchInfo = data.search_information || {};

    let position: number | null = null;
    let url = '';
    let title = '';
    let description = '';
    let foundMatch = false;

    logger.debug(`Parsing ${organicResults.length} organic results for domain: ${cleanDomain}`);

    // Search through organic results for domain match
    for (let i = 0; i < organicResults.length; i++) {
      const result = organicResults[i];
      if (result.link) {
        const resultDomain = this.extractDomain(result.link);

        if (this.domainsMatch(resultDomain, cleanDomain)) {
          position = result.position || (i + 1);
          url = result.link;
          title = result.title || '';
          description = result.snippet || result.rich_snippet?.top?.detected_extensions?.description || '';
          foundMatch = true;
          logger.debug(`✅ Found domain match at position ${position}: ${resultDomain}`);
          break;
        }
      }
    }

    if (!foundMatch) {
      logger.debug(`❌ Domain ${cleanDomain} not found in top ${organicResults.length} results`);
    }

    return {
      keyword: keyword.trim(),
      domain: options.domain,
      position,
      url,
      title,
      description,
      country: options.country.toUpperCase(),
      city: options.city?.trim() || '',
      state: options.state?.trim() || '',
      postalCode: options.postalCode?.trim() || '',
      totalResults: this.parseTotalResults(searchInfo.total_results),
      searchedResults: organicResults.length,
      timestamp: new Date(),
      found: foundMatch
    };
  }

  private parseTotalResults(totalResults: any): number {
    if (typeof totalResults === 'number') {
      return totalResults;
    }
    
    if (typeof totalResults === 'string') {
      // Remove non-digit characters and parse
      return parseInt(totalResults.replace(/[^\d]/g, '') || '0') || 0;
    }
    
    return 0;
  }

  private extractDomain(url: string): string {
    try {
      // Remove protocol
      let domain = url.replace(/^https?:\/\//, '');
      // Remove www
      domain = domain.replace(/^www\./, '');
      // Remove path, query, and fragment
      domain = domain.split('/')[0].split('?')[0].split('#')[0];
      // Convert to lowercase
      return domain.toLowerCase().trim();
    } catch (error) {
      logger.warn(`Error extracting domain from ${url}:`, error);
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase().trim();
    }
  }

  private domainsMatch(domain1: string, domain2: string): boolean {
    if (!domain1 || !domain2) return false;
    
    const d1 = domain1.toLowerCase().trim();
    const d2 = domain2.toLowerCase().trim();
    
    // Exact match
    if (d1 === d2) return true;
    
    // Remove common prefixes/suffixes for comparison
    const normalize = (d: string) => d.replace(/^(www|m|mobile)\./, '').replace(/\/$/, '');
    const n1 = normalize(d1);
    const n2 = normalize(d2);
    
    if (n1 === n2) return true;
    
    // Check if one is subdomain of another
    return d1.includes(d2) || d2.includes(d1) || 
           d1.endsWith(`.${d2}`) || d2.endsWith(`.${d1}`);
  }

  private async updateKeyUsage(keyId: string, success: boolean): Promise<void> {
    const keyConfig = this.apiKeys.find(k => k.id === keyId);
    if (!keyConfig) {
      logger.warn(`Key ${keyId} not found for usage update`);
      return;
    }

    const previousUsage = keyConfig.usedToday;

    if (success) {
      keyConfig.usedToday++;
      keyConfig.usedThisMonth++;
      // Weighted success rate calculation (more recent results have more weight)
      keyConfig.successRate = Math.min(100, (keyConfig.successRate * 0.95) + (100 * 0.05));
    } else {
      keyConfig.errorCount++;
      // Penalize success rate for errors
      keyConfig.successRate = Math.max(0, (keyConfig.successRate * 0.95) + (0 * 0.05));
    }

    keyConfig.lastUsed = new Date();
    keyConfig.updatedAt = new Date();

    // Check if key should be marked as exhausted
    if (keyConfig.usedToday >= keyConfig.dailyLimit) {
      keyConfig.status = 'exhausted';
      logger.warn(`Key ${keyId} has reached daily limit: ${keyConfig.usedToday}/${keyConfig.dailyLimit}`);
    }

    // Update in database asynchronously
    setImmediate(async () => {
      try {
        await ApiKeyModel.findOneAndUpdate(
          { keyId },
          {
            usedToday: keyConfig.usedToday,
            usedThisMonth: keyConfig.usedThisMonth,
            status: keyConfig.status,
            errorCount: keyConfig.errorCount,
            successRate: Math.round(keyConfig.successRate * 100) / 100,
            lastUsed: keyConfig.lastUsed,
            updatedAt: keyConfig.updatedAt
          },
          { upsert: true }
        );
        
        if (success && keyConfig.usedToday !== previousUsage) {
          logger.debug(`Updated key ${keyId} usage: ${keyConfig.usedToday}/${keyConfig.dailyLimit}`);
        }
      } catch (error) {
        logger.error('Failed to update key usage in database:', error);
      }
    });
  }

  private async markKeyExhausted(keyId: string): Promise<void> {
    const keyConfig = this.apiKeys.find(k => k.id === keyId);
    if (keyConfig && keyConfig.status !== 'exhausted') {
      keyConfig.status = 'exhausted';
      await this.updateKeyUsage(keyId, false);
      logger.warn(`🚫 Key ${keyId} marked as exhausted`);
    }
  }

  private async pauseKey(keyId: string, duration: number): Promise<void> {
    const keyConfig = this.apiKeys.find(k => k.id === keyId);
    if (keyConfig) {
      const previousStatus = keyConfig.status;
      keyConfig.status = 'paused';
      logger.info(`⏸️ Key ${keyId} paused for ${duration}ms`);
      
      setTimeout(() => {
        if (keyConfig.status === 'paused') {
          keyConfig.status = previousStatus === 'exhausted' ? 'exhausted' : 'active';
          logger.info(`▶️ Key ${keyId} resumed (status: ${keyConfig.status})`);
        }
      }, duration);
    }
  }

  private async saveSearchResult(result: ISearchResult): Promise<void> {
    try {
      await SearchResultModel.create(result);
      logger.debug(`Saved search result: ${result.keyword} -> ${result.position || 'Not Found'}`);
    } catch (error) {
      logger.error('Failed to save search result to database:', error);
    }
  }

  private isQuotaExceeded(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('quota') || 
           message.includes('limit') || 
           message.includes('exceeded') ||
           message.includes('usage limit') ||
           message.includes('monthly searches used up') ||
           message.includes('daily searches used up');
  }

  private isRateLimited(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('rate') || 
           message.includes('too many') || 
           message.includes('429') ||
           message.includes('rate limit') ||
           message.includes('requests per second');
  }

  public getKeyStats(): { 
    total: number; 
    active: number; 
    exhausted: number; 
    paused: number; 
    totalUsageToday: number; 
    totalCapacity: number;
    hasEnvironmentKeys: boolean;
    usagePercentage: number;
    remainingCapacity: number;
    estimatedTimeToExhaustion?: string;
    criticalKeys: number;
    warningKeys: number;
    totalUsageThisMonth: number;
    totalMonthlyCapacity: number;
    monthlyUsagePercentage: number;
  } {
    const totalUsageToday = this.apiKeys.reduce((sum, k) => sum + k.usedToday, 0);
    const totalCapacity = this.apiKeys.reduce((sum, k) => sum + k.dailyLimit, 0);
    const remainingCapacity = totalCapacity - totalUsageToday;
    const usagePercentage = totalCapacity > 0 ? Math.round((totalUsageToday / totalCapacity) * 100) : 0;
    
    // Count keys in different warning states
    const criticalKeys = this.apiKeys.filter(k => 
      (k.usedToday / k.dailyLimit) >= 0.9 && k.status === 'active'
    ).length;
    
    const warningKeys = this.apiKeys.filter(k => 
      (k.usedToday / k.dailyLimit) >= 0.75 && (k.usedToday / k.dailyLimit) < 0.9 && k.status === 'active'
    ).length;

    // Estimate time to exhaustion based on current usage pattern
    let estimatedTimeToExhaustion: string | undefined;
    if (remainingCapacity > 0 && totalUsageToday > 0) {
      const hoursElapsed = new Date().getHours() + (new Date().getMinutes() / 60);
      if (hoursElapsed > 0) {
        const currentRate = totalUsageToday / hoursElapsed; // requests per hour
        const hoursToExhaustion = remainingCapacity / currentRate;
        
        if (hoursToExhaustion < 24) {
          estimatedTimeToExhaustion = hoursToExhaustion < 1 
            ? `${Math.round(hoursToExhaustion * 60)} minutes`
            : `${Math.round(hoursToExhaustion)} hours`;
        }
      }
    }

    return {
      total: this.apiKeys.length,
      active: this.apiKeys.filter(k => k.status === 'active' && k.usedThisMonth < k.monthlyLimit).length,
      exhausted: this.apiKeys.filter(k => k.status === 'exhausted' || k.usedThisMonth >= k.monthlyLimit).length,
      paused: this.apiKeys.filter(k => k.status === 'paused').length,
      totalUsageToday,
      totalCapacity,
      hasEnvironmentKeys: this.apiKeys.length > 0,
      usagePercentage,
      remainingCapacity,
      estimatedTimeToExhaustion,
      criticalKeys,
      warningKeys,
      // Add monthly usage tracking
      totalUsageThisMonth: this.apiKeys.reduce((sum, k) => sum + k.usedThisMonth, 0),
      totalMonthlyCapacity: this.apiKeys.reduce((sum, k) => sum + k.monthlyLimit, 0),
      monthlyUsagePercentage: totalCapacity > 0 ? Math.round((this.apiKeys.reduce((sum, k) => sum + k.usedThisMonth, 0) / this.apiKeys.reduce((sum, k) => sum + k.monthlyLimit, 0)) * 100) : 0
    };
  }

  public getDetailedKeyStats() {
    return this.apiKeys.map(key => {
      const usagePercentage = Math.round((key.usedToday / key.dailyLimit) * 100);
      const remainingRequests = key.dailyLimit - key.usedToday;
      
      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'critical' | 'exhausted';
      if (key.status === 'exhausted') {
        healthStatus = 'exhausted';
      } else if (usagePercentage >= 90) {
        healthStatus = 'critical';
      } else if (usagePercentage >= 75) {
        healthStatus = 'warning';
      } else {
        healthStatus = 'healthy';
      }

      // Calculate monthly usage percentage
      const monthlyUsagePercentage = Math.round((key.usedThisMonth / key.monthlyLimit) * 100);

      return {
        id: key.id,
        status: key.status,
        usedToday: key.usedToday,
        dailyLimit: key.dailyLimit,
        usagePercentage,
        remainingRequests,
        successRate: key.successRate,
        errorCount: key.errorCount,
        lastUsed: key.lastUsed?.toISOString() || new Date().toISOString(),
        priority: key.priority,
        healthStatus,
        usedThisMonth: key.usedThisMonth,
        monthlyLimit: key.monthlyLimit,
        monthlyUsagePercentage,
        estimatedDailyExhaustion: this.estimateExhaustionTime(key)
      };
    });
  }

  private estimateExhaustionTime(key: ISerpApiKey): string | null {
    const remainingRequests = key.dailyLimit - key.usedToday;
    if (remainingRequests <= 0 || key.usedToday === 0) {
      return null;
    }

    const hoursElapsed = new Date().getHours() + (new Date().getMinutes() / 60);
    if (hoursElapsed === 0) return null;

    const currentRate = key.usedToday / hoursElapsed; // requests per hour
    const hoursToExhaustion = remainingRequests / currentRate;
    
    if (hoursToExhaustion < 1) {
      return `${Math.round(hoursToExhaustion * 60)} minutes`;
    } else if (hoursToExhaustion < 24) {
      return `${Math.round(hoursToExhaustion)} hours`;
    } else {
      return null; // More than a day
    }
  }

  public async resetDailyUsage(): Promise<void> {
    logger.info('🔄 Starting daily usage reset...');
    
    let resetCount = 0;
    for (const key of this.apiKeys) {
      if (key.usedToday > 0 || key.status === 'exhausted') {
        key.usedToday = 0;
        key.status = 'active';
        key.errorCount = 0; // Reset daily errors
        resetCount++;
      }
    }

    try {
      // Reset in database
      await ApiKeyModel.updateMany({}, {
        usedToday: 0,
        status: 'active',
        errorCount: 0
      });
      
      logger.info(`✅ Daily usage reset completed for ${resetCount} API keys`);
    } catch (error) {
      logger.error('❌ Failed to reset daily usage in database:', error);
    }
  }

  public async resetMonthlyUsage(): Promise<void> {
    logger.info('🔄 Starting monthly usage reset (SerpAPI monthly limit refresh)...');
    
    for (const key of this.apiKeys) {
      if (key.usedThisMonth > 0 || key.status === 'exhausted') {
        key.usedThisMonth = 0;
        if (key.status === 'exhausted' && key.usedToday < key.dailyLimit) {
          key.status = 'active';
        }
        key.errorCount = 0; // Reset monthly errors
        logger.debug(`Reset monthly usage for key ${key.id}`);
      }
    }

    try {
      // Reset in database
      await ApiKeyModel.updateMany({}, {
        usedThisMonth: 0,
        $set: {
          monthlyResetAt: new Date()
        }
      });
      
      logger.info(`✅ Monthly usage reset completed for ${this.apiKeys.length} API keys`);
    } catch (error) {
      logger.error('❌ Failed to reset monthly usage in database:', error);
    }
  }

  // Check if monthly reset is needed and perform it
  public async checkAndResetMonthlyUsage(): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Check each key to see if it needs monthly reset
    for (const key of this.apiKeys) {
      try {
        const existingKey = await ApiKeyModel.findOne({ keyId: key.id });
        if (existingKey && existingKey.monthlyResetAt) {
          const lastReset = new Date(existingKey.monthlyResetAt);
          const lastResetMonth = lastReset.getMonth();
          const lastResetYear = lastReset.getFullYear();
          
          // If we're in a new month, reset the usage
          if (currentMonth !== lastResetMonth || currentYear !== lastResetYear) {
            logger.info(`🗓️ Monthly reset needed for key ${key.id} (last reset: ${lastReset.toISOString()})`);
            await this.resetMonthlyUsage();
            break; // Reset all keys at once
          }
        } else {
          // No reset record found, perform initial monthly reset
          await this.resetMonthlyUsage();
          break;
        }
      } catch (error) {
        logger.warn(`Failed to check monthly reset for key ${key.id}:`, error);
      }
    }
  }

  public async testAllKeys(): Promise<void> {
    logger.info('🧪 Testing all API keys...');
    
    for (const key of this.apiKeys) {
      try {
        logger.info(`Testing key ${key.id}...`);
        const result = await this.makeRequest(key, 'test query', {
          domain: 'example.com',
          country: 'US'
        });
        logger.info(`✅ Key ${key.id} is working`);
      } catch (error) {
        logger.error(`❌ Key ${key.id} failed test: ${(error as Error).message}`);
        key.status = 'error';
      }
    }
  }

  public async testUserApiKey(apiKey: string): Promise<{ valid: boolean; message: string; details?: any }> {
    try {
      logger.info(`🧪 Testing user-provided API key...`);
      
      // Create a temporary key object for testing
      const tempKey: ISerpApiKey = {
        id: 'temp_user_key',
        key: apiKey.trim(),
        dailyLimit: 250,
        monthlyLimit: 250,
        usedToday: 0,
        usedThisMonth: 0,
        status: 'active',
        priority: 999,
        lastUsed: new Date(),
        errorCount: 0,
        successRate: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Make a test request using the provided API key
      const result = await this.makeRequest(tempKey, 'test query', {
        domain: 'example.com',
        country: 'US'
      });

      logger.info(`✅ User API key test successful`);
      return {
        valid: true,
        message: 'API key is valid and working',
        details: {
          totalResults: result.totalResults || 0,
          responseTime: Date.now(),
          testKeyword: 'test query',
          testDomain: 'example.com'
        }
      };

    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error(`❌ User API key test failed: ${errorMessage}`);
      
      // Check for specific error types to provide better feedback
      if (this.isQuotaExceeded(error)) {
        return {
          valid: false,
          message: 'API key has reached its quota limit',
          details: { error: 'quota_exceeded', errorMessage }
        };
      } else if (this.isRateLimited(error)) {
        return {
          valid: false,
          message: 'API key is being rate limited',
          details: { error: 'rate_limited', errorMessage }
        };
      } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        return {
          valid: false,
          message: 'Invalid API key',
          details: { error: 'unauthorized', errorMessage }
        };
      } else {
        return {
          valid: false,
          message: `API key test failed: ${errorMessage}`,
          details: {
            error: errorMessage,
            testKeyword: 'test query',
            testDomain: 'example.com'
          }
        };
      }
    }
  }

  // Dynamic API Key Management Methods

  public async addApiKey(apiKey: string, dailyLimit?: number, monthlyLimit?: number): Promise<{ success: boolean; message: string; keyId?: string }> {
    try {
      // First test if the API key is valid
      const testResult = await this.testUserApiKey(apiKey);
      if (!testResult.valid) {
        return {
          success: false,
          message: `Invalid API key: ${testResult.message}`
        };
      }

      // Check if key already exists
      const existingKey = this.apiKeys.find(k => k.key === apiKey);
      if (existingKey) {
        return {
          success: false,
          message: 'API key already exists in the pool'
        };
      }

      // Generate unique ID
      const keyId = `user_serpapi_${Date.now()}`;
      
      // Create new key configuration
      const newKey: ISerpApiKey = {
        id: keyId,
        key: apiKey,
        dailyLimit: dailyLimit || 250, // SerpAPI free tier default
        monthlyLimit: monthlyLimit || 250, // SerpAPI free tier default
        usedToday: 0,
        usedThisMonth: 0,
        status: 'active',
        priority: this.apiKeys.length + 1,
        lastUsed: new Date(),
        errorCount: 0,
        successRate: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        monthlyResetAt: new Date()
      };

      // Add to memory pool
      this.apiKeys.push(newKey);

      // Save to database
      await ApiKeyModel.create({
        keyId: newKey.id,
        dailyLimit: newKey.dailyLimit,
        monthlyLimit: newKey.monthlyLimit,
        usedToday: 0,
        usedThisMonth: 0,
        status: 'active',
        priority: newKey.priority,
        errorCount: 0,
        successRate: 100,
        monthlyResetAt: new Date()
      });

      logger.info(`✅ Successfully added new API key: ${keyId}`);
      return {
        success: true,
        message: 'API key added successfully',
        keyId: keyId
      };

    } catch (error) {
      logger.error('❌ Failed to add API key:', error);
      return {
        success: false,
        message: `Failed to add API key: ${(error as Error).message}`
      };
    }
  }

  public async removeApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find the key in memory
      const keyIndex = this.apiKeys.findIndex(k => k.id === keyId);
      if (keyIndex === -1) {
        return {
          success: false,
          message: 'API key not found'
        };
      }

      // Remove from memory
      this.apiKeys.splice(keyIndex, 1);

      // Remove from database
      await ApiKeyModel.deleteOne({ keyId: keyId });

      logger.info(`✅ Successfully removed API key: ${keyId}`);
      return {
        success: true,
        message: 'API key removed successfully'
      };

    } catch (error) {
      logger.error('❌ Failed to remove API key:', error);
      return {
        success: false,
        message: `Failed to remove API key: ${(error as Error).message}`
      };
    }
  }

  public async updateApiKey(keyId: string, updates: Partial<{ dailyLimit: number; monthlyLimit: number; priority: number }>): Promise<{ success: boolean; message: string }> {
    try {
      // Find the key in memory
      const key = this.apiKeys.find(k => k.id === keyId);
      if (!key) {
        return {
          success: false,
          message: 'API key not found'
        };
      }

      // Update memory
      if (updates.dailyLimit !== undefined) key.dailyLimit = updates.dailyLimit;
      if (updates.monthlyLimit !== undefined) key.monthlyLimit = updates.monthlyLimit;
      if (updates.priority !== undefined) key.priority = updates.priority;
      key.updatedAt = new Date();

      // Update database
      const updateData: any = { updatedAt: new Date() };
      if (updates.dailyLimit !== undefined) updateData.dailyLimit = updates.dailyLimit;
      if (updates.monthlyLimit !== undefined) updateData.monthlyLimit = updates.monthlyLimit;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      await ApiKeyModel.updateOne({ keyId: keyId }, updateData);

      logger.info(`✅ Successfully updated API key: ${keyId}`);
      return {
        success: true,
        message: 'API key updated successfully'
      };

    } catch (error) {
      logger.error('❌ Failed to update API key:', error);
      return {
        success: false,
        message: `Failed to update API key: ${(error as Error).message}`
      };
    }
  }

  public async refreshStats(): Promise<void> {
    // This method can be called to refresh stats after dynamic changes
    // It's mainly for future extensibility
    logger.debug('📊 Refreshing API pool statistics...');
  }
}