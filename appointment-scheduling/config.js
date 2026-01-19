/**
 * Central Configuration for Terminfindung Application
 *
 * This file contains all configurable constants and rules for the application.
 * Modify these values to adjust business logic without changing code.
 */

module.exports = {
   /**
    * Appointment Scheduling Rules
    */
   appointments: {
      // Follow-up appointment must be between MIN and MAX days after primary
      followUpMinDays: 29,
      followUpMaxDays: 31,
   },

   /**
    * Study Progress Tracking
    */
   study: {
      participantGoal: parseInt(process.env.PARTICIPANT_GOAL || "80", 10),
   },

   /**
    * Server Configuration
    */
   server: {
      port: process.env.PORT || 3000,
      sessionSecret: process.env.SESSION_SECRET || "change-this-in-production",
      sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
   },

   /**
    * Security Configuration
    */
   security: {
      bcryptSaltRounds: 10,
      cookieHttpOnly: true,
      cookieSecure: process.env.NODE_ENV === "production",
   },

   /**
    * Email Configuration
    */
   email: {
      enabled: process.env.MAIL_ENABLED === "true",
      from: process.env.MAIL_FROM || "noreply@terminfindung.local",
   },

   /**
    * Application Metadata
    */
   app: {
      name: "Terminfindung",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
   },
};
