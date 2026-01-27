// Admin routes module
// Handles all admin-facing API endpoints (requires authentication)

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const db = require("../../database");
const mailer = require("../../mailer");
const BookingService = require("../services/bookingService");
const NotificationService = require("../services/notificationService");
const reminderScheduler = require("../services/reminderScheduler");
const { requireAdmin } = require("../middleware/auth");
const {
   asyncHandler,
   validateRequired,
   ValidationError,
   NotFoundError,
} = require("../middleware/errorHandler");
const { Logger } = require("../middleware/logging");
const config = require("../../config");

const FOLLOWUP_MIN_DAYS = config.FOLLOWUP_MIN_DAYS;
const FOLLOWUP_MAX_DAYS = config.FOLLOWUP_MAX_DAYS;

// ============================================================================
// Authentication Routes
// ============================================================================

/**
 * POST /login
 * Admin login
 */
router.post(
   "/login",
   asyncHandler(async (req, res) => {
      const { username, password } = req.body;

      validateRequired(req.body, ["username", "password"]);

      const admin = db.getAdminByUsername(username);
      if (!admin) {
         throw new ValidationError("Invalid credentials");
      }

      const validPassword = await bcrypt.compare(password, admin.password_hash);
      if (!validPassword) {
         throw new ValidationError("Invalid credentials");
      }

      req.session.adminId = admin.id;

      // Explicitly save session before sending response
      await new Promise((resolve, reject) => {
         req.session.save((err) => {
            if (err) {
               Logger.error("Session save error", err);
               reject(err);
            } else {
               Logger.info("Admin logged in", {
                  sessionId: req.sessionID,
                  adminId: admin.id,
                  username: admin.username,
               });
               resolve();
            }
         });
      });

      res.json({ success: true, message: "Login successful" });
   }),
);

/**
 * POST /logout
 * Admin logout
 */
router.post(
   "/logout",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const adminId = req.session.adminId;

      await new Promise((resolve, reject) => {
         req.session.destroy((err) => {
            if (err) {
               Logger.error("Error destroying session", err);
               reject(err);
            } else {
               Logger.info("Admin logged out", { adminId });
               resolve();
            }
         });
      });

      res.json({ success: true, message: "Logged out successfully" });
   }),
);

/**
 * GET /check
 * Check admin session status
 */
router.get("/check", (req, res) => {
   res.json({ authenticated: !!req.session.adminId });
});

// ============================================================================
// Participant Routes
// ============================================================================

/**
 * GET /participants
 * Get all participants
 */
router.get(
   "/participants",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const participants = db.getAllParticipants();
      res.json(participants);
   }),
);

/**
 * DELETE /participants/:id
 * Delete a participant and all their bookings
 */
router.delete(
   "/participants/:id",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { id } = req.params;

      // Get participant data before deleting
      const participant = db.getParticipantById(id);
      if (!participant) {
         throw new NotFoundError("Participant not found");
      }

      // Delete participant (and all their bookings via cascade)
      const result = db.deleteParticipant(id);

      if (result.changes === 0) {
         throw new NotFoundError("Participant not found");
      }

      Logger.info("Participant deleted", {
         participantId: id,
         name: participant.name,
         email: participant.email,
      });

      res.json({
         success: true,
         message: "Participant and all their bookings deleted successfully",
      });
   }),
);

// ============================================================================
// Timeslot Routes
// ============================================================================

/**
 * GET /timeslots
 * Get all timeslots with optional pagination
 */
router.get(
   "/timeslots",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      const offset = req.query.offset ? parseInt(req.query.offset) : 0;

      const timeslots = db.getAllTimeslots(limit, offset);

      // Return paginated format only if limit is specified
      if (limit !== null) {
         const total = db.getTimeslotsCount();
         res.json({
            timeslots,
            total,
            limit,
            offset,
         });
      } else {
         // Backward compatibility: return array directly
         res.json(timeslots);
      }
   }),
);

/**
 * POST /timeslots
 * Create a new timeslot
 */
router.post(
   "/timeslots",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const {
         startTime,
         endTime,
         location,
         appointmentType,
         capacity,
         primaryCapacity,
         followupCapacity,
      } = req.body;

      validateRequired(req.body, ["startTime", "endTime"]);

      const timeslot = db.createTimeslot(
         startTime,
         endTime,
         location || "",
         appointmentType || "primary",
         capacity || null,
         null, // parentAppointmentId
         primaryCapacity || null,
         followupCapacity || null,
      );

      Logger.info("Timeslot created", {
         timeslotId: timeslot.id,
         startTime,
         endTime,
         appointmentType,
      });

      res.json(timeslot);
   }),
);

