// Alert/notification component for displaying user feedback

/**
 * Show an alert message to the user
 * @param {string} message - Message to display
 * @param {string} type - Alert type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in ms (0 = no auto-dismiss)
 */
export function showAlert(message, type = 'info', duration = 3000) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.3s ease';

    // Find or create alert container
    let container = document.getElementById('alertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alertContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.maxWidth = '400px';
        document.body.appendChild(container);
    }

    container.appendChild(alert);

    // Fade in
    setTimeout(() => {
        alert.style.opacity = '1';
    }, 10);

    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => {
            dismissAlert(alert);
        }, duration);
    }

    return alert;
}

/**
 * Dismiss an alert
 * @param {HTMLElement} alert - Alert element to dismiss
 */
export function dismissAlert(alert) {
    alert.style.opacity = '0';
    setTimeout(() => {
        alert.remove();
    }, 300);
}

/**
 * Show a success alert
 * @param {string} message
 */
export function showSuccess(message) {
    return showAlert(message, 'success');
}

/**
 * Show an error alert
 * @param {string} message
 */
export function showError(message) {
    return showAlert(message, 'error', 5000); // Errors stay longer
}

/**
 * Show an info alert
 * @param {string} message
 */
export function showInfo(message) {
    return showAlert(message, 'info');
}

/**
 * Show a warning alert
 * @param {string} message
 */
export function showWarning(message) {
    return showAlert(message, 'warning', 4000);
}

/**
 * Clear all alerts
 */
export function clearAllAlerts() {
    const container = document.getElementById('alertContainer');
    if (container) {
        container.innerHTML = '';
    }
}
