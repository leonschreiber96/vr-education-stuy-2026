// Public routes module
// Handles all public-facing API endpoints (no authentication required)

const express = require("express");
const router = express.Router();

const db = require("../../database");
const mailer = require("../../mailer");
const config = require("../../config");
const BookingService = require("../services/bookingService");
const {
   asyncHandler,
   validateRequired,
   ValidationError,
} = require("../middleware/errorHandler");
const { Logger } = require("../middleware/logging");
const FOLLOWUP_MIN_DAYS = config.FOLLOWUP_MIN_DAYS;
const FOLLOWUP_MAX_DAYS = config.FOLLOWUP_MAX_DAYS;

/**
 * GET /api/timeslots
 * Get available timeslots (optionally filtered by type)
 */
router.get(
   "/api/timeslots",
   asyncHandler(async (req, res) => {
      const { type, primaryDate } = req.query;

      let timeslots;

      if (type === "followup" && primaryDate) {
         // Get follow-up slots based on configured days after primary date
         const primaryDateTime = new Date(primaryDate);
         primaryDateTime.setHours(0, 0, 0, 0); // Set to midnight for date-only comparison

         const startDate = new Date(primaryDateTime);
         startDate.setDate(startDate.getDate() + FOLLOWUP_MIN_DAYS);
         startDate.setHours(0, 0, 0, 0); // Start of day

         const endDate = new Date(primaryDateTime);
         endDate.setDate(endDate.getDate() + FOLLOWUP_MAX_DAYS);
         endDate.setHours(23, 59, 59, 999); // End of day

         timeslots = db.getTimeslotsInRange(
            startDate.toISOString(),
            endDate.toISOString(),
            "followup",
         );
      } else {
         timeslots = db.getAvailableTimeslots(type || "primary");
      }

      res.json(timeslots);
   }),
);

/**
 * POST /api/register
 * Register participant and book dual appointment (primary + followup)
 */
router.post(
   "/api/register",
   asyncHandler(async (req, res) => {
      const {
         name,
         email,
         primaryTimeslotId,
         followupTimeslotId,
         questionnaireData,
      } = req.body;

      // Validate required fields
      validateRequired(req.body, [
         "name",
         "email",
         "primaryTimeslotId",
         "followupTimeslotId",
      ]);

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
         throw new ValidationError("Invalid email address");
      }

      // Validate both timeslots exist and have capacity
      const primaryTimeslot = db.getTimeslotById(primaryTimeslotId);
      const followupTimeslot = db.getTimeslotById(followupTimeslotId);

      if (!primaryTimeslot) {
         throw new ValidationError("Primary timeslot not found");
      }

      if (!followupTimeslot) {
         throw new ValidationError("Follow-up timeslot not found");
      }

      // Validate follow-up is within configured days after primary (date-only, ignore time)
      const primaryDate = new Date(primaryTimeslot.start_time);
      const followupDate = new Date(followupTimeslot.start_time);
      // Set to midnight to compare dates only
      primaryDate.setHours(0, 0, 0, 0);
      followupDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
         (followupDate - primaryDate) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff < FOLLOWUP_MIN_DAYS || daysDiff > FOLLOWUP_MAX_DAYS) {
         throw new ValidationError(
            `Follow-up appointment must be ${FOLLOWUP_MIN_DAYS}-${FOLLOWUP_MAX_DAYS} days after primary appointment`,
         );
      }

      // Check capacity
      if (!db.hasCapacity(primaryTimeslotId)) {
         throw new ValidationError("Primary timeslot is at full capacity");
      }

      if (!db.hasCapacity(followupTimeslotId)) {
         throw new ValidationError("Follow-up timeslot is at full capacity");
      }

      // Create participant and dual booking
      const participant = db.createParticipant(name, email, questionnaireData);
      const bookings = db.createDualBooking(
         participant.id,
         primaryTimeslotId,
         followupTimeslotId,
      );

      Logger.info("Dual booking created", {
         participantId: participant.id,
         primaryTimeslotId,
         followupTimeslotId,
      });

      // Send confirmation email (async, don't wait)
      mailer
         .sendDualRegistrationEmail(
            participant,
            primaryTimeslot,
            followupTimeslot,
         )
         .catch((err) => {
            Logger.error("Failed to send dual registration email", err, {
               participantId: participant.id,
            });
         });

      // Send admin notification (async, don't wait)
      mailer
         .sendAdminNotification("registration", participant, {
            primary: primaryTimeslot,
            followup: followupTimeslot,
         })
         .catch((err) => {
            Logger.error("Failed to send admin notification", err);
         });

      res.json({
         success: true,
         participantId: participant.id,
         confirmationToken: participant.confirmationToken,
         primaryBookingId: bookings.primary.id,
         followupBookingId: bookings.followup.id,
         message: "Registration successful. Check your email for confirmation.",
      });
   }),
);

