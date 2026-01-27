# AGENTS.md - Appointment Scheduling System

## PROJECT OVERVIEW
**Name**: Terminfindung (Appointment Scheduling)
**Purpose**: Participant management system for VR education master thesis study
**Type**: Node.js Express web application with SQLite database
**Node Version**: >=18.0.0

## SYSTEM ARCHITECTURE

### Core Components
1. **Server Entry**: `server.js` - HTTP server initialization, graceful shutdown, default admin creation
2. **Application**: `src/app.js` - Express app configuration, middleware, route mounting
3. **Database**: `database.js` - SQLite operations with better-sqlite3
4. **Configuration**: `config.js` - Single configuration file, loads .env and provides all config values
5. **Email Service**: `mailer.js` - Nodemailer integration for participant notifications

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express 4.18
- **Database**: better-sqlite3 (SQLite with WAL mode)
- **Session**: express-session with better-sqlite3-session-store
- **Email**: nodemailer
- **Auth**: bcrypt for password hashing
- **Environment**: dotenv

## DATABASE SCHEMA

### Tables
1. **admins**: id, username, password_hash, created_at
2. **participants**: id, name, email, confirmation_token, created_at
3. **timeslots**: id, start_time, end_time, location, appointment_type ('primary'|'followup'|'dual'), capacity, parent_appointment_id, original_type, primary_capacity, followup_capacity, is_featured, created_at
4. **bookings**: id, participant_id, timeslot_id, status ('active'), is_followup (boolean), result_status ('successful'|'issues_arised'|'unusable_data'|'no_show'), created_at, updated_at
5. **activity_logs**: id, ip_address, action_type, action_path, user_type, details, timestamp

### Key Relationships
- bookings.participant_id → participants.id
- bookings.timeslot_id → timeslots.id

## BUSINESS LOGIC

### Appointment Rules (from config.js)
- **Follow-up Constraint**: Must be 29-31 days after primary appointment
  - Configured via `FOLLOWUP_MIN_DAYS` (default: 29) and `FOLLOWUP_MAX_DAYS` (default: 31) environment variables
  - Used in: `src/routes/public.js`, `src/routes/admin.js`, `src/services/bookingService.js`
- **Participant Goal**: 80 participants (configurable via PARTICIPANT_GOAL env var, default: 50)
- **Session Duration**: 24 hours
- **Booking Flow**: Participant must book primary before follow-up

**IMPORTANT**: All configuration is centralized in `config.js` at the project root. It loads environment variables from `.env` file and provides structured access throughout the application. There is only ONE configuration file.

### Appointment Types
- **primary**: Only primary appointments allowed
- **followup**: Only follow-up appointments allowed
- **dual**: Both types allowed (default)

### Capacity System
- Timeslots can have overall capacity OR separate primary_capacity/followup_capacity
- System checks availability via `isTimeslotAvailable()` and `hasCapacity()`

## API ENDPOINTS

### Public Routes (src/routes/public.js)
- `GET /api/timeslots` - Get available timeslots (filters by type, primaryDate for follow-ups)
- `POST /api/register` - Register participant with dual booking (primary + follow-up)
- `POST /api/book` - Book single timeslot (used for individual booking flow)
- `GET /api/config` - Get public configuration (participant goal, follow-up days)
- `GET /api/participant/:token` - Get participant details by confirmation token
- `POST /api/cancel/:token` - Cancel participant bookings via token
- `POST /api/reschedule/:token` - Reschedule participant appointments

