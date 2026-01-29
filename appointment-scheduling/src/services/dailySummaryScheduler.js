// Daily Summary Scheduler Service
// Sends admin a summary email each evening with tomorrow's appointments

const db = require("../../database");
const mailer = require("../../mailer");
const { Logger } = require("../middleware/logging");

// Time to send daily summary (default: 18:00 / 6 PM)
const SUMMARY_HOUR = process.env.DAILY_SUMMARY_HOUR || 18;
const SUMMARY_MINUTE = process.env.DAILY_SUMMARY_MINUTE || 0;

let schedulerTimeout = null;
let isRunning = false;

/**
 * Send daily summary email with tomorrow's appointments
 * @returns {Promise<Object>} Result with appointment count
 */
async function sendDailySummary() {
   if (isRunning) {
      Logger.warn("Daily summary already running, skipping...");
      return;
   }

   isRunning = true;

   try {
      Logger.info("Starting daily summary check...");

      // Get tomorrow's appointments
      const appointments = db.getTomorrowsAppointments();

      Logger.info(`Found ${appointments.length} appointments for tomorrow`);

      if (appointments.length > 0) {
         // Send summary email
         await mailer.sendDailySummaryEmail(appointments);

         Logger.info("Daily summary email sent", {
            appointmentCount: appointments.length,
         });

         return {
            success: true,
            appointmentCount: appointments.length,
         };
      } else {
         Logger.info("No appointments tomorrow, skipping email");

         return {
            success: true,
            appointmentCount: 0,
            skipped: true,
         };
      }
   } catch (error) {
      Logger.error("Error during daily summary", error);

      return {
         success: false,
         error: error.message,
      };
   } finally {
      isRunning = false;
   }
}

/**
 * Calculate milliseconds until next scheduled time
 * @returns {number} Milliseconds until next summary time
 */
function getMillisecondsUntilNextSummary() {
   const now = new Date();
   const nextRun = new Date();

   // Set to today's scheduled time
   nextRun.setHours(SUMMARY_HOUR, SUMMARY_MINUTE, 0, 0);

   // If scheduled time has already passed today, schedule for tomorrow
   if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
   }

   const msUntilNext = nextRun.getTime() - now.getTime();

   Logger.info("Next daily summary scheduled", {
      scheduledTime: nextRun.toLocaleString("de-DE"),
      hoursUntil: (msUntilNext / 1000 / 60 / 60).toFixed(2),
   });

   return msUntilNext;
}

/**
 * Schedule the next daily summary
 */
function scheduleNext() {
   // Clear any existing timeout
   if (schedulerTimeout) {
      clearTimeout(schedulerTimeout);
   }

   const msUntilNext = getMillisecondsUntilNextSummary();

   schedulerTimeout = setTimeout(async () => {
      await sendDailySummary();
      // After sending, schedule the next one
      scheduleNext();
   }, msUntilNext);
}

/**
 * Start the daily summary scheduler
 */
function start() {
   if (schedulerTimeout) {
      Logger.warn("Daily summary scheduler already running");
      return;
   }

   Logger.info("Starting daily summary scheduler", {
      scheduledTime: `${String(SUMMARY_HOUR).padStart(2, "0")}:${String(SUMMARY_MINUTE).padStart(2, "0")}`,
   });

   scheduleNext();

   Logger.info("Daily summary scheduler started");
}

/**
 * Stop the daily summary scheduler
 */
function stop() {
   if (schedulerTimeout) {
      clearTimeout(schedulerTimeout);
      schedulerTimeout = null;
      Logger.info("Daily summary scheduler stopped");
   }
}

/**
 * Check if scheduler is running
 * @returns {boolean}
 */
function isSchedulerRunning() {
   return schedulerTimeout !== null;
}

/**
 * Manually trigger a daily summary (for testing or admin trigger)
 * @returns {Promise<Object>}
 */
async function triggerManualSummary() {
   Logger.info("Manual daily summary triggered");
   return await sendDailySummary();
}

module.exports = {
   start,
   stop,
   isSchedulerRunning,
   triggerManualSummary,
   sendDailySummary,
};
