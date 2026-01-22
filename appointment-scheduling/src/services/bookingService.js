// Booking service module
// Handles all business logic related to bookings

const db = require("../../database");
const NotificationService = require("./notificationService");
const { Logger } = require("../middleware/logging");
const {
   ValidationError,
   ConflictError,
   NotFoundError,
} = require("../middleware/errorHandler");
const config = require("../../config");

/**
 * Booking service for managing appointment bookings
 */
class BookingService {
   /**
    * Create a new booking
    * @param {number} participantId - Participant ID
    * @param {number} timeslotId - Timeslot ID
    * @param {boolean} isFollowup - Whether this is a follow-up booking
    * @returns {Object} Created booking with timeslot and participant info
    */
   static createBooking(participantId, timeslotId, isFollowup = false) {
      // Validate inputs
      if (!participantId || !timeslotId) {
         throw new ValidationError(
            "Participant ID and Timeslot ID are required",
         );
      }

      // Get timeslot to check availability and type
      const timeslot = db.getTimeslotById(timeslotId);
      if (!timeslot) {
         throw new NotFoundError("Timeslot not found");
      }

      // Check if timeslot is available
      if (!db.isTimeslotAvailable(timeslotId)) {
         throw new ConflictError("Timeslot is no longer available");
      }

      // Check capacity
      if (!db.hasCapacity(timeslotId)) {
         throw new ConflictError("Timeslot has reached maximum capacity");
      }

      // Get participant
      const participant = db.getParticipantById(participantId);
      if (!participant) {
         throw new NotFoundError("Participant not found");
      }

      // Validate appointment type compatibility
      if (isFollowup) {
         if (timeslot.appointment_type === "primary") {
            throw new ConflictError(
               "Cannot book a follow-up in a primary-only timeslot",
            );
         }
      } else {
         if (timeslot.appointment_type === "followup") {
            throw new ConflictError(
               "Cannot book a primary appointment in a follow-up-only timeslot",
            );
         }
      }

      // Check if participant already has a booking of this type
      const existingBookings = db.getParticipantBookings(participantId);

      if (isFollowup) {
         const hasFollowup = existingBookings.some((b) => b.is_followup);
         if (hasFollowup) {
            throw new ConflictError(
               "Participant already has a follow-up booking",
            );
         }

         // Must have a primary booking first
         const hasPrimary = existingBookings.some((b) => !b.is_followup);
         if (!hasPrimary) {
            throw new ConflictError(
               "Must book a primary appointment before booking a follow-up",
            );
         }

         // Validate 29-31 day gap between primary and follow-up
         const primaryBooking = existingBookings.find((b) => !b.is_followup);
         const primaryTimeslot = db.getTimeslotById(primaryBooking.timeslot_id);

         const primaryDate = new Date(primaryTimeslot.start_time);
         const followupDate = new Date(timeslot.start_time);
         const daysDifference = Math.floor(
            (followupDate - primaryDate) / (1000 * 60 * 60 * 24),
         );

         if (
            daysDifference < config.FOLLOWUP_MIN_DAYS ||
            daysDifference > config.FOLLOWUP_MAX_DAYS
         ) {
            throw new ConflictError(
               `Follow-up must be ${config.FOLLOWUP_MIN_DAYS}-${config.FOLLOWUP_MAX_DAYS} days after primary appointment. Current gap: ${daysDifference} days.`,
            );
         }
      } else {
         const hasPrimary = existingBookings.some((b) => !b.is_followup);
         if (hasPrimary) {
            throw new ConflictError(
               "Participant already has a primary booking",
            );
         }
      }

      // Create the booking
      const booking = db.createBooking(participantId, timeslotId, isFollowup);

      Logger.info("Booking created", {
         bookingId: booking.id,
         participantId,
         timeslotId,
         isFollowup,
      });

      // Send confirmation email asynchronously (don't wait for it)
      NotificationService.sendBookingConfirmation(
         booking,
         participant,
         timeslot,
      ).catch((err) => {
         Logger.error("Failed to send booking confirmation email", err, {
            bookingId: booking.id,
         });
      });

      return {
         booking,
         timeslot,
         participant,
      };
   }

