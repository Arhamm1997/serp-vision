"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (error, req, res, next) => {
    logger_1.logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body
    });
    let status = 500;
    let message = 'Internal Server Error';
    const errors = [];
    if (error.name === 'ValidationError') {
        status = 400;
        message = 'Validation Error';
        if (error.details) {
            errors.push(...error.details.map((d) => d.message));
        }
    }
    else if (error.name === 'CastError') {
        status = 400;
        message = 'Invalid ID format';
    }
    else if (error.code === 11000) {
        status = 409;
        message = 'Duplicate key error';
        errors.push('Resource already exists');
    }
    else if (error.name === 'MongoNetworkError') {
        status = 503;
        message = 'Database connection error';
    }
    else if (error.message) {
        message = error.message;
        if (error.message.includes('quota') || error.message.includes('limit')) {
            status = 429;
            message = 'API quota exceeded';
        }
        else if (error.message.includes('timeout')) {
            status = 408;
            message = 'Request timeout';
        }
        else if (error.message.includes('Invalid JSON')) {
            status = 400;
            message = 'Invalid JSON format in request body';
        }
        else if (error.message.includes('validation')) {
            status = 400;
            message = 'Validation failed';
        }
    }
    const response = {
        success: false,
        message,
        errors: errors.length > 0 ? errors : undefined,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            originalError: error.message,
            requestInfo: {
                method: req.method,
                url: req.url,
                body: req.body,
                headers: req.headers
            }
        })
    };
    res.status(status).json(response);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map