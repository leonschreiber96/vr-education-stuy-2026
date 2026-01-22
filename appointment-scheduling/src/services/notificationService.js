// Notification service module
// Handles all email notifications for the application

const mailer = require("../../mailer");
const { Logger } = require("../middleware/logging");
const config = require("../../config");

/**
 * Notification service for sending emails
 */
class NotificationService {
   /**
    * Send booking confirmation email to participant
    * @param {Object} booking - Booking details
    * @param {Object} participant - Participant details
    * @param {Object} timeslot - Timeslot details
    * @returns {Promise<boolean>} True if email sent successfully
    */
   static async sendBookingConfirmation(booking, participant, timeslot) {
      try {
         const startTime = new Date(timeslot.start_time);
         const endTime = new Date(timeslot.end_time);

         const dateStr = startTime.toLocaleDateString("de-DE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
         });

         const timeStr = `${startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;

         const appointmentTypeLabel = this.getAppointmentTypeLabel(
            timeslot.appointment_type,
         );

         const subject = `Terminbestätigung - ${appointmentTypeLabel}`;

         const text = `
Hallo ${participant.name},

Ihre Buchung wurde erfolgreich bestätigt!

Termindetails:
- Datum: ${dateStr}
- Uhrzeit: ${timeStr}
- Typ: ${appointmentTypeLabel}
- Ort: ${timeslot.location || "Wird noch bekannt gegeben"}

Buchungs-ID: ${booking.id}

Falls Sie Fragen haben oder den Termin nicht wahrnehmen können, kontaktieren Sie uns bitte.

Mit freundlichen Grüßen
Ihr Team
            `.trim();

         const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .details { background-color: white; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0; }
        .detail-row { margin: 10px 0; }
        .detail-label { font-weight: bold; color: #555; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Terminbestätigung</h1>
        </div>
        <div class="content">
            <p>Hallo <strong>${participant.name}</strong>,</p>
            <p>Ihre Buchung wurde erfolgreich bestätigt!</p>

            <div class="details">
                <h3 style="margin-top: 0;">Termindetails</h3>
                <div class="detail-row">
                    <span class="detail-label">📅 Datum:</span> ${dateStr}
                </div>
                <div class="detail-row">
                    <span class="detail-label">🕒 Uhrzeit:</span> ${timeStr}
                </div>
                <div class="detail-row">
                    <span class="detail-label">📋 Typ:</span> ${appointmentTypeLabel}
                </div>
                <div class="detail-row">
                    <span class="detail-label">📍 Ort:</span> ${timeslot.location || "Wird noch bekannt gegeben"}
                </div>
                <div class="detail-row" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <span class="detail-label">🆔 Buchungs-ID:</span> <code>${booking.id}</code>
                </div>
            </div>

            <p>Falls Sie Fragen haben oder den Termin nicht wahrnehmen können, kontaktieren Sie uns bitte.</p>

            <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br>Ihr Team</p>
        </div>
        <div class="footer">
            <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
        </div>
    </div>
</body>
</html>
            `.trim();

         await mailer.sendMail(participant.email, subject, text, html);
         Logger.info("Booking confirmation email sent", {
            participantId: participant.id,
            bookingId: booking.id,
            email: participant.email,
         });

         return true;
      } catch (error) {
         Logger.error("Failed to send booking confirmation email", error, {
            participantId: participant.id,
            bookingId: booking.id,
         });
         // Don't throw - email failure shouldn't prevent booking
         return false;
      }
   }

   /**
    * Send booking cancellation email to participant
    * @param {Object} booking - Booking details
    * @param {Object} participant - Participant details
    * @param {Object} timeslot - Timeslot details
    * @param {string} reason - Cancellation reason
    * @returns {Promise<boolean>} True if email sent successfully
    */
   static async sendBookingCancellation(
      booking,
      participant,
      timeslot,
      reason = "",
   ) {
      try {
         const startTime = new Date(timeslot.start_time);
         const dateStr = startTime.toLocaleDateString("de-DE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
         });
         const timeStr = startTime.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
         });

         const subject = "Terminabsage - Buchung storniert";

         const reasonText = reason ? `\n\nGrund: ${reason}` : "";

         const text = `
Hallo ${participant.name},

Ihr Termin wurde leider storniert.

Stornierter Termin:
- Datum: ${dateStr}
- Uhrzeit: ${timeStr}
- Ort: ${timeslot.location || "Nicht angegeben"}
${reasonText}

Falls Sie einen neuen Termin vereinbaren möchten, besuchen Sie bitte unsere Buchungsseite.

Buchungs-ID: ${booking.id}

Mit freundlichen Grüßen
Ihr Team
            `.trim();

         const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .details { background-color: white; padding: 20px; border-left: 4px solid #f44336; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✕ Terminabsage</h1>
        </div>
        <div class="content">
            <p>Hallo <strong>${participant.name}</strong>,</p>
            <p>Ihr Termin wurde leider storniert.</p>

            <div class="details">
                <h3 style="margin-top: 0;">Stornierter Termin</h3>
                <p><strong>Datum:</strong> ${dateStr}</p>
                <p><strong>Uhrzeit:</strong> ${timeStr}</p>
                <p><strong>Ort:</strong> ${timeslot.location || "Nicht angegeben"}</p>
                ${reason ? `<p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;"><strong>Grund:</strong> ${reason}</p>` : ""}
                <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px;"><strong>Buchungs-ID:</strong> <code>${booking.id}</code></p>
            </div>

            <p>Falls Sie einen neuen Termin vereinbaren möchten, besuchen Sie bitte unsere Buchungsseite.</p>

            <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br>Ihr Team</p>
        </div>
        <div class="footer">
            <p>Diese E-Mail wurde automatisch generiert.</p>
        </div>
    </div>
</body>
</html>
            `.trim();

         await mailer.sendMail(participant.email, subject, text, html);
         Logger.info("Cancellation email sent", {
            participantId: participant.id,
            bookingId: booking.id,
         });

         return true;
      } catch (error) {
         Logger.error("Failed to send cancellation email", error, {
            participantId: participant.id,
            bookingId: booking.id,
         });
         return false;
      }
   }

   /**
    * Send custom email to participant
    * @param {string} email - Recipient email
    * @param {string} name - Recipient name
    * @param {string} subject - Email subject
    * @param {string} message - Email message
    * @returns {Promise<boolean>} True if email sent successfully
    */
   static async sendCustomEmail(email, name, subject, message) {
      try {
         const text = `
Hallo ${name},

${message}

Mit freundlichen Grüßen
Ihr Team
            `.trim();

         const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .message { background-color: white; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; white-space: pre-wrap; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${subject}</h1>
        </div>
        <div class="content">
            <p>Hallo <strong>${name}</strong>,</p>

            <div class="message">
                ${message.replace(/\n/g, "<br>")}
            </div>

            <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br>Ihr Team</p>
        </div>
        <div class="footer">
            <p>Diese E-Mail wurde automatisch generiert.</p>
        </div>
    </div>
</body>
</html>
            `.trim();

         await mailer.sendMail(email, subject, text, html);
         Logger.info("Custom email sent", { email, subject });

         return true;
      } catch (error) {
         Logger.error("Failed to send custom email", error, { email, subject });
         throw error; // Throw for custom emails so admin knows it failed
      }
   }

   /**
    * Get human-readable appointment type label
    * @param {string} appointmentType - Appointment type code
    * @returns {string} Human-readable label
    */
   static getAppointmentTypeLabel(appointmentType) {
      const labels = {
         primary: "Haupttermin",
         followup: "Folgetermin",
         dual: "Dual (Haupt- oder Folgetermin)",
      };
      return labels[appointmentType] || appointmentType;
   }
}

module.exports = NotificationService;
