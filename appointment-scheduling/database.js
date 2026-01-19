const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const DB_PATH =
   process.env.DB_PATH || path.join(__dirname, "data", "appointments.db");
let db;

// Initialize database and create tables
function initialize() {
   // Create data directory if it doesn't exist
   const fs = require("fs");
   const dataDir = path.dirname(DB_PATH);
   if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
   }

   db = new Database(DB_PATH);
   db.pragma("journal_mode = WAL");

   // Create base tables first
   db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      confirmation_token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS timeslots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      timeslot_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      FOREIGN KEY (timeslot_id) REFERENCES timeslots(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT,
      action_type TEXT NOT NULL,
      action_path TEXT,
      user_type TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

   // Migration: Add new columns to existing databases
   const columnsToAdd = [
      {
         table: "timeslots",
         column: "appointment_type",
         definition: "TEXT DEFAULT 'primary'",
      },
      { table: "timeslots", column: "capacity", definition: "INTEGER" },
      {
         table: "timeslots",
         column: "parent_appointment_id",
         definition: "INTEGER",
      },
      {
         table: "timeslots",
         column: "original_type",
         definition: "TEXT",
      },
      {
         table: "bookings",
         column: "is_followup",
         definition: "INTEGER DEFAULT 0",
      },
      { table: "bookings", column: "parent_booking_id", definition: "INTEGER" },
      {
         table: "bookings",
         column: "appointment_type",
         definition: "TEXT",
      },
      {
         table: "bookings",
         column: "result_status",
         definition: "TEXT",
      },
   ];

   for (const { table, column, definition } of columnsToAdd) {
      try {
         db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
         console.log(`Added column ${column} to ${table}`);
      } catch (e) {
         // Column already exists, skip
      }
   }

   // Backfill original_type for existing timeslots that don't have it
   try {
      db.exec(`
         UPDATE timeslots
         SET original_type = appointment_type
         WHERE original_type IS NULL;
      `);
      console.log("Backfilled original_type for existing timeslots");
   } catch (e) {
      // Already backfilled or error, skip
   }

   // Backfill appointment_type in bookings from timeslots
   try {
      db.exec(`
         UPDATE bookings
         SET appointment_type = (
            SELECT t.appointment_type
            FROM timeslots t
            WHERE t.id = bookings.timeslot_id
         )
         WHERE appointment_type IS NULL
           AND timeslot_id IN (SELECT id FROM timeslots);
      `);
      console.log("Backfilled appointment_type for existing bookings");
   } catch (e) {
      // Already backfilled or error, skip
      console.log("Backfill appointment_type skipped or error:", e.message);
   }

   // Create indexes after all columns exist
   db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookings_participant ON bookings(participant_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_timeslot ON bookings(timeslot_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_followup ON bookings(is_followup);
    CREATE INDEX IF NOT EXISTS idx_bookings_parent ON bookings(parent_booking_id);
    CREATE INDEX IF NOT EXISTS idx_timeslots_type ON timeslots(appointment_type);
    CREATE INDEX IF NOT EXISTS idx_timeslots_parent ON timeslots(parent_appointment_id);
    CREATE INDEX IF NOT EXISTS idx_participants_token ON participants(confirmation_token);
  `);

   console.log("Database initialized successfully");
}

// ===== ADMIN FUNCTIONS =====

function createAdmin(username, passwordHash) {
   const stmt = db.prepare(
      "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
   );
   const result = stmt.run(username, passwordHash);
   return { id: result.lastInsertRowid, username };
}

function getAdminByUsername(username) {
   const stmt = db.prepare("SELECT * FROM admins WHERE username = ?");
   return stmt.get(username);
}

// ===== PARTICIPANT FUNCTIONS =====

function createParticipant(name, email) {
   const token = crypto.randomBytes(32).toString("hex");
   const stmt = db.prepare(
      "INSERT INTO participants (name, email, confirmation_token) VALUES (?, ?, ?)",
   );
   const result = stmt.run(name, email, token);
   return {
      id: result.lastInsertRowid,
      name,
      email,
      confirmationToken: token,
   };
}

function getParticipantById(id) {
   const stmt = db.prepare("SELECT * FROM participants WHERE id = ?");
   return stmt.get(id);
}

function getAllParticipants() {
   const stmt = db.prepare(`
    SELECT
      p.*,
      b.id as booking_id,
      b.status as booking_status,
      t.start_time,
      t.end_time,
      t.location
    FROM participants p
    LEFT JOIN bookings b ON p.id = b.participant_id AND b.status = 'active'
    LEFT JOIN timeslots t ON b.timeslot_id = t.id
    ORDER BY p.created_at DESC
  `);
   return stmt.all();
}

function deleteParticipant(id) {
   const transaction = db.transaction(() => {
      // First delete all bookings for this participant
      const deleteBookingsStmt = db.prepare(
         "DELETE FROM bookings WHERE participant_id = ?",
      );
      deleteBookingsStmt.run(id);

      // Then delete the participant
      const deleteParticipantStmt = db.prepare(
         "DELETE FROM participants WHERE id = ?",
      );
      const result = deleteParticipantStmt.run(id);

      return { changes: result.changes };
   });

   return transaction();
}

// ===== TIMESLOT FUNCTIONS =====

function createTimeslot(
   startTime,
   endTime,
   location = "",
   appointmentType = "dual",
   capacity = null,
   parentAppointmentId = null,
) {
   const stmt = db.prepare(
      "INSERT INTO timeslots (start_time, end_time, location, appointment_type, original_type, capacity, parent_appointment_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
   );
   const result = stmt.run(
      startTime,
      endTime,
      location,
      appointmentType,
      appointmentType, // original_type is same as appointment_type at creation
      capacity,
      parentAppointmentId,
   );
   return {
      id: result.lastInsertRowid,
      start_time: startTime,
      end_time: endTime,
      location,
      appointment_type: appointmentType,
      original_type: appointmentType,
      capacity,
      parent_appointment_id: parentAppointmentId,
   };
}

function getTimeslotById(id) {
   const stmt = db.prepare("SELECT * FROM timeslots WHERE id = ?");
   return stmt.get(id);
}

function getAvailableTimeslots(appointmentType = null) {
   let query = `
    SELECT
      t.*,
      (SELECT COUNT(*) FROM bookings WHERE timeslot_id = t.id AND status = 'active') as booked_count
    FROM timeslots t
    WHERE datetime(start_time) > datetime('now')
  `;

   const params = [];

   if (appointmentType) {
      // Include dual type timeslots when filtering by primary or followup
      query += ` AND (appointment_type = ? OR appointment_type = 'dual')`;
      params.push(appointmentType);
   }

   query += ` ORDER BY start_time ASC`;

   const stmt = db.prepare(query);
   const slots = stmt.all(...params);

   // Filter by capacity
   return slots.filter((slot) => {
      if (slot.capacity === null) return true; // Unlimited capacity
      return slot.booked_count < slot.capacity;
   });
}

function getAllTimeslots(limit = null, offset = 0) {
   let query = `
    SELECT
      t.*,
      b.id as booking_id,
      p.name as participant_name,
      p.email as participant_email
    FROM timeslots t
    LEFT JOIN bookings b ON t.id = b.timeslot_id AND b.status = 'active'
    LEFT JOIN participants p ON b.participant_id = p.id
    ORDER BY t.start_time ASC
  `;

   if (limit !== null) {
      query += ` LIMIT ? OFFSET ?`;
      const stmt = db.prepare(query);
      return stmt.all(limit, offset);
   } else {
      const stmt = db.prepare(query);
      return stmt.all();
   }
}

function getTimeslotsCount() {
   const stmt = db.prepare("SELECT COUNT(*) as count FROM timeslots");
   return stmt.get().count;
}

function updateTimeslot(id, updates) {
   const fields = [];
   const values = [];

   if (updates.startTime !== undefined) {
      fields.push("start_time = ?");
      values.push(updates.startTime);
   }
   if (updates.endTime !== undefined) {
      fields.push("end_time = ?");
      values.push(updates.endTime);
   }
   if (updates.location !== undefined) {
      fields.push("location = ?");
      values.push(updates.location);
   }
   if (updates.appointmentType !== undefined) {
      fields.push("appointment_type = ?");
      values.push(updates.appointmentType);
   }
   if (updates.capacity !== undefined) {
      fields.push("capacity = ?");
      values.push(updates.capacity);
   }

   if (fields.length === 0) return;

   values.push(id);
   const stmt = db.prepare(
      `UPDATE timeslots SET ${fields.join(", ")} WHERE id = ?`,
   );
   stmt.run(...values);
}

function deleteTimeslot(id) {
   const stmt = db.prepare("DELETE FROM timeslots WHERE id = ?");
   stmt.run(id);
}

// Delete all bookings for a timeslot (including linked bookings)
// This is needed before deleting a timeslot to avoid FK constraint errors
function deleteBookingsForTimeslotWithLinked(timeslotId) {
   const transaction = db.transaction(() => {
      // Get all bookings for this timeslot (active OR cancelled)
      const bookings = db
         .prepare(
            "SELECT id, is_followup, parent_booking_id FROM bookings WHERE timeslot_id = ?",
         )
         .all(timeslotId);

      if (bookings.length === 0) {
         return { deletedCount: 0 };
      }

      const bookingIdsToDelete = new Set();

      // For each booking, find its linked booking
      for (const booking of bookings) {
         bookingIdsToDelete.add(booking.id);

         if (booking.is_followup === 1 && booking.parent_booking_id) {
            // This is a follow-up, delete the primary too
            bookingIdsToDelete.add(booking.parent_booking_id);
         } else if (booking.is_followup === 0) {
            // This is a primary, find and delete the follow-up
            const followup = db
               .prepare("SELECT id FROM bookings WHERE parent_booking_id = ?")
               .get(booking.id);
            if (followup) {
               bookingIdsToDelete.add(followup.id);
            }
         }
      }

      // Delete all bookings (both original and linked)
      const bookingIdsList = Array.from(bookingIdsToDelete);
      if (bookingIdsList.length > 0) {
         const placeholders = bookingIdsList.map(() => "?").join(",");
         const deleteStmt = db.prepare(
            `DELETE FROM bookings WHERE id IN (${placeholders})`,
         );
         deleteStmt.run(...bookingIdsList);
      }

      return {
         deletedCount: bookingIdsList.length,
      };
   });

   return transaction();
}

// Bulk delete timeslots
function bulkDeleteTimeslots(ids) {
   const transaction = db.transaction(() => {
      const results = {
         deleted: 0,
         failed: 0,
         errors: [],
      };

      for (const id of ids) {
         try {
            // First delete all bookings (including linked ones)
            deleteBookingsForTimeslotWithLinked(id);

            // Then delete the timeslot
            const stmt = db.prepare("DELETE FROM timeslots WHERE id = ?");
            const result = stmt.run(id);

            if (result.changes > 0) {
               results.deleted++;
            } else {
               results.failed++;
               results.errors.push({ id, error: "Timeslot not found" });
            }
         } catch (error) {
            results.failed++;
            results.errors.push({ id, error: error.message });
         }
      }

      return results;
   });

   return transaction();
}

// Get affected participants before deleting a timeslot (for notifications)
function getAffectedParticipantsByTimeslot(timeslotId) {
   const stmt = db.prepare(
      "SELECT DISTINCT " +
         "p.id, p.name, p.email, p.confirmation_token, " +
         "b.id as booking_id, b.is_followup, b.parent_booking_id, " +
         "t.start_time, t.end_time, t.location " +
         "FROM bookings b " +
         "JOIN participants p ON b.participant_id = p.id " +
         "JOIN timeslots t ON b.timeslot_id = t.id " +
         "WHERE b.timeslot_id = ? AND b.status = 'active'",
   );
   return stmt.all(timeslotId);
}

// Cancel all bookings for a timeslot (used when admin cancels bookings)
function cancelBookingsForTimeslot(timeslotId) {
   const stmt = db.prepare(
      "UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE timeslot_id = ? AND status = 'active'",
   );
   stmt.run(timeslotId);
}

// Cancel all bookings for a timeslot AND their linked appointments (primary <-> followup)
function cancelBookingsForTimeslotWithLinked(timeslotId) {
   const transaction = db.transaction(() => {
      // Get all active bookings for this timeslot
      const bookings = db
         .prepare(
            "SELECT id, is_followup, parent_booking_id, participant_id FROM bookings WHERE timeslot_id = ? AND status = 'active'",
         )
         .all(timeslotId);

      if (bookings.length === 0) {
         return { cancelledCount: 0, affectedParticipants: [] };
      }

      const bookingIdsToCancel = new Set();
      const participantIds = new Set();

      // For each booking, find its linked booking
      for (const booking of bookings) {
         bookingIdsToCancel.add(booking.id);
         participantIds.add(booking.participant_id);

         if (booking.is_followup === 1 && booking.parent_booking_id) {
            // This is a follow-up, cancel the primary too
            bookingIdsToCancel.add(booking.parent_booking_id);
         } else if (booking.is_followup === 0) {
            // This is a primary, find and cancel the follow-up
            const followup = db
               .prepare(
                  "SELECT id FROM bookings WHERE parent_booking_id = ? AND status = 'active'",
               )
               .get(booking.id);
            if (followup) {
               bookingIdsToCancel.add(followup.id);
            }
         }
      }

      // Cancel all bookings (both original and linked)
      const bookingIdsList = Array.from(bookingIdsToCancel);
      if (bookingIdsList.length > 0) {
         const placeholders = bookingIdsList.map(() => "?").join(",");
         const cancelStmt = db.prepare(
            `UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
         );
         cancelStmt.run(...bookingIdsList);
      }

      return {
         cancelledCount: bookingIdsList.length,
         affectedParticipants: Array.from(participantIds),
      };
   });

   return transaction();
}

