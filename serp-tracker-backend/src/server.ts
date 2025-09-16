import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from 'dotenv';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter, speedLimiter } from './middleware/rateLimiter';
import { corsMiddleware } from './middleware/cors';
import { requestLogger } from './middleware/validation';
import { setupRoutes } from './routes';
import { SerpApiPoolManager } from './services/serpApiPoolManager';
import { scheduleCleanupJobs } from './services/scheduler';

// Load environment variables
config();

class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000');
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      }
    }));

    // CORS configuration
    this.app.use(corsMiddleware);

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      type: ['application/json', 'text/plain']
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Request logging
    this.app.use(requestLogger);

    // HTTP request logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
        skip: (req) => req.path === '/health'
      }));
    }

    // Rate limiting
    this.app.use('/api', rateLimiter);
    this.app.use('/api', speedLimiter);

    // Root health check endpoint (outside /api for load balancers)
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      });
    });

    // API status endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'SERP Keyword Tracker API',
        version: '2.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        documentation: '/api',
        health: '/health'
      });
    });
  }

  private initializeRoutes(): void {
    setupRoutes(this.app);
  }

  private initializeErrorHandling(): void {
    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: '/api'
      });
    });

    // 404 handler for all other routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        suggestion: 'Visit /api for API documentation'
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      logger.info('✅ Database connected successfully');

      // Initialize SerpApi Pool Manager
      await SerpApiPoolManager.getInstance().initialize();
      logger.info('✅ SerpApi Pool Manager initialized');

      // Schedule cleanup jobs
      scheduleCleanupJobs();
      logger.info('✅ Scheduled jobs initialized');

      // Start server
      const server = this.app.listen(this.port, () => {
        logger.info(`🚀 SERP Tracker Server running on port ${this.port}`);
        logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
        logger.info(`🔗 CORS Origins: ${process.env.CORS_ORIGIN}`);
        logger.info(`📝 API Documentation: http://localhost:${this.port}/api`);
        logger.info(`🏥 Health Check: http://localhost:${this.port}/health`);
        
        const keyStats = SerpApiPoolManager.getInstance().getKeyStats();
        logger.info(`🔑 API Keys: ${keyStats.active}/${keyStats.total} active`);
      });

      // Set server timeout
      server.timeout = 60000; // 60 seconds

      // Graceful shutdown
      this.setupGracefulShutdown(server);
      
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(server: any): void {
    const signals = ['SIGTERM', 'SIGINT'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`📴 Received ${signal}, shutting down gracefully...`);
        
        try {
          // Stop accepting new connections
          server.close(() => {
            logger.info('🔌 HTTP server closed');
          });

          // Close database connection
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          logger.info('🗄️ Database connection closed');
          
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('🚫 Unhandled Rejection at:', { promise, reason });
      process.exit(1);
    });
  }
}

// Start server
const server = new Server();
server.start().catch(error => {
  logger.error('💥 Failed to start application:', error);
  process.exit(1);
});

export default Server;