import { Router } from 'express';
import {
  trackSingleKeyword,
  trackBulkKeywords,
  getSerpAnalysis,
  getSearchHistory,
  getKeywordAnalytics,
  exportResults,
  getKeywordTrends,
  getApiKeyStats
} from '../controllers/searchController';
import { searchRateLimiter } from '../middleware/rateLimiter';
import { 
  validateApiKey, 
  validateSearchEndpoint, 
  validateRequestSize 
} from '../middleware/validation';

const router = Router();

// Apply middleware to all routes
router.use(searchRateLimiter);
router.use(validateApiKey);
router.use(validateSearchEndpoint);
router.use(validateRequestSize('10mb'));

// Single keyword tracking endpoint
router.post('/track', trackSingleKeyword);

// Bulk keywords tracking endpoint  
router.post('/bulk', trackBulkKeywords);

// Advanced SERP analysis (handles both single and bulk with AI insights)
router.post('/analyze', getSerpAnalysis);

// Search history with filters
router.get('/history', getSearchHistory);

// Get keyword analytics and insights
router.get('/analytics', getKeywordAnalytics);

// Get keyword trends over time
router.get('/trends', getKeywordTrends);

// Export results in various formats
router.get('/export', exportResults);

// Get API key stats (number of connected APIs and usage)
router.get('/api-key-stats', getApiKeyStats);

export { router as searchRoutes };