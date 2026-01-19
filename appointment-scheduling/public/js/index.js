// Application state
let currentStep = 1;
let participantName = "";
let participantEmail = "";
let selectedPrimaryTimeslotId = null;
let selectedFollowupTimeslotId = null;
let primaryTimeslots = [];
let followupTimeslots = [];
let selectedPrimaryTimeslot = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
   loadPrimaryTimeslots();
});

// Load primary appointment timeslots
async function loadPrimaryTimeslots() {
   try {
      const response = await fetch("/api/timeslots?type=primary");
      if (!response.ok) {
         throw new Error("Fehler beim Laden der Termine");
      }

      primaryTimeslots = await response.json();
      console.log(
         "Loaded primary timeslots:",
         primaryTimeslots.length,
      );
   } catch (error) {
      console.error("Error loading primary timeslots:", error);
      showAlert(
         "Fehler beim Laden der Termine. Bitte versuchen Sie es später erneut.",
         "error",
      );
   }
}

// Step 1 → Step 2: Continue to primary appointment selection
function continueToStep2() {
   const name = document.getElementById("name").value.trim();
   const email = document.getElementById("email").value.trim();

   if (!name || !email) {
      showAlert("Bitte füllen Sie alle Felder aus.", "warning");
      return;
   }

   // Basic email validation
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert(
         "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
         "warning",
      );
      return;
   }

   participantName = name;
   participantEmail = email;
   currentStep = 2;

   // Update UI
   document
      .getElementById("personalInfoSection")
      .classList.add("hidden");
   document
      .getElementById("primaryAppointmentSection")
      .classList.remove("hidden");
   updateStepIndicator();

   // Display primary timeslots
   displayPrimaryTimeslots();

   // Setup scroll prevention
   setTimeout(() => preventPageScrollOnContainer(), 100);

   // Scroll to top
   window.scrollTo({ top: 0, behavior: "smooth" });
}

// Display primary timeslots
function displayPrimaryTimeslots() {
   const container = document.getElementById(
      "primaryTimeslotsContainer",
   );
   const loading = document.getElementById("primaryTimeslotsLoading");

   loading.classList.add("hidden");
   container.classList.remove("hidden");

   if (primaryTimeslots.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; color: #6c757d; padding: 40px;">Derzeit sind keine Haupttermine verfügbar. Bitte schauen Sie später noch einmal vorbei.</p>';
      return;
   }

   // Show scroll hint if there are many timeslots
   const scrollHint = document.getElementById("primaryScrollHint");
   if (primaryTimeslots.length > 6) {
      scrollHint.classList.remove("hidden");
   }

   container.innerHTML = primaryTimeslots
      .map((slot) => {
         const startDate = new Date(slot.start_time);
         const endDate = new Date(slot.end_time);

         const dateStr = startDate.toLocaleDateString("de-DE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
         });

         const timeStr = `${startDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
         })} - ${endDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
         })}`;

         return `
                    <div class="timeslot" onclick="selectPrimaryTimeslot(${slot.id})">
                        <input type="radio" name="primary-timeslot" value="${slot.id}" id="primary-slot-${slot.id}">
                        <div class="timeslot-header">
                            <div class="timeslot-date">${dateStr}</div>
                            <div class="timeslot-type-badge badge-primary-type">Haupttermin</div>
                        </div>
                        <div class="timeslot-time">🕐 ${timeStr}</div>
                        ${slot.location ? `<div class="timeslot-location">📍 ${slot.location}</div>` : ""}
                    </div>
                `;
      })
      .join("");
}

// Select primary timeslot
function selectPrimaryTimeslot(id) {
   selectedPrimaryTimeslotId = id;
   selectedPrimaryTimeslot = primaryTimeslots.find((s) => s.id === id);

   // Update UI
   document
      .querySelectorAll("#primaryTimeslotsContainer .timeslot")
      .forEach((slot) => {
         slot.classList.remove("selected");
      });
   event.currentTarget.classList.add("selected");

   // Check the radio button
   document.getElementById(`primary-slot-${id}`).checked = true;

   // Enable continue button
   document.getElementById("continueToStep3Btn").disabled = false;
}

// Step 2 → Step 3: Continue to follow-up appointment selection
async function continueToStep3() {
   if (!selectedPrimaryTimeslotId || !selectedPrimaryTimeslot) {
      showAlert("Bitte wählen Sie einen Haupttermin aus.", "warning");
      return;
   }

   currentStep = 3;

   // Update UI
   document
      .getElementById("primaryAppointmentSection")
      .classList.add("hidden");
   document
      .getElementById("followupAppointmentSection")
      .classList.remove("hidden");
   updateStepIndicator();

   // Display selected primary appointment info
   displaySelectedPrimaryInfo();

   // Load and display follow-up timeslots
   await loadFollowupTimeslots();

   // Scroll to top
   window.scrollTo({ top: 0, behavior: "smooth" });
}