// Get detailed information about all bookings that will be affected (including linked appointments)
function getAffectedParticipantsWithLinkedBookings(timeslotId) {
   // Get all active bookings for this timeslot
   const bookings = db
      .prepare(
         `SELECT
         b.id as booking_id,
         b.participant_id,
         b.timeslot_id,
         b.is_followup,
         b.parent_booking_id,
         p.name as participant_name,
         p.email as participant_email,
         p.confirmation_token,
         t.start_time,
         t.end_time,
         t.location
       FROM bookings b
       JOIN participants p ON b.participant_id = p.id
       JOIN timeslots t ON b.timeslot_id = t.id
       WHERE b.timeslot_id = ? AND b.status = 'active'`,
      )
      .all(timeslotId);

   if (bookings.length === 0) {
      return [];
   }

   const participantMap = new Map();

   // Process each booking and find its linked booking
   for (const booking of bookings) {
      const participantId = booking.participant_id;

      if (!participantMap.has(participantId)) {
         participantMap.set(participantId, {
            id: participantId,
            name: booking.participant_name,
            email: booking.participant_email,
            confirmation_token: booking.confirmation_token,
            primary: null,
            followup: null,
         });
      }

      const participant = participantMap.get(participantId);

      // Store this booking info
      const bookingInfo = {
         booking_id: booking.booking_id,
         timeslot_id: booking.timeslot_id,
         start_time: booking.start_time,
         end_time: booking.end_time,
         location: booking.location,
         is_followup: booking.is_followup,
      };

      if (booking.is_followup === 0) {
         participant.primary = bookingInfo;
      } else {
         participant.followup = bookingInfo;
      }

      // Find the linked booking
      if (booking.is_followup === 1 && booking.parent_booking_id) {
         // This is a follow-up, get the primary
         const primary = db
            .prepare(
               `SELECT
               b.id as booking_id,
               b.timeslot_id,
               t.start_time,
               t.end_time,
               t.location
             FROM bookings b
             JOIN timeslots t ON b.timeslot_id = t.id
             WHERE b.id = ?`,
            )
            .get(booking.parent_booking_id);

         if (primary && !participant.primary) {
            participant.primary = {
               booking_id: primary.booking_id,
               timeslot_id: primary.timeslot_id,
               start_time: primary.start_time,
               end_time: primary.end_time,
               location: primary.location,
               is_followup: 0,
            };
         }
      } else if (booking.is_followup === 0) {
         // This is a primary, get the follow-up
         const followup = db
            .prepare(
               `SELECT
               b.id as booking_id,
               b.timeslot_id,
               t.start_time,
               t.end_time,
               t.location
             FROM bookings b
             JOIN timeslots t ON b.timeslot_id = t.id
             WHERE b.parent_booking_id = ? AND b.status = 'active'`,
            )
            .get(booking.booking_id);

         if (followup && !participant.followup) {
            participant.followup = {
               booking_id: followup.booking_id,
               timeslot_id: followup.timeslot_id,
               start_time: followup.start_time,
               end_time: followup.end_time,
               location: followup.location,
               is_followup: 1,
            };
         }
      }
   }

   return Array.from(participantMap.values());
}