/**
 * POST /api/book
 * Book a single timeslot (primary or followup)
 */
router.post(
   "/api/book",
   asyncHandler(async (req, res) => {
      const { participantId, timeslotId, isFollowup } = req.body;

      validateRequired(req.body, ["participantId", "timeslotId"]);

      // Use booking service for validation and creation
      const result = BookingService.createBooking(
         participantId,
         timeslotId,
         isFollowup || false,
      );

      Logger.info("Single booking created", {
         participantId,
         timeslotId,
         isFollowup: isFollowup || false,
      });

      res.json({
         success: true,
         booking: result.booking,
         message: "Booking successful. Check your email for confirmation.",
      });
   }),
);

/**
 * GET /api/config
 * Get public configuration (participant goal, follow-up days, etc.)
 */
router.get("/api/config", (req, res) => {
   res.json({
      participantGoal: config.participantGoal,
      followUpMinDays: config.appointments.followUpMinDays,
      followUpMaxDays: config.appointments.followUpMaxDays,
   });
});

/**
 * GET /api/featured-timeslot
 * Get the currently featured timeslot
 */
router.get("/api/featured-timeslot", (req, res) => {
   const featured = db.getFeaturedTimeslot();
   res.json(featured || null);
});

/**
 * GET /api/booking/:token
 * Get all bookings for a participant by confirmation token
 */
router.get(
   "/api/booking/:token",
   asyncHandler(async (req, res) => {
      const { token } = req.params;

      if (!token) {
         throw new ValidationError("Token is required");
      }

      // Get all bookings for this participant
      const bookings = db.getAllBookingsByToken(token);

      if (!bookings || bookings.length === 0) {
         throw new ValidationError("No bookings found for this token");
      }

      Logger.info("Bookings retrieved by token", {
         token: token.substring(0, 8) + "...",
         count: bookings.length,
      });

      res.json(bookings);
   }),
);

/**
 * POST /api/reschedule
 * Reschedule a booking to a new timeslot
 */
