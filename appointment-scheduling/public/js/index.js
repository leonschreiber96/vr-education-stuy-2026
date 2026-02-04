// Main entry point for registration page (index.html)
// This file orchestrates the registration workflow using modular components

import {
   state,
   setParticipantInfo,
   setPrimaryTimeslots,
   setFollowupTimeslots,
   setStep,
   hasPrimaryTimeslot,
} from "./pages/index/state.js";
import {
   displayPrimaryTimeslots,
   displayFollowupTimeslots,
   displaySelectedPrimaryInfo,
   displayFeaturedTimeslot,
   handlePrimaryTimeslotSelection,
   handleFollowupTimeslotSelection,
   handleFeaturedTimeslotSelection,
} from "./pages/index/timeslotSelection.js";
import { fetchPrimaryTimeslots, fetchFollowupTimeslots } from "./services/timeslotService.js";
import { registerParticipant } from "./services/bookingService.js";
import { showAlert, showWarning, showError } from "./utils/alerts.js";
import { validateName, validateEmail } from "./utils/validation.js";
import { hide, show, getValue, setText, disable, scrollToTop } from "./utils/dom.js";
import { formatDate, formatTimeRange, parseISODate, toISODateString } from "./utils/dateFormatter.js";
import { initI18n, setLanguage, t, updatePageTranslations } from "./i18n/i18n.js";
import { showLanguageSelector } from "./components/languageSelector.js";

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
   initializeApp();
});

/**
 * Initialize the application with i18n support
 */
async function initializeApp() {
   const shouldShowLanguageSelector = initI18n();

   if (shouldShowLanguageSelector) {
      // First-time visitor - show language selector
      showLanguageSelector((selectedLanguage) => {
         // After language selection, load the app
         loadApp();
      });
   } else {
      // Returning visitor - load app directly
      loadApp();
   }
}

/**
 * Load the main application
 */
function loadApp() {
   // Update all translations on the page
   updatePageTranslations();

   // Load primary timeslots
   loadPrimaryTimeslots();

   // Setup scroll prevention
   setupScrollPrevention();
}

// Expose functions to global scope for onclick handlers
window.proceedToStep1 = proceedToStep1;
window.handlePrimaryTimeslotClick = handlePrimaryTimeslotSelection;
window.handleFollowupTimeslotClick = handleFollowupTimeslotSelection;
window.handleFeaturedTimeslotClick = handleFeaturedTimeslotSelection;
window.continueToStep2 = continueToStep2;
window.continueToStep3 = continueToStep3;
window.submitRegistration = submitRegistration;
window.backToStep0 = backToStep0;
window.backToStep1 = backToStep1;
window.backToStep2 = backToStep2;

/**
 * Load primary appointment timeslots
 */
async function loadPrimaryTimeslots() {
   try {
      const timeslots = await fetchPrimaryTimeslots();
      setPrimaryTimeslots(timeslots);
      console.log("Loaded primary timeslots:", timeslots.length);

      // Load and display featured timeslot
      await displayFeaturedTimeslot();
   } catch (error) {
      console.error("Error loading primary timeslots:", error);
      showError(t("alerts.loadingError"));
   }
}

/**
 * Step 0 → Step 1: Proceed from study description to primary appointment selection
 */
function proceedToStep1() {
   setStep(1);

   hide("studyDescriptionSection");
   show("primaryAppointmentSection");

   // Update step indicator
   document.getElementById("step0").classList.remove("active");
   document.getElementById("step1").classList.add("active");

   // Display primary timeslots
   displayPrimaryTimeslots();

   // Setup scroll prevention
   setTimeout(() => preventPageScrollOnContainer(), 100);

   scrollToTop();
}

/**
 * Step 1 → Step 2: Continue from primary appointment to follow-up appointment selection
 */
async function continueToStep2() {
   if (!hasPrimaryTimeslot()) {
      showWarning(t("primaryAppointment.noTimeslotWarning"));
      return;
   }

   setStep(2);

   // Update UI
   hide("primaryAppointmentSection");
   show("followupAppointmentSection");
   updateStepIndicator();

   // Display selected primary appointment info
   displaySelectedPrimaryInfo();

   // Load and display follow-up timeslots
   await loadFollowupTimeslots();

   scrollToTop();
}

