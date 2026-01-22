/**
 * Central Configuration Module
 *
 * Single source of truth for all application configuration.
 * Loads environment variables from .env file and provides structured access.
 *
 * DO NOT create other config files. All configuration should be defined here.
 */

const path = require("path");
const fs = require("fs");

// ============================================================================
// Load .env file
// ============================================================================

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
   try {
      const envContent = fs.readFileSync(envPath, "utf8");

      // Parse .env file
      envContent.split("\n").forEach((line) => {
         line = line.trim();

         // Skip comments and empty lines
         if (!line || line.startsWith("#")) {
            return;
         }

         // Parse KEY=VALUE
         const match = line.match(/^([^=]+)=(.*)$/);
         if (match) {
            const key = match[1].trim();
            let value = match[2].trim();

            // Remove surrounding quotes
            if (
               (value.startsWith('"') && value.endsWith('"')) ||
               (value.startsWith("'") && value.endsWith("'"))
            ) {
               value = value.slice(1, -1);
            }

            // Only set if not already set (don't override existing env vars)
            if (!process.env[key]) {
               process.env[key] = value;
            }
         }
      });
   } catch (error) {
      console.warn("⚠️  Failed to load .env file:", error.message);
   }
}

// ============================================================================
// Configuration Object
// ============================================================================

const config = {
   // ------------------------------------------------------------------------
   // Node Environment
   // ------------------------------------------------------------------------
   NODE_ENV: process.env.NODE_ENV || "development",

   // ------------------------------------------------------------------------
   // Server Configuration
   // ------------------------------------------------------------------------
   PORT: parseInt(process.env.PORT || "3000", 10),
   BASE_PATH: process.env.BASE_PATH || "",

   // ------------------------------------------------------------------------
   // Session Configuration
   // ------------------------------------------------------------------------
   SESSION_SECRET: process.env.SESSION_SECRET || "your-secret-key-change-this",
   SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10), // 24 hours
   SECURE_COOKIES: process.env.SECURE_COOKIES === "true",

   // ------------------------------------------------------------------------
   // Admin Credentials
   // ------------------------------------------------------------------------
   ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
   ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

   // ------------------------------------------------------------------------
   // Email Configuration
   // ------------------------------------------------------------------------
   SMTP_HOST: process.env.SMTP_HOST,
   SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
   SMTP_USER: process.env.SMTP_USER,
   SMTP_PASS: process.env.SMTP_PASS,
   SMTP_FROM: process.env.SMTP_FROM || "noreply@example.com",
   SMTP_SECURE: process.env.SMTP_SECURE === "true",

   // ------------------------------------------------------------------------
   // Application Business Rules
   // ------------------------------------------------------------------------
   PARTICIPANT_GOAL: parseInt(process.env.PARTICIPANT_GOAL || "50", 10),
   FOLLOWUP_MIN_DAYS: parseInt(process.env.FOLLOWUP_MIN_DAYS || "29", 10),
   FOLLOWUP_MAX_DAYS: parseInt(process.env.FOLLOWUP_MAX_DAYS || "31", 10),

   // ------------------------------------------------------------------------
   // Database
   // ------------------------------------------------------------------------
   DATABASE_PATH:
      process.env.DATABASE_PATH ||
      path.join(process.cwd(), "data", "appointments.db"),

   // ------------------------------------------------------------------------
   // Legacy structure for /api/config endpoint compatibility
   // ------------------------------------------------------------------------
   appointments: {
      get followUpMinDays() {
         return config.FOLLOWUP_MIN_DAYS;
      },
      get followUpMaxDays() {
         return config.FOLLOWUP_MAX_DAYS;
      },
   },

   participantGoal: null, // getter defined below

   server: {
      get port() {
         return config.PORT;
      },
      get sessionSecret() {
         return config.SESSION_SECRET;
      },
      get sessionMaxAge() {
         return config.SESSION_MAX_AGE;
      },
   },

   security: {
      cookieHttpOnly: true,
      get cookieSecure() {
         return config.shouldUseSecureCookies();
      },
   },

   email: {
      get enabled() {
         return !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
      },
      get from() {
         return config.SMTP_FROM;
      },
   },

   app: {
      name: "Terminfindung",
      version: "1.0.0",
      get environment() {
         return config.NODE_ENV;
      },
   },
};

// Setup participantGoal getter
Object.defineProperty(config, "participantGoal", {
   get() {
      return config.PARTICIPANT_GOAL;
   },
   enumerable: true,
});

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Check if running in production mode
 */
config.isProduction = () => config.NODE_ENV === "production";

/**
 * Check if running in development mode
 */
config.isDevelopment = () => config.NODE_ENV === "development";

/**
 * Check if running in test mode
 */
config.isTest = () => config.NODE_ENV === "test";

/**
 * Get cookie security setting
 */
config.shouldUseSecureCookies = () => {
   return config.isProduction() || config.SECURE_COOKIES;
};

/**
 * Validate required environment variables
 */
config.validate = () => {
   if (
      !config.SESSION_SECRET ||
      config.SESSION_SECRET === "your-secret-key-change-this"
   ) {
      console.warn(
         "⚠️  WARNING: Using default SESSION_SECRET. Set SESSION_SECRET in .env for production!",
      );
   }

   if (config.isProduction()) {
      if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
         console.warn(
            "⚠️  WARNING: Email configuration incomplete. Email functionality may not work.",
         );
      }
   }
};

/**
 * Print configuration summary (safe for logging - no secrets)
 */
config.printSummary = () => {
   console.log("\n📋 Configuration Summary:");
   console.log("  Environment:", config.NODE_ENV);
   console.log("  Port:", config.PORT);
   console.log("  Base Path:", config.BASE_PATH || "(root)");
   console.log("  Secure Cookies:", config.shouldUseSecureCookies());
   console.log("  SMTP Configured:", !!(config.SMTP_HOST && config.SMTP_USER));
   console.log("  Participant Goal:", config.PARTICIPANT_GOAL);
   console.log(
      "  Follow-up Days:",
      `${config.FOLLOWUP_MIN_DAYS}-${config.FOLLOWUP_MAX_DAYS}`,
   );
   console.log("");
};

module.exports = config;
