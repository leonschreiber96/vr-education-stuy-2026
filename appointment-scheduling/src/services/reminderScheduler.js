// Reminder Scheduler Service
// Periodically checks for bookings that need reminders and sends them

const db = require("../../database");
const mailer = require("../../mailer");
const { Logger } = require("../middleware/logging");

// Check interval in milliseconds (every hour)
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

let schedulerInterval = null;
let isRunning = false;

/**
 * Process and send 7-day reminders
 * @returns {Promise<Object>} Result with counts
 */
async function processSevenpDayReminders() {
   const bookings = db.getBookingsNeedingSevenpDayReminder();
   let sentCount = 0;
   let failedCount = 0;
   const errors = [];

   Logger.info(`Found ${bookings.length} bookings needing 7-day reminders`);

   for (const booking of bookings) {
      try {
         const timeslot = {
            start_time: booking.start_time,
            end_time: booking.end_time,
            location: booking.location,
         };

         await mailer.sendReminderEmail(
            booking.participant_email,
            booking.participant_name,
            timeslot,
            7, // days until appointment
            booking.confirmation_token,
            booking.is_followup === 1,
         );

         db.markSevenDayReminderSent(booking.booking_id);
         sentCount++;

         Logger.info(`7-day reminder sent`, {
            bookingId: booking.booking_id,
            participantEmail: booking.participant_email,
            timeslot: booking.start_time,
         });
      } catch (error) {
         failedCount++;
         errors.push({
            bookingId: booking.booking_id,
            error: error.message,
         });

         Logger.error(`Failed to send 7-day reminder`, error, {
            bookingId: booking.booking_id,
            participantEmail: booking.participant_email,
         });
      }
   }

   return { sentCount, failedCount, errors };
}

/**
 * Process and send 1-day reminders
 * @returns {Promise<Object>} Result with counts
 */
async function processOneDayReminders() {
   const bookings = db.getBookingsNeedingOneDayReminder();
   let sentCount = 0;
   let failedCount = 0;
   const errors = [];

   Logger.info(`Found ${bookings.length} bookings needing 1-day reminders`);

   for (const booking of bookings) {
      try {
         const timeslot = {
            start_time: booking.start_time,
            end_time: booking.end_time,
            location: booking.location,
         };

         await mailer.sendReminderEmail(
            booking.participant_email,
            booking.participant_name,
            timeslot,
            1, // days until appointment
            booking.confirmation_token,
            booking.is_followup === 1,
         );

         db.markOneDayReminderSent(booking.booking_id);
         sentCount++;

         Logger.info(`1-day reminder sent`, {
            bookingId: booking.booking_id,
            participantEmail: booking.participant_email,
            timeslot: booking.start_time,
         });
      } catch (error) {
         failedCount++;
         errors.push({
            bookingId: booking.booking_id,
            error: error.message,
         });

         Logger.error(`Failed to send 1-day reminder`, error, {
            bookingId: booking.booking_id,
            participantEmail: booking.participant_email,
         });
      }
   }

   return { sentCount, failedCount, errors };
}

/**
 * Check and send all pending reminders
 */
async function checkAndSendReminders() {
   if (isRunning) {
      Logger.warn("Reminder check already running, skipping...");
      return;
   }

   isRunning = true;

   try {
      Logger.info("Starting reminder check...");

      // Process 7-day reminders
      const sevenDayResults = await processSevenpDayReminders();
      Logger.info("7-day reminders processed", sevenDayResults);

      // Process 1-day reminders
      const oneDayResults = await processOneDayReminders();
      Logger.info("1-day reminders processed", oneDayResults);

      const totalSent = sevenDayResults.sentCount + oneDayResults.sentCount;
      const totalFailed =
         sevenDayResults.failedCount + oneDayResults.failedCount;

      Logger.info("Reminder check completed", {
         totalSent,
         totalFailed,
         sevenDaySent: sevenDayResults.sentCount,
         oneDaySent: oneDayResults.sentCount,
      });
   } catch (error) {
      Logger.error("Error during reminder check", error);
   } finally {
      isRunning = false;
   }
}

/**
 * Start the reminder scheduler
 */
function start() {
   if (schedulerInterval) {
      Logger.warn("Reminder scheduler already running");
      return;
   }

   Logger.info("Starting reminder scheduler", {
      checkInterval: `${CHECK_INTERVAL / 1000 / 60} minutes`,
   });

   // Run immediately on start
   checkAndSendReminders();

   // Then run periodically
   schedulerInterval = setInterval(checkAndSendReminders, CHECK_INTERVAL);

   Logger.info("Reminder scheduler started");
}

/**
 * Stop the reminder scheduler
 */
function stop() {
   if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      Logger.info("Reminder scheduler stopped");
   }
}

/**
 * Check if scheduler is running
 * @returns {boolean}
 */
function isSchedulerRunning() {
   return schedulerInterval !== null;
}

/**
 * Manually trigger a reminder check (for testing or admin trigger)
 * @returns {Promise<void>}
 */
async function triggerManualCheck() {
   Logger.info("Manual reminder check triggered");
   await checkAndSendReminders();
}

module.exports = {
   start,
   stop,
   isSchedulerRunning,
   triggerManualCheck,
   checkAndSendReminders,
};
