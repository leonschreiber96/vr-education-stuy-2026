# Registration Flow Changes

## Summary
Changed the order of forms in the registration process so that participants first select appointments and then complete the pre-questionnaire.

## Visual Flow Diagram

### Previous Flow
```
Step 0: Study Description
    ↓ (proceedToRegistration)
Step 1: Personal Data & Pre-Questionnaire
    ↓ (continueToStep2 - validates questionnaire)
Step 2: Primary Appointment Selection
    ↓ (continueToStep3)
Step 3: Follow-up Appointment Selection
    ↓ (submitRegistration - submits data)
SUCCESS PAGE
```

### New Flow
```
Step 0: Study Description
    ↓ (proceedToStep1)
Step 1: Primary Appointment Selection
    ↓ (continueToStep2)
Step 2: Follow-up Appointment Selection
    ↓ (continueToStep3)
Step 3: Personal Data & Pre-Questionnaire
    ↓ (submitRegistration - validates & submits data)
SUCCESS PAGE
```

## Previous Flow
1. **Step 0**: Study Description (Info page)
2. **Step 1**: Personal Data & Pre-Questionnaire
3. **Step 2**: Primary Appointment Selection
4. **Step 3**: Follow-up Appointment Selection

## New Flow
1. **Step 0**: Study Description (Info page)
2. **Step 1**: Primary Appointment Selection
3. **Step 2**: Follow-up Appointment Selection
4. **Step 3**: Personal Data & Pre-Questionnaire

## Rationale
This change allows participants to:
- Check appointment availability before investing time in the questionnaire
- Make informed decisions about participation based on schedule compatibility
- Reduce abandonment rates from participants who complete the questionnaire but find no suitable appointments

## Files Modified

### 1. `public/index.html`
- Updated step indicator labels (steps 1-3)
- Reordered HTML sections to match new flow
- Changed button labels and onclick handlers:
  - Study info → "Zur Terminauswahl" (Step 1)
  - Primary appointment → "Weiter zum Folgetermin" (Step 2)
  - Follow-up appointment → "Weiter zur Datenerfassung" (Step 3)
  - Questionnaire → "Anmeldung abschließen" (Submit)
- Updated back button navigation logic

### 2. `public/js/index.js`
- Renamed `proceedToRegistration()` → `proceedToStep1()` (now shows primary appointments)
- Refactored `continueToStep2()` to handle primary → follow-up transition
- Refactored `continueToStep3()` to handle follow-up → questionnaire transition
- Moved validation logic from `continueToStep2()` to `submitRegistration()`
- Updated `submitRegistration()` to:
  - Validate personal data and questionnaire
  - Submit registration with all collected data
- Added new navigation functions:
  - `backToStep0()`: Return to study info
  - `backToStep1()`: Return to primary appointments
  - `backToStep2()`: Return to follow-up appointments
- Updated window-exposed functions

### 3. `public/js/pages/index/timeslotSelection.js`
- Updated `handlePrimaryTimeslotSelection()` to enable `continueToStep2Btn` (was `continueToStep3Btn`)
- Updated `handleFeaturedTimeslotSelection()` to call `window.continueToStep2()` (was `continueToStep3()`)
- Updated `handleFollowupTimeslotSelection()` to enable `continueToStep3Btn` (was `submitRegistrationBtn`)

## Testing Checklist
- [ ] Step 0 → Step 1: Study info to primary appointment selection works
- [ ] Step 1 → Step 2: Primary to follow-up appointment selection works
- [ ] Step 2 → Step 3: Follow-up to questionnaire works
- [ ] Step 3 → Submit: Questionnaire submission with all data works
- [ ] Back navigation from each step functions correctly
- [ ] Featured timeslot selection works and proceeds to follow-up
- [ ] Form validation triggers at the correct step (submission)
- [ ] Registration email contains all appointment and questionnaire data
- [ ] Step indicator updates correctly throughout the flow
- [ ] Mobile responsive behavior maintained

## Backend Compatibility
No backend changes required. The API endpoints and data structures remain the same:
- Registration still requires: name, email, primaryTimeslotId, followupTimeslotId, questionnaireData
- The order of data collection doesn't affect the backend submission

## User Experience Improvements
1. **Reduced friction**: Users can verify appointment availability immediately
2. **Better information hierarchy**: Critical decision (scheduling) comes before details
3. **Lower abandonment**: Users less likely to abandon after completing questionnaire
4. **Clearer commitment**: Selecting appointments first signals stronger intent