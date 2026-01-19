// State management for registration page

/**
 * Application state for the registration workflow
 */
export const state = {
   // Current step in the registration process (1, 2, or 3)
   currentStep: 1,

   // Participant information
   participantName: "",
   participantEmail: "",

   // Selected timeslot IDs
   selectedPrimaryTimeslotId: null,
   selectedFollowupTimeslotId: null,

   // Timeslot data arrays
   primaryTimeslots: [],
   followupTimeslots: [],

   // Selected timeslot objects (full data)
   selectedPrimaryTimeslot: null,
   selectedFollowupTimeslot: null,
};

/**
 * Reset state to initial values
 */
export function resetState() {
   state.currentStep = 1;
   state.participantName = "";
   state.participantEmail = "";
   state.selectedPrimaryTimeslotId = null;
   state.selectedFollowupTimeslotId = null;
   state.primaryTimeslots = [];
   state.followupTimeslots = [];
   state.selectedPrimaryTimeslot = null;
   state.selectedFollowupTimeslot = null;
}

/**
 * Update participant information
 * @param {string} name - Participant name
 * @param {string} email - Participant email
 */
export function setParticipantInfo(name, email) {
   state.participantName = name;
   state.participantEmail = email;
}

/**
 * Set primary timeslots
 * @param {Array} timeslots - Array of primary timeslot objects
 */
export function setPrimaryTimeslots(timeslots) {
   state.primaryTimeslots = timeslots || [];
}

/**
 * Set followup timeslots
 * @param {Array} timeslots - Array of followup timeslot objects
 */
export function setFollowupTimeslots(timeslots) {
   state.followupTimeslots = timeslots || [];
}

/**
 * Select a primary timeslot
 * @param {number} timeslotId - Primary timeslot ID
 */
export function selectPrimaryTimeslot(timeslotId) {
   state.selectedPrimaryTimeslotId = timeslotId;
   state.selectedPrimaryTimeslot = state.primaryTimeslots.find(
      (slot) => slot.id === timeslotId
   );
}

/**
 * Select a followup timeslot
 * @param {number} timeslotId - Followup timeslot ID
 */
export function selectFollowupTimeslot(timeslotId) {
   state.selectedFollowupTimeslotId = timeslotId;
   state.selectedFollowupTimeslot = state.followupTimeslots.find(
      (slot) => slot.id === timeslotId
   );
}

/**
 * Set current step
 * @param {number} step - Step number (1, 2, or 3)
 */
export function setStep(step) {
   if (step >= 1 && step <= 3) {
      state.currentStep = step;
   }
}

/**
 * Get current state (read-only copy)
 * @returns {Object} Current state
 */
export function getState() {
   return { ...state };
}

/**
 * Check if participant info is complete
 * @returns {boolean} True if name and email are set
 */
export function hasParticipantInfo() {
   return !!(state.participantName && state.participantEmail);
}

/**
 * Check if primary timeslot is selected
 * @returns {boolean} True if primary timeslot is selected
 */
export function hasPrimaryTimeslot() {
   return !!(state.selectedPrimaryTimeslotId && state.selectedPrimaryTimeslot);
}

/**
 * Check if followup timeslot is selected
 * @returns {boolean} True if followup timeslot is selected
 */
export function hasFollowupTimeslot() {
   return !!(state.selectedFollowupTimeslotId && state.selectedFollowupTimeslot);
}

/**
 * Check if registration is complete (all required data is present)
 * @returns {boolean} True if all required data is present
 */
export function isRegistrationComplete() {
   return hasParticipantInfo() && hasPrimaryTimeslot() && hasFollowupTimeslot();
}
