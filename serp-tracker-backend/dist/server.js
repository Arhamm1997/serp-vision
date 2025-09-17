"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = require("dotenv");
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const cors_1 = require("./middleware/cors");
const routes_1 = require("./routes");
const serpApiPoolManager_1 = require("./services/serpApiPoolManager");
const scheduler_1 = require("./services/scheduler");
(0, dotenv_1.config)();
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || '5000');
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        this.app.set('trust proxy', 1);
        this.app.use((0, helmet_1.default)({
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
        this.app.use(cors_1.corsMiddleware);
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({
            limit: '10mb',
            type: ['application/json', 'text/plain'],
            verify: (req, res, buf) => {
                try {
                    JSON.parse(buf.toString());
                }
                catch (e) {
                    logger_1.logger.error('Invalid JSON in request body:', {
                        error: (e instanceof Error ? e.message : String(e)),
                        body: buf.toString(),
                        url: req.url
                    });
                    throw new Error('Invalid JSON format');
                }
            }
        }));
        this.app.use(express_1.default.urlencoded({
            extended: true,
            limit: '10mb'
        }));
        this.app.use((error, req, res, next) => {
            if (error instanceof SyntaxError && 'body' in error) {
                logger_1.logger.error('JSON parsing error:', { error: error.message, url: req.url });
                res.status(400).json({
                    success: false,
                    message: 'Invalid JSON format in request body'
                });
                return;
            }
            next(error);
        });
        this.app.use((req, res, next) => {
            logger_1.logger.info('Request:', {
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                body: req.body
            });
            next();
        });
        if (process.env.NODE_ENV !== 'test') {
            this.app.use((0, morgan_1.default)('combined', {
                stream: { write: (message) => logger_1.logger.info(message.trim()) },
                skip: (req) => req.path === '/health'
            }));
        }
        this.app.use('/api', rateLimiter_1.rateLimiter);
        this.app.use('/api', rateLimiter_1.speedLimiter);
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
    initializeRoutes() {
        (0, routes_1.setupRoutes)(this.app);
    }
    initializeErrorHandling() {
        this.app.use('/api/*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'API endpoint not found',
                path: req.originalUrl,
                method: req.method,
                availableEndpoints: '/api'
            });
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route not found',
                path: req.originalUrl,
                suggestion: 'Visit /api for API documentation'
            });
        });
        this.app.use(errorHandler_1.errorHandler);
    }
    async start() {
        try {
            await (0, database_1.connectDatabase)();
            logger_1.logger.info('✅ Database connected successfully');
            await serpApiPoolManager_1.SerpApiPoolManager.getInstance().initialize();
            logger_1.logger.info('✅ SerpApi Pool Manager initialized');
            (0, scheduler_1.scheduleCleanupJobs)();
            logger_1.logger.info('✅ Scheduled jobs initialized');
            const server = this.app.listen(this.port, () => {
                logger_1.logger.info(`🚀 SERP Tracker Server running on port ${this.port}`);
                logger_1.logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
                logger_1.logger.info(`🔗 CORS Origins: ${process.env.CORS_ORIGIN}`);
                logger_1.logger.info(`📝 API Documentation: http://localhost:${this.port}/api`);
                logger_1.logger.info(`🏥 Health Check: http://localhost:${this.port}/health`);
                const keyStats = serpApiPoolManager_1.SerpApiPoolManager.getInstance().getKeyStats();
                logger_1.logger.info(`🔑 API Keys: ${keyStats.active}/${keyStats.total} active`);
            });
            server.timeout = 60000;
            this.setupGracefulShutdown(server);
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }
    setupGracefulShutdown(server) {
        const signals = ['SIGTERM', 'SIGINT'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                logger_1.logger.info(`📴 Received ${signal}, shutting down gracefully...`);
                try {
                    server.close(() => {
                        logger_1.logger.info('🔌 HTTP server closed');
                    });
                    const mongoose = require('mongoose');
                    await mongoose.connection.close();
                    logger_1.logger.info('🗄️ Database connection closed');
                    logger_1.logger.info('✅ Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.error('❌ Error during shutdown:', error);
                    process.exit(1);
                }
            });
        });
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('💥 Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('🚫 Unhandled Rejection at:', { promise, reason });
            process.exit(1);
        });
    }
}
const server = new Server();
server.start().catch(error => {
    logger_1.logger.error('💥 Failed to start application:', error);
    process.exit(1);
});
exports.default = Server;
//# sourceMappingURL=server.js.map