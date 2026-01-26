const nodemailer = require("nodemailer");
const config = require("./config");

// Email configuration from environment variables
const EMAIL_CONFIG = {
   host: process.env.SMTP_HOST || "smtp.gmail.com",
   port: parseInt(process.env.SMTP_PORT || "587", 10),
   secure: process.env.SMTP_SECURE === "true",
   auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
   },
   // Additional TLS options for better compatibility
   tls: {
      // Do not fail on invalid certs (not recommended for production)
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
      // Minimum TLS version
      minVersion: "TLSv1.2",
   },
   // Connection timeout
   connectionTimeout: 10000,
   // Greeting timeout
   greetingTimeout: 5000,
   // Socket timeout
   socketTimeout: 10000,
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const FROM_EMAIL = process.env.FROM_EMAIL || EMAIL_CONFIG.auth.user;
const ORGANIZER_NAME = process.env.ORGANIZER_NAME || "Leon Schreiber";

/**
 * Build a full URL including BASE_PATH
 * @param {string} path - The path (e.g., "manage.html")
 * @returns {string} Full URL
 */
function buildUrl(path) {
   const baseUrl = process.env.BASE_URL || "http://localhost:3000";
   const basePath = config.BASE_PATH || "";

   // Remove leading slash from path if present
   const cleanPath = path.startsWith("/") ? path.substring(1) : path;

   // Construct full URL: baseUrl + basePath + "/" + path
   if (basePath) {
      return `${baseUrl}${basePath}/${cleanPath}`;
   }
   return `${baseUrl}/${cleanPath}`;
}

// Create transporter
let transporter;

function initializeTransporter() {
   console.log("\n=== Email Configuration ===");
   console.log("SMTP Host:", EMAIL_CONFIG.host);
   console.log("SMTP Port:", EMAIL_CONFIG.port);
   console.log("SMTP Secure:", EMAIL_CONFIG.secure);
   console.log("SMTP User:", EMAIL_CONFIG.auth.user ? "✓ Set" : "✗ Not set");
   console.log(
      "SMTP Pass:",
      EMAIL_CONFIG.auth.pass ? "✓ Set (hidden)" : "✗ Not set",
   );
   console.log("From Email:", FROM_EMAIL);
   console.log("Admin Email:", ADMIN_EMAIL);

   // Provide helpful configuration hints
   if (EMAIL_CONFIG.port === 587 && EMAIL_CONFIG.secure) {
      console.warn(
         "⚠ WARNING: Port 587 typically uses STARTTLS (secure: false), not direct SSL.",
      );
      console.warn("   Consider setting SMTP_SECURE=false in your .env file.");
   } else if (EMAIL_CONFIG.port === 465 && !EMAIL_CONFIG.secure) {
      console.warn(
         "⚠ WARNING: Port 465 typically uses direct SSL (secure: true).",
      );
      console.warn("   Consider setting SMTP_SECURE=true in your .env file.");
   }

   console.log("===========================\n");

   if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.warn(
         "⚠ Email credentials not configured. Email notifications will be logged to console only.",
      );
      console.warn(
         "⚠ Please set SMTP_USER and SMTP_PASS in your .env file to enable email sending.",
      );
      return null;
   }

   try {
      transporter = nodemailer.createTransport(EMAIL_CONFIG);
      console.log("✓ Email transporter initialized successfully");
      return transporter;
   } catch (error) {
      console.error("✗ Failed to initialize email transporter:", error);
      return null;
   }
}

// Initialize on module load
initializeTransporter();

// Format date and time for emails
function formatDateTime(dateTimeString) {
   if (!dateTimeString) {
      return "Datum nicht verfügbar";
   }
   const date = new Date(dateTimeString);
   if (isNaN(date.getTime())) {
      return "Ungültiges Datum";
   }
   return date.toLocaleString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   });
}

