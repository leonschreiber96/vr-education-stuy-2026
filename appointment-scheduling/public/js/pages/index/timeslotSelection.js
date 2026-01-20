// Timeslot selection and display logic for registration page

import {
   formatDate,
   formatTimeRange,
   daysBetween,
   parseISODate,
} from "../../utils/dateFormatter.js";
import {
   state,
   selectPrimaryTimeslot as selectPrimaryInState,
   selectFollowupTimeslot as selectFollowupInState,
} from "./state.js";
import {
   disable,
   enable,
   querySelectorAll,
   getElementById,
} from "../../utils/dom.js";
import { API_BASE } from "../../config.js";

/**
 * Display featured timeslot prominently
 */
export async function displayFeaturedTimeslot() {
   const featuredSection = getElementById("featuredTimeslotSection");
   const featuredCard = getElementById("featuredTimeslotCard");

   if (!featuredSection || !featuredCard) return;

   try {
      // Fetch featured timeslot from API
      const response = await fetch(`${API_BASE}/featured-timeslot`);
      const featuredSlot = await response.json();

      if (featuredSlot && featuredSlot.id) {
         // Check if it has capacity
         const bookedCount = featuredSlot.booked_count || 0;
         const capacity = featuredSlot.capacity;
         const hasCapacity = capacity === null || bookedCount < capacity;

         if (hasCapacity) {
            const startDate = parseISODate(featuredSlot.start_time);
            const endDate = parseISODate(featuredSlot.end_time);
            const dateStr = formatDate(startDate);
            const timeStr = formatTimeRange(startDate, endDate);

            featuredCard.innerHTML = `
               <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                  <div>
                     <div style="font-size: 1.2em; font-weight: 600; color: #667eea; margin-bottom: 5px;">
                        ${dateStr}
                     </div>
                     <div style="font-size: 1em; color: #666; margin-bottom: 8px;">
                        🕐 ${timeStr}
                     </div>
                     ${featuredSlot.location ? `<div style="font-size: 0.95em; color: #888;">📍 ${featuredSlot.location}</div>` : ""}
                  </div>
                  <button
                     class="btn btn-primary"
                     onclick="window.handleFeaturedTimeslotClick(${featuredSlot.id})"
                     style="white-space: nowrap;">
                     Diesen Termin wählen
                  </button>
               </div>
            `;
            featuredCard.onclick = null; // Remove onclick from card itself to avoid double-triggering
            featuredSection.classList.remove("hidden");
         } else {
            featuredSection.classList.add("hidden");
         }
      } else {
         featuredSection.classList.add("hidden");
      }
   } catch (error) {
      console.error("Error loading featured timeslot:", error);
      featuredSection.classList.add("hidden");
   }
}

/**
 * Display primary timeslots in the UI
 */
