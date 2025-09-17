"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseHealth = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/serp_tracker';
        await mongoose_1.default.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
            retryWrites: true,
            writeConcern: {
                w: 'majority'
            }
        });
        logger_1.logger.info('MongoDB connected successfully');
        mongoose_1.default.connection.on('error', (error) => {
            logger_1.logger.error('MongoDB connection error:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            logger_1.logger.info('MongoDB reconnected successfully');
        });
        process.on('SIGINT', async () => {
            try {
                await mongoose_1.default.connection.close();
                logger_1.logger.info('MongoDB connection closed due to app termination');
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error('Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Database connection failed:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const checkDatabaseHealth = async () => {
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            const db = mongoose_1.default.connection.db;
            if (db) {
                await db.admin().ping();
                return {
                    status: 'connected',
                    details: {
                        readyState: mongoose_1.default.connection.readyState,
                        host: mongoose_1.default.connection.host,
                        port: mongoose_1.default.connection.port,
                        name: mongoose_1.default.connection.name
                    }
                };
            }
            else {
                return { status: 'disconnected', details: { readyState: mongoose_1.default.connection.readyState } };
            }
        }
        else {
            return { status: 'disconnected', details: { readyState: mongoose_1.default.connection.readyState } };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { status: 'error', details: { error: errorMessage } };
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
//# sourceMappingURL=database.js.map