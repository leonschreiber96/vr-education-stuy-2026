// Admin service - handles admin authentication and operations

import { API_BASE } from "../config.js";

/**
 * Login as admin
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise<Object>} Login response with token
 */
export async function login(username, password) {
   const response = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Login fehlgeschlagen");
   }

   return await response.json();
}

/**
 * Verify admin token is valid
 * @param {string} token - Admin authentication token
 * @returns {Promise<boolean>} True if token is valid
 */
export async function verifyToken(token) {
   try {
      const response = await fetch(`${API_BASE}/admin/verify`, {
         headers: {
            Authorization: `Bearer ${token}`,
         },
      });

      return response.ok;
   } catch (error) {
      console.error("Token verification error:", error);
      return false;
   }
}

/**
 * Fetch admin dashboard statistics
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function fetchDashboardStats(token) {
   const response = await fetch(`${API_BASE}/admin/stats`, {
      headers: {
         Authorization: `Bearer ${token}`,
      },
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Laden der Statistiken");
   }

   return await response.json();
}

/**
 * Fetch all participants (admin only)
 * @param {string} token - Admin authentication token
 * @returns {Promise<Array>} Array of participants
 */
export async function fetchAllParticipants(token) {
   const response = await fetch(`${API_BASE}/admin/participants`, {
      headers: {
         Authorization: `Bearer ${token}`,
      },
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Laden der Teilnehmer");
   }

   return await response.json();
}

/**
 * Export participants data as CSV (admin only)
 * @param {string} token - Admin authentication token
 * @returns {Promise<Blob>} CSV file blob
 */
export async function exportParticipantsCSV(token) {
   const response = await fetch(`${API_BASE}/admin/participants/export`, {
      headers: {
         Authorization: `Bearer ${token}`,
      },
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Exportieren der Daten");
   }

   return await response.blob();
}

/**
 * Send reminder emails to participants (admin only)
 * @param {Array<number>} bookingIds - Array of booking IDs to send reminders to
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Result of reminder sending
 */
export async function sendReminders(bookingIds, token) {
   const response = await fetch(`${API_BASE}/admin/send-reminders`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingIds }),
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Senden der Erinnerungen");
   }

   return await response.json();
}

/**
 * Get system configuration (admin only)
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} System configuration
 */
export async function getSystemConfig(token) {
   const response = await fetch(`${API_BASE}/admin/config`, {
      headers: {
         Authorization: `Bearer ${token}`,
      },
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Fehler beim Laden der Konfiguration");
   }

   return await response.json();
}

/**
 * Update system configuration (admin only)
 * @param {Object} config - Configuration to update
 * @param {string} token - Admin authentication token
 * @returns {Promise<Object>} Updated configuration
 */
export async function updateSystemConfig(config, token) {
   const response = await fetch(`${API_BASE}/admin/config`, {
      method: "PUT",
      headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
         error.error || "Fehler beim Aktualisieren der Konfiguration",
      );
   }

   return await response.json();
}

/**
 * Store token in localStorage
 * @param {string} token - Admin authentication token
 */
export function storeToken(token) {
   localStorage.setItem("adminToken", token);
}

/**
 * Retrieve token from localStorage
 * @returns {string|null} Admin authentication token or null
 */
export function getStoredToken() {
   return localStorage.getItem("adminToken");
}

/**
 * Remove token from localStorage (logout)
 */
export function removeToken() {
   localStorage.removeItem("adminToken");
}

/**
 * Check if user is logged in (has valid token in localStorage)
 * @returns {boolean} True if token exists in localStorage
 */
export function isLoggedIn() {
   return !!getStoredToken();
}