/**
 * Step 2 → Step 3: Continue from follow-up appointment to personal data & questionnaire
 */
function continueToStep3() {
   if (!state.selectedFollowupTimeslotId) {
      showWarning(t("followupAppointment.noTimeslotWarning"));
      return;
   }

   setStep(3);

   // Update UI
   hide("followupAppointmentSection");
   show("personalInfoSection");
   updateStepIndicator();

   // Setup form validation to enable submit button
   setupFormValidation();

   scrollToTop();
}

/**
 * Setup form validation to enable/disable submit button based on form completion
 */
function setupFormValidation() {
   const submitBtn = document.getElementById("submitRegistrationBtn");
   if (!submitBtn) return;

   // Get all form inputs
   const nameInput = document.getElementById("name");
   const emailInput = document.getElementById("email");
   const visionCorrectionInput = document.getElementById("visionCorrection");
   const studySubjectInput = document.getElementById("studySubject");

   // Function to check if form is complete
   const checkFormComplete = () => {
      const name = nameInput?.value.trim();
      const email = emailInput?.value.trim();
      const visionCorrection = visionCorrectionInput?.value;
      const studySubject = studySubjectInput?.value.trim();
      const vrExperience = document.querySelector('input[name="vrExperience"]:checked');
      const motionSickness = document.querySelector('input[name="motionSickness"]:checked');

      // Enable button if all fields are filled
      const isComplete = name && email && visionCorrection && studySubject && vrExperience && motionSickness;

      if (isComplete) {
         submitBtn.disabled = false;
      } else {
         submitBtn.disabled = true;
      }
   };

   // Add event listeners to all inputs
   nameInput?.addEventListener("input", checkFormComplete);
   emailInput?.addEventListener("input", checkFormComplete);
   visionCorrectionInput?.addEventListener("change", checkFormComplete);
   studySubjectInput?.addEventListener("input", checkFormComplete);

   // Add listeners to radio buttons
   document.querySelectorAll('input[name="vrExperience"]').forEach((input) => {
      input.addEventListener("change", checkFormComplete);
   });
   document.querySelectorAll('input[name="motionSickness"]').forEach((input) => {
      input.addEventListener("change", checkFormComplete);
   });

   // Check initial state
   checkFormComplete();
}

/**
 * Load follow-up timeslots in valid range (29-31 days after primary)
 */
async function loadFollowupTimeslots() {
   const loading = document.getElementById("followupTimeslotsLoading");
   const container = document.getElementById("followupTimeslotsContainer");

   if (!loading || !container) return;

   loading.classList.remove("hidden");
   container.classList.add("hidden");

   try {
      const primaryDate = parseISODate(state.selectedPrimaryTimeslot.start_time);
      const primaryDateStr = toISODateString(primaryDate);

      const timeslots = await fetchFollowupTimeslots(primaryDateStr);
      setFollowupTimeslots(timeslots);
      console.log("Loaded follow-up timeslots:", timeslots.length);

      displayFollowupTimeslots();

      // Setup scroll prevention
      setTimeout(() => preventPageScrollOnContainer(), 100);
   } catch (error) {
      console.error("Error loading follow-up timeslots:", error);
      showError("Fehler beim Laden der Folgetermine. Bitte versuchen Sie es später erneut.");
      loading.innerHTML = '<p style="color: #dc3545;">Folgetermine konnten nicht geladen werden.</p>';
   }
}

/**
 * Submit registration (with appointments already selected and personal data/questionnaire)
 */
