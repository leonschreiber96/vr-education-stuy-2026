// API client for making HTTP requests to the backend
import { API_BASE } from './config.js';

/**
 * Centralized API client for all backend communication
 */
export class API {
    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint (e.g., '/admin/participants')
     * @returns {Promise<any>} Response data
     */
    static async get(endpoint) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                method: 'GET',
                credentials: 'include', // Include cookies for session
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API GET ${endpoint} failed:`, error);
            throw error;
        }
    }

    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @returns {Promise<any>} Response data
     */
    static async post(endpoint, data = {}) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API POST ${endpoint} failed:`, error);
            throw error;
        }
    }

    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @returns {Promise<any>} Response data
     */
    static async put(endpoint, data = {}) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API PUT ${endpoint} failed:`, error);
            throw error;
        }
    }

    /**
     * Make a PATCH request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @returns {Promise<any>} Response data
     */
    static async patch(endpoint, data = {}) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API PATCH ${endpoint} failed:`, error);
            throw error;
        }
    }

    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise<any>} Response data
     */
    static async delete(endpoint) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API DELETE ${endpoint} failed:`, error);
            throw error;
        }
    }
}

/**
 * Specialized API endpoints for common operations
 */
export const AdminAPI = {
    // Authentication
    checkAuth: () => API.get('/admin/check'),
    login: (username, password) => API.post('/admin/login', { username, password }),
    logout: () => API.post('/admin/logout'),

    // Participants
    getParticipants: () => API.get('/admin/participants'),
    deleteParticipant: (id) => API.delete(`/admin/participants/${id}`),

    // Timeslots
    getTimeslots: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.get(`/admin/timeslots${query ? '?' + query : ''}`);
    },
    getTimeslot: (id) => API.get(`/admin/timeslots/${id}`),
    createTimeslot: (data) => API.post('/admin/timeslots', data),
    updateTimeslot: (id, data) => API.put(`/admin/timeslots/${id}`, data),
    deleteTimeslot: (id) => API.delete(`/admin/timeslots/${id}`),
    bulkCreateTimeslots: (data) => API.post('/admin/bulk-timeslots', data),
    bulkDeleteTimeslots: (ids) => API.post('/admin/timeslots/bulk', { ids }),
    cancelTimeslotBookings: (id) => API.post(`/admin/timeslots/${id}/cancel-bookings`),

    // Bookings
    getBookings: () => API.get('/admin/bookings'),
    getUnreviewedBookings: () => API.get('/admin/bookings/unreviewed'),
    updateBookingResultStatus: (id, resultStatus) =>
        API.patch(`/admin/bookings/${id}/result-status`, { resultStatus }),

    // Logs
    getLogs: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.get(`/admin/logs${query ? '?' + query : ''}`);
    },

    // Misc
    getConfig: () => API.get('/config'),
    sendCustomEmail: (data) => API.post('/admin/send-email', data),
};
