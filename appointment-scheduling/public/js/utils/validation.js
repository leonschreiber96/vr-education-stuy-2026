// Form validation utilities

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidEmail(email) {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return emailRegex.test(email);
}

/**
 * Validate that a string is not empty or whitespace-only
 * @param {string} value - String to validate
 * @returns {boolean} True if not empty, false otherwise
 */
export function isNotEmpty(value) {
   return value && value.trim().length > 0;
}

/**
 * Validate minimum length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum required length
 * @returns {boolean} True if meets minimum length, false otherwise
 */
export function hasMinLength(value, minLength) {
   return value && value.trim().length >= minLength;
}

/**
 * Validate maximum length
 * @param {string} value - String to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} True if within maximum length, false otherwise
 */
export function hasMaxLength(value, maxLength) {
   return value && value.trim().length <= maxLength;
}

/**
 * Validate that a value is selected (not null/undefined)
 * @param {*} value - Value to validate
 * @returns {boolean} True if selected, false otherwise
 */
export function isSelected(value) {
   return value !== null && value !== undefined && value !== '';
}

/**
 * Validate form field and return error message if invalid
 * @param {string} value - Value to validate
 * @param {Object} rules - Validation rules
 * @returns {string|null} Error message or null if valid
 */
export function validateField(value, rules) {
   if (rules.required && !isNotEmpty(value)) {
      return rules.requiredMessage || 'Dieses Feld ist erforderlich.';
   }

   if (rules.email && value && !isValidEmail(value)) {
      return rules.emailMessage || 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
   }

   if (rules.minLength && value && !hasMinLength(value, rules.minLength)) {
      return rules.minLengthMessage || `Mindestens ${rules.minLength} Zeichen erforderlich.`;
   }

   if (rules.maxLength && value && !hasMaxLength(value, rules.maxLength)) {
      return rules.maxLengthMessage || `Maximal ${rules.maxLength} Zeichen erlaubt.`;
   }

   if (rules.custom && typeof rules.custom === 'function') {
      const customResult = rules.custom(value);
      if (customResult !== true) {
         return customResult || 'Ungültiger Wert.';
      }
   }

   return null;
}

/**
 * Validate multiple form fields
 * @param {Object} fields - Object with field names as keys and values to validate
 * @param {Object} rules - Object with field names as keys and validation rules as values
 * @returns {Object} Object with field names as keys and error messages as values (or null if valid)
 */
export function validateForm(fields, rules) {
   const errors = {};

   for (const fieldName in rules) {
      if (rules.hasOwnProperty(fieldName)) {
         const value = fields[fieldName];
         const fieldRules = rules[fieldName];
         const error = validateField(value, fieldRules);

         if (error) {
            errors[fieldName] = error;
         }
      }
   }

   return errors;
}

/**
 * Check if validation errors object has any errors
 * @param {Object} errors - Errors object from validateForm
 * @returns {boolean} True if there are errors, false otherwise
 */
export function hasErrors(errors) {
   return Object.keys(errors).length > 0;
}

/**
 * Get first error message from errors object
 * @param {Object} errors - Errors object from validateForm
 * @returns {string|null} First error message or null if no errors
 */
export function getFirstError(errors) {
   const keys = Object.keys(errors);
   return keys.length > 0 ? errors[keys[0]] : null;
}

/**
 * Validate name field (common validation)
 * @param {string} name - Name to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateName(name) {
   return validateField(name, {
      required: true,
      requiredMessage: 'Bitte geben Sie Ihren Namen ein.',
      minLength: 2,
      minLengthMessage: 'Der Name muss mindestens 2 Zeichen lang sein.'
   });
}

/**
 * Validate email field (common validation)
 * @param {string} email - Email to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
   return validateField(email, {
      required: true,
      requiredMessage: 'Bitte geben Sie Ihre E-Mail-Adresse ein.',
      email: true,
      emailMessage: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
   });
}
