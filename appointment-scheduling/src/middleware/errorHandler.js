// Error handling middleware module
// Centralizes error handling and response formatting

const env = require('../config/env');
const { Logger } = require('./logging');

/**
 * Custom application error class
 * Allows throwing errors with specific HTTP status codes
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true; // Distinguish operational errors from programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation error - 400 Bad Request
 */
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, details);
        this.name = 'ValidationError';
    }
}

/**
 * Authentication error - 401 Unauthorized
 */
class AuthenticationError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

/**
 * Authorization error - 403 Forbidden
 */
class AuthorizationError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}

/**
 * Not found error - 404 Not Found
 */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Conflict error - 409 Conflict
 */
class ConflictError extends AppError {
    constructor(message, details = null) {
        super(message, 409, details);
        this.name = 'ConflictError';
    }
}

/**
 * Main error handling middleware
 * Catches all errors and formats them into consistent JSON responses
 */
function errorHandler(err, req, res, next) {
    // Default error values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let details = err.details || null;

    // Log error
    if (statusCode >= 500) {
        Logger.error('Server Error', err, {
            path: req.path,
            method: req.method,
            ip: req.ip,
            statusCode,
        });
    } else {
        Logger.warn('Client Error', {
            message,
            path: req.path,
            method: req.method,
            ip: req.ip,
            statusCode,
        });
    }

    // Don't leak error details in production
    if (env.isProduction() && statusCode >= 500) {
        message = 'Internal Server Error';
        details = null;
    }

    // Send error response
    const errorResponse = {
        error: message,
        statusCode,
    };

    // Add details in development or for client errors
    if (details || (env.isDevelopment() && err.stack)) {
        if (details) {
            errorResponse.details = details;
        }
        if (env.isDevelopment() && err.stack) {
            errorResponse.stack = err.stack.split('\n');
        }
    }

    res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Catches requests to non-existent routes
 */
function notFoundHandler(req, res, next) {
    const error = new NotFoundError(`Route not found: ${req.method} ${req.path}`);
    next(error);
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error handler
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => {
 *     // async code here
 *   }));
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Wrap multiple async middleware functions
 */
function asyncHandlers(...fns) {
    return fns.map(fn => asyncHandler(fn));
}

/**
 * Try-catch wrapper for synchronous functions
 * Useful for wrapping database operations
 */
function tryCatch(fn, errorMessage = 'Operation failed') {
    try {
        return fn();
    } catch (error) {
        Logger.error(errorMessage, error);
        throw new AppError(errorMessage, 500, env.isDevelopment() ? error.message : null);
    }
}

/**
 * Async try-catch wrapper
 */
async function asyncTryCatch(fn, errorMessage = 'Operation failed') {
    try {
        return await fn();
    } catch (error) {
        Logger.error(errorMessage, error);
        throw new AppError(errorMessage, 500, env.isDevelopment() ? error.message : null);
    }
}

/**
 * Validate required fields in request body
 * Throws ValidationError if any required field is missing
 */
function validateRequired(data, requiredFields) {
    const missing = [];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            missing.push(field);
        }
    }

    if (missing.length > 0) {
        throw new ValidationError(
            'Missing required fields',
            { missing }
        );
    }
}

/**
 * Validate data types
 */
function validateTypes(data, schema) {
    const errors = [];

    for (const [field, expectedType] of Object.entries(schema)) {
        if (data[field] !== undefined && data[field] !== null) {
            const actualType = typeof data[field];
            if (actualType !== expectedType) {
                errors.push({
                    field,
                    expected: expectedType,
                    actual: actualType,
                });
            }
        }
    }

    if (errors.length > 0) {
        throw new ValidationError(
            'Invalid data types',
            { errors }
        );
    }
}

module.exports = {
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,

    // Middleware
    errorHandler,
    notFoundHandler,
    asyncHandler,
    asyncHandlers,

    // Utilities
    tryCatch,
    asyncTryCatch,
    validateRequired,
    validateTypes,
};
