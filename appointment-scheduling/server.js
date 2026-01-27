// Server entry point
// Creates app and starts HTTP server

const config = require("./config");
const createApp = require("./src/app");
const db = require("./database");
const bcrypt = require("bcrypt");
const { Logger } = require("./src/middleware/logging");
const reminderScheduler = require("./src/services/reminderScheduler");

// Validate environment configuration
try {
   config.validate();
} catch (error) {
   console.error("❌ Environment validation failed:", error.message);
   process.exit(1);
}

// Print configuration summary
config.printSummary();

// Initialize database
db.initialize();
Logger.info("Database initialized");

// Create default admin if not exists
async function createDefaultAdmin() {
   const adminExists = db.getAdminByUsername("admin");
   if (!adminExists) {
      const defaultPassword = config.ADMIN_PASSWORD || "admin123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      db.createAdmin("admin", hashedPassword);
      Logger.info("Default admin created", { username: "admin" });
      if (!config.ADMIN_PASSWORD) {
         Logger.warn(
            "⚠️  Using default password. Please change it or set ADMIN_PASSWORD environment variable!",
         );
      }
   }
}

// Create and configure Express app
const app = createApp();

// Start server
async function startServer() {
   try {
      // Create default admin
      await createDefaultAdmin();

      // Start reminder scheduler
      reminderScheduler.start();
      Logger.info(
         "Reminder scheduler started - checking every hour for reminders",
      );

      // Start listening
      const server = app.listen(config.PORT, () => {
         console.log("\n" + "=".repeat(60));
         console.log("🚀 Server started successfully!");
         console.log("=".repeat(60));
         console.log(`📡 Port: ${config.PORT}`);
         console.log(`🌐 Base Path: ${config.BASE_PATH || "(root)"}`);
         console.log(
            `🔗 URL: http://localhost:${config.PORT}${config.BASE_PATH}`,
         );
         console.log(
            `👤 Admin URL: http://localhost:${config.PORT}${config.BASE_PATH}/admin.html`,
         );
         console.log("⏰ Reminder system: Active (checking hourly)");
         console.log("=".repeat(60) + "\n");
      });

      // Graceful shutdown
      const shutdown = async (signal) => {
         Logger.info(`${signal} received. Starting graceful shutdown...`);

         // Stop reminder scheduler
         reminderScheduler.stop();
         Logger.info("Reminder scheduler stopped");

         server.close(() => {
            Logger.info("HTTP server closed");

            // Close database connection
            try {
               db.close();
               Logger.info("Database connection closed");
            } catch (error) {
               Logger.error("Error closing database", error);
            }

            Logger.info("Shutdown complete");
            process.exit(0);
         });

         // Force shutdown after 10 seconds
         setTimeout(() => {
            Logger.error("Forced shutdown after timeout");
            process.exit(1);
         }, 10000);
      };

      // Handle shutdown signals
      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));

      // Handle uncaught errors
      process.on("uncaughtException", (error) => {
         Logger.error("Uncaught Exception", error);
         shutdown("UNCAUGHT_EXCEPTION");
      });

      process.on("unhandledRejection", (reason, promise) => {
         Logger.error("Unhandled Rejection", new Error(reason), { promise });
         shutdown("UNHANDLED_REJECTION");
      });
   } catch (error) {
      Logger.error("Failed to start server", error);
      process.exit(1);
   }
}

// Start the server
startServer();