   /**
    * Cancel a booking
    * @param {number} bookingId - Booking ID to cancel
    * @param {string} reason - Cancellation reason
    * @returns {Object} Cancelled booking info
    */
   static cancelBooking(bookingId, reason = "") {
      const booking = db.getBookingById(bookingId);
      if (!booking) {
         throw new NotFoundError("Booking not found");
      }

      const timeslot = db.getTimeslotById(booking.timeslot_id);
      const participant = db.getParticipantById(booking.participant_id);

      // Delete the booking
      db.deleteBooking(bookingId);

      Logger.info("Booking cancelled", {
         bookingId,
         participantId: booking.participant_id,
         timeslotId: booking.timeslot_id,
         reason,
      });

      // Send cancellation email asynchronously
      if (participant && timeslot) {
         NotificationService.sendBookingCancellation(
            booking,
            participant,
            timeslot,
            reason,
         ).catch((err) => {
            Logger.error("Failed to send cancellation email", err, {
               bookingId,
            });
         });
      }

      return {
         booking,
         timeslot,
         participant,
      };
   }

   /**
    * Cancel all bookings for a timeslot
    * @param {number} timeslotId - Timeslot ID
    * @param {string} reason - Cancellation reason
    * @returns {Array} List of cancelled bookings
    */
   static cancelTimeslotBookings(
      timeslotId,
      reason = "Timeslot was cancelled by administrator",
   ) {
      const timeslot = db.getTimeslotById(timeslotId);
      if (!timeslot) {
         throw new NotFoundError("Timeslot not found");
      }

      const affectedBookings = db.getBookingsByTimeslot(timeslotId);

      Logger.info("Cancelling timeslot bookings", {
         timeslotId,
         bookingCount: affectedBookings.length,
         reason,
      });

      const cancelled = [];

      for (const booking of affectedBookings) {
         const participant = db.getParticipantById(booking.participant_id);

         // Delete booking
         db.deleteBooking(booking.id);

         cancelled.push({
            booking,
            participant,
         });

         // Send cancellation email
         if (participant) {
            NotificationService.sendBookingCancellation(
               booking,
               participant,
               timeslot,
               reason,
            ).catch((err) => {
               Logger.error("Failed to send cancellation email", err, {
                  bookingId: booking.id,
               });
            });
         }
      }

      return cancelled;
   }

   /**
    * Update booking result status (after appointment completion)
    * @param {number} bookingId - Booking ID
    * @param {string} resultStatus - Result status (successful, issues_arised, unusable_data, no_show)
    * @returns {Object} Updated booking
    */
   static updateBookingResultStatus(bookingId, resultStatus) {
      const validStatuses = [
         "successful",
         "issues_arised",
         "unusable_data",
         "no_show",
      ];

      if (!validStatuses.includes(resultStatus)) {
         throw new ValidationError("Invalid result status", { validStatuses });
      }

      const booking = db.getBookingById(bookingId);
      if (!booking) {
         throw new NotFoundError("Booking not found");
      }

      const updatedBooking = db.updateBookingResultStatus(
         bookingId,
         resultStatus,
      );

      Logger.info("Booking result status updated", {
         bookingId,
         resultStatus,
      });

      return updatedBooking;
   }

   /**
    * Get all bookings
    * @returns {Array} All bookings with participant and timeslot info
    */
   static getAllBookings() {
      return db.getBookings();
   }

   /**
    * Get bookings for a specific participant
    * @param {number} participantId - Participant ID
    * @returns {Array} Participant's bookings
    */
   static getParticipantBookings(participantId) {
      return db.getParticipantBookings(participantId);
   }

   /**
    * Get bookings for a specific timeslot
    * @param {number} timeslotId - Timeslot ID
    * @returns {Array} Timeslot's bookings
    */
   static getTimeslotBookings(timeslotId) {
      return db.getBookingsByTimeslot(timeslotId);
   }

