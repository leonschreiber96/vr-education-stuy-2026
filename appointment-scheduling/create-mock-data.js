/**
 * Mock Data Generator for Appointment Scheduling System
 * Creates realistic test data for a running VR study
 */

const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const dbPath = path.join(__dirname, "data", "appointments.db");
const db = new Database(dbPath);

// Helper function to generate a random token
function generateToken() {
   return crypto.randomBytes(16).toString("hex");
}

// Helper function to create a date relative to now
function daysFromNow(days, hour = 10, minute = 0) {
   const date = new Date();
   date.setDate(date.getDate() + days);
   date.setHours(hour, minute, 0, 0);
   return date.toISOString();
}

console.log("🧹 Clearing existing data...");

// Clear existing data
try {
   db.prepare("DELETE FROM activity_logs").run();
} catch (e) {
   console.log("⚠️  Note: activity_logs table does not exist, skipping");
}
db.prepare("DELETE FROM bookings").run();
db.prepare("DELETE FROM timeslots").run();
db.prepare("DELETE FROM participants").run();

console.log("✅ Existing data cleared\n");

// ============================================================================
// PARTICIPANTS
// ============================================================================

console.log("👥 Creating participants...");

const participants = [
   // Completed successfully (both appointments done, reviewed as successful)
   {
      name: "Anna Schmidt",
      email: "anna.schmidt@example.com",
      status: "completed_success",
   },
   {
      name: "Michael Weber",
      email: "michael.weber@example.com",
      status: "completed_success",
   },
   {
      name: "Sarah Müller",
      email: "sarah.mueller@example.com",
      status: "completed_success",
   },
   {
      name: "Thomas Fischer",
      email: "thomas.fischer@example.com",
      status: "completed_success",
   },

   // Completed with issues (both appointments done, but had technical problems)
   {
      name: "Julia Becker",
      email: "julia.becker@example.com",
      status: "completed_issues",
   },
   {
      name: "David Wagner",
      email: "david.wagner@example.com",
      status: "completed_issues",
   },

   // Both appointments done but not yet reviewed by admin
   {
      name: "Lisa Hoffmann",
      email: "lisa.hoffmann@example.com",
      status: "awaiting_review",
   },
   {
      name: "Markus Schulz",
      email: "markus.schulz@example.com",
      status: "awaiting_review",
   },

   // Primary done (past, reviewed), followup scheduled (future)
   {
      name: "Emma Klein",
      email: "emma.klein@example.com",
      status: "primary_done_followup_future",
   },
   {
      name: "Felix Zimmermann",
      email: "felix.zimmermann@example.com",
      status: "primary_done_followup_future",
   },

   // Primary scheduled (future), followup not yet scheduled
   {
      name: "Sophie Krause",
      email: "sophie.krause@example.com",
      status: "primary_future",
   },
   {
      name: "Leon Schmitt",
      email: "leon.schmitt@example.com",
      status: "primary_future",
   },

   // Both appointments scheduled (future)
   {
      name: "Hannah Richter",
      email: "hannah.richter@example.com",
      status: "both_future",
   },
   {
      name: "Paul Meyer",
      email: "paul.meyer@example.com",
      status: "both_future",
   },

   // Registered but no appointments scheduled yet
   {
      name: "Marie Koch",
      email: "marie.koch@example.com",
      status: "no_appointments",
   },
   {
      name: "Jonas Wolf",
      email: "jonas.wolf@example.com",
      status: "no_appointments",
   },
];

const insertParticipant = db.prepare(`
    INSERT INTO participants (name, email, confirmation_token, created_at)
    VALUES (?, ?, ?, ?)
`);

const participantRecords = participants.map((p, index) => {
   const createdAt = daysFromNow(-30 + index, 9, 0); // Spread registrations over last 30 days
   const token = generateToken();

   insertParticipant.run(p.name, p.email, token, createdAt);

   return {
      ...p,
      id: db.prepare("SELECT last_insert_rowid() as id").get().id,
      token,
      createdAt,
   };
});

console.log(`✅ Created ${participantRecords.length} participants\n`);