/**
 * POST /bulk-timeslots
 * Bulk create timeslots with weekday and working hours filters
 */
router.post(
   "/bulk-timeslots",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const {
         startDate,
         endDate,
         duration,
         breakTime,
         location,
         appointmentType,
         capacity,
         primaryCapacity,
         followupCapacity,
         weekdays,
         workingHours,
      } = req.body;

      validateRequired(req.body, [
         "startDate",
         "endDate",
         "duration",
         "breakTime",
         "weekdays",
         "workingHours",
      ]);

      // Validate inputs
      if (duration <= 0) {
         throw new ValidationError("Duration must be positive");
      }

      if (breakTime < 0) {
         throw new ValidationError("Break time cannot be negative");
      }

      if (!Array.isArray(weekdays) || weekdays.length === 0) {
         throw new ValidationError("At least one weekday must be selected");
      }

      if (!Array.isArray(workingHours) || workingHours.length === 0) {
         throw new ValidationError(
            "At least one working hours range must be specified",
         );
      }

      // Validate working hours
      for (const hours of workingHours) {
         if (!hours.start || !hours.end) {
            throw new ValidationError("Invalid working hours format");
         }
         if (hours.start >= hours.end) {
            throw new ValidationError(
               "End time must be after start time in working hours",
            );
         }
      }

      const timeslots = db.bulkCreateTimeslots(
         startDate,
         endDate,
         parseInt(duration),
         parseInt(breakTime),
         location || "",
         appointmentType || "primary",
         capacity ? parseInt(capacity) : null,
         weekdays,
         workingHours,
         primaryCapacity ? parseInt(primaryCapacity) : null,
         followupCapacity ? parseInt(followupCapacity) : null,
      );

      Logger.info("Bulk timeslots created", {
         count: timeslots.length,
         startDate,
         endDate,
         weekdays,
         workingHours,
      });

      res.json({
         success: true,
         count: timeslots.length,
         timeslots: timeslots,
      });
   }),
);

/**
 * PUT /timeslots/bulk-edit
 * Bulk edit timeslots (location and/or appointment type)
 */
