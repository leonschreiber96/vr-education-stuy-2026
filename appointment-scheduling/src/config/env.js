// Environment configuration module
// Handles .env file loading and provides centralized access to environment variables

const path = require("path");
const fs = require("fs");

// Load .env file if it exists
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

/**
 * Environment configuration
 * All environment variables should be accessed through this module
 */
const env = {
   // Node environment
   NODE_ENV: process.env.NODE_ENV || "development",

   // Server configuration
   PORT: parseInt(process.env.PORT || "3000", 10),
   BASE_PATH: process.env.BASE_PATH || "",

   // Session configuration
   SESSION_SECRET: process.env.SESSION_SECRET || "your-secret-key-change-this",
   SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10), // 24 hours
   SECURE_COOKIES: process.env.SECURE_COOKIES === "true",

   // Admin credentials
   ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
   ADMIN_PASSWORD_HASH:
      process.env.ADMIN_PASSWORD_HASH || "$2b$10$YourHashedPasswordHere",

   // Email configuration
   SMTP_HOST: process.env.SMTP_HOST,
   SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
   SMTP_USER: process.env.SMTP_USER,
   SMTP_PASS: process.env.SMTP_PASS,
   SMTP_FROM: process.env.SMTP_FROM || "noreply@example.com",
   SMTP_SECURE: process.env.SMTP_SECURE === "true",

   // Application configuration
   PARTICIPANT_GOAL: parseInt(process.env.PARTICIPANT_GOAL || "50", 10),
   FOLLOWUP_MIN_DAYS: parseInt(process.env.FOLLOWUP_MIN_DAYS || "29", 10),
   FOLLOWUP_MAX_DAYS: parseInt(process.env.FOLLOWUP_MAX_DAYS || "31", 10),

   // Database
   DATABASE_PATH:
      process.env.DATABASE_PATH || path.join(process.cwd(), "appointments.db"),
};

/**
 * Check if running in production mode
 */
env.isProduction = () => env.NODE_ENV === "production";

/**
 * Check if running in development mode
 */
env.isDevelopment = () => env.NODE_ENV === "development";

/**
 * Check if running in test mode
 */
env.isTest = () => env.NODE_ENV === "test";

/**
 * Get cookie security setting
 */
env.shouldUseSecureCookies = () => {
   return env.isProduction() || env.SECURE_COOKIES;
};

/**
 * Validate required environment variables
 */
env.validate = () => {
   if (
      !env.SESSION_SECRET ||
      env.SESSION_SECRET === "your-secret-key-change-this"
   ) {
      console.warn(
         "⚠️  WARNING: Using default SESSION_SECRET. Set SESSION_SECRET in .env for production!",
      );
   }

   if (env.isProduction()) {
      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
         console.warn(
            "⚠️  WARNING: Email configuration incomplete. Email functionality may not work.",
         );
      }
   }
};

/**
 * Print configuration summary (safe for logging - no secrets)
 */
env.printSummary = () => {
   console.log("\n📋 Configuration Summary:");
   console.log("  Environment:", env.NODE_ENV);
   console.log("  Port:", env.PORT);
   console.log("  Base Path:", env.BASE_PATH || "(root)");
   console.log("  Secure Cookies:", env.shouldUseSecureCookies());
   console.log("  SMTP Configured:", !!(env.SMTP_HOST && env.SMTP_USER));
   console.log("  Participant Goal:", env.PARTICIPANT_GOAL);
   console.log(
      "  Follow-up Days:",
      `${env.FOLLOWUP_MIN_DAYS}-${env.FOLLOWUP_MAX_DAYS}`,
   );
   console.log("");
};

module.exports = env;