// Generate iCal event for appointment
function generateICalEvent(appointment, participantName, isForAdmin = false) {
   const start = new Date(appointment.start_time);
   const end = new Date(appointment.end_time);
   const location = appointment.location || "TBD";
   const type =
      appointment.appointment_type === "primary"
         ? "Haupttermin"
         : "Folgetermin";

   // Different summary based on recipient
   const summary = isForAdmin
      ? `${type} [${participantName}]`
      : `Studie (${ORGANIZER_NAME}) - Teilnahme ${type}`;

   // Format dates for iCal in UTC format (YYYYMMDDTHHMMSSZ)
   // Using UTC ensures consistent timezone handling across all calendar clients
   const formatICalDate = (date) => {
      const pad = (n) => String(n).padStart(2, "0");
      return (
         date.getUTCFullYear() +
         pad(date.getUTCMonth() + 1) +
         pad(date.getUTCDate()) +
         "T" +
         pad(date.getUTCHours()) +
         pad(date.getUTCMinutes()) +
         pad(date.getUTCSeconds()) +
         "Z"
      );
   };

   const uid = `${appointment.id}-${Date.now()}@terminfindung`;
   const now = formatICalDate(new Date());

   const icalContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Terminfindung//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatICalDate(start)}`,
      `DTEND:${formatICalDate(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:Termin für die Teilnahme an der Studie`,
      `LOCATION:${location}`,
      `ATTENDEE;CN=${participantName}:MAILTO:participant@example.com`,
      `ORGANIZER:MAILTO:${FROM_EMAIL}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR",
   ].join("\r\n");

   return icalContent;
}

// Send email or log to console if not configured
async function sendEmail(to, subject, html, icalAttachment = null) {
   if (!transporter) {
      console.log("\n=== EMAIL NOTIFICATION ===");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${html}`);
      if (icalAttachment) {
         console.log(`iCal Attachment: ${icalAttachment.filename}`);
      }
      console.log("=========================\n");
      return {
         success: true,
         message: "Email logged to console (transporter not configured)",
      };
   }

   try {
      const mailOptions = {
         from: FROM_EMAIL,
         to,
         subject,
         html,
      };

      // Add iCal attachment if provided
      if (icalAttachment) {
         mailOptions.attachments = [
            {
               filename: icalAttachment.filename,
               content: icalAttachment.content,
               contentType: "text/calendar; charset=utf-8; method=REQUEST",
            },
         ];
         mailOptions.alternatives = [
            {
               contentType: "text/calendar; charset=utf-8; method=REQUEST",
               content: Buffer.from(icalAttachment.content),
            },
         ];
      }

      const info = await transporter.sendMail(mailOptions);

      console.log(`Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
   } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
   }
}

// Send registration confirmation email to participant (single appointment - legacy)
async function sendRegistrationEmail(participant, timeslot) {
   const subject = "Terminbestätigung - Studie Teilnahme";
   const managementUrl = `${buildUrl("manage.html")}?token=${participant.confirmationToken}`;

   const html = `
    <h2>Vielen Dank für Ihre Anmeldung!</h2>
    <p>Hallo ${participant.name},</p>
    <p>Ihre Anmeldung für die Studie wurde erfolgreich registriert.</p>

    <h3>Termin Details:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(timeslot.start_time)} - ${new Date(timeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${timeslot.location ? `<li><strong>Ort:</strong> ${timeslot.location}</li>` : ""}
    </ul>

    <h3>Termin verwalten:</h3>
    <p>Sie können Ihren Termin über den folgenden Link einsehen, ändern oder absagen:</p>
    <p><a href="${managementUrl}">${managementUrl}</a></p>

    <p><strong>Wichtig:</strong> Bitte bewahren Sie diese E-Mail auf, da Sie den Link benötigen, um Ihren Termin zu verwalten.</p>

    <p><strong>📅 Kalender:</strong> Der Termin wurde als Kalender-Datei (.ics) angehängt, die Sie in Ihren Kalender importieren können.</p>

    <hr>
    <p style="font-size: 0.9em; color: #666;">
      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
    </p>
  `;

   // Generate iCal attachment
   const icalContent = generateICalEvent(timeslot, participant.name, false);
   const icalAttachment = {
      filename: "termin.ics",
      content: icalContent,
   };

   // Send to participant
   return sendEmail(participant.email, subject, html, icalAttachment);
}

// Send dual registration confirmation email (primary + followup)
async function sendDualRegistrationEmail(
   participant,
   primaryTimeslot,
   followupTimeslot,
) {
   const subject = "Terminbestätigung - Studie Teilnahme (2 Termine)";
   const managementUrl = `${buildUrl("manage.html")}?token=${participant.confirmationToken}`;

   const html = `
    <h2>Vielen Dank für Ihre Anmeldung!</h2>
    <p>Hallo ${participant.name},</p>
    <p>Ihre Anmeldung für die Studie wurde erfolgreich registriert. Sie haben zwei Termine gebucht:</p>

    <h3>Ersttermin:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(primaryTimeslot.start_time)} - ${new Date(primaryTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${primaryTimeslot.location ? `<li><strong>Ort:</strong> ${primaryTimeslot.location}</li>` : ""}
    </ul>

    <h3>Folgetermin:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(followupTimeslot.start_time)} - ${new Date(followupTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${followupTimeslot.location ? `<li><strong>Ort:</strong> ${followupTimeslot.location}</li>` : ""}
    </ul>

    <h3>Termine verwalten:</h3>
    <p>Sie können Ihre Termine über den folgenden Link einsehen, ändern oder absagen:</p>
    <p><a href="${managementUrl}">${managementUrl}</a></p>

    <p><strong>Wichtig:</strong> Bitte bewahren Sie diese E-Mail auf, da Sie den Link benötigen, um Ihre Termine zu verwalten.</p>

    <p><strong>📅 Kalender:</strong> Die Termine wurden als Kalender-Dateien (.ics) angehängt, die Sie in Ihren Kalender importieren können.</p>

    <hr>
    <p style="font-size: 0.9em; color: #666;">
      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
    </p>
  `;

   // Generate iCal for primary appointment
   const primaryIcal = generateICalEvent(
      { ...primaryTimeslot, appointment_type: "primary" },
      participant.name,
      false,
   );
   const followupIcal = generateICalEvent(
      { ...followupTimeslot, appointment_type: "followup" },
      participant.name,
      false,
   );

   // Combine both iCal events into one file
   // Extract just the VEVENT section from each iCal
   const primaryLines = primaryIcal.split("\r\n");
   const followupLines = followupIcal.split("\r\n");

   // Find VEVENT sections
   const primaryEventStart = primaryLines.findIndex(
      (line) => line === "BEGIN:VEVENT",
   );
   const primaryEventEnd = primaryLines.findIndex(
      (line) => line === "END:VEVENT",
   );
   const followupEventStart = followupLines.findIndex(
      (line) => line === "BEGIN:VEVENT",
   );
   const followupEventEnd = followupLines.findIndex(
      (line) => line === "END:VEVENT",
   );

   const primaryEvent = primaryLines
      .slice(primaryEventStart, primaryEventEnd + 1)
      .join("\r\n");
   const followupEvent = followupLines
      .slice(followupEventStart, followupEventEnd + 1)
      .join("\r\n");

   const combinedIcal = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Terminfindung//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      primaryEvent,
      followupEvent,
      "END:VCALENDAR",
   ].join("\r\n");

   const icalAttachment = {
      filename: "termine.ics",
      content: combinedIcal,
   };

   // Send to participant
   return sendEmail(participant.email, subject, html, icalAttachment);
}

// Send reschedule confirmation email
async function sendRescheduleEmail(booking, oldTimeslot, newTimeslot) {
   const subject = "Terminänderung bestätigt";
   const managementUrl = `${buildUrl("manage.html")}?token=${booking.confirmation_token}`;

   const html = `
    <h2>Ihr Termin wurde geändert</h2>
    <p>Hallo ${booking.name},</p>
    <p>Ihre Terminänderung wurde erfolgreich durchgeführt.</p>

    <h3>Alter Termin:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(oldTimeslot.start_time)} - ${new Date(oldTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
    </ul>

    <h3>Neuer Termin:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(newTimeslot.start_time)} - ${new Date(newTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${newTimeslot.location ? `<li><strong>Ort:</strong> ${newTimeslot.location}</li>` : ""}
    </ul>

    <p>Sie können Ihren Termin weiterhin über diesen Link verwalten:</p>
    <p><a href="${managementUrl}">${managementUrl}</a></p>

    <hr>
    <p style="font-size: 0.9em; color: #666;">
      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
    </p>
  `;

   return sendEmail(booking.email, subject, html);
}

// Send cancellation confirmation email
async function sendCancellationEmail(
   participant,
   primaryTimeslot,
   followupTimeslot,
) {
   const subject = "Terminabsage bestätigt";

   const html = `
    <h2>Ihre Termine wurden abgesagt</h2>
    <p>Hallo ${participant.name},</p>
    <p>Ihre Terminabsage wurde erfolgreich durchgeführt.</p>

    ${
       primaryTimeslot
          ? `
    <h3>Abgesagter Ersttermin:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(primaryTimeslot.start_time)} - ${new Date(primaryTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${primaryTimeslot.location ? `<li><strong>Ort:</strong> ${primaryTimeslot.location}</li>` : ""}
    </ul>
    `
          : ""
    }

    ${
       followupTimeslot
          ? `
    <h3>Abgesagter Folgetermin:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(followupTimeslot.start_time)} - ${new Date(followupTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${followupTimeslot.location ? `<li><strong>Ort:</strong> ${followupTimeslot.location}</li>` : ""}
    </ul>
    `
          : ""
    }

    <p>Wenn Sie sich umentschieden haben, können Sie sich jederzeit erneut für freie Termine anmelden.</p>

    <hr>
    <p style="font-size: 0.9em; color: #666;">
      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
    </p>
  `;

   return sendEmail(participant.email, subject, html);
}

// Send admin notification
async function sendAdminNotification(type, participant, timeslots) {
   let subject = "";
   let html = "";
   let icalAttachment = null;

   switch (type) {
      case "registration":
         subject = `Neue Anmeldung: ${participant.name}`;
         if (timeslots.primary && timeslots.followup) {
            html = `
          <h2>Neue Teilnehmer-Anmeldung (2 Termine)</h2>
          <ul>
            <li><strong>Name:</strong> ${participant.name}</li>
            <li><strong>E-Mail:</strong> ${participant.email}</li>
          </ul>
          <h3>Ersttermin:</h3>
          <ul>
            <li><strong>Termin:</strong> ${formatDateTime(timeslots.primary.start_time)} - ${new Date(timeslots.primary.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
            ${timeslots.primary.location ? `<li><strong>Ort:</strong> ${timeslots.primary.location}</li>` : ""}
          </ul>
          <h3>Folgetermin:</h3>
          <ul>
            <li><strong>Termin:</strong> ${formatDateTime(timeslots.followup.start_time)} - ${new Date(timeslots.followup.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
            ${timeslots.followup.location ? `<li><strong>Ort:</strong> ${timeslots.followup.location}</li>` : ""}
          </ul>
        `;

            // Generate combined iCal for admin with both events
            const adminPrimaryIcal = generateICalEvent(
               { ...timeslots.primary, appointment_type: "primary" },
               participant.name,
               true,
            );
            const adminFollowupIcal = generateICalEvent(
               { ...timeslots.followup, appointment_type: "followup" },
               participant.name,
               true,
            );

            // Combine admin iCal events
            const adminPrimaryLines = adminPrimaryIcal.split("\r\n");
            const adminFollowupLines = adminFollowupIcal.split("\r\n");

            const adminPrimaryEventStart = adminPrimaryLines.findIndex(
               (line) => line === "BEGIN:VEVENT",
            );
            const adminPrimaryEventEnd = adminPrimaryLines.findIndex(
               (line) => line === "END:VEVENT",
            );
            const adminFollowupEventStart = adminFollowupLines.findIndex(
               (line) => line === "BEGIN:VEVENT",
            );
            const adminFollowupEventEnd = adminFollowupLines.findIndex(
               (line) => line === "END:VEVENT",
            );

            const adminPrimaryEvent = adminPrimaryLines
               .slice(adminPrimaryEventStart, adminPrimaryEventEnd + 1)
               .join("\r\n");
            const adminFollowupEvent = adminFollowupLines
               .slice(adminFollowupEventStart, adminFollowupEventEnd + 1)
               .join("\r\n");

            const adminCombinedIcal = [
               "BEGIN:VCALENDAR",
               "VERSION:2.0",
               "PRODID:-//Terminfindung//DE",
               "CALSCALE:GREGORIAN",
               "METHOD:REQUEST",
               adminPrimaryEvent,
               adminFollowupEvent,
               "END:VCALENDAR",
            ].join("\r\n");

            icalAttachment = {
               filename: "termine.ics",
               content: adminCombinedIcal,
            };
         } else {
            // Single appointment (legacy)
            html = `
          <h2>Neue Teilnehmer-Anmeldung</h2>
          <ul>
            <li><strong>Name:</strong> ${participant.name}</li>
            <li><strong>E-Mail:</strong> ${participant.email}</li>
            <li><strong>Termin:</strong> ${formatDateTime(timeslots.start_time)} - ${new Date(timeslots.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
            ${timeslots.location ? `<li><strong>Ort:</strong> ${timeslots.location}</li>` : ""}
          </ul>
        `;

            // Generate iCal for single appointment
            const adminIcalContent = generateICalEvent(
               timeslots,
               participant.name,
               true,
            );
            icalAttachment = {
               filename: "termin.ics",
               content: adminIcalContent,
            };
         }
         break;

      case "reschedule":
         subject = `Terminänderung: ${participant.name}`;
         html = `
        <h2>Teilnehmer hat Termin geändert</h2>
        <ul>
          <li><strong>Name:</strong> ${participant.name}</li>
          <li><strong>E-Mail:</strong> ${participant.email}</li>
          <li><strong>Alter Termin:</strong> ${formatDateTime(timeslots.old.start_time)}</li>
          <li><strong>Neuer Termin:</strong> ${formatDateTime(timeslots.new.start_time)}</li>
        </ul>
      `;
         break;

      case "cancellation":
         subject = `Terminabsage: ${participant.name}`;
         if (timeslots.primary && timeslots.followup) {
            html = `
          <h2>Teilnehmer hat beide Termine abgesagt</h2>
          <ul>
            <li><strong>Name:</strong> ${participant.name}</li>
            <li><strong>E-Mail:</strong> ${participant.email}</li>
          </ul>
          <h3>Abgesagter Ersttermin:</h3>
          <ul>
            <li><strong>Termin:</strong> ${formatDateTime(timeslots.primary.start_time)} - ${new Date(timeslots.primary.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
          </ul>
          <h3>Abgesagter Folgetermin:</h3>
          <ul>
            <li><strong>Termin:</strong> ${formatDateTime(timeslots.followup.start_time)} - ${new Date(timeslots.followup.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
          </ul>
        `;
         } else if (timeslots.primary || timeslots.followup) {
            // Handle case where only one timeslot exists
            const timeslot = timeslots.primary || timeslots.followup;
            const appointmentType = timeslots.primary
               ? "Ersttermin"
               : "Folgetermin";
            html = `
          <h2>Teilnehmer hat ${appointmentType} abgesagt</h2>
          <ul>
            <li><strong>Name:</strong> ${participant.name}</li>
            <li><strong>E-Mail:</strong> ${participant.email}</li>
            <li><strong>Termin:</strong> ${formatDateTime(timeslot.start_time)} - ${new Date(timeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
          </ul>
        `;
         } else {
            // Fallback if no timeslot data available (shouldn't happen, but handle gracefully)
            html = `
          <h2>Teilnehmer hat Termin abgesagt</h2>
          <ul>
            <li><strong>Name:</strong> ${participant.name}</li>
            <li><strong>E-Mail:</strong> ${participant.email}</li>
          </ul>
          <p><em>Termindetails nicht verfügbar (Zeitslot wurde möglicherweise gelöscht)</em></p>
        `;
         }
         break;

      default:
         console.warn(`Unknown notification type: ${type}`);
         return;
   }

   return sendEmail(ADMIN_EMAIL, subject, html, icalAttachment);
}

// Send timeslot update notification to participant
async function sendTimeslotUpdateEmail(
   participant,
   oldTimeslot,
   newTimeslot,
   isFollowup = false,
) {
   const subject = "Terminänderung durch Studienleitung";
   const managementUrl = `${buildUrl("manage.html")}?token=${participant.confirmation_token}`;
   const appointmentType = isFollowup ? "Folgetermin" : "Ersttermin";

   const html = `
    <h2>Ihr ${appointmentType} wurde geändert</h2>
    <p>Hallo ${participant.name},</p>
    <p>Die Studienleitung hat Ihren ${appointmentType} geändert. Hier sind die Details:</p>

    <h3>Bisherige Termindetails:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(oldTimeslot.start_time)} - ${new Date(oldTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${oldTimeslot.location ? `<li><strong>Ort:</strong> ${oldTimeslot.location}</li>` : ""}
    </ul>

    <h3>Neue Termindetails:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(newTimeslot.start_time)} - ${new Date(newTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${newTimeslot.location ? `<li><strong>Ort:</strong> ${newTimeslot.location}</li>` : ""}
    </ul>

    <p>Falls dieser neue Termin für Sie nicht passt, können Sie Ihren Termin über den folgenden Link ändern oder absagen:</p>
    <p><a href="${managementUrl}">${managementUrl}</a></p>

    <hr>
    <p style="font-size: 0.9em; color: #666;">
      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
    </p>
  `;

   return sendEmail(participant.email, subject, html);
}

// Send timeslot deletion notification to participant
async function sendTimeslotDeletionEmail(
   participant,
   deletedTimeslot,
   isFollowup = false,
) {
   const subject = "Terminabsage durch Studienleitung";
   const appointmentType = isFollowup ? "Folgetermin" : "Ersttermin";

   const html = `
    <h2>Ihr ${appointmentType} wurde abgesagt</h2>
    <p>Hallo ${participant.name},</p>
    <p>Leider müssen wir Ihnen mitteilen, dass Ihr ${appointmentType} von der Studienleitung abgesagt werden musste.</p>

    <h3>Abgesagter Termin:</h3>
    <ul>
      <li><strong>Datum und Uhrzeit:</strong> ${formatDateTime(deletedTimeslot.start_time)} - ${new Date(deletedTimeslot.end_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
      ${deletedTimeslot.location ? `<li><strong>Ort:</strong> ${deletedTimeslot.location}</li>` : ""}
    </ul>

    <p>Bitte melden Sie sich erneut für einen anderen Termin an oder kontaktieren Sie uns für weitere Informationen.</p>

    <hr>
    <p style="font-size: 0.9em; color: #666;">
      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
    </p>
  `;

   return sendEmail(participant.email, subject, html);
}

// Send custom email to participant
async function sendCustomEmail(email, name, subject, message) {
   const html = `
    <h2>${subject}</h2>
    <p>Hallo ${name || ""},</p>
    ${message
       .split("\n")
       .map((line) => `<p>${line}</p>`)
       .join("")}
    <hr>
    <p style="color: #666; font-size: 0.9em;">Diese Nachricht wurde von der Studienleitung versendet.</p>
    <p style="color: #666; font-size: 0.9em;">Bei Fragen wenden Sie sich bitte an: ${ADMIN_EMAIL}</p>
  `;

   return sendEmail(email, subject, html);
}

/**
 * Generic function to send an email (used by notification service)
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 * @returns {Promise<Object>} Email send result
 */
async function sendMail(to, subject, text, html) {
   return await sendEmail(to, subject, html);
}

module.exports = {
   sendRegistrationEmail,
   sendDualRegistrationEmail,
   sendRescheduleEmail,
   sendCancellationEmail,
   sendAdminNotification,
   sendTimeslotUpdateEmail,
   sendTimeslotDeletionEmail,
   sendCustomEmail,
   sendMail,
};