// Get timeslots within a date range (for follow-up selection)
function getTimeslotsInRange(startDate, endDate, appointmentType = "followup") {
   const stmt = db.prepare(`
    SELECT
      t.*,
      (SELECT COUNT(*) FROM bookings WHERE timeslot_id = t.id AND status = 'active') as booked_count
    FROM timeslots t
    WHERE datetime(start_time) >= datetime(?)
    AND datetime(start_time) <= datetime(?)
    AND (appointment_type = ? OR appointment_type = 'dual')
    ORDER BY start_time ASC
  `);

   const slots = stmt.all(startDate, endDate, appointmentType);

   // Filter by capacity
   return slots.filter((slot) => {
      if (slot.capacity === null) return true; // Unlimited capacity
      return slot.booked_count < slot.capacity;
   });
}

// Bulk create timeslots (for series generation)
function bulkCreateTimeslots(
   startDate,
   endDate,
   duration,
   breakTime,
   location = "",
   appointmentType = "dual",
   capacity = null,
   weekdays = [1, 2, 3, 4, 5], // Default to Monday-Friday
   workingHours = [{ start: "09:00", end: "17:00" }], // Default 9-5
) {
   const slots = [];
   const start = new Date(startDate + "T00:00:00");
   const end = new Date(endDate + "T23:59:59");

   // Iterate through each day in the date range
   let currentDate = new Date(start);

   while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();

      // Check if this day is in the selected weekdays
      if (weekdays.includes(dayOfWeek)) {
         // For each working hours range on this day
         for (const hours of workingHours) {
            // Parse working hours
            const [startHour, startMinute] = hours.start.split(":").map(Number);
            const [endHour, endMinute] = hours.end.split(":").map(Number);

            // Create datetime for this working period
            let currentTime = new Date(currentDate);
            currentTime.setHours(startHour, startMinute, 0, 0);

            const workingEnd = new Date(currentDate);
            workingEnd.setHours(endHour, endMinute, 0, 0);

            // Generate slots within this working period
            while (currentTime < workingEnd) {
               const slotEnd = new Date(
                  currentTime.getTime() + duration * 60000,
               );

               if (slotEnd <= workingEnd) {
                  const slot = createTimeslot(
                     currentTime.toISOString(),
                     slotEnd.toISOString(),
                     location,
                     appointmentType,
                     capacity,
                  );
                  slots.push(slot);
               }

               // Move to next slot (duration + break)
               currentTime = new Date(slotEnd.getTime() + breakTime * 60000);
            }
         }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
   }

   return slots;
}

