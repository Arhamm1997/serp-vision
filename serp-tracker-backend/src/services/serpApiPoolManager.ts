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

  private constructor() {}

  public static getInstance(): SerpApiPoolManager {
    if (!SerpApiPoolManager.instance) {
      SerpApiPoolManager.instance = new SerpApiPoolManager();
    }
    return SerpApiPoolManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadApiKeys();
    this.rotationStrategy = (process.env.SERPAPI_ROTATION_STRATEGY as any) || 'priority';
    logger.info(`SerpApi Pool Manager initialized with ${this.apiKeys.length} keys`);
  }

  private async loadApiKeys(): Promise<void> {
    const keys: ISerpApiKey[] = [];
    let keyIndex = 1;

    // Load keys from environment variables
    while (process.env[`SERPAPI_KEY_${keyIndex}`]) {
      const key = process.env[`SERPAPI_KEY_${keyIndex}`];
      if (key) {
        keys.push({
          id: `serpapi_${keyIndex}`,
          key,
          dailyLimit: parseInt(process.env.SERPAPI_DAILY_LIMIT || '5000'),
          monthlyLimit: parseInt(process.env.SERPAPI_MONTHLY_LIMIT || '100000'),
          usedToday: 0,
          usedThisMonth: 0,
          status: 'active',
          priority: keyIndex,
          lastUsed: new Date(),
          errorCount: 0,
          successRate: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      keyIndex++;
    }

    if (keys.length === 0) {
      throw new Error('No SerpApi keys found in environment variables');
    }

    // Load existing usage data from database
    for (const keyConfig of keys) {
      try {
        const existingKey = await ApiKeyModel.findOne({ keyId: keyConfig.id });
        if (existingKey) {
          keyConfig.usedToday = existingKey.usedToday;
          keyConfig.usedThisMonth = existingKey.usedThisMonth;
          keyConfig.status = existingKey.status;
          keyConfig.errorCount = existingKey.errorCount;
          keyConfig.successRate = existingKey.successRate;
          keyConfig.lastUsed = existingKey.lastUsed;
        }
      } catch (error) {
        logger.warn(`Failed to load existing data for key ${keyConfig.id}:`, error);
      }
    }

    this.apiKeys = keys;
    logger.info(`Loaded ${keys.length} SerpApi keys with total daily capacity: ${keys.reduce((sum, k) => sum + k.dailyLimit, 0)}`);
  }

  public async trackKeyword(keyword: string, options: ISearchOptions): Promise<ISearchResult> {
    let lastError: Error | null = null;
    const maxRetries = parseInt(process.env.SERPAPI_MAX_RETRIES || '3');
    const startTime = Date.now();

    for (let attempt = 0; attempt < this.apiKeys.length && attempt < maxRetries; attempt++) {
      const keyConfig = await this.getNextAvailableKey();

      if (!keyConfig) {
        throw new Error('All SerpApi keys exhausted for today');
      }

      try {
        const result = await this.makeRequest(keyConfig, keyword, options);
  // @ts-ignore: Add missing properties dynamically
  (result as any).processingTime = Date.now() - startTime;
  (result as any).apiKeyUsed = keyConfig.id;

        // Update usage stats
        await this.updateKeyUsage(keyConfig.id, true);

        // Save result to database
        await this.saveSearchResult(result);

  logger.info(`Keyword "${keyword}" tracked successfully with key ${keyConfig.id} (${(result as any).processingTime}ms)`);
        return result;

      } catch (error) {
        lastError = error as Error;

        if (this.isQuotaExceeded(error)) {
          await this.markKeyExhausted(keyConfig.id);
          logger.warn(`Key ${keyConfig.id} exhausted, switching to next available key`);
          continue;
        }

        if (this.isRateLimited(error)) {
          await this.pauseKey(keyConfig.id, 60000);
          logger.warn(`Key ${keyConfig.id} rate limited, pausing temporarily`);
          continue;
        }

        await this.updateKeyUsage(keyConfig.id, false);
        logger.error(`Error with key ${keyConfig.id}: ${(error as Error).message}`);
        continue;
      }
    }

    throw new Error(`Failed to track keyword "${keyword}" with all available keys: ${lastError?.message}`);
  }

  private async getNextAvailableKey(): Promise<ISerpApiKey | null> {
    const availableKeys = this.apiKeys.filter(key =>
      key.status === 'active' &&
      key.usedToday < key.dailyLimit &&
      key.usedThisMonth < key.monthlyLimit
    );

    if (availableKeys.length === 0) {
      return null;
    }

    switch (this.rotationStrategy) {
      case 'priority':
        return availableKeys.sort((a, b) => a.priority - b.priority)[0];

      case 'least-used':
        return availableKeys.sort((a, b) => a.usedToday - b.usedToday)[0];

      case 'round-robin':
      default:
        const key = availableKeys[this.currentKeyIndex % availableKeys.length];
        this.currentKeyIndex++;
        return key;
    }
  }

  private async makeRequest(keyConfig: ISerpApiKey, keyword: string, options: ISearchOptions): Promise<ISearchResult> {
    const params = new URLSearchParams({
      engine: 'google',
      q: keyword,
      api_key: keyConfig.key,
      gl: options.country.toLowerCase(),
      hl: options.language || 'en',
      num: '150',
      device: options.device || 'desktop',
      safe: 'off',
      filter: '0'
    });

    // Add location parameters
    if (options.city && options.state) {
      params.append('location', `${options.city}, ${options.state}`);
    } else if (options.city) {
      params.append('location', options.city);
    }

    if (options.postalCode) {
      const existingLocation = params.get('location');
      if (existingLocation) {
        params.set('location', `${existingLocation} ${options.postalCode}`);
      } else {
        params.set('location', options.postalCode);
      }
    }

    const url = `https://serpapi.com/search?${params.toString()}`;
    const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SERP-Tracker/2.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if ((data as any).error) {
        throw new Error((data as any).error);
      }

      return this.parseSearchResults(keyword, data, options);

    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any).name === 'AbortError') {
        throw new Error('Request timeout exceeded');
      }
      throw error;
    }
  }

  private parseSearchResults(keyword: string, data: any, options: ISearchOptions): ISearchResult {
    const organicResults = data.organic_results || [];
    const cleanDomain = this.extractDomain(options.domain);

    let position: number | null = null;
    let url = '';
    let title = '';
    let description = '';
    let foundMatch = false;

    for (let i = 0; i < organicResults.length; i++) {
      const result = organicResults[i];
      if (result.link) {
        const resultDomain = this.extractDomain(result.link);

        if (this.domainsMatch(resultDomain, cleanDomain)) {
          position = i + 1;
          url = result.link;
          title = result.title || '';
          description = result.snippet || '';
          foundMatch = true;
          break;
        }
      }
    }

    return {
      keyword,
      domain: options.domain,
      position,
      url,
      title,
      description,
      country: options.country,
      city: options.city || '',
      state: options.state || '',
      postalCode: options.postalCode || '',
      totalResults: data.search_information?.total_results || 0,
      searchedResults: organicResults.length,
      timestamp: new Date(),
      found: foundMatch
    };
  }

  private extractDomain(url: string): string {
    try {
      let domain = url.replace(/^https?:\/\//, '');
      domain = domain.replace(/^www\./, '');
      domain = domain.split('/')[0];
      domain = domain.split('?')[0].split('#')[0];
      return domain.toLowerCase();
    } catch (error) {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    }
  }

  private domainsMatch(domain1: string, domain2: string): boolean {
    const d1 = domain1.toLowerCase();
    const d2 = domain2.toLowerCase();
    
    return d1 === d2 || 
           d1.includes(d2) || 
           d2.includes(d1) ||
           d1.endsWith(`.${d2}`) ||
           d2.endsWith(`.${d1}`);
  }

  private async updateKeyUsage(keyId: string, success: boolean): Promise<void> {
    const keyConfig = this.apiKeys.find(k => k.id === keyId);
    if (!keyConfig) return;

    if (success) {
      keyConfig.usedToday++;
      keyConfig.usedThisMonth++;
      keyConfig.successRate = ((keyConfig.successRate * 99) + 100) / 100;
    } else {
      keyConfig.errorCount++;
      keyConfig.successRate = ((keyConfig.successRate * 99) + 0) / 100;
    }

    keyConfig.lastUsed = new Date();
    keyConfig.updatedAt = new Date();

    // Update in database
    try {
      await ApiKeyModel.findOneAndUpdate(
        { keyId },
        {
          usedToday: keyConfig.usedToday,
          usedThisMonth: keyConfig.usedThisMonth,
          status: keyConfig.status,
          errorCount: keyConfig.errorCount,
          successRate: keyConfig.successRate,
          lastUsed: keyConfig.lastUsed,
          updatedAt: keyConfig.updatedAt
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Failed to update key usage in database:', error);
    }
  }

  private async markKeyExhausted(keyId: string): Promise<void> {
    const keyConfig = this.apiKeys.find(k => k.id === keyId);
    if (keyConfig) {
      keyConfig.status = 'exhausted';
      await this.updateKeyUsage(keyId, false);
    }
  }

  private async pauseKey(keyId: string, duration: number): Promise<void> {
    const keyConfig = this.apiKeys.find(k => k.id === keyId);
    if (keyConfig) {
      keyConfig.status = 'paused';
      setTimeout(() => {
        if (keyConfig.status === 'paused') {
          keyConfig.status = 'active';
        }
      }, duration);
    }
  }

  private async saveSearchResult(result: ISearchResult): Promise<void> {
    try {
      await SearchResultModel.create(result);
    } catch (error) {
      logger.error('Failed to save search result:', error);
    }
  }

  private isQuotaExceeded(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('quota') || 
           message.includes('limit') || 
           message.includes('exceeded') ||
           message.includes('usage limit');
  }

  private isRateLimited(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('rate') || 
           message.includes('too many') || 
           message.includes('429') ||
           message.includes('rate limit');
  }

  public getKeyStats(): { total: number; active: number; exhausted: number; totalUsageToday: number } {
    return {
      total: this.apiKeys.length,
      active: this.apiKeys.filter(k => k.status === 'active').length,
      exhausted: this.apiKeys.filter(k => k.status === 'exhausted').length,
      totalUsageToday: this.apiKeys.reduce((sum, k) => sum + k.usedToday, 0)
    };
  }

  public async resetDailyUsage(): Promise<void> {
    for (const key of this.apiKeys) {
      key.usedToday = 0;
      if (key.status === 'exhausted') {
        key.status = 'active';
      }
    }

    try {
      await ApiKeyModel.updateMany({}, {
        usedToday: 0,
        status: 'active'
      });
    } catch (error) {
      logger.error('Failed to reset daily usage in database:', error);
    }

    logger.info('Daily usage reset for all API keys');
  }

  public getDetailedKeyStats() {
    return this.apiKeys.map(key => ({
      id: key.id,
      status: key.status,
      usedToday: key.usedToday,
      dailyLimit: key.dailyLimit,
      successRate: Math.round(key.successRate * 100) / 100,
      lastUsed: key.lastUsed
    }));
  }
}