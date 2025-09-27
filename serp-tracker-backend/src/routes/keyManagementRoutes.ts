import { Router, Request, Response } from 'express';
import { SerpApiPoolManager } from '../services/serpApiPoolManager';
import { logger } from '../utils/logger';
import { validateApiKey, validateKeyUpdate } from '../utils/validators';

const router = Router();
const poolManager = SerpApiPoolManager.getInstance();

// Get all API key stats and details
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Set cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const stats = poolManager.getKeyStats();
    const detailedStats = poolManager.getDetailedKeyStats();
    
    return res.json({
      success: true,
      data: {
        summary: stats,
        keys: detailedStats
      }
    });
  } catch (error) {
    logger.error('Failed to get API key stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve API key statistics',
      error: (error as Error).message
    });
  }
});

// Add new API key
router.post('/add', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { apiKey, dailyLimit, monthlyLimit } = req.body;
    
    const result = await poolManager.addApiKey(apiKey, dailyLimit, monthlyLimit);
    
    if (result.success) {
      // Return updated stats
      const stats = poolManager.getKeyStats();
      const detailedStats = poolManager.getDetailedKeyStats();
      
      return res.json({
        success: true,
        message: result.message,
        keyId: result.keyId,
        data: {
          summary: stats,
          keys: detailedStats
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('Failed to add API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add API key',
      error: (error as Error).message
    });
  }
});

// Remove API key
router.delete('/remove/:keyId', async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    
    const result = await poolManager.removeApiKey(keyId);
    
    if (result.success) {
      // Return updated stats
      const stats = poolManager.getKeyStats();
      const detailedStats = poolManager.getDetailedKeyStats();
      
      return res.json({
        success: true,
        message: result.message,
        data: {
          summary: stats,
          keys: detailedStats
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('Failed to remove API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove API key',
      error: (error as Error).message
    });
  }
});

// Update API key settings
router.put('/update/:keyId', validateKeyUpdate, async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    const updates = req.body;
    
    const result = await poolManager.updateApiKey(keyId, updates);
    
    if (result.success) {
      // Return updated stats
      const stats = poolManager.getKeyStats();
      const detailedStats = poolManager.getDetailedKeyStats();
      
      return res.json({
        success: true,
        message: result.message,
        data: {
          summary: stats,
          keys: detailedStats
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('Failed to update API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update API key',
      error: (error as Error).message
    });
  }
});

// Test specific API key
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }
    
    const result = await poolManager.testUserApiKey(apiKey);
    
    return res.json({
      success: result.valid,
      message: result.message,
      details: result.details
    });
  } catch (error) {
    logger.error('Failed to test API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test API key',
      error: (error as Error).message
    });
  }
});

export default router;