// Check if timeslot has capacity
function hasCapacity(timeslotId) {
   const stmt = db.prepare(`
    SELECT
      t.capacity,
      (SELECT COUNT(*) FROM bookings WHERE timeslot_id = t.id AND status = 'active') as booked_count
    FROM timeslots t
    WHERE t.id = ?
  `);

   const result = stmt.get(timeslotId);
   if (!result) return false;

   // Null capacity means unlimited
   if (result.capacity === null) return true;

   return result.booked_count < result.capacity;
}

// ===== BOOKING FUNCTIONS =====

function createBooking(
   participantId,
   timeslotId,
   isFollowup = false,
   parentBookingId = null,
) {
   // Check capacity before booking
   if (!hasCapacity(timeslotId)) {
      throw new Error("Timeslot is at full capacity");
   }

   // Get appointment_type from timeslot
   const timeslotStmt = db.prepare(
      "SELECT appointment_type FROM timeslots WHERE id = ?",
   );
   const timeslot = timeslotStmt.get(timeslotId);
   const appointmentType = timeslot ? timeslot.appointment_type : null;

   const stmt = db.prepare(
      "INSERT INTO bookings (participant_id, timeslot_id, is_followup, parent_booking_id, appointment_type) VALUES (?, ?, ?, ?, ?)",
   );
   const result = stmt.run(
      participantId,
      timeslotId,
      isFollowup ? 1 : 0,
      parentBookingId,
      appointmentType,
   );

   return {
      id: result.lastInsertRowid,
      participant_id: participantId,
      timeslot_id: timeslotId,
      is_followup: isFollowup,
      parent_booking_id: parentBookingId,
      appointment_type: appointmentType,
   };
}

