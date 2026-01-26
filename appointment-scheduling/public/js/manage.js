// Calculate BASE_PATH from current URL to support subdirectory deployment
const BASE_PATH =
   window.location.pathname.split("/").slice(0, -1).join("/") || "";
const API_BASE = BASE_PATH + "/api";

console.log("Manage page BASE_PATH:", BASE_PATH || "(root)");

// Application state
let currentToken = null;
let bookings = [];
let primaryBooking = null;
let followupBooking = null;
let availableTimeslots = [];
let selectedNewTimeslotId = null;
let selectedNewFollowupTimeslotId = null;
let selectedNewPrimaryTimeslot = null; // Store the new primary timeslot object for step 2
let currentRescheduleType = null; // 'primary' or 'followup'
let needsFollowupReschedule = false; // If primary reschedule requires followup change
let rescheduleStep = 1; // 1 = select primary, 2 = select followup

// Get token from URL or user input
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get("token");

if (urlToken) {
   document.getElementById("tokenInput").value = urlToken;
   loadBookings();
}

// Handle clicking outside modal to close
function handleModalBackdropClick(event, modalId) {
   if (event.target.id === modalId) {
      if (modalId === "rescheduleModal") {
         closeRescheduleModal();
      } else if (modalId === "cancelModal") {
         closeCancelModal();
      }
   }
}

// Load bookings by token
async function loadBookings() {
   const token = document.getElementById("tokenInput").value.trim();

   if (!token) {
      showAlert("Bitte geben Sie einen Bestätigungscode ein.", "warning");
      return;
   }

   currentToken = token;

   // Show loading
   document.getElementById("tokenInputSection").style.display = "none";
   document.getElementById("loadingSection").style.display = "block";

   try {
      const response = await fetch(`${API_BASE}/booking/${token}`);

      if (!response.ok) {
         throw new Error("Ungültiger Bestätigungscode");
      }

      bookings = await response.json();

      if (!bookings || bookings.length === 0) {
         throw new Error("Keine Termine gefunden");
      }

      // Separate primary and follow-up bookings
      primaryBooking = bookings.find((b) => !b.is_followup);
      followupBooking = bookings.find((b) => b.is_followup);

      if (!primaryBooking || !followupBooking) {
         throw new Error("Unvollständige Buchungsdaten");
      }

      displayBookings();

      // Hide loading, show bookings
      document.getElementById("loadingSection").style.display = "none";
      document.getElementById("bookingsSection").style.display = "block";
   } catch (error) {
      console.error("Error loading bookings:", error);
      showAlert(error.message, "error");
      document.getElementById("loadingSection").style.display = "none";
      document.getElementById("tokenInputSection").style.display = "block";
   }
}

// Display bookings
function displayBookings() {
   // Display participant info
   document.getElementById("participantName").textContent =
      primaryBooking.participant_name;
   document.getElementById("participantEmail").textContent =
      primaryBooking.participant_email;

   // Display primary appointment
   displayAppointment(primaryBooking, "primary");

   // Display follow-up appointment
   displayAppointment(followupBooking, "followup");

   // Calculate and display days between appointments
   const primaryDate = new Date(primaryBooking.timeslot_start);
   const followupDate = new Date(followupBooking.timeslot_start);
   const daysAfter = Math.round(
      (followupDate - primaryDate) / (1000 * 60 * 60 * 24),
   );
   document.getElementById("followupDaysAfter").textContent =
      `${daysAfter} Tage nach Haupttermin`;
}

// Display a single appointment
function displayAppointment(booking, type) {
   const startDate = new Date(booking.timeslot_start);
   const endDate = new Date(booking.timeslot_end);

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

   const prefix = type === "primary" ? "primary" : "followup";

   document.getElementById(`${prefix}Date`).textContent = dateStr;
   document.getElementById(`${prefix}Time`).textContent = timeStr;

   if (booking.timeslot_location) {
      document.getElementById(`${prefix}Location`).textContent =
         booking.timeslot_location;
      document.getElementById(`${prefix}LocationRow`).style.display = "flex";
   }
}

