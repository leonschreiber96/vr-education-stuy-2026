// Configuration and constants for the admin application

// Calculate BASE_PATH from current URL
export const BASE_PATH = window.location.pathname.split("/").slice(0, -1).join("/") || "";

// API base URL
export const API_BASE = BASE_PATH + "/api";

// Application constants
export const PARTICIPANT_GOAL = 80;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 25;

// Date/time formats
export const DATE_FORMAT = {
    locale: 'de-DE',
    options: {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }
};

export const DATETIME_FORMAT = {
    locale: 'de-DE',
    options: {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }
};

// Appointment type labels
export const APPOINTMENT_TYPES = {
    primary: 'Haupttermin',
    followup: 'Folgetermin',
    dual: 'Dual'
};

// Result status labels
export const RESULT_STATUS = {
    success: 'Erfolgreich',
    issues: 'Kleinere Probleme',
    unusable: 'Nicht verwendbar',
    noshow: 'Nicht erschienen'
};

// Follow-up day constraints
export const FOLLOWUP_MIN_DAYS = 29;
export const FOLLOWUP_MAX_DAYS = 31;

// Default timeslot duration (in minutes)
export const DEFAULT_TIMESLOT_DURATION = 45;
export const DEFAULT_BULK_DURATION = 60;

// Auto-refresh intervals (in milliseconds)
export const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

// Log the configuration on load
console.log('Frontend BASE_PATH:', BASE_PATH || '(root)');