// Update timeslot type when booked (e.g., dual -> primary/followup)
function setTimeslotType(timeslotId, newType) {
   const stmt = db.prepare(
      "UPDATE timeslots SET appointment_type = ? WHERE id = ?",
   );
   stmt.run(newType, timeslotId);
}

// Revert timeslot to its original type
function revertTimeslotToOriginalType(timeslotId) {
   const stmt = db.prepare(
      "UPDATE timeslots SET appointment_type = original_type WHERE id = ?",
   );
   stmt.run(timeslotId);
}

// Create dual booking (primary + followup)
function createDualBooking(
   participantId,
   primaryTimeslotId,
   followupTimeslotId,
) {
   const transaction = db.transaction(() => {
      // Get timeslot info to check if they're dual type
      const primarySlot = getTimeslotById(primaryTimeslotId);
      const followupSlot = getTimeslotById(followupTimeslotId);

      // Check both slots have capacity
      if (!hasCapacity(primaryTimeslotId)) {
         throw new Error("Primary timeslot is at full capacity");
      }
      if (!hasCapacity(followupTimeslotId)) {
         throw new Error("Follow-up timeslot is at full capacity");
      }

      // If slots are dual type, convert them to their specific types
      if (
         primarySlot.original_type === "dual" ||
         primarySlot.appointment_type === "dual"
      ) {
         setTimeslotType(primaryTimeslotId, "primary");
      }
      if (
         followupSlot.original_type === "dual" ||
         followupSlot.appointment_type === "dual"
      ) {
         setTimeslotType(followupTimeslotId, "followup");
      }

      // Create primary booking
      const primaryBooking = createBooking(
         participantId,
         primaryTimeslotId,
         false,
         null,
      );

      // Create follow-up booking linked to primary
      const followupBooking = createBooking(
         participantId,
         followupTimeslotId,
         true,
         primaryBooking.id,
      );

      return {
         primary: primaryBooking,
         followup: followupBooking,
      };
   });

   return transaction();
}