// Display selected primary appointment info
function displaySelectedPrimaryInfo() {
   const startDate = new Date(selectedPrimaryTimeslot.start_time);
   const endDate = new Date(selectedPrimaryTimeslot.end_time);

   const dateStr = startDate.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
   });

   const timeStr = `${startDate.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
   })} - ${endDate.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
   })}`;

   document.getElementById("selectedPrimaryInfo").innerHTML = `
                <strong>${dateStr}</strong><br>
                ${timeStr}
                ${selectedPrimaryTimeslot.location ? `<br>📍 ${selectedPrimaryTimeslot.location}` : ""}
            `;
}

// Load follow-up timeslots in valid range (29-31 days after primary)
async function loadFollowupTimeslots() {
   const loading = document.getElementById("followupTimeslotsLoading");
   const container = document.getElementById(
      "followupTimeslotsContainer",
   );

   loading.classList.remove("hidden");
   container.classList.add("hidden");

   try {
      const primaryDate = new Date(selectedPrimaryTimeslot.start_time);
      const primaryDateStr = primaryDate.toISOString().split("T")[0];

      const response = await fetch(
         `/api/timeslots?type=followup&primaryDate=${primaryDateStr}`,
      );
      if (!response.ok) {
         throw new Error("Fehler beim Laden der Folgetermine");
      }

      followupTimeslots = await response.json();
      console.log(
         "Loaded follow-up timeslots:",
         followupTimeslots.length,
      );

      displayFollowupTimeslots();

      // Setup scroll prevention
      setTimeout(() => preventPageScrollOnContainer(), 100);
   } catch (error) {
      console.error("Error loading follow-up timeslots:", error);
      showAlert(
         "Fehler beim Laden der Folgetermine. Bitte versuchen Sie es später erneut.",
         "error",
      );
      loading.innerHTML =
         '<p style="color: #dc3545;">Folgetermine konnten nicht geladen werden.</p>';
   }
}

// Display follow-up timeslots
function displayFollowupTimeslots() {
   const container = document.getElementById(
      "followupTimeslotsContainer",
   );
   const loading = document.getElementById("followupTimeslotsLoading");

   loading.classList.add("hidden");
   container.classList.remove("hidden");

   if (followupTimeslots.length === 0) {
      container.innerHTML =
         '<div class="alert alert-warning">Leider sind keine passenden Folgetermine (29-31 Tage nach dem Haupttermin) verfügbar. Bitte wählen Sie einen anderen Haupttermin.</div>';
      return;
   }

   const primaryDate = new Date(selectedPrimaryTimeslot.start_time);

   // Show scroll hint if there are many timeslots
   const scrollHint = document.getElementById("followupScrollHint");
   if (followupTimeslots.length > 6) {
      scrollHint.classList.remove("hidden");
   }

   container.innerHTML = followupTimeslots
      .map((slot) => {
         const startDate = new Date(slot.start_time);
         const endDate = new Date(slot.end_time);

         const dateStr = startDate.toLocaleDateString("de-DE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
         });

         const timeStr = `${startDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
         })} - ${endDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
         })}`;

         // Calculate days after primary
         const daysAfter = Math.round(
            (startDate - primaryDate) / (1000 * 60 * 60 * 24),
         );

         return `
                    <div class="timeslot followup-slot" onclick="selectFollowupTimeslot(${slot.id})">
                        <input type="radio" name="followup-timeslot" value="${slot.id}" id="followup-slot-${slot.id}">
                        <div class="timeslot-header">
                            <div class="timeslot-date">${dateStr}</div>
                            <div class="timeslot-type-badge badge-followup-type">Folgetermin</div>
                        </div>
                        <div class="timeslot-time">🕐 ${timeStr}</div>
                        ${slot.location ? `<div class="timeslot-location">📍 ${slot.location}</div>` : ""}
                        <div class="timeslot-days-after">✓ ${daysAfter} Tage nach dem Haupttermin</div>
                    </div>
                `;
      })
      .join("");
}

// Select follow-up timeslot
function selectFollowupTimeslot(id) {
   selectedFollowupTimeslotId = id;

   // Update UI
   document
      .querySelectorAll("#followupTimeslotsContainer .timeslot")
      .forEach((slot) => {
         slot.classList.remove("selected");
      });
   event.currentTarget.classList.add("selected");

   // Check the radio button
   document.getElementById(`followup-slot-${id}`).checked = true;

   // Enable submit button
   document.getElementById("submitRegistrationBtn").disabled = false;
}

// Submit registration (both primary and follow-up)
async function submitRegistration() {
   if (!selectedPrimaryTimeslotId || !selectedFollowupTimeslotId) {
      showAlert(
         "Bitte wählen Sie sowohl einen Haupttermin als auch einen Folgetermin aus.",
         "warning",
      );
      return;
   }

   const submitBtn = document.getElementById("submitRegistrationBtn");
   const originalText = submitBtn.textContent;

   submitBtn.disabled = true;
   submitBtn.textContent = "Wird gesendet...";

   try {
      const response = await fetch("/api/register", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            name: participantName,
            email: participantEmail,
            primaryTimeslotId: selectedPrimaryTimeslotId,
            followupTimeslotId: selectedFollowupTimeslotId,
         }),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Anmeldung fehlgeschlagen");
      }

      // Show success page
      showSuccessPage(data);
   } catch (error) {
      console.error("Registration error:", error);
      showAlert(error.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
   }
}

