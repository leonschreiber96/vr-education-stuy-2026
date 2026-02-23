// Main application configuration
// Sets up Express app with middleware and routes

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");

// Configuration
const config = require("../config");
const { createSessionMiddleware } = require("./config/session");

// Middleware
const { requestLogger, performanceLogger, errorLogger } = require("./middleware/logging");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// Routes
const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
function createApp() {
   const app = express();

   // Trust proxy (important for sessions behind reverse proxy)
   app.set("trust proxy", 1);

   // Body parsers
   app.use(bodyParser.json());
   app.use(bodyParser.urlencoded({ extended: true }));
   app.use(cookieParser());

   // Session middleware
   app.use(createSessionMiddleware());

   // Logging middleware
   app.use(requestLogger);
   if (config.isDevelopment() || process.env.LOG_PERFORMANCE === "true") {
      app.use(performanceLogger);
   }

   // Serve static files
   const BASE_PATH = config.BASE_PATH;
   if (BASE_PATH) {
      app.use(BASE_PATH, express.static("public"));
   } else {
      app.use(express.static("public"));
   }

   // Health check endpoint (before auth)
   app.get((BASE_PATH || "") + "/health", (req, res) => {
      res.json({
         status: "ok",
         timestamp: new Date().toISOString(),
         uptime: process.uptime(),
         environment: config.NODE_ENV,
      });
   });

   // Mount routes
   app.use(BASE_PATH || "", publicRoutes);
   app.use((BASE_PATH || "") + "/api/admin", adminRoutes);

   // Suppress noisy browser/devtools probes to /.well-known/appspecific/*
   // Some Chrome/DevTools variants probe this path when opening DevTools and that
   // currently results in many 404s logged by our notFoundHandler. Mount a small
   // handler that returns 204 No Content for that prefix so those probes are
   // silently ignored and do not clutter logs.
   const wellKnownPrefix = (config.BASE_PATH || "") + "/.well-known/appspecific";
   app.use(wellKnownPrefix, (req, res) => {
      // Respond with 204 No Content for any method under this prefix
      res.status(204).send();
   });

   // 404 handler (must be after all routes)
   app.use(notFoundHandler);

   // Error logging
   app.use(errorLogger);

   // Error handler (must be last)
   app.use(errorHandler);

   return app;
}

module.exports = createApp;
