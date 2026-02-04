// i18n.js - Internationalization utility for language switching and translations
import { de } from "./de.js";
import { en } from "./en.js";

const STORAGE_KEY = "preferredLanguage";
const DEFAULT_LANGUAGE = "de";

let currentLanguage = DEFAULT_LANGUAGE;
let translations = { de, en };

/**
 * Initialize i18n system
 * - Check localStorage for saved language preference
 * - Check if language selector should be shown (first visit)
 */
export function initI18n() {
   const savedLanguage = localStorage.getItem(STORAGE_KEY);

   if (savedLanguage && (savedLanguage === "de" || savedLanguage === "en")) {
      currentLanguage = savedLanguage;
      return false; // Don't show language selector
   }

   return true; // Show language selector (first visit)
}

/**
 * Set the current language
 */
export function setLanguage(lang) {
   if (lang !== "de" && lang !== "en") {
      console.error("Invalid language:", lang);
      return;
   }

   currentLanguage = lang;
   localStorage.setItem(STORAGE_KEY, lang);

   // Update HTML lang attribute
   document.documentElement.lang = lang;
}

/**
 * Get the current language
 */
export function getCurrentLanguage() {
   return currentLanguage;
}

/**
 * Get translation by key path (e.g., 'header.title' or 'items[0]')
 */
export function t(keyPath, replacements = {}) {
   // Split the path and handle array indices like items[0]
   const parts = keyPath.split(".");
   let value = translations[currentLanguage];

   for (const part of parts) {
      // Check if this part has an array index notation like "items[0]"
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);

      if (arrayMatch) {
         // Handle array index notation
         const [, key, index] = arrayMatch;
         if (value && typeof value === "object" && key in value) {
            value = value[key];
            if (Array.isArray(value)) {
               value = value[parseInt(index)];
            } else {
               console.warn(`Translation key "${key}" in "${keyPath}" is not an array`);
               return keyPath;
            }
         } else {
            console.warn(`Translation key not found: ${keyPath}`);
            return keyPath;
         }
      } else {
         // Handle regular object property
         if (value && typeof value === "object" && part in value) {
            value = value[part];
         } else {
            console.warn(`Translation key not found: ${keyPath}`);
            return keyPath;
         }
      }
   }

   // Handle replacements like {{count}}
   if (typeof value === "string" && Object.keys(replacements).length > 0) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
         return replacements[key] !== undefined ? replacements[key] : match;
      });
   }

   return value;
}

/**
 * Get entire translation object for current language
 */
export function getTranslations() {
   return translations[currentLanguage];
}

/**
 * Update all translatable elements on the page
 * Elements with data-i18n attribute will be translated
 * Example: <h1 data-i18n="header.title"></h1>
 */
export function updatePageTranslations() {
   const elements = document.querySelectorAll("[data-i18n]");

   elements.forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const translation = t(key);

      // Skip if translation is not found or is an array/object
      if (typeof translation !== "string") {
         if (Array.isArray(translation)) {
            console.warn(`Translation key "${key}" is an array. Handle it in JavaScript instead.`);
         }
         return;
      }

      // Always use innerHTML to preserve HTML tags like <strong>, <br>, etc.
      element.innerHTML = translation;
   });

   // Update placeholders
   const placeholderElements = document.querySelectorAll("[data-i18n-placeholder]");
   placeholderElements.forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      const translation = t(key);
      if (typeof translation === "string") {
         element.placeholder = translation;
      }
   });

   // Update aria-labels
   const ariaElements = document.querySelectorAll("[data-i18n-aria]");
   ariaElements.forEach((element) => {
      const key = element.getAttribute("data-i18n-aria");
      const translation = t(key);
      if (typeof translation === "string") {
         element.setAttribute("aria-label", translation);
      }
   });
}

/**
 * Format date according to current language
 */
export function formatDate(date, options = {}) {
   const locale = currentLanguage === "de" ? "de-DE" : "en-US";
   const defaultOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
   };

   return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(date);
}

/**
 * Format time according to current language
 */
export function formatTime(date) {
   const locale = currentLanguage === "de" ? "de-DE" : "en-US";

   return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
   }).format(date);
}

/**
 * Format date and time together
 */
export function formatDateTime(date) {
   return `${formatDate(date)} ${formatTime(date)}`;
}