router.put(
   "/timeslots/bulk-edit",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { ids, updates } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
         throw new ValidationError("Invalid or empty timeslot IDs array");
      }

      if (!updates || typeof updates !== "object") {
         throw new ValidationError("Updates object is required");
      }

      // Validate that at least one field is being updated
      const { location, appointmentType, capacity } = updates;
      if (
         location === undefined &&
         appointmentType === undefined &&
         capacity === undefined
      ) {
         throw new ValidationError(
            "At least one field (location, appointmentType, or capacity) must be provided",
         );
      }

      // Track results
      const results = {
         updated: 0,
         failed: 0,
         errors: [],
         affectedParticipants: [],
      };

      // Process each timeslot
      for (const id of ids) {
         try {
            const timeslot = db.getTimeslotById(id);
            if (!timeslot) {
               results.failed++;
               results.errors.push({
                  id,
                  error: "Timeslot not found",
               });
               continue;
            }

            // Check if timeslot has bookings - need to notify participants if location changes
            const affectedParticipants =
               db.getAffectedParticipantsWithLinkedBookings(id);
            const hasBookings = affectedParticipants.length > 0;

            // Check if timeslot has variant capacities (primary_capacity or followup_capacity)
            const hasVariantCapacities =
               timeslot.primary_capacity !== null ||
               timeslot.followup_capacity !== null;

            // Prepare update object
            const updateData = {};
            if (location !== undefined) {
               updateData.location = location;
            }
            if (capacity !== undefined) {
               // Only allow capacity changes for timeslots with singular capacity
               if (hasVariantCapacities) {
                  results.failed++;
                  results.errors.push({
                     id,
                     error: "Cannot change capacity: timeslot has variant capacities (primary/followup)",
                  });
                  continue;
               }
               updateData.capacity = capacity;
            }
            if (appointmentType !== undefined) {
               updateData.appointmentType = appointmentType;

               // Validate appointment type
               const validTypes = ["primary", "followup", "dual"];
               if (!validTypes.includes(appointmentType)) {
                  results.failed++;
                  results.errors.push({
                     id,
                     error: `Invalid appointment type: ${appointmentType}`,
                  });
                  continue;
               }

               // If timeslot has bookings, validate type compatibility
               if (hasBookings) {
                  // Check if any affected participants have incompatible bookings
                  let hasIncompatibleBookings = false;
                  let errorMessage = "";

                  for (const participant of affectedParticipants) {
                     const isPrimaryBooking =
                        participant.primary &&
                        participant.primary.timeslot_id === id;
                     const isFollowupBooking =
                        participant.followup &&
                        participant.followup.timeslot_id === id;

                     // Check if new type is compatible with existing bookings
                     if (appointmentType === "primary" && isFollowupBooking) {
                        hasIncompatibleBookings = true;
                        errorMessage =
                           "Cannot change to primary-only: has follow-up bookings";
                        break;
                     }
                     if (appointmentType === "followup" && isPrimaryBooking) {
                        hasIncompatibleBookings = true;
                        errorMessage =
                           "Cannot change to follow-up-only: has primary bookings";
                        break;
                     }
                  }

                  if (hasIncompatibleBookings) {
                     results.failed++;
                     results.errors.push({
                        id,
                        error: errorMessage,
                     });
                     continue;
                  }
               }
            }

            // Update the timeslot
            db.updateTimeslot(id, updateData);
            results.updated++;

            // If location changed and has bookings, collect participants for notification
            if (location !== undefined && hasBookings) {
               for (const participantData of affectedParticipants) {
                  // Check if we already have this participant
                  if (
                     !results.affectedParticipants.find(
                        (p) => p.email === participantData.email,
                     )
                  ) {
                     results.affectedParticipants.push({
                        id: participantData.participant_id,
                        email: participantData.email,
                        name: participantData.name,
                        oldLocation: timeslot.location, // Store old location
                     });
                  }
               }
            }

            Logger.info("Timeslot updated via bulk edit", {
               timeslotId: id,
               updates: updateData,
               hasBookings,
            });
         } catch (error) {
            results.failed++;
            results.errors.push({
               id,
               error: error.message,
            });
            Logger.error("Failed to update timeslot in bulk edit", error, {
               timeslotId: id,
            });
         }
      }

      // Send notification emails to affected participants if location changed
      if (location !== undefined && results.affectedParticipants.length > 0) {
         for (const participant of results.affectedParticipants) {
            const oldLocationText =
               participant.oldLocation || "nicht angegeben";
            const newLocationText = location || "nicht angegeben";
            mailer
               .sendCustomEmail(
                  participant.email,
                  participant.name,
                  "Raumänderung - Ihre Termine wurden aktualisiert",
                  `Der Ort für Ihre Termine wurde geändert.\n\nAlter Ort: ${oldLocationText}\nNeuer Ort: ${newLocationText}\n\nBitte notieren Sie sich die Änderung. Ihre Termine bleiben ansonsten unverändert.`,
               )
               .catch((err) => {
                  Logger.error(
                     "Failed to send location change notification",
                     err,
                     {
                        participantId: participant.id,
                     },
                  );
               });
         }
      }

      Logger.info("Bulk edit completed", {
         totalRequested: ids.length,
         updated: results.updated,
         failed: results.failed,
         notifiedParticipants: results.affectedParticipants.length,
      });

      res.json({
         success: true,
         updated: results.updated,
         failed: results.failed,
         errors: results.errors,
         notifiedParticipants: results.affectedParticipants.length,
      });
   }),
);

/**
 * PUT /timeslots/:id
 * Update a timeslot
 */