function getBookingById(id) {
   const stmt = db.prepare(`
    SELECT
      b.*,
      p.name,
      p.email,
      p.confirmation_token,
      t.start_time,
      t.end_time,
      t.location
    FROM bookings b
    JOIN participants p ON b.participant_id = p.id
    JOIN timeslots t ON b.timeslot_id = t.id
    WHERE b.id = ?
  `);
   return stmt.get(id);
}

function getBookingByToken(token) {
   const stmt = db.prepare(`
    SELECT
      b.*,
      p.name,
      p.email,
      p.confirmation_token,
      t.start_time,
      t.end_time,
      t.location,
      t.appointment_type
    FROM bookings b
    JOIN participants p ON b.participant_id = p.id
    JOIN timeslots t ON b.timeslot_id = t.id
    WHERE p.confirmation_token = ? AND b.status = 'active'
  `);
   return stmt.get(token);
}

// Get all bookings for a participant by token (primary + followup)
function getAllBookingsByToken(token) {
   const stmt = db.prepare(`
    SELECT
      b.id as booking_id,
      b.participant_id,
      b.timeslot_id,
      b.status,
      b.is_followup,
      b.parent_booking_id,
      b.created_at,
      b.updated_at,
      p.name as participant_name,
      p.email as participant_email,
      p.confirmation_token,
      t.start_time as timeslot_start,
      t.end_time as timeslot_end,
      t.location as timeslot_location,
      t.appointment_type
    FROM bookings b
    JOIN participants p ON b.participant_id = p.id
    JOIN timeslots t ON b.timeslot_id = t.id
    WHERE p.confirmation_token = ? AND b.status = 'active'
    ORDER BY b.is_followup ASC, t.start_time ASC
  `);
   return stmt.all(token);
}