   /**
    * Get unreviewed appointments (past appointments without result status)
    * @returns {Array} Unreviewed appointments
    */
   static getUnreviewedAppointments() {
      const now = new Date().toISOString();
      const bookings = db.getBookings();

      return bookings.filter((booking) => {
         const timeslot = db.getTimeslotById(booking.timeslot_id);
         if (!timeslot) return false;

         const isPast = new Date(timeslot.end_time) < new Date(now);
         const isUnreviewed = !booking.result_status;

         return isPast && isUnreviewed;
      });
   }

   /**
    * Validate if a follow-up booking can be made
    * @param {number} participantId - Participant ID
    * @param {number} followupTimeslotId - Follow-up timeslot ID
    * @returns {Object} Validation result with isValid and message
    */
   static validateFollowupBooking(participantId, followupTimeslotId) {
      const participant = db.getParticipantById(participantId);
      if (!participant) {
         return {
            isValid: false,
            message: "Participant not found",
         };
      }

      const followupTimeslot = db.getTimeslotById(followupTimeslotId);
      if (!followupTimeslot) {
         return {
            isValid: false,
            message: "Timeslot not found",
         };
      }

      // Check if participant has a primary booking
      const bookings = db.getParticipantBookings(participantId);
      const primaryBooking = bookings.find((b) => !b.is_followup);

      if (!primaryBooking) {
         return {
            isValid: false,
            message:
               "Must have a primary appointment before booking a follow-up",
         };
      }

      // Check day gap
      const primaryTimeslot = db.getTimeslotById(primaryBooking.timeslot_id);
      const primaryDate = new Date(primaryTimeslot.start_time);
      const followupDate = new Date(followupTimeslot.start_time);
      const daysDifference = Math.floor(
         (followupDate - primaryDate) / (1000 * 60 * 60 * 24),
      );

      if (
         daysDifference < config.FOLLOWUP_MIN_DAYS ||
         daysDifference > config.FOLLOWUP_MAX_DAYS
      ) {
         return {
            isValid: false,
            message: `Follow-up must be ${config.FOLLOWUP_MIN_DAYS}-${config.FOLLOWUP_MAX_DAYS} days after primary appointment. Current gap: ${daysDifference} days.`,
            daysDifference,
         };
      }

      return {
         isValid: true,
         message: "Follow-up booking is valid",
         daysDifference,
      };
   }

   /**
    * Get booking statistics
    * @returns {Object} Statistics about bookings
    */
   static getBookingStatistics() {
      const bookings = db.getBookings();
      const timeslots = db.getTimeslots();
      const participants = db.getParticipants();

      const now = new Date().toISOString();

      // Count bookings
      const totalBookings = bookings.length;
      const primaryBookings = bookings.filter((b) => !b.is_followup).length;
      const followupBookings = bookings.filter((b) => b.is_followup).length;

      // Count completed appointments
      const completedAppointments = bookings.filter((b) => {
         const timeslot = db.getTimeslotById(b.timeslot_id);
         return timeslot && new Date(timeslot.end_time) < new Date(now);
      }).length;

      // Count by result status
      const statusCounts = {
         successful: 0,
         issues_arised: 0,
         unusable_data: 0,
         no_show: 0,
         unreviewed: 0,
      };

      bookings.forEach((booking) => {
         if (booking.result_status) {
            statusCounts[booking.result_status]++;
         } else {
            const timeslot = db.getTimeslotById(booking.timeslot_id);
            if (timeslot && new Date(timeslot.end_time) < new Date(now)) {
               statusCounts.unreviewed++;
            }
         }
      });

      // Timeslot statistics
      const totalTimeslots = timeslots.length;
      const bookedTimeslots = new Set(bookings.map((b) => b.timeslot_id)).size;
      const availableTimeslots = totalTimeslots - bookedTimeslots;

      return {
         bookings: {
            total: totalBookings,
            primary: primaryBookings,
            followup: followupBookings,
            completed: completedAppointments,
         },
         results: statusCounts,
         timeslots: {
            total: totalTimeslots,
            booked: bookedTimeslots,
            available: availableTimeslots,
         },
         participants: {
            total: participants.length,
            withBookings: new Set(bookings.map((b) => b.participant_id)).size,
         },
      };
   }
}

module.exports = BookingService;