router.put(
   "/timeslots/:id",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { id } = req.params;
      const {
         startTime,
         endTime,
         location,
         appointmentType,
         capacity,
         primaryCapacity,
         followupCapacity,
      } = req.body;

      // Get old timeslot data before updating
      const oldTimeslot = db.getTimeslotById(id);
      if (!oldTimeslot) {
         throw new NotFoundError("Timeslot not found");
      }

      // Check if time changed
      const timeChanged =
         startTime !== oldTimeslot.start_time ||
         endTime !== oldTimeslot.end_time;

      // If time is changing, validate 29-31 day rule for linked bookings
      if (timeChanged) {
         const affectedBookings = db.getAffectedParticipantsByTimeslot(id);

         for (const booking of affectedBookings) {
            // If this is a primary timeslot, check all linked followups
            if (
               oldTimeslot.appointment_type === "primary" &&
               !booking.is_followup
            ) {
               // Find this participant's followup booking
               const allParticipantBookings = db.getAllBookingsByToken(
                  booking.confirmation_token,
               );
               const followupBooking = allParticipantBookings.find(
                  (b) => b.parent_booking_id === booking.booking_id,
               );

               if (followupBooking) {
                  const newPrimaryDate = new Date(startTime);
                  const followupDate = new Date(followupBooking.timeslot_start);
                  const daysDiff = Math.floor(
                     (followupDate - newPrimaryDate) / (1000 * 60 * 60 * 24),
                  );

                  if (
                     daysDiff < FOLLOWUP_MIN_DAYS ||
                     daysDiff > FOLLOWUP_MAX_DAYS
                  ) {
                     throw new ValidationError(
                        `Zeitänderung nicht möglich: Würde die ${FOLLOWUP_MIN_DAYS}-${FOLLOWUP_MAX_DAYS} Tage Regel verletzen. Folgetermin ist ${daysDiff} Tage nach dem neuen Haupttermin. Bitte stornieren Sie zuerst die Buchungen.`,
                     );
                  }
               }
            }

            // If this is a followup timeslot, check against linked primary
            if (
               oldTimeslot.appointment_type === "followup" &&
               booking.is_followup
            ) {
               const allParticipantBookings = db.getAllBookingsByToken(
                  booking.confirmation_token,
               );
               const primaryBooking = allParticipantBookings.find(
                  (b) => b.booking_id === booking.parent_booking_id,
               );

               if (primaryBooking) {
                  const primaryDate = new Date(primaryBooking.timeslot_start);
                  const newFollowupDate = new Date(startTime);
                  const daysDiff = Math.floor(
                     (newFollowupDate - primaryDate) / (1000 * 60 * 60 * 24),
                  );

                  if (
                     daysDiff < FOLLOWUP_MIN_DAYS ||
                     daysDiff > FOLLOWUP_MAX_DAYS
                  ) {
                     throw new ValidationError(
                        `Zeitänderung nicht möglich: Würde die ${FOLLOWUP_MIN_DAYS}-${FOLLOWUP_MAX_DAYS} Tage Regel verletzen. Neuer Folgetermin wäre ${daysDiff} Tage nach dem Haupttermin. Bitte stornieren Sie zuerst die Buchungen.`,
                     );
                  }
               }
            }
         }
      }

      // Check if time or location changed (for notifications)
      const timeOrLocationChanged =
         startTime !== oldTimeslot.start_time ||
         endTime !== oldTimeslot.end_time ||
         location !== oldTimeslot.location;

      // Get affected participants before updating (if changes warrant notification)
      let affectedParticipants = [];
      if (timeOrLocationChanged) {
         affectedParticipants = db.getAffectedParticipantsByTimeslot(id);
      }

      // Update the timeslot
      db.updateTimeslot(id, {
         startTime,
         endTime,
         location,
         appointmentType,
         capacity:
            capacity === "" || capacity === undefined
               ? null
               : parseInt(capacity),
         primaryCapacity:
            primaryCapacity === "" || primaryCapacity === undefined
               ? null
               : parseInt(primaryCapacity),
         followupCapacity:
            followupCapacity === "" || followupCapacity === undefined
               ? null
               : parseInt(followupCapacity),
      });

      // Get updated timeslot data
      const newTimeslot = db.getTimeslotById(id);

      // Send notifications to affected participants
      if (timeOrLocationChanged && affectedParticipants.length > 0) {
         for (const participant of affectedParticipants) {
            mailer
               .sendTimeslotUpdateEmail(
                  participant,
                  oldTimeslot,
                  newTimeslot,
                  participant.is_followup === 1,
               )
               .catch((err) => {
                  Logger.error("Failed to send timeslot update email", err, {
                     participantId: participant.id,
                  });
               });
         }
         Logger.info("Timeslot update notifications sent", {
            timeslotId: id,
            notifiedCount: affectedParticipants.length,
         });
      }

      res.json({
         success: true,
         message: "Timeslot updated successfully",
         notifiedParticipants: affectedParticipants.length,
      });
   }),
);

/**
 * POST /timeslots/bulk
 * Bulk delete timeslots
 */
