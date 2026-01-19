// Main application configuration
// Sets up Express app with middleware and routes

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

// Configuration
const env = require('./config/env');
const { createSessionMiddleware } = require('./config/session');

// Middleware
const { requestLogger, performanceLogger, errorLogger } = require('./middleware/logging');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
function createApp() {
    const app = express();

    // Trust proxy (important for sessions behind reverse proxy)
    app.set('trust proxy', 1);

    // Body parsers
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Session middleware
    app.use(createSessionMiddleware());

    // Logging middleware
    app.use(requestLogger);
    if (env.isDevelopment() || process.env.LOG_PERFORMANCE === 'true') {
        app.use(performanceLogger);
    }

    // Serve static files
    const BASE_PATH = env.BASE_PATH;
    if (BASE_PATH) {
        app.use(BASE_PATH, express.static('public'));
    } else {
        app.use(express.static('public'));
    }

    // Health check endpoint (before auth)
    app.get((BASE_PATH || '') + '/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: env.NODE_ENV,
        });
    });

    // Mount routes
    app.use(BASE_PATH || '', publicRoutes);
    app.use((BASE_PATH || '') + '/api/admin', adminRoutes);

    // 404 handler (must be after all routes)
    app.use(notFoundHandler);

    // Error logging
    app.use(errorLogger);

    // Error handler (must be last)
    app.use(errorHandler);

    return app;
}

module.exports = createApp;
