// Date and time formatting utilities

/**
 * Format a date object to German locale date string
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "Montag, 15. Januar 2024")
 */
export function formatDate(date) {
   return date.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
   });
}

/**
 * Format a date object to German locale time string
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string (e.g., "14:30")
 */
export function formatTime(date) {
   return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
   });
}

/**
 * Format a time range between two dates
 * @param {Date} startDate - The start date/time
 * @param {Date} endDate - The end date/time
 * @returns {string} Formatted time range (e.g., "14:30 - 16:00")
 */
export function formatTimeRange(startDate, endDate) {
   return `${formatTime(startDate)} - ${formatTime(endDate)}`;
}

/**
 * Format a date object to German locale date and time string
 * @param {Date} date - The date to format
 * @returns {string} Formatted datetime string (e.g., "Montag, 15. Januar 2024, 14:30")
 */
export function formatDateTime(date) {
   return date.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   });
}

/**
 * Calculate the number of days between two dates
 * @param {Date} startDate - The start date
 * @param {Date} endDate - The end date
 * @returns {number} Number of days between dates (rounded)
 */
export function daysBetween(startDate, endDate) {
   return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
}

/**
 * Convert ISO date string to Date object
 * @param {string} isoString - ISO date string
 * @returns {Date} Date object
 */
export function parseISODate(isoString) {
   return new Date(isoString);
}

/**
 * Get ISO date string from Date object (YYYY-MM-DD format)
 * @param {Date} date - The date to convert
 * @returns {string} ISO date string
 */
export function toISODateString(date) {
   return date.toISOString().split("T")[0];
}
