// Session configuration module
// Centralizes session setup for Express

const session = require('express-session');
const env = require('./env');

/**
 * Create and configure session middleware
 * @returns {Function} Express session middleware
 */
function createSessionMiddleware() {
    const sessionConfig = {
        secret: env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: 'terminfindung.sid',
        cookie: {
            maxAge: env.SESSION_MAX_AGE,
            httpOnly: true,
            secure: env.shouldUseSecureCookies(),
            sameSite: 'lax',
            path: env.BASE_PATH || '/',
        },
        proxy: true, // Trust proxy headers (X-Forwarded-Proto)
    };

    // Log session configuration (safe info only)
    console.log('🔐 Session Configuration:');
    console.log('  Session Name:', sessionConfig.name);
    console.log('  Cookie Path:', sessionConfig.cookie.path);
    console.log('  Secure Cookies:', sessionConfig.cookie.secure);
    console.log('  Max Age:', sessionConfig.cookie.maxAge / 1000 / 60, 'minutes');
    console.log('  Proxy Trust:', sessionConfig.proxy);

    return session(sessionConfig);
}

/**
 * Session store configuration
 * Currently using MemoryStore (default) which is fine for single-server deployments
 * For production with multiple servers, consider Redis or another persistent store
 */
function getSessionStore() {
    // Using default MemoryStore for now
    // Future: Implement Redis store for production scaling
    return undefined; // undefined = use default MemoryStore
}

module.exports = {
    createSessionMiddleware,
    getSessionStore,
};