// ============================================================================
// TIMESLOTS
// ============================================================================

console.log("📅 Creating timeslots...");

const timeslots = [];
const insertTimeslot = db.prepare(`
    INSERT INTO timeslots (start_time, end_time, location, appointment_type, capacity, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);

// Helper to create timeslots
function createTimeslot(
   daysOffset,
   startHour,
   type,
   location = "VR Lab - Raum 201",
) {
   const startTime = daysFromNow(daysOffset, startHour, 0);
   const endTime = daysFromNow(daysOffset, startHour + 1, 0);
   const createdAt = daysFromNow(-35, 10, 0);

   insertTimeslot.run(startTime, endTime, location, type, null, createdAt);

   return {
      id: db.prepare("SELECT last_insert_rowid() as id").get().id,
      start_time: startTime,
      end_time: endTime,
      location,
      appointment_type: type,
   };
}

// Past timeslots (for completed appointments)
// Week 1 - 4 weeks ago
for (let day = -28; day <= -24; day++) {
   timeslots.push(createTimeslot(day, 9, "primary"));
   timeslots.push(createTimeslot(day, 10, "primary"));
   timeslots.push(createTimeslot(day, 14, "primary"));
   timeslots.push(createTimeslot(day, 15, "primary"));
}

// Week 2 - 3 weeks ago (followup appointments)
for (let day = -21; day <= -17; day++) {
   timeslots.push(createTimeslot(day, 9, "followup"));
   timeslots.push(createTimeslot(day, 10, "followup"));
   timeslots.push(createTimeslot(day, 14, "followup"));
   timeslots.push(createTimeslot(day, 15, "followup"));
}

// Week 3 - 2 weeks ago (more primary)
for (let day = -14; day <= -10; day++) {
   timeslots.push(createTimeslot(day, 9, "primary"));
   timeslots.push(createTimeslot(day, 11, "primary"));
   timeslots.push(createTimeslot(day, 13, "primary"));
   timeslots.push(createTimeslot(day, 15, "primary"));
}

// Week 4 - 1 week ago (recent followups)
for (let day = -7; day <= -3; day++) {
   timeslots.push(createTimeslot(day, 10, "followup"));
   timeslots.push(createTimeslot(day, 11, "followup"));
   timeslots.push(createTimeslot(day, 14, "followup"));
   timeslots.push(createTimeslot(day, 16, "followup"));
}

// Current week and future (upcoming appointments)
for (let day = 0; day <= 4; day++) {
   timeslots.push(createTimeslot(day, 9, "primary"));
   timeslots.push(createTimeslot(day, 10, "primary"));
   timeslots.push(createTimeslot(day, 11, "primary"));
   timeslots.push(createTimeslot(day, 13, "followup"));
   timeslots.push(createTimeslot(day, 14, "followup"));
   timeslots.push(createTimeslot(day, 15, "followup"));
   timeslots.push(createTimeslot(day, 16, "dual"));
}

// Next 2 weeks (lots of available slots)
for (let day = 7; day <= 21; day++) {
   if (day % 7 === 6 || day % 7 === 0) continue; // Skip weekends

   timeslots.push(createTimeslot(day, 9, "primary"));
   timeslots.push(createTimeslot(day, 10, "primary"));
   timeslots.push(createTimeslot(day, 11, "primary"));
   timeslots.push(createTimeslot(day, 13, "followup"));
   timeslots.push(createTimeslot(day, 14, "followup"));
   timeslots.push(createTimeslot(day, 15, "followup"));
   timeslots.push(createTimeslot(day, 16, "dual"));
   timeslots.push(createTimeslot(day, 17, "dual"));
}

console.log(`✅ Created ${timeslots.length} timeslots\n`);

// ============================================================================
// BOOKINGS
// ============================================================================

console.log("📝 Creating bookings...");

const insertBooking = db.prepare(`
    INSERT INTO bookings (participant_id, timeslot_id, status, appointment_type, result_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);

let bookingIndex = 0;

participantRecords.forEach((participant) => {
   const createdAt = new Date(participant.createdAt);
   createdAt.setHours(createdAt.getHours() + 1); // Booked 1 hour after registration

   switch (participant.status) {
      case "completed_success":
         // Primary (past, reviewed as successful)
         const primarySlot1 = timeslots.find(
            (t) =>
               t.appointment_type === "primary" &&
               new Date(t.start_time) < new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (primarySlot1) {
            insertBooking.run(
               participant.id,
               primarySlot1.id,
               "active",
               "primary",
               "successful",
               createdAt.toISOString(),
            );
            primarySlot1.booked = true;
         }

         // Followup (past, reviewed as successful)
         const followupSlot1 = timeslots.find(
            (t) =>
               t.appointment_type === "followup" &&
               new Date(t.start_time) < new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (followupSlot1) {
            const followupCreated = new Date(createdAt);
            followupCreated.setDate(followupCreated.getDate() + 7);
            insertBooking.run(
               participant.id,
               followupSlot1.id,
               "active",
               "followup",
               "successful",
               followupCreated.toISOString(),
            );
            followupSlot1.booked = true;
         }
         break;

      case "completed_issues":
         // Primary (past, reviewed with issues)
         const primarySlot2 = timeslots.find(
            (t) =>
               t.appointment_type === "primary" &&
               new Date(t.start_time) < new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (primarySlot2) {
            insertBooking.run(
               participant.id,
               primarySlot2.id,
               "active",
               "primary",
               "issues_arised",
               createdAt.toISOString(),
            );
            primarySlot2.booked = true;
         }

         // Followup (past, reviewed as successful despite issues)
         const followupSlot2 = timeslots.find(
            (t) =>
               t.appointment_type === "followup" &&
               new Date(t.start_time) < new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (followupSlot2) {
            const followupCreated = new Date(createdAt);
            followupCreated.setDate(followupCreated.getDate() + 7);
            insertBooking.run(
               participant.id,
               followupSlot2.id,
               "active",
               "followup",
               "successful",
               followupCreated.toISOString(),
            );
            followupSlot2.booked = true;
         }
         break;

      case "awaiting_review":
         // Both appointments in past, not yet reviewed
         const primarySlot3 = timeslots.find(
            (t) =>
               t.appointment_type === "primary" &&
               new Date(t.start_time) < new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (primarySlot3) {
            insertBooking.run(
               participant.id,
               primarySlot3.id,
               "active",
               "primary",
               null,
               createdAt.toISOString(),
            );
            primarySlot3.booked = true;
         }

         const followupSlot3 = timeslots.find(
            (t) =>
               t.appointment_type === "followup" &&
               new Date(t.start_time) < new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (followupSlot3) {
            const followupCreated = new Date(createdAt);
            followupCreated.setDate(followupCreated.getDate() + 7);
            insertBooking.run(
               participant.id,
               followupSlot3.id,
               "active",
               "followup",
               null,
               followupCreated.toISOString(),
            );
            followupSlot3.booked = true;
         }
         break;

      case "primary_done_followup_future":
         // Primary in past (reviewed), followup in future
         const primarySlot4 = timeslots.find(
            (t) =>
               t.appointment_type === "primary" &&
               new Date(t.start_time) < new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (primarySlot4) {
            insertBooking.run(
               participant.id,
               primarySlot4.id,
               "active",
               "primary",
               "successful",
               createdAt.toISOString(),
            );
            primarySlot4.booked = true;
         }

         const followupSlot4 = timeslots.find(
            (t) =>
               (t.appointment_type === "followup" ||
                  t.appointment_type === "dual") &&
               new Date(t.start_time) > new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (followupSlot4) {
            const followupCreated = new Date(createdAt);
            followupCreated.setDate(followupCreated.getDate() + 7);
            insertBooking.run(
               participant.id,
               followupSlot4.id,
               "active",
               "followup",
               null,
               followupCreated.toISOString(),
            );
            followupSlot4.booked = true;
         }
         break;

      case "primary_future":
         // Only primary scheduled (future)
         const primarySlot5 = timeslots.find(
            (t) =>
               t.appointment_type === "primary" &&
               new Date(t.start_time) > new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (primarySlot5) {
            insertBooking.run(
               participant.id,
               primarySlot5.id,
               "active",
               "primary",
               null,
               createdAt.toISOString(),
            );
            primarySlot5.booked = true;
         }
         break;

      case "both_future":
         // Both appointments scheduled (future)
         const primarySlot6 = timeslots.find(
            (t) =>
               t.appointment_type === "primary" &&
               new Date(t.start_time) > new Date() &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (primarySlot6) {
            insertBooking.run(
               participant.id,
               primarySlot6.id,
               "active",
               "primary",
               null,
               createdAt.toISOString(),
            );
            primarySlot6.booked = true;
         }

         const followupSlot6 = timeslots.find(
            (t) =>
               (t.appointment_type === "followup" ||
                  t.appointment_type === "dual") &&
               new Date(t.start_time) >
                  new Date(primarySlot6?.start_time || 0) &&
               !timeslots[timeslots.indexOf(t)].booked,
         );
         if (followupSlot6) {
            const followupCreated = new Date(createdAt);
            followupCreated.setDate(followupCreated.getDate() + 7);
            insertBooking.run(
               participant.id,
               followupSlot6.id,
               "active",
               "followup",
               null,
               followupCreated.toISOString(),
            );
            followupSlot6.booked = true;
         }
         break;

      case "no_appointments":
         // No bookings created
         break;
   }
});

const bookingCount = db
   .prepare("SELECT COUNT(*) as count FROM bookings")
   .get().count;
console.log(`✅ Created ${bookingCount} bookings\n`);

// ============================================================================
// LOGS (Optional - skipped for simplicity)
// ============================================================================

console.log("⏭️  Skipping activity logs (optional)\n");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("📊 MOCK DATA SUMMARY");
console.log("=".repeat(50));

const stats = {
   participants: db.prepare("SELECT COUNT(*) as count FROM participants").get()
      .count,
   timeslots: db.prepare("SELECT COUNT(*) as count FROM timeslots").get().count,
   bookings: db.prepare("SELECT COUNT(*) as count FROM bookings").get().count,
   bookedTimeslots: db
      .prepare(
         "SELECT COUNT(DISTINCT timeslot_id) as count FROM bookings WHERE status = 'active'",
      )
      .get().count,
   availableTimeslots: null,
   completedSuccessful: participantRecords.filter(
      (p) => p.status === "completed_success",
   ).length,
   completedIssues: participantRecords.filter(
      (p) => p.status === "completed_issues",
   ).length,
   awaitingReview: participantRecords.filter(
      (p) => p.status === "awaiting_review",
   ).length,
   primaryDoneFollowupFuture: participantRecords.filter(
      (p) => p.status === "primary_done_followup_future",
   ).length,
   primaryFuture: participantRecords.filter(
      (p) => p.status === "primary_future",
   ).length,
   bothFuture: participantRecords.filter((p) => p.status === "both_future")
      .length,
   noAppointments: participantRecords.filter(
      (p) => p.status === "no_appointments",
   ).length,
};

stats.availableTimeslots = stats.timeslots - stats.bookedTimeslots;

console.log(`
Participants:     ${stats.participants}
Timeslots:        ${stats.timeslots}
  - Booked:       ${stats.bookedTimeslots}
  - Available:    ${stats.availableTimeslots}
Bookings:         ${stats.bookings}

Participant Status:
  ✓ Completed (successful):    ${stats.completedSuccessful}
  ⚠ Completed (with issues):   ${stats.completedIssues}
  📋 Awaiting review:           ${stats.awaitingReview}
  ⏳ Primary done, followup scheduled: ${stats.primaryDoneFollowupFuture}
  📅 Primary scheduled only:    ${stats.primaryFuture}
  📅 Both scheduled (future):   ${stats.bothFuture}
  ○ No appointments:            ${stats.noAppointments}
`);

console.log("=".repeat(50));
console.log("✅ Mock data creation complete!");
console.log("\n💡 You can now:");
console.log("   - View the dashboard with realistic data");
console.log('   - Review past appointments in the "Termine bewerten" tab');
console.log("   - See various participant statuses");
console.log("   - Test the full appointment workflow\n");

db.close();
