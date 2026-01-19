// Authentication utilities
import { AdminAPI } from '../api.js';

/**
 * Authentication manager for admin panel
 */
export class Auth {
    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    static async check() {
        try {
            const data = await AdminAPI.checkAuth();
            return data.authenticated === true;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    /**
     * Login with username and password
     * @param {string} username
     * @param {string} password
     * @returns {Promise<object>}
     */
    static async login(username, password) {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        try {
            const data = await AdminAPI.login(username, password);

            if (data.success) {
                console.log('✓ Login successful');
                return data;
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    static async logout() {
        try {
            await AdminAPI.logout();
            console.log('✓ Logout successful');
        } catch (error) {
            console.error('Logout failed:', error);
            // Don't throw - allow logout to proceed even if API call fails
        }
    }

    /**
     * Require authentication - redirect to login if not authenticated
     * @returns {Promise<boolean>}
     */
    static async requireAuth() {
        const isAuthenticated = await this.check();

        if (!isAuthenticated) {
            console.log('❌ Not authenticated - showing login');
            return false;
        }

        console.log('✓ Authenticated');
        return true;
    }
}
