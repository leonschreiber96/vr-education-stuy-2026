// DOM manipulation utilities

/**
 * Safely get an element by ID
 * @param {string} id - The element ID
 * @returns {HTMLElement|null} The element or null if not found
 */
export function getElementById(id) {
   return document.getElementById(id);
}

/**
 * Safely get an element by ID and throw an error if not found
 * @param {string} id - The element ID
 * @returns {HTMLElement} The element
 * @throws {Error} If element is not found
 */
export function getRequiredElement(id) {
   const element = document.getElementById(id);
   if (!element) {
      throw new Error(`Required element with ID '${id}' not found`);
   }
   return element;
}

/**
 * Show an element by removing the 'hidden' class
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
export function show(elementOrId) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.classList.remove('hidden');
      element.style.display = '';
   }
}

/**
 * Hide an element by adding the 'hidden' class
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
export function hide(elementOrId) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.classList.add('hidden');
   }
}

/**
 * Toggle element visibility
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
export function toggle(elementOrId) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      if (element.classList.contains('hidden')) {
         show(element);
      } else {
         hide(element);
      }
   }
}

/**
 * Set element's innerHTML safely
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} html - HTML content to set
 */
export function setHTML(elementOrId, html) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.innerHTML = html;
   }
}

/**
 * Set element's text content
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} text - Text content to set
 */
export function setText(elementOrId, text) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.textContent = text;
   }
}

/**
 * Get element's value (for input elements)
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @returns {string} The element's value
 */
export function getValue(elementOrId) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   return element ? element.value : '';
}

/**
 * Set element's value (for input elements)
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} value - Value to set
 */
export function setValue(elementOrId, value) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.value = value;
   }
}

/**
 * Add a CSS class to an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name to add
 */
export function addClass(elementOrId, className) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.classList.add(className);
   }
}

/**
 * Remove a CSS class from an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name to remove
 */
export function removeClass(elementOrId, className) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.classList.remove(className);
   }
}

/**
 * Toggle a CSS class on an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name to toggle
 */
export function toggleClass(elementOrId, className) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.classList.toggle(className);
   }
}

/**
 * Enable a button or input element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
export function enable(elementOrId) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.disabled = false;
   }
}

/**
 * Disable a button or input element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
export function disable(elementOrId) {
   const element = typeof elementOrId === 'string'
      ? getElementById(elementOrId)
      : elementOrId;

   if (element) {
      element.disabled = true;
   }
}

/**
 * Scroll to top of page smoothly
 */
export function scrollToTop() {
   window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Query selector helper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {HTMLElement|null} First matching element
 */
export function querySelector(selector, parent = document) {
   return parent.querySelector(selector);
}

/**
 * Query selector all helper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {NodeList} All matching elements
 */
export function querySelectorAll(selector, parent = document) {
   return parent.querySelectorAll(selector);
}
