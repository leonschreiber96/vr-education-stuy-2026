// Booking service - handles all booking-related API calls

/**
 * Register a new participant with primary and followup appointments
 * @param {Object} registrationData - Registration data
 * @param {string} registrationData.name - Participant name
 * @param {string} registrationData.email - Participant email
 * @param {number} registrationData.primaryTimeslotId - Primary timeslot ID
 * @param {number} registrationData.followupTimeslotId - Followup timeslot ID
 * @returns {Promise<Object>} Registration confirmation with token
 */
export async function registerParticipant(registrationData) {
   const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData)
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Anmeldung fehlgeschlagen');
   }

   return await response.json();
}

/**
 * Fetch booking information by confirmation token
 * @param {string} token - Confirmation token
 * @returns {Promise<Array>} Array of booking objects (primary and followup)
 */
export async function fetchBookingByToken(token) {
   if (!token) {
      throw new Error('Token ist erforderlich');
   }

   const response = await fetch(`/api/booking/${token}`);

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Ungültiger Bestätigungscode');
   }

   return await response.json();
}

/**
 * Reschedule a booking to a new timeslot
 * @param {Object} rescheduleData - Reschedule data
 * @param {string} rescheduleData.token - Confirmation token
 * @param {number} rescheduleData.bookingId - Booking ID to reschedule
 * @param {number} rescheduleData.newTimeslotId - New timeslot ID
 * @param {number} rescheduleData.newFollowupTimeslotId - Optional new followup timeslot ID (when rescheduling both)
 * @returns {Promise<Object>} Reschedule confirmation
 */
export async function rescheduleBooking(rescheduleData) {
   const response = await fetch('/api/reschedule', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(rescheduleData)
   });

   const data = await response.json();

   if (!response.ok) {
      // Pass through the full error data (may include requiresFollowupReschedule)
      const error = new Error(data.error || 'Fehler beim Ändern des Termins');
      error.data = data;
      throw error;
   }

   return data;
}

/**
 * Cancel a booking (both primary and followup)
 * @param {string} token - Confirmation token
 * @returns {Promise<Object>} Cancellation confirmation
 */
export async function cancelBooking(token) {
   if (!token) {
      throw new Error('Token ist erforderlich');
   }

   const response = await fetch('/api/cancel', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Fehler beim Stornieren');
   }

   return await response.json();
}

/**
 * Fetch all bookings (admin only)
 * @param {string} token - Admin authentication token
 * @returns {Promise<Array>} Array of all bookings
 */
export async function fetchAllBookings(token) {
   const response = await fetch('/api/admin/bookings', {
      headers: {
         'Authorization': `Bearer ${token}`
      }
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Fehler beim Laden der Buchungen');
   }

   return await response.json();
}

/**
 * Mark a participant as no-show (admin only)
 * @param {number} bookingId - Booking ID
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Update confirmation
 */
export async function markAsNoShow(bookingId, token) {
   const response = await fetch(`/api/admin/bookings/${bookingId}/no-show`, {
      method: 'PUT',
      headers: {
         'Authorization': `Bearer ${token}`
      }
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Fehler beim Aktualisieren des Status');
   }

   return await response.json();
}

/**
 * Update booking status (admin only)
 * @param {number} bookingId - Booking ID
 * @param {string} status - New status
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Update confirmation
 */
export async function updateBookingStatus(bookingId, status, token) {
   const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Fehler beim Aktualisieren des Status');
   }

   return await response.json();
}
