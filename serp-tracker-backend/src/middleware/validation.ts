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

// Additional validation middleware for request body size
export const validateRequestSize = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        res.status(413).json({
          success: false,
          message: 'Request payload too large',
          maxSize: maxSize
        });
        return;
      }
    }
    
    next();
  };
};

// Helper function to parse size strings like '10mb'
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 0;
  
  const num = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(num * (units[unit] || 1));
};

// Middleware to validate specific endpoints
export const validateSearchEndpoint = (req: Request, res: Response, next: NextFunction): void => {
  const { method, path } = req;
  
  // Log the request for debugging
  logger.debug(`Validating ${method} ${path}`, {
    body: req.body,
    query: req.query,
    headers: {
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent')
    }
  });
  
  // Validate content type for POST requests
  if (method === 'POST') {
    const contentType = req.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        success: false,
        message: 'Content-Type must be application/json'
      });
      return;
    }
  }
  
  next();
};

// Rate limiting validation
export const validateRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // Get client identifier (IP or API key)
  const clientId = req.headers['x-api-key'] || req.ip;
  const userAgent = req.get('user-agent') || 'unknown';
  
  // Log the request for monitoring
  logger.info(`Request from client: ${clientId}`, {
    method: req.method,
    path: req.path,
    userAgent,
    timestamp: new Date().toISOString()
  });
  
  next();
};

// CORS validation middleware
export const validateCors = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('origin');
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:9002'
  ];
  
  // Log CORS requests for debugging
  if (origin) {
    logger.debug(`CORS request from origin: ${origin}`, {
      allowed: allowedOrigins.includes(origin),
      method: req.method,
      path: req.path
    });
  }
  
  next();
};