// Show reschedule modal
async function showRescheduleModal(type) {
   currentRescheduleType = type;
   selectedNewTimeslotId = null;
   selectedNewFollowupTimeslotId = null;
   selectedNewPrimaryTimeslot = null;
   needsFollowupReschedule = false;
   rescheduleStep = 1;

   const modal = document.getElementById("rescheduleModal");
   const booking = type === "primary" ? primaryBooking : followupBooking;

   // Update modal title
   const title =
      type === "primary" ? "Haupttermin ändern" : "Folgetermin ändern";
   document.getElementById("rescheduleModalTitle").textContent = title;

   // Update info box style
   const infoBox = document.getElementById("rescheduleInfoBox");
   if (type === "followup") {
      infoBox.classList.add("followup-info");
   } else {
      infoBox.classList.remove("followup-info");
   }

   // Display current appointment info
   const startDate = new Date(booking.timeslot_start);
   const endDate = new Date(booking.timeslot_end);
   const dateStr = startDate.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   });
   document.getElementById("currentAppointmentInfo").textContent = dateStr;

   // Show constraint info for follow-up
   const constraintDiv = document.getElementById("rescheduleConstraintInfo");
   if (type === "followup") {
      constraintDiv.innerHTML = `
                    <div class="info-box followup-info">
                        <h4>✅ Wichtiger Hinweis</h4>
                        <p>Der neue Folgetermin muss <strong>29-31 Tage</strong> nach dem Haupttermin liegen.</p>
                        <p>Es werden nur passende Termine angezeigt.</p>
                    </div>
                `;
   } else {
      constraintDiv.innerHTML = "";
   }

   modal.classList.add("active");

   // Load available timeslots
   await loadAvailableTimeslotsForReschedule(type);
}

// Close reschedule modal
function closeRescheduleModal() {
   document.getElementById("rescheduleModal").classList.remove("active");
   selectedNewTimeslotId = null;
   selectedNewFollowupTimeslotId = null;
   selectedNewPrimaryTimeslot = null;
   currentRescheduleType = null;
   needsFollowupReschedule = false;
   rescheduleStep = 1;
}