router.post(
   "/timeslots/bulk",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
         throw new ValidationError("Invalid or empty timeslot IDs array");
      }

      // Get affected participants for all timeslots before deleting
      const allAffectedParticipants = [];
      for (const id of ids) {
         const participants = db.getAffectedParticipantsWithLinkedBookings(id);
         allAffectedParticipants.push(...participants);
      }

      // Bulk delete (this will delete bookings and timeslots in a transaction)
      const result = db.bulkDeleteTimeslots(ids);

      // Send notifications to affected participants
      if (allAffectedParticipants.length > 0) {
         for (const participant of allAffectedParticipants) {
            // Prepare timeslot objects for email
            const primaryTimeslot = participant.primary
               ? {
                    start_time: participant.primary.start_time,
                    end_time: participant.primary.end_time,
                    location: participant.primary.location,
                 }
               : null;

            const followupTimeslot = participant.followup
               ? {
                    start_time: participant.followup.start_time,
                    end_time: participant.followup.end_time,
                    location: participant.followup.location,
                 }
               : null;

            mailer
               .sendCancellationEmail(
                  participant.email,
                  participant.name,
                  { primary: primaryTimeslot, followup: followupTimeslot },
                  "admin",
               )
               .catch((err) => {
                  Logger.error("Failed to send cancellation email", err, {
                     email: participant.email,
                  });
               });
         }
      }

      Logger.info("Bulk timeslots deleted", {
         deleted: result.deleted,
         failed: result.failed,
         notifiedCount: allAffectedParticipants.length,
      });

      res.json({
         success: true,
         deleted: result.deleted,
         failed: result.failed,
         errors: result.errors,
      });
   }),
);

/**
 * POST /timeslots/:id/cancel-bookings
 * Cancel all bookings for a timeslot
 */
router.post(
   "/timeslots/:id/cancel-bookings",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { id } = req.params;

      // Get timeslot data
      const timeslot = db.getTimeslotById(id);
      if (!timeslot) {
         throw new NotFoundError("Timeslot not found");
      }

      // Get affected participants WITH their linked bookings (primary + followup)
      const affectedParticipants =
         db.getAffectedParticipantsWithLinkedBookings(id);

      if (affectedParticipants.length === 0) {
         return res.json({
            success: true,
            message: "No active bookings to cancel",
            notifiedParticipants: 0,
         });
      }

      // Cancel all bookings for this timeslot AND their linked appointments
      const result = db.cancelBookingsForTimeslotWithLinked(id);

      // Send notifications to affected participants
      for (const participant of affectedParticipants) {
         // Prepare timeslot objects for email
         const primaryTimeslot = participant.primary
            ? {
                 start_time: participant.primary.start_time,
                 end_time: participant.primary.end_time,
                 location: participant.primary.location,
              }
            : null;

         const followupTimeslot = participant.followup
            ? {
                 start_time: participant.followup.start_time,
                 end_time: participant.followup.end_time,
                 location: participant.followup.location,
              }
            : null;

         // Send cancellation email (both appointments)
         mailer
            .sendCancellationEmail(
               {
                  name: participant.name,
                  email: participant.email,
               },
               primaryTimeslot,
               followupTimeslot,
            )
            .catch((err) => {
               Logger.error("Failed to send cancellation email", err, {
                  email: participant.email,
               });
            });
      }

      Logger.info("Timeslot bookings cancelled", {
         timeslotId: id,
         cancelledCount: result.cancelledCount,
         notifiedCount: affectedParticipants.length,
      });

      res.json({
         success: true,
         message: "All bookings and linked appointments cancelled successfully",
         notifiedParticipants: affectedParticipants.length,
         cancelledBookings: result.cancelledCount,
      });
   }),
);

/**
 * DELETE /timeslots/:id
 * Delete a timeslot
 */
router.delete(
   "/timeslots/:id",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { id } = req.params;

      // Get timeslot data before deleting
      const timeslot = db.getTimeslotById(id);
      if (!timeslot) {
         throw new NotFoundError("Timeslot not found");
      }

      // Get affected participants WITH their linked bookings before deleting
      const affectedParticipants =
         db.getAffectedParticipantsWithLinkedBookings(id);

      // Delete all bookings for this timeslot AND their linked bookings
      db.deleteBookingsForTimeslotWithLinked(id);

      // Delete the timeslot
      db.deleteTimeslot(id);

      // Send notifications to affected participants (showing both appointments)
      if (affectedParticipants.length > 0) {
         for (const participant of affectedParticipants) {
            // Prepare timeslot objects for email
            const primaryTimeslot = participant.primary
               ? {
                    start_time: participant.primary.start_time,
                    end_time: participant.primary.end_time,
                    location: participant.primary.location,
                 }
               : null;

            const followupTimeslot = participant.followup
               ? {
                    start_time: participant.followup.start_time,
                    end_time: participant.followup.end_time,
                    location: participant.followup.location,
                 }
               : null;

            // Send cancellation email (both appointments)
            mailer
               .sendCancellationEmail(
                  {
                     name: participant.name,
                     email: participant.email,
                  },
                  primaryTimeslot,
                  followupTimeslot,
               )
               .catch((err) => {
                  Logger.error("Failed to send cancellation email", err, {
                     email: participant.email,
                  });
               });
         }

         Logger.info("Timeslot deleted with notifications", {
            timeslotId: id,
            notifiedCount: affectedParticipants.length,
         });
      }

      res.json({
         success: true,
         message: "Timeslot deleted and linked appointments cancelled",
         notifiedParticipants: affectedParticipants.length,
      });
   }),
);