export function displayPrimaryTimeslots() {
   const container = getElementById("primaryTimeslotsContainer");
   const loading = getElementById("primaryTimeslotsLoading");

   if (!container || !loading) return;

   loading.classList.add("hidden");
   container.classList.remove("hidden");

   if (state.primaryTimeslots.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; color: #6c757d; padding: 40px;">Derzeit sind keine Haupttermine verfügbar. Bitte schauen Sie später noch einmal vorbei.</p>';
      return;
   }

   // Show scroll hint if there are many timeslots
   const scrollHint = getElementById("primaryScrollHint");
   if (scrollHint && state.primaryTimeslots.length > 6) {
      scrollHint.classList.remove("hidden");
   }

   container.innerHTML = state.primaryTimeslots
      .map((slot) => {
         const startDate = parseISODate(slot.start_time);
         const endDate = parseISODate(slot.end_time);

         const dateStr = formatDate(startDate);
         const timeStr = formatTimeRange(startDate, endDate);

         return `
            <div class="timeslot" onclick="window.handlePrimaryTimeslotClick(${slot.id})">
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

/**
 * Display followup timeslots in the UI
 */
export function displayFollowupTimeslots() {
   const container = getElementById("followupTimeslotsContainer");
   const loading = getElementById("followupTimeslotsLoading");

   if (!container || !loading) return;

   loading.classList.add("hidden");
   container.classList.remove("hidden");

   if (state.followupTimeslots.length === 0) {
      container.innerHTML =
         '<div class="alert alert-warning">Leider sind keine passenden Folgetermine (29-31 Tage nach dem Haupttermin) verfügbar. Bitte wählen Sie einen anderen Haupttermin.</div>';
      return;
   }

   const primaryDate = parseISODate(state.selectedPrimaryTimeslot.start_time);

   // Show scroll hint if there are many timeslots
   const scrollHint = getElementById("followupScrollHint");
   if (scrollHint && state.followupTimeslots.length > 6) {
      scrollHint.classList.remove("hidden");
   }

   container.innerHTML = state.followupTimeslots
      .map((slot) => {
         const startDate = parseISODate(slot.start_time);
         const endDate = parseISODate(slot.end_time);

         const dateStr = formatDate(startDate);
         const timeStr = formatTimeRange(startDate, endDate);

         // Calculate days after primary
         const daysAfter = daysBetween(primaryDate, startDate);

         return `
            <div class="timeslot followup-slot" onclick="window.handleFollowupTimeslotClick(${slot.id})">
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

/**
 * Handle primary timeslot selection
 * @param {number} timeslotId - The selected timeslot ID
 */
export function handlePrimaryTimeslotSelection(timeslotId) {
   selectPrimaryInState(timeslotId);

   // Update UI - remove selection from all timeslots
   querySelectorAll("#primaryTimeslotsContainer .timeslot").forEach((slot) => {
      slot.classList.remove("selected");
   });

   // Add selection to clicked timeslot
   const clickedSlot = event?.currentTarget;
   if (clickedSlot) {
      clickedSlot.classList.add("selected");
   }

   // Check the radio button
   const radioButton = getElementById(`primary-slot-${timeslotId}`);
   if (radioButton) {
      radioButton.checked = true;
   }

   // Enable continue button
   enable("continueToStep3Btn");
}

/**
 * Handle featured timeslot selection - directly proceed to followup selection
 * @param {number} timeslotId - The selected timeslot ID
 */
export function handleFeaturedTimeslotSelection(timeslotId) {
   selectPrimaryInState(timeslotId);

   // Check the radio button if it exists in the main list
   const radioButton = getElementById(`primary-slot-${timeslotId}`);
   if (radioButton) {
      radioButton.checked = true;
   }

   // Directly proceed to step 3 (followup selection)
   if (window.continueToStep3) {
      window.continueToStep3();
   }
}

/**
 * Handle followup timeslot selection
 * @param {number} timeslotId - The selected timeslot ID
 */
export function handleFollowupTimeslotSelection(timeslotId) {
   selectFollowupInState(timeslotId);

   // Update UI - remove selection from all timeslots
   querySelectorAll("#followupTimeslotsContainer .timeslot").forEach((slot) => {
      slot.classList.remove("selected");
   });

   // Add selection to clicked timeslot
   const clickedSlot = event?.currentTarget;
   if (clickedSlot) {
      clickedSlot.classList.add("selected");
   }

   // Check the radio button
   const radioButton = getElementById(`followup-slot-${timeslotId}`);
   if (radioButton) {
      radioButton.checked = true;
   }

   // Enable submit button
   enable("submitRegistrationBtn");
}

/**
 * Display selected primary appointment info
 */
export function displaySelectedPrimaryInfo() {
   if (!state.selectedPrimaryTimeslot) return;

   const startDate = parseISODate(state.selectedPrimaryTimeslot.start_time);
   const endDate = parseISODate(state.selectedPrimaryTimeslot.end_time);

   const dateStr = formatDate(startDate);
   const timeStr = formatTimeRange(startDate, endDate);

   const infoElement = getElementById("selectedPrimaryInfo");
   if (infoElement) {
      infoElement.innerHTML = `
         <strong>${dateStr}</strong><br>
         ${timeStr}
         ${state.selectedPrimaryTimeslot.location ? `<br>📍 ${state.selectedPrimaryTimeslot.location}` : ""}
      `;
   }
}