function getAllBookings() {
   const stmt = db.prepare(`
    SELECT
      b.*,
      p.name,
      p.email,
      t.start_time,
      t.end_time,
      t.location
    FROM bookings b
    JOIN participants p ON b.participant_id = p.id
    JOIN timeslots t ON b.timeslot_id = t.id
    ORDER BY t.start_time ASC
  `);
   return stmt.all();
}

function updateBookingResultStatus(bookingId, resultStatus) {
   // Validate result status
   const validStatuses = [
      "successful",
      "issues_arised",
      "unusable_data",
      "no_show",
   ];
   if (resultStatus && !validStatuses.includes(resultStatus)) {
      throw new Error(`Invalid result status: ${resultStatus}`);
   }

   const stmt = db.prepare(
      "UPDATE bookings SET result_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
   );
   const result = stmt.run(resultStatus, bookingId);

   if (result.changes === 0) {
      throw new Error("Booking not found");
   }

   return getBookingById(bookingId);
}

function getPastUnreviewedBookings() {
   const stmt = db.prepare(`
    SELECT
      b.*,
      p.name,
      p.email,
      t.start_time,
      t.end_time,
      t.location,
      COALESCE(b.appointment_type, t.appointment_type) as appointment_type
    FROM bookings b
    JOIN participants p ON b.participant_id = p.id
    JOIN timeslots t ON b.timeslot_id = t.id
    WHERE datetime(t.start_time) < datetime('now')
      AND (b.result_status IS NULL OR b.result_status = '')
      AND b.status != 'cancelled'
    ORDER BY t.start_time DESC
  `);
   return stmt.all();
}

