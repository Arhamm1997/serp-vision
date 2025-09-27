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
  validateRequestSize,
  validateSerpApiKey,
  addSecurityHeaders,
  sanitizeInputs,
  requestTimeout
} from '../middleware/validation';

const router = Router();

// Apply middleware to all routes
router.use(addSecurityHeaders);
router.use(sanitizeInputs);
router.use(requestTimeout(60000)); // 60 second timeout for search operations
router.use(searchRateLimiter);

// API key validation is now optional - middleware will skip if not configured
router.use(validateApiKey);
router.use(validateSearchEndpoint);
router.use(validateRequestSize('10mb'));
router.use(validateSerpApiKey);

// Middleware for JSON body validation on POST routes
const validateJsonBody = (req: any, res: any, next: any) => {
  if (req.method === 'POST') {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is required and cannot be empty',
        expectedFields: req.path.includes('bulk') ? 
          ['keywords', 'domain', 'country'] : 
          ['keyword', 'domain', 'country']
      });
    }
  }
  next();
};

router.use(validateJsonBody);

// SERP Analysis Routes (Primary endpoints for frontend)

// Main SERP analysis endpoint - handles both single and bulk keywords
router.post('/analyze', getSerpAnalysis);

// Legacy/specific endpoints for backward compatibility
router.post('/track', trackSingleKeyword);
router.post('/bulk', trackBulkKeywords);

// Data retrieval endpoints

// Get search history with advanced filtering
router.get('/history', getSearchHistory);

// Get keyword analytics and performance metrics
router.get('/analytics', getKeywordAnalytics);

// Get keyword trends over time
router.get('/trends', getKeywordTrends);

// Export results in various formats (CSV, JSON, Excel)
router.get('/export', exportResults);

// API management endpoints

// Get current API key statistics and usage
router.get('/keys/stats', getApiKeyStats);

// Test endpoint for API connectivity
router.post('/keys/test', async (req, res): Promise<void> => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      res.status(400).json({
        success: false,
        message: 'API key is required for testing',
        example: {
          apiKey: 'your_serpapi_key_here'
        }
      });
      return;
    }

    // Use the SerpApiPoolManager to test the API key directly
    const { SerpApiPoolManager } = await import('../services/serpApiPoolManager');
    const poolManager = SerpApiPoolManager.getInstance();
    
    const testResult = await poolManager.testUserApiKey(apiKey);

    if (testResult.valid) {
      res.json({
        success: true,
        message: testResult.message,
        details: testResult.details,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API key test failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint specific to search services
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SERP Search API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      analyze: 'POST /api/search/analyze',
      history: 'GET /api/search/history',
      analytics: 'GET /api/search/analytics',
      trends: 'GET /api/search/trends',
      export: 'GET /api/search/export',
      test: 'POST /api/search/test'
    }
  });
});

// Options endpoint for CORS preflight
router.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-SerpAPI-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

export { router as searchRoutes };