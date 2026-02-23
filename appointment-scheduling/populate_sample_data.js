/**
 * populate_sample_data.js
 *
 * Usage:
 *   cd appointment-scheduling
 *   node populate_sample_data.js
 *
 * This script creates 80 participants with randomized prescreen data and creates
 * primary + follow-up bookings for each participant. About half of the bookings
 * are scheduled in the past and many of those are given a random result_status
 * to emulate reviewed appointments.
 *
 * IMPORTANT: Run this only in a development/test environment. Back up your DB
 * before running if it contains real data.
 */

const db = require("./database");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeName(i) {
  const first = randomChoice([
    "Lukas",
    "Mia",
    "Noah",
    "Emma",
    "Elias",
    "Hannah",
    "Leon",
    "Lea",
    "Paul",
    "Lina",
    "Max",
    "Anna",
    "Jonas",
    "Sara",
    "Ben",
    "Nora",
    "Tim",
    "Laura",
    "David",
    "Julia",
    "Jan",
    "Marie",
    "Tom",
    "Lisa",
    "Mark",
    "Sophie",
    "Felix",
    "Clara",
    "Oliver",
    "Maja",
  ]);
  const last = randomChoice([
    "Müller",
    "Schmidt",
    "Schneider",
    "Fischer",
    "Weber",
    "Meyer",
    "Wagner",
    "Becker",
    "Schulz",
    "Hoffmann",
    "Keller",
    "Richter",
    "Klein",
  ]);
  return `${first} ${last}${i % 5 === 0 ? ` ${i}` : ""}`;
}

function makeEmail(name, i) {
  const local = name
    .toLowerCase()
    .replace(/[^a-zäöüß]/g, ".")
    .replace(/\.+/g, ".");
  return `${local}.${i}@example.test`;
}

function iso(dt) {
  return dt.toISOString();
}

async function main() {
  try {
    console.log("Starting sample data population...");

    // Initialize DB if the exported API provides that (idempotent)
    if (typeof db.initialize === "function") {
      try {
        db.initialize();
      } catch (e) {
        // ignore initialization errors if DB already exists
      }
    }

    const TOTAL = 80;
    const visionOptions = ["none", "glasses", "contacts"];
    const conditionOptions = ["Presence", "2D Screen", "2D VR", "Immersive VR"];
    const resultOptions = ["successful", "issues_arised", "unusable_data", "no_show"];

    const now = new Date();

    for (let i = 1; i <= TOTAL; i++) {
      const name = makeName(i);
      const email = makeEmail(name, i);

      // Random prescreen
      const vision = randomChoice(visionOptions);
      const vrExperience = randomInt(1, 5);
      const motionSickness = randomInt(0, 5);
      const tuBerlin = Math.random() < 0.15 ? "yes" : "no";

      // Randomly set condition for some participants, keep others null to allow balancing
      const condition = Math.random() < 0.5 ? null : randomChoice(conditionOptions);

      const participant = db.createParticipant(name, email, {
        condition: condition,
        visionCorrection: vision,
        vrExperience: vrExperience,
        motionSickness: motionSickness,
        tuBerlinEmployee: tuBerlin,
      });

      // Determine if appointment is in the past or future
      const isPast = Math.random() < 0.5; // ~50% past
      const daysOffset = randomInt(1, 60);
      const primaryStart = new Date(now.getTime() + (isPast ? -daysOffset : daysOffset) * 24 * 3600 * 1000);
      // Stagger hours slightly so not all at same time
      primaryStart.setHours(9 + (i % 8), 0, 0, 0);
      const primaryEnd = new Date(primaryStart.getTime() + 45 * 60 * 1000);

      // Follow-up approximately 29-31 days later
      const followupStart = new Date(primaryStart.getTime() + randomInt(29, 31) * 24 * 3600 * 1000);
      const followupEnd = new Date(followupStart.getTime() + 45 * 60 * 1000);

      // Create timeslots and a dual booking (primary + follow-up)
      // createTimeslot signature: (startTime, endTime, location="", appointmentType="dual", capacity=null, parentAppointmentId=null, primaryCapacity=null, followupCapacity=null)
      const primarySlot = db.createTimeslot(iso(primaryStart), iso(primaryEnd), "", "primary", 1);
      const followupSlot = db.createTimeslot(iso(followupStart), iso(followupEnd), "", "followup", 1);

      // Create linked bookings
      const bookings = db.createDualBooking(participant.id, primarySlot.id, followupSlot.id);

      // If primary is in the past, optionally mark it as reviewed (result_status)
      if (isPast && Math.random() < 0.7) {
        const status = randomChoice(resultOptions);
        try {
          db.updateBookingResultStatus(bookings.primary.id, status);
        } catch (e) {
          console.warn("Could not set result status for booking", bookings.primary && bookings.primary.id, e.message || e);
        }
      }

      if (i % 10 === 0) {
        console.log(`Created ${i} / ${TOTAL} participants`);
      }
    }

    console.log("Sample data population complete.");
    console.log("You should restart the server (if running) and refresh the admin UI.");
  } catch (err) {
    console.error("Failed to populate sample data:", err);
    process.exitCode = 1;
  }
}

main();