// Load available timeslots for reschedule
async function loadAvailableTimeslotsForReschedule(type) {
   const loading = document.getElementById("rescheduleTimeslotsLoading");
   const container = document.getElementById("rescheduleTimeslotsContainer");

   loading.style.display = "block";
   container.style.display = "none";

   try {
      let url = `${API_BASE}/timeslots`;

      if (type === "primary") {
         url += "?type=primary";
      } else {
         // For follow-up, we need to pass the primary date to get valid range
         // If we're in step 2 (after changing primary), use the NEW primary date
         let primaryDateToUse;
         if (selectedNewPrimaryTimeslot) {
            primaryDateToUse = new Date(selectedNewPrimaryTimeslot.start_time);
         } else {
            primaryDateToUse = new Date(primaryBooking.timeslot_start);
         }
         const primaryDateStr = primaryDateToUse.toISOString().split("T")[0];
         url += `?type=followup&primaryDate=${primaryDateStr}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
         throw new Error("Fehler beim Laden der Termine");
      }

      availableTimeslots = await response.json();
      displayAvailableTimeslots(type);
   } catch (error) {
      console.error("Error loading timeslots:", error);
      showAlert("Fehler beim Laden der verfügbaren Termine.", "error");
      loading.innerHTML =
         '<p style="color: #dc3545;">Termine konnten nicht geladen werden.</p>';
   }
}

// Display available timeslots
function displayAvailableTimeslots(type) {
   const container = document.getElementById("rescheduleTimeslotsContainer");
   const loading = document.getElementById("rescheduleTimeslotsLoading");

   loading.style.display = "none";
   container.style.display = "grid";

   if (availableTimeslots.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; color: #6c757d; padding: 20px;">Derzeit sind keine alternativen Termine verfügbar.</p>';
      return;
   }

   const isFollowup = type === "followup";
   const primaryDate =
      type === "followup" ? new Date(primaryBooking.timeslot_start) : null;

   container.innerHTML = availableTimeslots
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

         const slotClass = isFollowup ? "timeslot followup-slot" : "timeslot";
         const badgeClass = isFollowup
            ? "badge-followup-slot"
            : "badge-primary-slot";
         const badgeText = isFollowup ? "Folgetermin" : "Haupttermin";

         return `
                    <div class="${slotClass}" onclick="selectNewTimeslot(${slot.id})">
                        <input type="radio" name="new-timeslot" value="${slot.id}" id="new-slot-${slot.id}">
                        <div class="timeslot-header">
                            <div class="timeslot-date">${dateStr}</div>
                            <div class="timeslot-type-badge ${badgeClass}">${badgeText}</div>
                        </div>
                        <div class="timeslot-time">🕐 ${timeStr}</div>
                        ${slot.location ? `<div class="timeslot-location">📍 ${slot.location}</div>` : ""}
                    </div>
                `;
      })
      .join("");
}

// Select new timeslot
function selectNewTimeslot(id) {
   if (rescheduleStep === 1) {
      selectedNewTimeslotId = id;
   } else {
      selectedNewFollowupTimeslotId = id;
   }

   // Update UI
   document
      .querySelectorAll("#rescheduleTimeslotsContainer .timeslot")
      .forEach((slot) => {
         slot.classList.remove("selected");
      });
   event.currentTarget.classList.add("selected");

   // Check the radio button
   document.getElementById(`new-slot-${id}`).checked = true;

   // Enable confirm button
   document.getElementById("confirmRescheduleBtn").disabled = false;
}

// Confirm reschedule
async function confirmReschedule() {
   if (!selectedNewTimeslotId || !currentRescheduleType) {
      showAlert("Bitte wählen Sie einen neuen Termin aus.", "warning");
      return;
   }

   // If rescheduling primary and in step 1, we need to check if followup needs rescheduling
   if (
      currentRescheduleType === "primary" &&
      rescheduleStep === 1 &&
      !needsFollowupReschedule
   ) {
      const btn = document.getElementById("confirmRescheduleBtn");
      const originalText = btn.textContent;

      btn.disabled = true;
      btn.textContent = "Prüfe...";

      try {
         const bookingId = primaryBooking.booking_id;

         const response = await fetch(`${API_BASE}/reschedule`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               token: currentToken,
               bookingId: bookingId,
               newTimeslotId: selectedNewTimeslotId,
            }),
         });

         const data = await response.json();

         if (!response.ok) {
            // Check if we need to also reschedule followup
            if (data.requiresFollowupReschedule) {
               needsFollowupReschedule = true;
               rescheduleStep = 2;
               btn.disabled = true;
               btn.textContent = originalText;

               // Store the selected new primary timeslot for step 2
               selectedNewPrimaryTimeslot = availableTimeslots.find(
                  (s) => s.id === selectedNewTimeslotId,
               );

               // Show message and load followup slots
               document.getElementById("rescheduleModalTitle").textContent =
                  "Schritt 2: Neuen Folgetermin wählen";

               const minDays = data.minDays || 29;
               const maxDays = data.maxDays || 31;
               document.getElementById("rescheduleConstraintInfo").innerHTML = `
                           <div class="alert alert-info" style="margin-bottom: 15px;">
                              <strong>⚠️ Folgetermin muss angepasst werden</strong>
                              <p>Der gewählte neue Haupttermin ist ${data.daysDiff} Tage vom aktuellen Folgetermin entfernt.</p>
                              <p>Bitte wählen Sie jetzt auch einen neuen Folgetermin (${minDays}-${maxDays} Tage nach dem neuen Haupttermin).</p>
                           </div>
                        `;

               // Reset selected followup
               selectedNewFollowupTimeslotId = null;

               // Load followup slots based on new primary date
               await loadAvailableTimeslotsForReschedule("followup");
               return;
            }

            throw new Error(data.error || "Fehler beim Ändern des Termins");
         }

         showAlert("Termin erfolgreich geändert!", "success");
         closeRescheduleModal();
         await loadBookings();
      } catch (error) {
         console.error("Error rescheduling:", error);
         showAlert(error.message, "error");
         btn.disabled = false;
         btn.textContent = originalText;
      }
      return;
   }

   // Final confirmation - either followup only, or primary + followup together
   const btn = document.getElementById("confirmRescheduleBtn");
   const originalText = btn.textContent;

   btn.disabled = true;
   btn.textContent = "Wird geändert...";

   try {
      const bookingId =
         currentRescheduleType === "primary"
            ? primaryBooking.booking_id
            : followupBooking.booking_id;

      const requestBody = {
         token: currentToken,
         bookingId: bookingId,
         newTimeslotId: selectedNewTimeslotId,
      };

      // If we're rescheduling both, include the followup
      if (needsFollowupReschedule && selectedNewFollowupTimeslotId) {
         requestBody.newFollowupTimeslotId = selectedNewFollowupTimeslotId;
      }

      const response = await fetch(`${API_BASE}/reschedule`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Ändern des Termins");
      }

      if (data.rescheduledBoth) {
         showAlert("Beide Termine erfolgreich geändert!", "success");
      } else {
         showAlert("Termin erfolgreich geändert!", "success");
      }

      closeRescheduleModal();
      await loadBookings();
   } catch (error) {
      console.error("Error rescheduling:", error);
      showAlert(error.message, "error");
      btn.disabled = false;
      btn.textContent = originalText;
   }
}

// Show cancel modal
function showCancelModal() {
   const modal = document.getElementById("cancelModal");

   // Format primary appointment info
   const primaryStart = new Date(primaryBooking.timeslot_start);
   const primaryDateStr = primaryStart.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   });
   document.getElementById("cancelPrimaryInfo").textContent = primaryDateStr;

   // Format follow-up appointment info
   const followupStart = new Date(followupBooking.timeslot_start);
   const followupDateStr = followupStart.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   });
   document.getElementById("cancelFollowupInfo").textContent = followupDateStr;

   modal.classList.add("active");
}

// Close cancel modal
function closeCancelModal() {
   document.getElementById("cancelModal").classList.remove("active");
}

// Confirm cancel (both appointments)
async function confirmCancel() {
   const btn = document.getElementById("confirmCancelBtn");
   const originalText = btn.textContent;

   btn.disabled = true;
   btn.textContent = "Wird storniert...";

   try {
      const response = await fetch(`${API_BASE}/cancel`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            token: currentToken,
         }),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Stornieren");
      }

      // Show success message
      closeCancelModal();
      document.getElementById("bookingsSection").style.display = "none";

      showAlert("Ihre Termine wurden erfolgreich storniert.", "success");

      // Show success message in main content
      document.getElementById("mainContent").innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <h2 style="color: #28a745; margin-bottom: 20px;">✅ Termine erfolgreich storniert</h2>
                        <p style="font-size: 1.1em; margin-bottom: 30px;">
                            Ihre Teilnahme wurde abgesagt. Sie erhalten eine Bestätigung per E-Mail.
                        </p>
                        <a href="index.html" class="btn btn-primary" style="color: white;">Zur Startseite</a>
                    </div>
                `;
   } catch (error) {
      console.error("Error cancelling:", error);
      showAlert(error.message, "error");
      btn.disabled = false;
      btn.textContent = originalText;
   }
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

   // Auto-hide success/info messages after 5 seconds
   if (type === "success" || type === "info") {
      setTimeout(() => {
         container.innerHTML = "";
      }, 5000);
   }
}