### Admin Routes (src/routes/admin.js - all require authentication)
- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/logout` - Destroy admin session
- `GET /api/admin/check` - Check authentication status
- `GET /api/admin/participants` - List all participants with bookings
- `DELETE /api/admin/participants/:id` - Delete participant and bookings
- `GET /api/admin/timeslots` - List all timeslots (supports pagination)
- `POST /api/admin/timeslots` - Create single timeslot
- `POST /api/admin/bulk-timeslots` - Bulk create timeslots by date range/time slots
- `PUT /api/admin/timeslots/:id` - Update timeslot (sends notifications if booked)
- `DELETE /api/admin/timeslots/:id` - Delete timeslot (cancels bookings)
- `POST /api/admin/timeslots/bulk` - Bulk delete timeslots
- `PUT /api/admin/timeslots/bulk-edit` - Bulk edit timeslots (location and/or appointment type)
- `POST /api/admin/timeslots/:id/cancel-bookings` - Cancel all bookings for timeslot
- `POST /api/admin/timeslots/:id/toggle-featured` - Set/unset featured timeslot
- `GET /api/admin/bookings` - List all bookings
- `GET /api/admin/bookings/unreviewed` - Get past appointments without result status
- `POST /api/admin/bookings/:id/result` - Update booking result status after completion
- `GET /api/admin/logs` - Get activity logs (supports pagination)
- `GET /api/admin/stats` - Get study progress statistics
- `POST /api/admin/send-email` - Send custom email to participant

### Static Files
- `public/index.html` - Participant registration interface (3-step: data, primary, follow-up)
- `public/manage.html` - Participant self-service (cancel/reschedule via token)
- `public/admin.html` - Admin dashboard (login required)

## SERVICE LAYER

### BookingService (src/services/bookingService.js)
**Purpose**: Business logic for appointment bookings

**Key Methods**:
- `createBooking(participantId, timeslotId, isFollowup)` - Create booking with validation
- `cancelBooking(bookingId, reason)` - Cancel single booking
- `cancelTimeslotBookings(timeslotId, reason)` - Cancel all bookings for timeslot
- `updateBookingResultStatus(bookingId, resultStatus)` - Mark appointment outcome
- `validateFollowupBooking(participantId, followupTimeslotId)` - Check 29-31 day rule
- `getBookingStatistics()` - Return stats for dashboard

**Validations**:
- Timeslot availability and capacity
- Appointment type compatibility (primary/followup/dual)
- Participant can't double-book same type
- Follow-up requires existing primary + 29-31 day gap
- Result status must be valid enum

### NotificationService (src/services/notificationService.js)
**Purpose**: Email notifications wrapper around mailer.js

**Key Methods**:
- `sendBookingConfirmation(booking, participant, timeslot)` - After booking creation
- `sendBookingCancellation(booking, participant, timeslot, reason)` - After cancellation
- `sendCustomEmail(email, name, subject, message)` - Admin-initiated emails

### ReminderScheduler (src/services/reminderScheduler.js) **NEW**
**Purpose**: Automatic reminder system for upcoming appointments

**Key Methods**:
- `start()` - Start the scheduler (runs automatically on server startup)
- `stop()` - Stop the scheduler (runs automatically on server shutdown)
- `triggerManualCheck()` - Manually trigger a reminder check (admin endpoint)
- `checkAndSendReminders()` - Main process that finds and sends reminders

**Functionality**:
- Runs every hour automatically
- Sends 7-day reminders (6-8 days before appointment)
- Sends 1-day reminders (12 hours - 2 days before appointment)
- Tracks sent reminders in database to avoid duplicates
- Logs all activities for monitoring
- See `REMINDER_SYSTEM.md` for detailed documentation

## EMAIL SYSTEM (mailer.js)

### Email Functions
- `sendRegistrationEmail()` - Dual booking confirmation with iCal
- `sendDualRegistrationEmail()` - Combined primary + follow-up iCal
- `sendRescheduleEmail()` - Appointment change notification
- `sendCancellationEmail()` - Booking cancellation
- `sendAdminNotification()` - Notify admin of participant actions
- `sendTimeslotUpdateEmail()` - Timeslot changed (to affected participants)
- `sendTimeslotDeletionEmail()` - Timeslot deleted (to affected participants)
- `sendCustomEmail()` - Custom message from admin
- `sendReminderEmail()` - **NEW** Automatic reminder emails (7 days & 1 day before appointment)

### Email Configuration (env vars)
- `MAIL_ENABLED` - Enable/disable email sending
- `MAIL_HOST` - SMTP server
- `MAIL_PORT` - SMTP port
- `MAIL_SECURE` - Use TLS
- `MAIL_USER` - SMTP username
- `MAIL_PASS` - SMTP password
- `MAIL_FROM` - Sender address
- `ADMIN_EMAIL` - Admin notification recipient

### iCal Integration
- Generates RFC 5545 compliant iCalendar events
- Includes VEVENT with ORGANIZER, LOCATION, SUMMARY, DESCRIPTION
- Attached as .ics file for calendar import
- Dual bookings create combined multi-event iCal

## MIDDLEWARE

### Logging (src/middleware/logging.js)
- **Logger**: Winston-style structured logging
- **requestLogger**: Logs all HTTP requests
- **performanceLogger**: Request duration tracking (dev mode)
- **errorLogger**: Captures uncaught errors

### Error Handling (src/middleware/errorHandler.js)
- **Custom Errors**: ValidationError, NotFoundError, ConflictError, UnauthorizedError
- **errorHandler**: Global Express error handler with appropriate HTTP status codes
- **notFoundHandler**: 404 for undefined routes

### Authentication
- **requireAdmin**: Checks `req.session.adminId` exists
- Sessions stored in SQLite via better-sqlite3-session-store

## ENVIRONMENT CONFIGURATION (config.js)

### Required Variables
- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session encryption key (required in production)
- `BASE_PATH` - Optional URL prefix for reverse proxy (e.g., '/appointments')

### Optional Variables
- `NODE_ENV` - development|production
- `ADMIN_PASSWORD` - Initial admin password (default: 'admin123')
- `DATABASE_PATH` - SQLite file location (default: ./data/appointments.db)
- `PARTICIPANT_GOAL` - Study target (default: 50)
- `FOLLOWUP_MIN_DAYS` - Minimum days between primary and follow-up (default: 29)
- `FOLLOWUP_MAX_DAYS` - Maximum days between primary and follow-up (default: 31)
- `LOG_PERFORMANCE` - Enable perf logging
- Email configuration (see Email System section)

### Configuration Architecture
1. **`.env` file** - Defines environment-specific values (git-ignored)
2. **`config.js`** - Loads .env, provides defaults, exports structured config object
3. All application code requires `config.js` for configuration values

## DATA FLOW

### Participant Registration Flow
1. User visits `index.html`
2. Enters name/email (Step 1)
3. Selects primary timeslot (Step 2)
4. System filters follow-up slots 29-31 days later
5. Selects follow-up timeslot (Step 3)
6. POST `/api/register` creates participant + 2 bookings
7. Email sent with confirmation token and iCal attachments
8. Admin receives notification

### Admin Timeslot Management Flow
1. Admin logs in via `admin.html`
2. Creates timeslots (single or bulk)
3. System checks capacity on each booking attempt
4. If timeslot updated/deleted → affected participants notified via email
5. Activity logged to `activity_logs` table

### Booking Result Tracking Flow
1. Appointment time passes
2. Admin views "Unreviewed" tab
3. Marks result: successful|issues_arised|unusable_data|no_show
4. Updates `bookings.result_status`
5. Statistics updated on dashboard

## KEY FEATURES

### Featured Timeslot
- Only one timeslot can be featured (is_featured = 1)
- Highlighted on participant booking page
- Toggle via `POST /api/admin/timeslots/:id/toggle-featured`

### Activity Logging
- All significant actions logged: bookings, cancellations, admin actions
- Includes IP address, action type, details JSON
- Viewable in admin panel with pagination

### Study Progress Dashboard
- Tracks total/successful/problem participants
- Shows upcoming/past appointment counts
- Calculates progress toward participant goal
- Result status breakdown

### Participant Self-Service
- Unique token in confirmation email
- Access via `manage.html?token=...`
- Can view appointments, cancel, or reschedule
- All changes trigger email notifications

## DATABASE OPERATIONS

### Key Functions (database.js)
- `initialize()` - Create tables and run migrations
- `createParticipant(name, email)` - Returns participant with unique token
- `createTimeslot(...)` - Create with appointment_type and capacity
- `createBooking(participantId, timeslotId, isFollowup)` - Create booking record
- `isTimeslotAvailable(timeslotId)` - Check if future and not full
- `hasCapacity(timeslotId)` - Check booking count vs capacity
- `getParticipantBookings(participantId)` - Get all active bookings
- `getBookingsByTimeslot(timeslotId)` - Get all bookings for slot
- `updateBookingResultStatus(bookingId, status)` - Mark appointment result
- `setFeaturedTimeslot(timeslotId)` - Set featured (unsets others)
- `logActivity(ip, actionType, path, userType, details)` - Audit trail

## DEVELOPMENT NOTES

### Starting the Server
```bash
npm start              # Production
npm run dev           # Development mode
npm run check         # Verify setup
```

### Default Admin Credentials
- Username: `admin`
- Password: `admin123` (or ADMIN_PASSWORD env var)
- Created automatically on first startup if not exists

### Database Location
- Default: `./data/appointments.db`
- WAL mode enabled for concurrent reads
- Migrations run automatically in `initialize()`

### Graceful Shutdown
- Listens for SIGTERM/SIGINT
- Closes HTTP server
- Closes database connection
- 10-second timeout before forced shutdown

## COMMON TASKS

### Adding New Timeslots
1. Admin → Timeslots tab → "Add Timeslot"
2. For bulk: Use date range picker with time slots
3. Set appointment_type: dual|primary|followup
4. Set capacity or separate primary_capacity/followup_capacity

### Bulk Editing Timeslots
1. Admin → Timeslots tab → Select multiple timeslots using checkboxes
2. Click "X bearbeiten" button
3. Update location and/or appointment type
4. System validates compatibility with existing bookings
5. Participants are notified via email if location changes

### Viewing Unreviewed Appointments
1. Admin → Bookings tab → "Unreviewed"
2. Shows past appointments without result_status
3. Click to set: successful, issues, unusable, no-show

### Sending Custom Emails
1. Admin → Participants tab → Click participant email
2. Compose subject and message
3. System logs action and sends email

### Checking Study Progress
1. Admin → Statistics tab
2. View progress bar toward participant goal
3. See booking/result breakdowns

## TROUBLESHOOTING

### Email Not Sending
- Check MAIL_ENABLED=true
- Verify SMTP credentials in .env
- Check logs for nodemailer errors
- Email failures don't block booking operations

### Session Issues
- Ensure SESSION_SECRET is set and consistent
- Sessions stored in SQLite (sessions table)
- Check cookie settings (httpOnly, secure in production)

### Capacity Problems
- Verify capacity vs booked_count in timeslots query
- Check appointment_type compatibility
- Dual slots count both types toward capacity

### Follow-up Date Validation
- Must be exactly 29-31 days after primary (configurable)
- Check FOLLOWUP_MIN_DAYS/MAX_DAYS environment variables (defaults in config.js)
- Frontend filters follow-up slots automatically based on server response

## SECURITY CONSIDERATIONS

- Admin passwords hashed with bcrypt (10 rounds)
- Session secret must be strong in production
- Cookie httpOnly flag prevents XSS
- Cookie secure flag in production (HTTPS)
- SQL injection prevented by prepared statements
- Input validation via validateRequired() helper
- Activity logging for audit trail
- No sensitive data in logs

## FILE STRUCTURE
```
appointment-scheduling/
├── server.js                    # Entry point
├── database.js                  # SQLite operations
├── config.js                    # Single configuration file (loads .env)
├── mailer.js                    # Email functions
├── package.json                 # Dependencies
├── .env                         # Environment variables (git-ignored)
├── data/                        # SQLite database
│   └── appointments.db
├── src/
│   ├── app.js                   # Express app
│   ├── config/
│   │   └── session.js          # Session middleware
│   ├── middleware/
│   │   ├── logging.js          # Request/error logging
│   │   └── errorHandler.js     # Error classes & handler
│   ├── routes/
│   │   ├── public.js           # Participant endpoints
│   │   └── admin.js            # Admin endpoints
│   └── services/
│       ├── bookingService.js   # Booking business logic
│       └── notificationService.js # Email wrapper
└── public/                      # Static files
    ├── index.html              # Registration UI
    ├── manage.html             # Self-service UI
    ├── admin.html              # Admin dashboard
    ├── css/                    # Stylesheets
    └── js/                     # Client-side scripts
```

## NEXT STEPS FOR AGENTS

When continuing work on this project:
1. Check environment variables are configured (.env file)
2. Verify database initialized (data/appointments.db exists)
3. Review recent activity logs for context
4. Check booking statistics for study progress
5. Test email functionality if MAIL_ENABLED=true
6. Review unreviewed appointments if working on results tracking
7. Check featured timeslot if modifying booking UI
8. Consider backward compatibility when modifying database schema
9. **Configuration changes**: All config is in `config.js` - add new env vars there with defaults