// Authentication middleware module
// Handles authentication checks for protected routes

const env = require('../config/env');

/**
 * Middleware to require admin authentication
 * Checks if user has valid admin session
 */
function requireAdmin(req, res, next) {
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - adminId:', req.session.adminId);

    if (env.isDevelopment()) {
        console.log('Auth check - session:', JSON.stringify(req.session));
    }

    if (req.session.adminId) {
        next();
    } else {
        console.log('❌ Auth failed - no adminId in session');
        res.status(401).json({ error: 'Unauthorized' });
    }
}

/**
 * Optional auth middleware - adds user info if authenticated but doesn't require it
 */
function optionalAuth(req, res, next) {
    if (req.session.adminId) {
        req.isAuthenticated = true;
        req.userId = req.session.adminId;
    } else {
        req.isAuthenticated = false;
    }
    next();
}

/**
 * Check if current request is authenticated
 * @param {Object} req - Express request object
 * @returns {boolean} True if authenticated
 */
function isAuthenticated(req) {
    return !!req.session.adminId;
}

/**
 * Get current user ID from session
 * @param {Object} req - Express request object
 * @returns {string|null} User ID or null if not authenticated
 */
function getCurrentUserId(req) {
    return req.session.adminId || null;
}

/**
 * Set user as authenticated in session
 * @param {Object} req - Express request object
 * @param {string} userId - User identifier
 */
function login(req, userId) {
    req.session.adminId = userId;
    console.log('✓ User logged in:', userId, 'Session ID:', req.sessionID);
}

/**
 * Remove authentication from session
 * @param {Object} req - Express request object
 */
function logout(req) {
    const userId = req.session.adminId;
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            console.log('✓ User logged out:', userId);
        }
    });
}

/**
 * Regenerate session (useful after login to prevent session fixation)
 * @param {Object} req - Express request object
 * @returns {Promise} Promise that resolves when session is regenerated
 */
function regenerateSession(req) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

module.exports = {
    requireAdmin,
    optionalAuth,
    isAuthenticated,
    getCurrentUserId,
    login,
    logout,
    regenerateSession,
};
