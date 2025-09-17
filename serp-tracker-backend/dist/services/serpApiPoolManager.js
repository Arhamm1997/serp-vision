"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerpApiPoolManager = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = require("../utils/logger");
const ApiKey_1 = require("../models/ApiKey");
const SearchResult_1 = require("../models/SearchResult");
class SerpApiPoolManager {
    constructor() {
        this.apiKeys = [];
        this.currentKeyIndex = 0;
        this.rotationStrategy = 'priority';
    }
    static getInstance() {
        if (!SerpApiPoolManager.instance) {
            SerpApiPoolManager.instance = new SerpApiPoolManager();
        }
        return SerpApiPoolManager.instance;
    }
    async initialize() {
        await this.loadApiKeys();
        this.rotationStrategy = process.env.SERPAPI_ROTATION_STRATEGY || 'priority';
        logger_1.logger.info(`SerpApi Pool Manager initialized with ${this.apiKeys.length} keys`);
    }
    async loadApiKeys() {
        const keys = [];
        let keyIndex = 1;
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
        for (const keyConfig of keys) {
            try {
                const existingKey = await ApiKey_1.ApiKeyModel.findOne({ keyId: keyConfig.id });
                if (existingKey) {
                    keyConfig.usedToday = existingKey.usedToday;
                    keyConfig.usedThisMonth = existingKey.usedThisMonth;
                    keyConfig.status = existingKey.status;
                    keyConfig.errorCount = existingKey.errorCount;
                    keyConfig.successRate = existingKey.successRate;
                    keyConfig.lastUsed = existingKey.lastUsed;
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to load existing data for key ${keyConfig.id}:`, error);
            }
        }
        this.apiKeys = keys;
        logger_1.logger.info(`Loaded ${keys.length} SerpApi keys with total daily capacity: ${keys.reduce((sum, k) => sum + k.dailyLimit, 0)}`);
    }
    async trackKeyword(keyword, options) {
        let lastError = null;
        const maxRetries = parseInt(process.env.SERPAPI_MAX_RETRIES || '3');
        const startTime = Date.now();
        for (let attempt = 0; attempt < this.apiKeys.length && attempt < maxRetries; attempt++) {
            const keyConfig = await this.getNextAvailableKey();
            if (!keyConfig) {
                throw new Error('All SerpApi keys exhausted for today');
            }
            try {
                const result = await this.makeRequest(keyConfig, keyword, options);
                result.processingTime = Date.now() - startTime;
                result.apiKeyUsed = keyConfig.id;
                await this.updateKeyUsage(keyConfig.id, true);
                await this.saveSearchResult(result);
                logger_1.logger.info(`Keyword "${keyword}" tracked successfully with key ${keyConfig.id} (${result.processingTime}ms)`);
                return result;
            }
            catch (error) {
                lastError = error;
                if (this.isQuotaExceeded(error)) {
                    await this.markKeyExhausted(keyConfig.id);
                    logger_1.logger.warn(`Key ${keyConfig.id} exhausted, switching to next available key`);
                    continue;
                }
                if (this.isRateLimited(error)) {
                    await this.pauseKey(keyConfig.id, 60000);
                    logger_1.logger.warn(`Key ${keyConfig.id} rate limited, pausing temporarily`);
                    continue;
                }
                await this.updateKeyUsage(keyConfig.id, false);
                logger_1.logger.error(`Error with key ${keyConfig.id}: ${error.message}`);
                continue;
            }
        }
        throw new Error(`Failed to track keyword "${keyword}" with all available keys: ${lastError?.message}`);
    }
    async getNextAvailableKey() {
        const availableKeys = this.apiKeys.filter(key => key.status === 'active' &&
            key.usedToday < key.dailyLimit &&
            key.usedThisMonth < key.monthlyLimit);
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
    async makeRequest(keyConfig, keyword, options) {
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
        if (options.city && options.state) {
            params.append('location', `${options.city}, ${options.state}`);
        }
        else if (options.city) {
            params.append('location', options.city);
        }
        if (options.postalCode) {
            const existingLocation = params.get('location');
            if (existingLocation) {
                params.set('location', `${existingLocation} ${options.postalCode}`);
            }
            else {
                params.set('location', options.postalCode);
            }
        }
        const url = `https://serpapi.com/search?${params.toString()}`;
        const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await (0, node_fetch_1.default)(url, {
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
            if (data.error) {
                throw new Error(data.error);
            }
            return this.parseSearchResults(keyword, data, options);
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout exceeded');
            }
            throw error;
        }
    }
    parseSearchResults(keyword, data, options) {
        const organicResults = data.organic_results || [];
        const cleanDomain = this.extractDomain(options.domain);
        let position = null;
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
    extractDomain(url) {
        try {
            let domain = url.replace(/^https?:\/\//, '');
            domain = domain.replace(/^www\./, '');
            domain = domain.split('/')[0];
            domain = domain.split('?')[0].split('#')[0];
            return domain.toLowerCase();
        }
        catch (error) {
            return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
        }
    }
    domainsMatch(domain1, domain2) {
        const d1 = domain1.toLowerCase();
        const d2 = domain2.toLowerCase();
        return d1 === d2 ||
            d1.includes(d2) ||
            d2.includes(d1) ||
            d1.endsWith(`.${d2}`) ||
            d2.endsWith(`.${d1}`);
    }
    async updateKeyUsage(keyId, success) {
        const keyConfig = this.apiKeys.find(k => k.id === keyId);
        if (!keyConfig)
            return;
        if (success) {
            keyConfig.usedToday++;
            keyConfig.usedThisMonth++;
            keyConfig.successRate = ((keyConfig.successRate * 99) + 100) / 100;
        }
        else {
            keyConfig.errorCount++;
            keyConfig.successRate = ((keyConfig.successRate * 99) + 0) / 100;
        }
        keyConfig.lastUsed = new Date();
        keyConfig.updatedAt = new Date();
        try {
            await ApiKey_1.ApiKeyModel.findOneAndUpdate({ keyId }, {
                usedToday: keyConfig.usedToday,
                usedThisMonth: keyConfig.usedThisMonth,
                status: keyConfig.status,
                errorCount: keyConfig.errorCount,
                successRate: keyConfig.successRate,
                lastUsed: keyConfig.lastUsed,
                updatedAt: keyConfig.updatedAt
            }, { upsert: true });
        }
        catch (error) {
            logger_1.logger.error('Failed to update key usage in database:', error);
        }
    }
    async markKeyExhausted(keyId) {
        const keyConfig = this.apiKeys.find(k => k.id === keyId);
        if (keyConfig) {
            keyConfig.status = 'exhausted';
            await this.updateKeyUsage(keyId, false);
        }
    }
    async pauseKey(keyId, duration) {
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
    async saveSearchResult(result) {
        try {
            await SearchResult_1.SearchResultModel.create(result);
        }
        catch (error) {
            logger_1.logger.error('Failed to save search result:', error);
        }
    }
    isQuotaExceeded(error) {
        const message = error?.message?.toLowerCase() || '';
        return message.includes('quota') ||
            message.includes('limit') ||
            message.includes('exceeded') ||
            message.includes('usage limit');
    }
    isRateLimited(error) {
        const message = error?.message?.toLowerCase() || '';
        return message.includes('rate') ||
            message.includes('too many') ||
            message.includes('429') ||
            message.includes('rate limit');
    }
    getKeyStats() {
        return {
            total: this.apiKeys.length,
            active: this.apiKeys.filter(k => k.status === 'active').length,
            exhausted: this.apiKeys.filter(k => k.status === 'exhausted').length,
            totalUsageToday: this.apiKeys.reduce((sum, k) => sum + k.usedToday, 0)
        };
    }
    async resetDailyUsage() {
        for (const key of this.apiKeys) {
            key.usedToday = 0;
            if (key.status === 'exhausted') {
                key.status = 'active';
            }
        }
        try {
            await ApiKey_1.ApiKeyModel.updateMany({}, {
                usedToday: 0,
                status: 'active'
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to reset daily usage in database:', error);
        }
        logger_1.logger.info('Daily usage reset for all API keys');
    }
    getDetailedKeyStats() {
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
exports.SerpApiPoolManager = SerpApiPoolManager;
//# sourceMappingURL=serpApiPoolManager.js.map