router.post(
   "/api/reschedule",
   asyncHandler(async (req, res) => {
      const { token, bookingId, newTimeslotId, newFollowupTimeslotId } =
         req.body;

      validateRequired(req.body, ["token", "bookingId", "newTimeslotId"]);

      // Helper function to calculate days difference (date-only, ignoring time)
      const calculateDaysDifference = (date1, date2) => {
         const d1 = new Date(date1);
         const d2 = new Date(date2);
         // Set to midnight to compare dates only
         d1.setHours(0, 0, 0, 0);
         d2.setHours(0, 0, 0, 0);
         return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      };

      // Verify token matches booking
      const bookings = db.getAllBookingsByToken(token);
      const booking = bookings.find((b) => b.booking_id === bookingId);

      if (!booking) {
         throw new ValidationError("Booking not found or invalid token");
      }

      // Get old and new timeslots
      const oldTimeslot = db.getTimeslotById(booking.timeslot_id);
      const newTimeslot = db.getTimeslotById(newTimeslotId);

      if (!newTimeslot) {
         throw new ValidationError("New timeslot not found");
      }

      // Check capacity
      if (!db.hasCapacity(newTimeslotId)) {
         throw new ValidationError("New timeslot is at full capacity");
      }

      // Check if rescheduling would violate constraints with linked appointment
      const primaryBooking = booking.is_followup
         ? bookings.find((b) => b.booking_id === booking.parent_booking_id)
         : booking;
      const followupBooking = booking.is_followup
         ? booking
         : bookings.find((b) => b.parent_booking_id === booking.booking_id);

      // If rescheduling primary and there's a followup
      if (!booking.is_followup && followupBooking && !newFollowupTimeslotId) {
         // Check if existing followup would still be valid with new primary
         const daysDiff = calculateDaysDifference(
            newTimeslot.start_time,
            followupBooking.timeslot_start,
         );

         if (daysDiff < FOLLOWUP_MIN_DAYS || daysDiff > FOLLOWUP_MAX_DAYS) {
            // Return error requiring followup reschedule
            return res.status(400).json({
               error: "Der neue Haupttermin ist nicht im gültigen Abstand zum Folgetermin",
               requiresFollowupReschedule: true,
               daysDiff: daysDiff,
               minDays: FOLLOWUP_MIN_DAYS,
               maxDays: FOLLOWUP_MAX_DAYS,
            });
         }
      }

      // If rescheduling followup and there's a primary
      if (booking.is_followup && primaryBooking && !newFollowupTimeslotId) {
         // Check if new followup would be valid with existing primary
         const daysDiff = calculateDaysDifference(
            primaryBooking.timeslot_start,
            newTimeslot.start_time,
         );

         if (daysDiff < FOLLOWUP_MIN_DAYS || daysDiff > FOLLOWUP_MAX_DAYS) {
            // Return error - cannot reschedule followup to invalid date
            throw new ValidationError(
               `Der Folgetermin muss ${FOLLOWUP_MIN_DAYS}-${FOLLOWUP_MAX_DAYS} Tage nach dem Haupttermin liegen. Aktuell: ${daysDiff} Tage.`,
            );
         }
      }

      // If both are being rescheduled, validate the relationship
      if (newFollowupTimeslotId) {
         const newFollowupTimeslot = db.getTimeslotById(newFollowupTimeslotId);

         if (!newFollowupTimeslot) {
            throw new ValidationError("New followup timeslot not found");
         }

         if (!db.hasCapacity(newFollowupTimeslotId)) {
            throw new ValidationError(
               "New followup timeslot is at full capacity",
            );
         }

         // Validate followup is within configured days (date-only comparison)
         const daysDiff = calculateDaysDifference(
            newTimeslot.start_time,
            newFollowupTimeslot.start_time,
         );

         if (daysDiff < FOLLOWUP_MIN_DAYS || daysDiff > FOLLOWUP_MAX_DAYS) {
            throw new ValidationError(
               `Der Folgetermin muss ${FOLLOWUP_MIN_DAYS}-${FOLLOWUP_MAX_DAYS} Tage nach dem Haupttermin liegen. Gewählt: ${daysDiff} Tage.`,
            );
         }

         // Reschedule followup as well
         if (followupBooking) {
            db.rescheduleBooking(
               followupBooking.booking_id,
               newFollowupTimeslotId,
            );
         }
      }

      // Reschedule the booking
      db.rescheduleBooking(bookingId, newTimeslotId);

      Logger.info("Booking rescheduled", {
         bookingId,
         oldTimeslotId: booking.timeslot_id,
         newTimeslotId,
      });

      // Send confirmation email
      mailer
         .sendRescheduleEmail(booking, oldTimeslot, newTimeslot)
         .catch((err) => {
            Logger.error("Failed to send reschedule email", err, {
               bookingId,
            });
         });

      res.json({
         success: true,
         message: "Booking rescheduled successfully",
      });
   }),
);

/**
 * POST /api/cancel
 * Cancel all bookings for a participant
 */
router.post(
   "/api/cancel",
   asyncHandler(async (req, res) => {
      const { token } = req.body;

      validateRequired(req.body, ["token"]);

      // Get all bookings for this participant
      const bookings = db.getAllBookingsByToken(token);

      if (!bookings || bookings.length === 0) {
         throw new ValidationError("No bookings found for this token");
      }

      // Cancel all bookings
      let cancelledCount = 0;
      for (const booking of bookings) {
         if (booking.status === "active") {
            db.cancelBooking(booking.booking_id);
            cancelledCount++;
         }
      }

      Logger.info("Bookings cancelled by participant", {
         token: token.substring(0, 8) + "...",
         cancelledCount,
      });

      // Send cancellation confirmation email
      const participant = {
         name: bookings[0].name,
         email: bookings[0].email,
      };

      // Get primary and followup timeslots
      const primaryBooking = bookings.find((b) => !b.is_followup);
      const followupBooking = bookings.find((b) => b.is_followup);

      const primaryTimeslot = primaryBooking
         ? {
              start_time: primaryBooking.timeslot_start,
              end_time: primaryBooking.timeslot_end,
              location: primaryBooking.location,
           }
         : null;

      const followupTimeslot = followupBooking
         ? {
              start_time: followupBooking.timeslot_start,
              end_time: followupBooking.timeslot_end,
              location: followupBooking.location,
           }
         : null;

      mailer
         .sendCancellationEmail(
            participant,
            primaryTimeslot,
            followupTimeslot,
            "participant",
         )
         .catch((err) => {
            Logger.error("Failed to send cancellation email", err, {
               email: participant.email,
            });
         });

      res.json({
         success: true,
         message: "All bookings cancelled successfully",
         cancelledCount,
      });
   }),
);

module.exports = router;