// Show success page
function showSuccessPage(data) {
   const primarySlot = primaryTimeslots.find(
      (s) => s.id === selectedPrimaryTimeslotId,
   );
   const followupSlot = followupTimeslots.find(
      (s) => s.id === selectedFollowupTimeslotId,
   );

   const primaryStart = new Date(primarySlot.start_time);
   const primaryEnd = new Date(primarySlot.end_time);
   const followupStart = new Date(followupSlot.start_time);
   const followupEnd = new Date(followupSlot.end_time);

   const formatDate = (date) =>
      date.toLocaleDateString("de-DE", {
         weekday: "long",
         year: "numeric",
         month: "long",
         day: "numeric",
      });

   const formatTime = (start, end) => {
      return `${start.toLocaleTimeString("de-DE", {
         hour: "2-digit",
         minute: "2-digit",
      })} - ${end.toLocaleTimeString("de-DE", {
         hour: "2-digit",
         minute: "2-digit",
      })}`;
   };

   const managementUrl = `${window.location.origin}/manage.html?token=${data.confirmationToken}`;

   document.getElementById("mainContent").innerHTML = `
                <div class="success-message">
                    <h2>✅ Anmeldung erfolgreich!</h2>
                    <p style="font-size: 1.1em;">Vielen Dank für Ihre Anmeldung, <strong>${participantName}</strong>!</p>

                    <div class="appointment-card">
                        <h4>📌 Haupttermin</h4>
                        <p style="font-size: 1.1em; margin: 10px 0;"><strong>${formatDate(primaryStart)}</strong></p>
                        <p style="color: #666;">${formatTime(primaryStart, primaryEnd)}</p>
                        ${primarySlot.location ? `<p style="color: #666;">📍 ${primarySlot.location}</p>` : ""}
                    </div>

                    <div class="appointment-card followup-card">
                        <h4>📌 Folgetermin</h4>
                        <p style="font-size: 1.1em; margin: 10px 0;"><strong>${formatDate(followupStart)}</strong></p>
                        <p style="color: #666;">${formatTime(followupStart, followupEnd)}</p>
                        ${followupSlot.location ? `<p style="color: #666;">📍 ${followupSlot.location}</p>` : ""}
                    </div>

                    <div class="alert alert-info" style="margin-top: 30px; text-align: left;">
                        <strong>Wichtig:</strong> Eine Bestätigungsemail wurde an <strong>${participantEmail}</strong> gesendet.
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
                        <a href="/" class="btn btn-secondary" style="margin-left: 10px; color: white;">
                            Zur Startseite
                        </a>
                    </div>
                </div>
            `;

   // Scroll to top
   window.scrollTo({ top: 0, behavior: "smooth" });
}

// Navigation: Back to step 1
function backToStep1() {
   currentStep = 1;
   selectedPrimaryTimeslotId = null;
   selectedPrimaryTimeslot = null;

   // Hide scroll hints
   document
      .getElementById("primaryScrollHint")
      .classList.add("hidden");

   document
      .getElementById("primaryAppointmentSection")
      .classList.add("hidden");
   document
      .getElementById("personalInfoSection")
      .classList.remove("hidden");
   updateStepIndicator();

   window.scrollTo({ top: 0, behavior: "smooth" });
}

// Navigation: Back to step 2
function backToStep2() {
   currentStep = 2;
   selectedFollowupTimeslotId = null;

   // Hide scroll hints
   document
      .getElementById("followupScrollHint")
      .classList.add("hidden");

   document
      .getElementById("followupAppointmentSection")
      .classList.add("hidden");
   document
      .getElementById("primaryAppointmentSection")
      .classList.remove("hidden");
   updateStepIndicator();

   window.scrollTo({ top: 0, behavior: "smooth" });
}

// Prevent page scroll when scrolling inside timeslot containers
function preventPageScrollOnContainer() {
   const containers = document.querySelectorAll(
      ".timeslots-container",
   );

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

// Update step indicator
function updateStepIndicator() {
   // Reset all steps
   for (let i = 1; i <= 3; i++) {
      const step = document.getElementById(`step${i}`);
      step.classList.remove("active", "completed");
   }

   // Mark completed steps
   for (let i = 1; i < currentStep; i++) {
      document.getElementById(`step${i}`).classList.add("completed");
   }

   // Mark current step
   document
      .getElementById(`step${currentStep}`)
      .classList.add("active");
}

// Show alert message
function showAlert(message, type = "info") {
   const container = document.getElementById("alertContainer");
   const alertClass =
      type === "error"
         ? "alert-error"
         : type === "success"
           ? "alert-success"
           : type === "warning"
             ? "alert-warning"
             : "alert-info";

   container.innerHTML = `
                <div class="alert ${alertClass}">
                    ${message}
                </div>
            `;

   // Scroll to top
   window.scrollTo({ top: 0, behavior: "smooth" });

   // Auto-hide after 5 seconds for success/info messages
   if (type === "success" || type === "info") {
      setTimeout(() => {
         container.innerHTML = "";
      }, 5000);
   }
}
