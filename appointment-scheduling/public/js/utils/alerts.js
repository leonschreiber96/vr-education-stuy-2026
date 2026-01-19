// Alert and notification utilities

/**
 * Show an alert message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of alert ('info', 'success', 'warning', 'error')
 * @param {string} containerId - The ID of the container element (default: 'alertContainer')
 * @param {boolean} autoHide - Whether to auto-hide the alert after 5 seconds (default: true for success/info)
 */
export function showAlert(message, type = "info", containerId = "alertContainer", autoHide = null) {
   const container = document.getElementById(containerId);
   if (!container) {
      console.error(`Alert container with ID '${containerId}' not found`);
      return;
   }

   const alertClass = getAlertClass(type);

   container.innerHTML = `
      <div class="alert ${alertClass}">
         ${message}
      </div>
   `;

   // Scroll to top to ensure alert is visible
   window.scrollTo({ top: 0, behavior: "smooth" });

   // Auto-hide for success/info messages if not explicitly disabled
   const shouldAutoHide = autoHide !== null ? autoHide : (type === "success" || type === "info");

   if (shouldAutoHide) {
      setTimeout(() => {
         clearAlert(containerId);
      }, 5000);
   }
}

/**
 * Clear all alerts from a container
 * @param {string} containerId - The ID of the container element
 */
export function clearAlert(containerId = "alertContainer") {
   const container = document.getElementById(containerId);
   if (container) {
      container.innerHTML = "";
   }
}

/**
 * Get the CSS class for an alert type
 * @param {string} type - The alert type
 * @returns {string} The CSS class name
 */
function getAlertClass(type) {
   switch (type) {
      case "error":
         return "alert-error";
      case "success":
         return "alert-success";
      case "warning":
         return "alert-warning";
      case "info":
      default:
         return "alert-info";
   }
}

/**
 * Show a success message
 * @param {string} message - The message to display
 * @param {string} containerId - The ID of the container element
 */
export function showSuccess(message, containerId = "alertContainer") {
   showAlert(message, "success", containerId);
}

/**
 * Show an error message
 * @param {string} message - The message to display
 * @param {string} containerId - The ID of the container element
 */
export function showError(message, containerId = "alertContainer") {
   showAlert(message, "error", containerId, false);
}

/**
 * Show a warning message
 * @param {string} message - The message to display
 * @param {string} containerId - The ID of the container element
 */
export function showWarning(message, containerId = "alertContainer") {
   showAlert(message, "warning", containerId);
}

/**
 * Show an info message
 * @param {string} message - The message to display
 * @param {string} containerId - The ID of the container element
 */
export function showInfo(message, containerId = "alertContainer") {
   showAlert(message, "info", containerId);
}
