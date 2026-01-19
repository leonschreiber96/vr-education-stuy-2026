// Logging middleware module
// Handles request logging and activity tracking

const db = require('../../database');

/**
 * Request logging middleware
 * Logs all incoming requests with timestamp, method, path, and IP
 */
function requestLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const ip = req.ip;

    console.log(`[${timestamp}] ${method} ${path} - IP: ${ip}`);

    // Log to database
    try {
        const userType = req.session && req.session.adminId ? 'admin' : 'public';
        db.logAction(ip, method, path, userType);
    } catch (error) {
        console.error('Error logging to database:', error);
        // Don't fail the request if logging fails
    }

    next();
}

/**
 * Error logging middleware
 * Logs errors that occur during request processing
 */
function errorLogger(err, req, res, next) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR:`, {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    // Pass error to next error handler
    next(err);
}

/**
 * Performance logging middleware
 * Logs request duration for monitoring
 */
function performanceLogger(req, res, next) {
    const startTime = Date.now();

    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log slow requests (>1 second)
        if (duration > 1000) {
            console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms - Status: ${statusCode}`);
        } else if (process.env.LOG_PERFORMANCE === 'true') {
            console.log(`⏱️  ${req.method} ${req.path} - ${duration}ms - Status: ${statusCode}`);
        }
    });

    next();
}

/**
 * Structured logger for application events
 */
class Logger {
    static info(message, meta = {}) {
        console.log(`[INFO] ${message}`, meta);
    }

    static warn(message, meta = {}) {
        console.warn(`[WARN] ${message}`, meta);
    }

    static error(message, error = null, meta = {}) {
        console.error(`[ERROR] ${message}`, {
            ...meta,
            error: error ? {
                message: error.message,
                stack: error.stack,
            } : undefined,
        });
    }

    static debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            console.log(`[DEBUG] ${message}`, meta);
        }
    }
}

module.exports = {
    requestLogger,
    errorLogger,
    performanceLogger,
    Logger,
};
