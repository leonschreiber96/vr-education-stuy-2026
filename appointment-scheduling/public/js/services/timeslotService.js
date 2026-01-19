// Timeslot service - handles all timeslot-related API calls

import { API_BASE } from "../config.js";

/**
 * Fetch all timeslots with optional filtering
 * @param {Object} params - Query parameters
 * @param {string} params.type - Type of timeslot ('primary' or 'followup')
 * @param {string} params.primaryDate - Primary date for followup filtering (YYYY-MM-DD)
 * @param {number} params.limit - Limit number of results
 * @returns {Promise<Array>} Array of timeslot objects
 */
export async function fetchTimeslots(params = {}) {
   const queryParams = new URLSearchParams();

   if (params.type) {
      queryParams.append("type", params.type);
   }

   if (params.primaryDate) {
      queryParams.append("primaryDate", params.primaryDate);
   }

   if (params.limit) {
      queryParams.append("limit", params.limit);
   }

   const url = `${API_BASE}/timeslots${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

   const response = await fetch(url);

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Laden der Termine");
   }

   return await response.json();
}

/**
 * Fetch primary timeslots only
 * @returns {Promise<Array>} Array of primary timeslot objects
 */
export async function fetchPrimaryTimeslots() {
   return fetchTimeslots({ type: "primary" });
}

/**
 * Fetch followup timeslots for a specific primary date
 * @param {string} primaryDate - Primary appointment date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of followup timeslot objects
 */
export async function fetchFollowupTimeslots(primaryDate) {
   if (!primaryDate) {
      throw new Error("Primary date is required for followup timeslots");
   }

   return fetchTimeslots({ type: "followup", primaryDate });
}

/**
 * Create a new timeslot (admin only)
 * @param {Object} timeslotData - Timeslot data
 * @param {string} timeslotData.start_time - Start time (ISO string)
 * @param {string} timeslotData.end_time - End time (ISO string)
 * @param {string} timeslotData.location - Location
 * @param {boolean} timeslotData.is_followup - Whether this is a followup slot
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Created timeslot object
 */
export async function createTimeslot(timeslotData, token) {
   const response = await fetch(`${API_BASE}/admin/timeslots`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(timeslotData),
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Erstellen des Termins");
   }

   return await response.json();
}

/**
 * Update an existing timeslot (admin only)
 * @param {number} timeslotId - Timeslot ID
 * @param {Object} timeslotData - Updated timeslot data
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Updated timeslot object
 */
export async function updateTimeslot(timeslotId, timeslotData, token) {
   const response = await fetch(`${API_BASE}/admin/timeslots/${timeslotId}`, {
      method: "PUT",
      headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(timeslotData),
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Aktualisieren des Termins");
   }

   return await response.json();
}

/**
 * Delete a timeslot (admin only)
 * @param {number} timeslotId - Timeslot ID
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteTimeslot(timeslotId, token) {
   const response = await fetch(`${API_BASE}/admin/timeslots/${timeslotId}`, {
      method: "DELETE",
      headers: {
         Authorization: `Bearer ${token}`,
      },
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Löschen des Termins");
   }

   return await response.json();
}

/**
 * Fetch all timeslots for admin dashboard (no limit)
 * @param {string} token - Admin authentication token
 * @returns {Promise<Array>} Array of all timeslot objects
 */
export async function fetchAllTimeslotsForAdmin(token) {
   const response = await fetch(`${API_BASE}/admin/timeslots`, {
      headers: {
         Authorization: `Bearer ${token}`,
      },
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Laden der Termine");
   }

   return await response.json();
}