async function submitRegistration() {
   // Validate personal data
   const name = getValue("name").trim();
   const email = getValue("email").trim();

   // Validate name
   const nameError = validateName(name);
   if (nameError) {
      showWarning(nameError);
      return;
   }

   // Validate email
   const emailError = validateEmail(email);
   if (emailError) {
      showWarning(emailError);
      return;
   }

   // Validate questionnaire fields
   const visionCorrection = getValue("visionCorrection");
   if (!visionCorrection) {
      showWarning("Bitte wählen Sie Ihre Sehkorrektur aus.");
      return;
   }

   const studySubject = getValue("studySubject").trim();
   if (!studySubject) {
      showWarning("Bitte geben Sie Ihr Studienfach an.");
      return;
   }

   const vrExperience = document.querySelector('input[name="vrExperience"]:checked');
   if (!vrExperience) {
      showWarning("Bitte bewerten Sie Ihre VR-Erfahrung.");
      return;
   }

   const motionSickness = document.querySelector('input[name="motionSickness"]:checked');
   if (!motionSickness) {
      showWarning("Bitte bewerten Sie Ihre Neigung zu Reiseübelkeit.");
      return;
   }

   // Ensure appointments are selected
   if (!state.selectedPrimaryTimeslotId || !state.selectedFollowupTimeslotId) {
      showWarning("Bitte wählen Sie sowohl einen Haupttermin als auch einen Folgetermin aus.");
      return;
   }

   const submitBtn = document.getElementById("submitRegistrationBtn");
   if (!submitBtn) return;

   const originalText = submitBtn.textContent;
   submitBtn.disabled = true;
   submitBtn.textContent = "Wird gesendet...";

   try {
      // Prepare questionnaire data
      const questionnaireData = {
         visionCorrection,
         studySubject,
         vrExperience: parseInt(vrExperience.value),
         motionSickness: parseInt(motionSickness.value),
      };

      const data = await registerParticipant({
         name: name,
         email: email,
         primaryTimeslotId: state.selectedPrimaryTimeslotId,
         followupTimeslotId: state.selectedFollowupTimeslotId,
         questionnaireData: questionnaireData,
      });

      // Show success page
      showSuccessPage(data, name);
   } catch (error) {
      console.error("Registration error:", error);
      showError(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
   }
}

/**
 * Show success page after registration
 * @param {Object} data - Registration response data
 * @param {string} name - Participant name
 */
function showSuccessPage(data, name) {
   const primarySlot = state.primaryTimeslots.find((s) => s.id === state.selectedPrimaryTimeslotId);
   const followupSlot = state.followupTimeslots.find((s) => s.id === state.selectedFollowupTimeslotId);

   if (!primarySlot || !followupSlot) return;

   const primaryStart = parseISODate(primarySlot.start_time);
   const primaryEnd = parseISODate(primarySlot.end_time);
   const followupStart = parseISODate(followupSlot.start_time);
   const followupEnd = parseISODate(followupSlot.end_time);

   const email = getValue("email").trim();

   // Calculate BASE_PATH from current URL to support subdirectory deployment
   const basePath = window.location.pathname.split("/").slice(0, -1).join("/");
   const managementUrl = `${window.location.origin}${basePath}/manage.html?token=${data.confirmationToken}`;

   const mainContent = document.getElementById("mainContent");
   if (mainContent) {
      mainContent.innerHTML = `
         <div class="success-message">
            <h2>✅ Anmeldung erfolgreich!</h2>
            <p style="font-size: 1.1em;">Vielen Dank für Ihre Anmeldung, <strong>${name}</strong>!</p>

            <div class="appointment-card">
               <h4>📌 Haupttermin</h4>
               <p style="font-size: 1.1em; margin: 10px 0;"><strong>${formatDate(primaryStart)}</strong></p>
               <p style="color: #666;">${formatTimeRange(primaryStart, primaryEnd)}</p>
               ${primarySlot.location ? `<p style="color: #666;">📍 ${primarySlot.location}</p>` : ""}
            </div>

            <div class="appointment-card followup-card">
               <h4>📌 Folgetermin</h4>
               <p style="font-size: 1.1em; margin: 10px 0;"><strong>${formatDate(followupStart)}</strong></p>
               <p style="color: #666;">${formatTimeRange(followupStart, followupEnd)}</p>
               ${followupSlot.location ? `<p style="color: #666;">📍 ${followupSlot.location}</p>` : ""}
            </div>

            <div class="alert alert-info" style="margin-top: 30px; text-align: left;">
               <strong>Wichtig:</strong> Eine Bestätigungsemail wurde an <strong>${email}</strong> gesendet.
               Diese E-Mail enthält einen Link zum Verwalten Ihrer Termine.
            </div>

            <div class="section">
               <h3 style="color: #667eea; margin-top: 30px;">Termine verwalten:</h3>
               <p style="margin-bottom: 15px;">Speichern Sie diesen Link, um Ihre Termine später zu ändern oder abzusagen:</p>
               <div class="success-token">
                  <a href="${managementUrl}" target="_blank">${managementUrl}</a>
               </div>
            </div>

            <div style="margin-top: 30px;">
               <a href="${managementUrl}" class="btn btn-primary" style="color: white;">
                  Zu meinen Terminen
               </a>
               <a href="index.html" class="btn btn-secondary" style="margin-left: 10px; color: white;">
                  Zur Startseite
               </a>
            </div>
         </div>
      `;
   }

   scrollToTop();
}

/**
 * Navigation: Back to step 0 (study info)
 */
function backToStep0() {
   setStep(0);
   state.selectedPrimaryTimeslotId = null;
   state.selectedPrimaryTimeslot = null;

   // Hide scroll hints
   hide("primaryScrollHint");

   hide("primaryAppointmentSection");
   show("studyDescriptionSection");

   // Update step indicator
   document.getElementById("step1").classList.remove("active", "completed");
   document.getElementById("step0").classList.add("active");

   scrollToTop();
}

/**
 * Navigation: Back to step 1 (primary appointment)
 */
function backToStep1() {
   setStep(1);
   state.selectedFollowupTimeslotId = null;

   // Hide scroll hints
   hide("followupScrollHint");

   hide("followupAppointmentSection");
   show("primaryAppointmentSection");
   updateStepIndicator();

   scrollToTop();
}

/**
 * Navigation: Back to step 2 (follow-up appointment)
 */
function backToStep2() {
   setStep(2);

   hide("personalInfoSection");
   show("followupAppointmentSection");
   updateStepIndicator();

   scrollToTop();
}

/**
 * Prevent page scroll when scrolling inside timeslot containers
 */
function preventPageScrollOnContainer() {
   const containers = document.querySelectorAll(".timeslots-container");

   containers.forEach((container) => {
      // Remove existing listeners first to avoid duplicates
      container.removeEventListener("wheel", handleContainerScroll);

      // Add wheel event listener to prevent page scroll
      container.addEventListener("wheel", handleContainerScroll, {
         passive: false,
      });

      // Add scroll listener to update fade indicators
      container.addEventListener("scroll", updateScrollIndicators);

      // Initial update
      updateScrollIndicators.call(container);
   });
}

/**
 * Setup scroll prevention on page load
 */
function setupScrollPrevention() {
   setTimeout(() => preventPageScrollOnContainer(), 100);
}

/**
 * Update scroll indicators for a container
 */
function updateScrollIndicators() {
   const container = this;
   const wrapper = container.parentElement;
   if (!wrapper.classList.contains("timeslots-scroll-wrapper")) return;

   const scrollTop = container.scrollTop;
   const scrollHeight = container.scrollHeight;
   const clientHeight = container.clientHeight;

   // Can scroll up if not at top
   if (scrollTop > 10) {
      wrapper.classList.add("can-scroll-up");
   } else {
      wrapper.classList.remove("can-scroll-up");
   }

   // Can scroll down if not at bottom
   if (scrollTop + clientHeight < scrollHeight - 10) {
      wrapper.classList.add("can-scroll-down");
   } else {
      wrapper.classList.remove("can-scroll-down");
   }
}

/**
 * Handle container scroll to prevent page scroll
 * @param {WheelEvent} e - Wheel event
 */
function handleContainerScroll(e) {
   const container = e.currentTarget;
   const scrollTop = container.scrollTop;
   const scrollHeight = container.scrollHeight;
   const height = container.clientHeight;
   const delta = e.deltaY;

   const isAtTop = scrollTop === 0;
   const isAtBottom = scrollTop + height >= scrollHeight;

   // Prevent page scroll if we're scrolling within the container bounds
   if ((delta < 0 && !isAtTop) || (delta > 0 && !isAtBottom)) {
      e.preventDefault();
      e.stopPropagation();
      container.scrollTop += delta;
   }
}

/**
 * Update step indicator
 */
function updateStepIndicator() {
   // Reset all steps
   for (let i = 1; i <= 3; i++) {
      const step = document.getElementById(`step${i}`);
      if (step) {
         step.classList.remove("active", "completed");
      }
   }

   // Mark completed steps
   for (let i = 1; i < state.currentStep; i++) {
      const step = document.getElementById(`step${i}`);
      if (step) {
         step.classList.add("completed");
      }
   }

   // Mark current step
   const currentStep = document.getElementById(`step${state.currentStep}`);
   if (currentStep) {
      currentStep.classList.add("active");
   }
}
