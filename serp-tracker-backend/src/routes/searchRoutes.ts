import { Router } from 'express';
import {
  getSerpAnalysis,
  getKeywordAnalytics,
  exportResults,
  getKeywordTrends,
  getApiKeyStats
} from '../controllers/searchController';
import { searchRateLimiter } from '../middleware/rateLimiter';
import { validateApiKey } from '../middleware/validation';

const router = Router();

router.use(searchRateLimiter);
router.use(validateApiKey);

// Track single keyword
router.post('/track', getSerpAnalysis);

// Bulk track keywords
router.post('/bulk', getSerpAnalysis);

// Get keyword analytics and insights
router.get('/analytics', getKeywordAnalytics);

// Get keyword trends over time
router.get('/trends', getKeywordTrends);

// Export results in various formats
router.get('/export', exportResults);

// Get API key stats (number of connected APIs)
router.get('/api-key-stats', getApiKeyStats);

export { router as searchRoutes };