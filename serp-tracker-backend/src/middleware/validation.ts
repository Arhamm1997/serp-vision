import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  // Skip API key validation if disabled
  if (process.env.ENABLE_API_KEY_AUTH !== 'true') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: 'API key required'
    });
    return;
  }

  // Validate API key (implement your logic here)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey as string)) {
    logger.warn(`Invalid API key attempt from IP: ${req.ip}`);
    res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
    return;
  }

  next();
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
  });
  
  next();
};