function rescheduleBooking(bookingId, newTimeslotId) {
   // Check new timeslot has capacity
   if (!hasCapacity(newTimeslotId)) {
      throw new Error("New timeslot is at full capacity");
   }

   const transaction = db.transaction(() => {
      // Get current booking
      const booking = getBookingById(bookingId);
      if (!booking) {
         throw new Error("Booking not found");
      }

      // Update booking
      const stmt = db.prepare(
         "UPDATE bookings SET timeslot_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      );
      stmt.run(newTimeslotId, bookingId);
   });

   transaction();
}

function cancelBooking(bookingId) {
   const transaction = db.transaction(() => {
      // Get current booking
      const booking = getBookingById(bookingId);
      if (!booking) {
         throw new Error("Booking not found");
      }

      // Get the timeslot info to check if it should revert to dual
      const timeslot = getTimeslotById(booking.timeslot_id);

      // Update booking status
      const stmt = db.prepare(
         "UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      );
      stmt.run(bookingId);

      // If timeslot was originally dual type, revert it back
      if (timeslot && timeslot.original_type === "dual") {
         // Check if there are any other active bookings for this timeslot
         const activeBookings = db
            .prepare(
               "SELECT COUNT(*) as count FROM bookings WHERE timeslot_id = ? AND status = 'active'",
            )
            .get(booking.timeslot_id);

         if (activeBookings.count === 0) {
            revertTimeslotToOriginalType(booking.timeslot_id);
         }
      }

      // If this is a primary booking, also cancel the follow-up
      if (!booking.is_followup) {
         const followupBooking = db
            .prepare("SELECT * FROM bookings WHERE parent_booking_id = ?")
            .get(bookingId);

         if (followupBooking) {
            const followupStmt = db.prepare(
               "UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE parent_booking_id = ?",
            );
            followupStmt.run(bookingId);

            // Also revert followup timeslot if it was dual
            const followupTimeslot = getTimeslotById(
               followupBooking.timeslot_id,
            );
            if (followupTimeslot && followupTimeslot.original_type === "dual") {
               const followupActiveBookings = db
                  .prepare(
                     "SELECT COUNT(*) as count FROM bookings WHERE timeslot_id = ? AND status = 'active'",
                  )
                  .get(followupBooking.timeslot_id);

               if (followupActiveBookings.count === 0) {
                  revertTimeslotToOriginalType(followupBooking.timeslot_id);
               }
            }
         }
      }
   });

   transaction();
}

// Cancel all bookings for a participant by token
function cancelAllBookingsByToken(token) {
   const participant = db
      .prepare("SELECT id FROM participants WHERE confirmation_token = ?")
      .get(token);
   if (!participant) {
      throw new Error("Participant not found");
   }

   const stmt = db.prepare(
      "UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE participant_id = ? AND status = 'active'",
   );
   stmt.run(participant.id);
}

// ===== LOGGING FUNCTIONS =====

function logAction(ipAddress, actionType, actionPath, userType, details = "") {
   const stmt = db.prepare(
      "INSERT INTO activity_logs (ip_address, action_type, action_path, user_type, details) VALUES (?, ?, ?, ?, ?)",
   );
   stmt.run(ipAddress, actionType, actionPath, userType, details);
}

function getLogs(limit = 100, offset = 0) {
   const stmt = db.prepare(
      "SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?",
   );
   return stmt.all(limit, offset);
}

function getLogsCount() {
   const stmt = db.prepare("SELECT COUNT(*) as count FROM activity_logs");
   return stmt.get().count;
}

// ===== UTILITY FUNCTIONS =====

function close() {
   if (db) {
      db.close();
   }
}

module.exports = {
   initialize,
   close,
   getAffectedParticipantsByTimeslot,
   getAffectedParticipantsWithLinkedBookings,
   cancelBookingsForTimeslot,
   cancelBookingsForTimeslotWithLinked,
   createAdmin,
   getAdminByUsername,
   createParticipant,
   getParticipantById,
   getAllParticipants,
   deleteParticipant,
   createTimeslot,
   setTimeslotType,
   revertTimeslotToOriginalType,
   getTimeslotById,
   getAvailableTimeslots,
   getAllTimeslots,
   getTimeslotsCount,
   updateTimeslot,
   deleteTimeslot,
   deleteBookingsForTimeslotWithLinked,
   bulkDeleteTimeslots,
   getTimeslotsInRange,
   bulkCreateTimeslots,
   hasCapacity,
   createBooking,
   createDualBooking,
   getBookingById,
   getBookingByToken,
   getAllBookingsByToken,
   getAllBookings,
   rescheduleBooking,
   cancelBooking,
   cancelAllBookingsByToken,
   logAction,
   getLogs,
   getLogsCount,
   updateBookingResultStatus,
   getPastUnreviewedBookings,
};