/**
 * POST /timeslots/:id/toggle-featured
 * Toggle featured status for a timeslot (only one can be featured at a time)
 */
router.post(
   "/timeslots/:id/toggle-featured",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { id } = req.params;

      // Get timeslot data
      const timeslot = db.getTimeslotById(id);
      if (!timeslot) {
         throw new NotFoundError("Timeslot not found");
      }

      const wasFeatured = timeslot.is_featured === 1;

      if (wasFeatured) {
         // Unfeatured this timeslot
         db.setFeaturedTimeslot(null);
         Logger.info("Timeslot unfeatured", { timeslotId: id });
         res.json({
            success: true,
            message: "Timeslot unfeatured",
            isFeatured: false,
         });
      } else {
         // Feature this timeslot (and unfeatured all others)
         db.setFeaturedTimeslot(id);
         Logger.info("Timeslot featured", { timeslotId: id });
         res.json({
            success: true,
            message: "Timeslot featured",
            isFeatured: true,
         });
      }
   }),
);

// ============================================================================
// Booking Routes
// ============================================================================

/**
 * GET /bookings
 * Get all bookings
 */
router.get(
   "/bookings",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const bookings = db.getAllBookings();
      res.json(bookings);
   }),
);

/**
 * GET /bookings/unreviewed
 * Get past unreviewed bookings
 */
router.get(
   "/bookings/unreviewed",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const bookings = db.getPastUnreviewedBookings();
      Logger.debug("Unreviewed bookings fetched", { count: bookings.length });
      res.json(bookings);
   }),
);

/**
 * PATCH /bookings/:id/result-status
 * Update booking result status
 */
router.patch(
   "/bookings/:id/result-status",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const bookingId = parseInt(req.params.id);
      const { resultStatus } = req.body;

      validateRequired(req.body, ["resultStatus"]);

      const booking = BookingService.updateBookingResultStatus(
         bookingId,
         resultStatus,
      );

      res.json({
         success: true,
         message: "Result status updated successfully",
         booking,
      });
   }),
);

// ============================================================================
// Log Routes
// ============================================================================

/**
 * GET /logs
 * Get activity logs with optional pagination
 */
router.get(
   "/logs",
   requireAdmin,
   asyncHandler(async (req, res) => {
      // Only use pagination if explicitly requested
      const hasLimitParam = req.query.limit !== undefined;
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset) : 0;

      const logs = db.getLogs(limit, offset);

      // Return paginated format only if limit param was provided
      if (hasLimitParam) {
         const total = db.getLogsCount();
         res.json({
            logs,
            total,
            limit,
            offset,
         });
      } else {
         // Backward compatibility: return array directly
         res.json(logs);
      }
   }),
);

// ============================================================================
// Email Routes
// ============================================================================

/**
 * POST /send-email
 * Send custom email to participant
 */
router.post(
   "/send-email",
   requireAdmin,
   asyncHandler(async (req, res) => {
      const { email, name, subject, message } = req.body;

      validateRequired(req.body, ["email", "subject", "message"]);

      await NotificationService.sendCustomEmail(
         email,
         name || "",
         subject,
         message,
      );

      Logger.info("Custom email sent by admin", {
         email,
         subject,
      });

      res.json({ success: true, message: "Email sent successfully" });
   }),
);

/**
 * POST /trigger-reminders
 * Manually trigger reminder check (for testing/admin purposes)
 */
router.post(
   "/trigger-reminders",
   requireAdmin,
   asyncHandler(async (req, res) => {
      Logger.info("Manual reminder check triggered by admin");

      // Trigger the reminder check asynchronously
      reminderScheduler.triggerManualCheck().catch((error) => {
         Logger.error("Error during manual reminder check", error);
      });

      res.json({
         success: true,
         message: "Reminder check initiated. Check logs for results.",
      });
   }),
);

module.exports = router;
