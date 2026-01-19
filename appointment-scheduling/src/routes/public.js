// Public routes module
// Handles all public-facing API endpoints (no authentication required)

const express = require('express');
const router = express.Router();

const db = require('../../database');
const mailer = require('../../mailer');
const config = require('../../config');
const BookingService = require('../services/bookingService');
const { asyncHandler, validateRequired, ValidationError } = require('../middleware/errorHandler');
const { Logger } = require('../middleware/logging');
const env = require('../config/env');

const FOLLOWUP_MIN_DAYS = env.FOLLOWUP_MIN_DAYS;
const FOLLOWUP_MAX_DAYS = env.FOLLOWUP_MAX_DAYS;

/**
 * GET /api/timeslots
 * Get available timeslots (optionally filtered by type)
 */
router.get('/api/timeslots', asyncHandler(async (req, res) => {
    const { type, primaryDate } = req.query;

    let timeslots;

    if (type === 'followup' && primaryDate) {
        // Get follow-up slots based on configured days after primary date
        const primaryDateTime = new Date(primaryDate);
        const startDate = new Date(primaryDateTime);
        startDate.setDate(startDate.getDate() + FOLLOWUP_MIN_DAYS);

        const endDate = new Date(primaryDateTime);
        endDate.setDate(endDate.getDate() + FOLLOWUP_MAX_DAYS);

        timeslots = db.getTimeslotsInRange(
            startDate.toISOString(),
            endDate.toISOString(),
            'followup',
        );
    } else {
        timeslots = db.getAvailableTimeslots(type || 'primary');
    }

    res.json(timeslots);
}));

/**
 * POST /api/register
 * Register participant and book dual appointment (primary + followup)
 */
router.post('/api/register', asyncHandler(async (req, res) => {
    const { name, email, primaryTimeslotId, followupTimeslotId } = req.body;

    // Validate required fields
    validateRequired(req.body, ['name', 'email', 'primaryTimeslotId', 'followupTimeslotId']);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email address');
    }

    // Validate both timeslots exist and have capacity
    const primaryTimeslot = db.getTimeslotById(primaryTimeslotId);
    const followupTimeslot = db.getTimeslotById(followupTimeslotId);

    if (!primaryTimeslot) {
        throw new ValidationError('Primary timeslot not found');
    }

    if (!followupTimeslot) {
        throw new ValidationError('Follow-up timeslot not found');
    }

    // Validate follow-up is within configured days after primary
    const primaryDate = new Date(primaryTimeslot.start_time);
    const followupDate = new Date(followupTimeslot.start_time);
    const daysDiff = Math.floor(
        (followupDate - primaryDate) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff < FOLLOWUP_MIN_DAYS || daysDiff > FOLLOWUP_MAX_DAYS) {
        throw new ValidationError(
            `Follow-up appointment must be ${FOLLOWUP_MIN_DAYS}-${FOLLOWUP_MAX_DAYS} days after primary appointment`
        );
    }

    // Check capacity
    if (!db.hasCapacity(primaryTimeslotId)) {
        throw new ValidationError('Primary timeslot is at full capacity');
    }

    if (!db.hasCapacity(followupTimeslotId)) {
        throw new ValidationError('Follow-up timeslot is at full capacity');
    }

    // Create participant and dual booking
    const participant = db.createParticipant(name, email);
    const bookings = db.createDualBooking(
        participant.id,
        primaryTimeslotId,
        followupTimeslotId,
    );

    Logger.info('Dual booking created', {
        participantId: participant.id,
        primaryTimeslotId,
        followupTimeslotId,
    });

    // Send confirmation email (async, don't wait)
    mailer.sendDualRegistrationEmail(
        participant,
        primaryTimeslot,
        followupTimeslot,
    ).catch(err => {
        Logger.error('Failed to send dual registration email', err, {
            participantId: participant.id,
        });
    });

    // Send admin notification (async, don't wait)
    mailer.sendAdminNotification('registration', participant, {
        primary: primaryTimeslot,
        followup: followupTimeslot,
    }).catch(err => {
        Logger.error('Failed to send admin notification', err);
    });

    res.json({
        success: true,
        participantId: participant.id,
        confirmationToken: participant.confirmationToken,
        primaryBookingId: bookings.primary.id,
        followupBookingId: bookings.followup.id,
        message: 'Registration successful. Check your email for confirmation.',
    });
}));

/**
 * POST /api/book
 * Book a single timeslot (primary or followup)
 */
router.post('/api/book', asyncHandler(async (req, res) => {
    const { participantId, timeslotId, isFollowup } = req.body;

    validateRequired(req.body, ['participantId', 'timeslotId']);

    // Use booking service for validation and creation
    const result = BookingService.createBooking(
        participantId,
        timeslotId,
        isFollowup || false
    );

    Logger.info('Single booking created', {
        participantId,
        timeslotId,
        isFollowup: isFollowup || false,
    });

    res.json({
        success: true,
        booking: result.booking,
        message: 'Booking successful. Check your email for confirmation.',
    });
}));

/**
 * GET /api/config
 * Get public configuration (participant goal, follow-up days, etc.)
 */
router.get('/api/config', (req, res) => {
    res.json({
        participantGoal: config.participantGoal,
        followUpMinDays: config.appointments.followUpMinDays,
        followUpMaxDays: config.appointments.followUpMaxDays,
    });
});

/**
 * GET /api/participants/:id
 * Get participant information by ID
 */
router.get('/api/participants/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const participant = db.getParticipantById(parseInt(id));

    if (!participant) {
        throw new ValidationError('Participant not found');
    }

    // Get participant's bookings
    const bookings = db.getParticipantBookings(participant.id);

    // Add timeslot details to bookings
    const bookingsWithDetails = bookings.map(booking => ({
        ...booking,
        timeslot: db.getTimeslotById(booking.timeslot_id),
    }));

    res.json({
        participant,
        bookings: bookingsWithDetails,
    });
}));

module.exports = router;
