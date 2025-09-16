// src/config/database.ts
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/serp_tracker';
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      retryWrites: true,
      writeConcern: {
        w: 'majority'
      }
    });

    logger.info('MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Database health check function
export const checkDatabaseHealth = async (): Promise<{status: string, details?: any}> => {
  try {
    if (mongoose.connection.readyState === 1) {
      // Test query to verify connection
      const db = mongoose.connection.db;
      if (db) {
        await db.admin().ping();
        return { 
          status: 'connected', 
          details: {
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
          }
        };
      } else {
        return { status: 'disconnected', details: { readyState: mongoose.connection.readyState } };
      }
    } else {
      return { status: 'disconnected', details: { readyState: mongoose.connection.readyState } };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'error', details: { error: errorMessage } };
  }
};