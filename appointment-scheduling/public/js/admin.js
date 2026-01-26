let isAuthenticated = false;
let allData = {
   participants: [],
   timeslots: [],
   timeslotsForStats: [], // All timeslots for accurate statistics
   bookings: [],
   logs: [],
   unreviewedAppointments: [],
};

// Base path for API calls (when app is served under a subpath)
const BASE_PATH =
   window.location.pathname.split("/").slice(0, -1).join("/") || "";
console.log("Frontend BASE_PATH:", BASE_PATH);

// Pagination state
let timeslotsPagination = {
   currentPage: 1,
   pageSize: 25,
   total: 0,
};

let logsPagination = {
   currentPage: 1,
   pageSize: 100,
   total: 0,
};

// Calendar state
let calendarState = {
   currentDate: new Date(),
   year: new Date().getFullYear(),
   month: new Date().getMonth(),
};

// Check authentication on load
window.addEventListener("DOMContentLoaded", async () => {
   await checkAuth();

   // Clear datetime fields on page load (browser may persist these)
   const startTimeInput = document.getElementById("startTime");
   const endTimeInput = document.getElementById("endTime");
   const bulkStartInput = document.getElementById("bulkStartDate");
   const bulkEndInput = document.getElementById("bulkEndDate");

   if (startTimeInput) startTimeInput.value = "";
   if (endTimeInput) endTimeInput.value = "";
   if (bulkStartInput) bulkStartInput.value = "";
   if (bulkEndInput) bulkEndInput.value = "";

   // Setup auto-fill for end time when start time changes
   if (startTimeInput && endTimeInput) {
      startTimeInput.addEventListener("change", function () {
         if (this.value && !endTimeInput.value) {
            // Parse the start time
            const startDate = new Date(this.value);

            // Add 45 minutes (default appointment duration)
            const endDate = new Date(startDate.getTime() + 45 * 60000);

            // Format as datetime-local string (YYYY-MM-DDTHH:MM)
            const year = endDate.getFullYear();
            const month = String(endDate.getMonth() + 1).padStart(2, "0");
            const day = String(endDate.getDate()).padStart(2, "0");
            const hours = String(endDate.getHours()).padStart(2, "0");
            const minutes = String(endDate.getMinutes()).padStart(2, "0");

            endTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
         }
      });
   }

   // Setup auto-fill for bulk creation end date
   if (bulkStartInput && bulkEndInput) {
      bulkStartInput.addEventListener("change", function () {
         if (this.value) {
            // Parse the start date
            const startDate = new Date(this.value);

            // Add 1 hour for bulk creation default
            const endDate = new Date(startDate.getTime() + 60 * 60000);

            // Format as datetime-local string (YYYY-MM-DDTHH:MM)
            const year = endDate.getFullYear();
            const month = String(endDate.getMonth() + 1).padStart(2, "0");
            const day = String(endDate.getDate()).padStart(2, "0");
            const hours = String(endDate.getHours()).padStart(2, "0");
            const minutes = String(endDate.getMinutes()).padStart(2, "0");

            bulkEndInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
         }
      });
   }

   // Add event listeners for appointment type changes
   const appointmentTypeSelect = document.getElementById("appointmentType");
   const bulkAppointmentTypeSelect = document.getElementById(
      "bulkAppointmentType",
   );

   if (appointmentTypeSelect) {
      appointmentTypeSelect.addEventListener(
         "change",
         toggleDualCapacityFields,
      );
   }

   if (bulkAppointmentTypeSelect) {
      bulkAppointmentTypeSelect.addEventListener(
         "change",
         toggleDualCapacityFields,
      );
   }

   // Handle bulk create form submission
   document
      .getElementById("bulkCreateForm")
      .addEventListener("submit", async (e) => {
         e.preventDefault();

         const startDate = document.getElementById("bulkStartDate").value;
         const endDate = document.getElementById("bulkEndDate").value;
         const duration = parseInt(
            document.getElementById("bulkDuration").value,
         );
         const breakTime = parseInt(document.getElementById("bulkBreak").value);
         const appointmentType = document.getElementById(
            "bulkAppointmentType",
         ).value;
         const capacityInput = document.getElementById("bulkCapacity").value;
         const capacity = capacityInput ? parseInt(capacityInput) : null;
         const primaryCapacityInput = document.getElementById(
            "bulkPrimaryCapacity",
         ).value;
         const primaryCapacity = primaryCapacityInput
            ? parseInt(primaryCapacityInput)
            : null;
         const followupCapacityInput = document.getElementById(
            "bulkFollowupCapacity",
         ).value;
         const followupCapacity = followupCapacityInput
            ? parseInt(followupCapacityInput)
            : null;
         const location = document.getElementById("bulkLocation").value;
         const weekdays = getSelectedWeekdays();
         const workingHours = getWorkingHours();

         if (
            !startDate ||
            !endDate ||
            !duration ||
            weekdays.length === 0 ||
            workingHours.length === 0
         ) {
            showDashboardAlert(
               "Bitte füllen Sie alle Pflichtfelder aus.",
               "error",
            );
            return;
         }

         // Validate working hours
         for (const hours of workingHours) {
            if (hours.start >= hours.end) {
               showDashboardAlert(
                  "Ungültige Arbeitszeiten: Die Endzeit muss nach der Startzeit liegen.",
                  "error",
               );
               return;
            }
         }

         const btn = document.getElementById("bulkCreateBtn");
         btn.disabled = true;
         btn.textContent = "Erstelle Zeitslots...";

         try {
            const response = await fetch(
               BASE_PATH + "/api/admin/bulk-timeslots",
               {
                  method: "POST",
                  headers: {
                     "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                     startDate,
                     endDate,
                     duration: parseInt(duration),
                     breakTime: parseInt(breakTime),
                     appointmentType,
                     capacity,
                     primaryCapacity,
                     followupCapacity,
                     location,
                     weekdays,
                     workingHours,
                  }),
               },
            );

            const data = await response.json();

            if (!response.ok) {
               throw new Error(
                  data.error || "Fehler beim Erstellen der Zeitslots",
               );
            }

            showDashboardAlert(
               `${data.count} Zeitslots erfolgreich erstellt!`,
               "success",
            );
            document.getElementById("bulkCreateForm").reset();
            // Reset to default working hours
            document.getElementById("workingHoursContainer").innerHTML = `
               <div class="working-hours-row" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                  <input type="time" class="working-hours-start" value="09:00" required style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px;">
                  <span>bis</span>
                  <input type="time" class="working-hours-end" value="17:00" required style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px;">
                  <button type="button" class="btn btn-danger btn-sm" onclick="removeWorkingHoursRow(this)" style="visibility: hidden;">Entfernen</button>
               </div>
            `;
            // Reset weekday checkboxes to Monday-Friday
            document
               .querySelectorAll('input[name="weekday"]')
               .forEach((cb, index) => {
                  cb.checked =
                     parseInt(cb.value) >= 1 && parseInt(cb.value) <= 5;
               });
            document.getElementById("bulkPreview").innerHTML = "";
            // Reload all data and refresh displays
            await loadBookings();
            await loadTimeslots();
            updateStatistics();
            displayUpcomingAppointments();
            closeBulkCreateModal();
         } catch (error) {
            console.error("Error creating bulk timeslots:", error);
            showDashboardAlert(error.message, "error");
         } finally {
            btn.disabled = false;
            btn.textContent = "Zeitslots erstellen";
         }
      });
});

// Check if user is authenticated
async function checkAuth() {
   try {
      const response = await fetch(BASE_PATH + "/api/admin/check");
      const data = await response.json();

      if (data.authenticated) {
         isAuthenticated = true;
         showDashboard();
         await loadDashboardData();
      } else {
         showLogin();
      }
   } catch (error) {
      console.error("Auth check failed:", error);
      showLogin();
   }
}

// Show login screen
function showLogin() {
   document.getElementById("loginContainer").style.display = "flex";
   document.getElementById("dashboardContainer").classList.remove("active");
}

// Show dashboard
function showDashboard() {
   document.getElementById("loginContainer").style.display = "none";
   document.getElementById("dashboardContainer").classList.add("active");
}

// Handle login form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
   e.preventDefault();

   const username = document.getElementById("username").value.trim();
   const password = document.getElementById("password").value;

   try {
      const response = await fetch(BASE_PATH + "/api/admin/login", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
         isAuthenticated = true;
         showDashboard();
         await loadDashboardData();
      } else {
         showLoginAlert(data.error || "Login fehlgeschlagen", "error");
      }
   } catch (error) {
      console.error("Login error:", error);
      showLoginAlert(
         "Login fehlgeschlagen. Bitte versuchen Sie es erneut.",
         "error",
      );
   }
});

// Logout
async function logout() {
   try {
      await fetch(BASE_PATH + "/api/admin/logout", { method: "POST" });
   } catch (error) {
      console.error("Logout error:", error);
   }

   isAuthenticated = false;
   showLogin();
   document.getElementById("loginForm").reset();
}

// Show login alert
function showLoginAlert(message, type = "info") {
   const container = document.getElementById("loginAlert");
   const alertClass = type === "error" ? "alert-error" : "alert-success";

   container.innerHTML = `
       <div class="alert ${alertClass}" style="margin-bottom: 20px;">
           ${message}
       </div>
   `;
}

// Show dashboard alert
function showDashboardAlert(message, type = "info") {
   const container = document.getElementById("dashboardAlert");
   const alertClass =
      type === "error"
         ? "alert-error"
         : type === "success"
           ? "alert-success"
           : "alert-info";

   container.innerHTML = `
       <div class="alert ${alertClass}">
           ${message}
       </div>
   `;

   setTimeout(() => {
      container.innerHTML = "";
   }, 5000);
}

// Switch tabs
function switchTab(tabName, buttonElement) {
   // Update tab buttons
   document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active");
   });
   if (buttonElement) {
      buttonElement.classList.add("active");
   }

   // Update tab content
   document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
   });
   document.getElementById(`${tabName}Tab`).classList.add("active");

   // Refresh data when switching tabs to ensure current view
   if (tabName === "participants") {
      loadParticipants();
   } else if (tabName === "timeslots") {
      // Load bookings first to ensure participant counts are correct
      loadBookings().then(() => loadTimeslots());
   } else if (tabName === "bookings") {
      loadBookings();
   } else if (tabName === "logs") {
      loadLogs();
   } else if (tabName === "calendar") {
      // Load all timeslots for calendar, then render
      loadTimeslotsForCalendar();
   } else if (tabName === "review") {
      loadUnreviewedAppointments();
   }
}

// Update review tab badge count
async function updateReviewTabBadge() {
   try {
      const response = await fetch(
         BASE_PATH + "/api/admin/bookings/unreviewed",
      );
      if (!response.ok) return;

      const appointments = await response.json();
      const count = appointments.length;
      const badge = document.getElementById("reviewTabBadge");

      if (badge) {
         badge.textContent = count;
         if (count > 0) {
            badge.classList.remove("hidden");
         } else {
            badge.classList.add("hidden");
         }
      }
   } catch (error) {
      console.error("Error updating review tab badge:", error);
   }
}

// Load dashboard data
async function loadDashboardData() {
   // Fetch participant goal from server config
   try {
      const configResponse = await fetch(BASE_PATH + "/api/config");
      if (configResponse.ok) {
         const config = await configResponse.json();
         window.PARTICIPANT_GOAL = config.participantGoal || 80;
      }
   } catch (error) {
      console.log("Could not load config, using default goal of 80");
      window.PARTICIPANT_GOAL = 80;
   }

   // Load data in sequence to avoid race conditions with display
   await loadParticipants();
   await loadBookings();
   await loadAllTimeslotsForStats(); // Load all timeslots for statistics
   await loadTimeslots(); // This calls displayTimeslots which needs bookings
   updateStatistics();
   displayUpcomingAppointments();
   updateReviewTabBadge();
}

// Refresh dashboard
async function refreshDashboard() {
   showDashboardAlert("Daten werden aktualisiert...", "info");
   await loadDashboardData();
   showDashboardAlert("Daten erfolgreich aktualisiert", "success");
}

// Load participants
async function loadParticipants() {
   try {
      const response = await fetch(BASE_PATH + "/api/admin/participants");
      if (!response.ok) throw new Error("Failed to load participants");

      allData.participants = await response.json();
      displayParticipants();
   } catch (error) {
      console.error("Error loading participants:", error);
   }
}

// Display participants
function displayParticipants() {
   const container = document.getElementById("participantsTableContainer");

   if (allData.participants.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; padding: 40px; color: #666;">Noch keine Teilnehmer registriert.</p>';
      return;
   }

   // Deduplicate participants by ID and collect all their bookings
   const participantsMap = new Map();
   allData.participants.forEach((p) => {
      if (!participantsMap.has(p.id)) {
         participantsMap.set(p.id, {
            id: p.id,
            name: p.name,
            email: p.email,
            created_at: p.created_at,
            vision_correction: p.vision_correction,
            study_subject: p.study_subject,
            vr_experience: p.vr_experience,
            motion_sickness: p.motion_sickness,
            bookings: [],
         });
      }
      // Add booking info if it exists
      if (p.booking_id) {
         participantsMap.get(p.id).bookings.push({
            booking_id: p.booking_id,
            start_time: p.start_time,
            end_time: p.end_time,
            location: p.location,
            booking_status: p.booking_status,
         });
      }
   });

   // Convert map to array and sort by creation date (newest first)
   const uniqueParticipants = Array.from(participantsMap.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
   );

   container.innerHTML = `
       <div class="table-container">
           <table>
               <thead>
                   <tr>
                       <th>Name</th>
                       <th>E-Mail</th>
                       <th>Termin(e)</th>
                       <th>Status</th>
                       <th>Fragebogen</th>
                       <th>Registriert</th>
                       <th>Aktionen</th>
                   </tr>
               </thead>
               <tbody>
                   ${uniqueParticipants
                      .map((p) => {
                         const hasBookings = p.bookings.length > 0;

                         // Format all appointments
                         let appointmentTimeDisplay = "-";
                         if (hasBookings) {
                            if (p.bookings.length === 1) {
                               appointmentTimeDisplay = new Date(
                                  p.bookings[0].start_time,
                               ).toLocaleString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                               });
                            } else {
                               // Multiple bookings - show them all
                               appointmentTimeDisplay = p.bookings
                                  .map((b) =>
                                     new Date(b.start_time).toLocaleString(
                                        "de-DE",
                                        {
                                           day: "2-digit",
                                           month: "2-digit",
                                           year: "numeric",
                                           hour: "2-digit",
                                           minute: "2-digit",
                                        },
                                     ),
                                  )
                                  .join("<br>");
                            }
                         }

                         // Questionnaire data formatting
                         const visionMap = {
                            none: "Keine Sehhilfe",
                            glasses: "Brille",
                            contacts: "Kontaktlinsen",
                         };
                         const visionText = p.vision_correction
                            ? visionMap[p.vision_correction] ||
                              p.vision_correction
                            : "n/a";
                         const studySubject = p.study_subject || "n/a";
                         const vrExp = p.vr_experience || "n/a";
                         const motionSick = p.motion_sickness || "n/a";

                         const hasQuestionnaire =
                            p.vision_correction ||
                            p.study_subject ||
                            p.vr_experience ||
                            p.motion_sickness;

                         // Create detailed questionnaire info for modal
                         const questionnaireDetails = hasQuestionnaire
                            ? `<strong>Sehkorrektur:</strong> ${visionText}<br>
                               <strong>Studienfach:</strong> ${studySubject}<br>
                               <strong>VR-Erfahrung:</strong> ${vrExp}/5<br>
                               <strong>Reiseübelkeit:</strong> ${motionSick}/5`
                            : "Keine Fragebogendaten verfügbar";

                         return `
                           <tr>
                               <td>${p.name}</td>
                               <td>${p.email}</td>
                               <td>${appointmentTimeDisplay}</td>
                               <td>
                                   ${
                                      hasBookings
                                         ? `<span class="badge badge-success">Gebucht${p.bookings.length > 1 ? ` (${p.bookings.length})` : ""}</span>`
                                         : `<span class="badge badge-warning">Kein Termin</span>`
                                   }
                               </td>
                               <td>
                                   ${
                                      hasQuestionnaire
                                         ? `<span onclick="showQuestionnaireModal('${p.name.replace(/'/g, "\\'")}', \`${questionnaireDetails}\`)" style="cursor: pointer; color: #667eea;">
                                               📋 <span style="text-decoration: underline;">Anzeigen</span>
                                           </span>`
                                         : `<span style="color: #999;">-</span>`
                                   }
                               </td>
                               <td>${new Date(p.created_at).toLocaleDateString("de-DE")}</td>
                               <td>
                                   <button class="btn btn-secondary btn-sm" onclick="showSendEmailModal('${p.email}', '${p.name.replace(/'/g, "\\'")}')">
                                       ✉️ Email
                                   </button>
                                   <button class="btn btn-danger btn-sm" onclick="deleteParticipant(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
                                       Löschen
                                   </button>
                               </td>
                           </tr>
                       `;
                      })
                      .join("")}
               </tbody>
           </table>
       </div>
   `;
}

// Load all timeslots for statistics (no pagination)
async function loadAllTimeslotsForStats() {
   try {
      const response = await fetch(BASE_PATH + "/api/admin/timeslots");
      if (!response.ok) throw new Error("Failed to load timeslots for stats");

      const data = await response.json();
      // Handle both old format (array) and new format (paginated object)
      if (Array.isArray(data)) {
         allData.timeslotsForStats = data;
      } else {
         allData.timeslotsForStats = data.timeslots || data;
      }

      console.log(
         "Loaded timeslots for stats:",
         allData.timeslotsForStats.length,
      );
   } catch (error) {
      console.error("Error loading timeslots for statistics:", error);
      allData.timeslotsForStats = []; // Ensure it's an empty array on error
   }
}

// Load timeslots
async function loadTimeslots(page = null) {
   try {
      if (page !== null) {
         timeslotsPagination.currentPage = page;
      }

      const pageSize = timeslotsPagination.pageSize;
      const offset = (timeslotsPagination.currentPage - 1) * pageSize;

      let url = BASE_PATH + "/api/admin/timeslots";
      if (pageSize !== "all") {
         url += `?limit=${pageSize}&offset=${offset}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load timeslots");

      const data = await response.json();
      // Handle both old format (array) and new format (paginated object)
      if (Array.isArray(data)) {
         allData.timeslots = data;
         timeslotsPagination.total = data.length;
      } else {
         allData.timeslots = data.timeslots;
         timeslotsPagination.total = data.total;
      }

      // Only display if we're on the timeslots tab or if bookings are loaded
      if (allData.bookings) {
         displayTimeslots();
         updateTimeslotsPaginationUI();
      }
   } catch (error) {
      console.error("Error loading timeslots:", error);
   }
}

// Update pagination UI for timeslots
function updateTimeslotsPaginationUI() {
   const pageSize = timeslotsPagination.pageSize;
   if (pageSize === "all") {
      document.getElementById("timeslotsPagination").style.display = "none";
      return;
   }

   const totalPages = Math.ceil(timeslotsPagination.total / pageSize);
   const currentPage = timeslotsPagination.currentPage;
   const start = (currentPage - 1) * pageSize + 1;
   const end = Math.min(currentPage * pageSize, timeslotsPagination.total);

   document.getElementById("timeslotsRangeStart").textContent =
      timeslotsPagination.total > 0 ? start : 0;
   document.getElementById("timeslotsRangeEnd").textContent = end;
   document.getElementById("timeslotsTotal").textContent =
      timeslotsPagination.total;
   document.getElementById("timeslotsCurrentPage").textContent = currentPage;
   document.getElementById("timeslotsTotalPages").textContent = totalPages;

   // Enable/disable buttons
   document.getElementById("timeslotsFirstBtn").disabled = currentPage === 1;
   document.getElementById("timeslotsPrevBtn").disabled = currentPage === 1;
   document.getElementById("timeslotsNextBtn").disabled =
      currentPage >= totalPages;
   document.getElementById("timeslotsLastBtn").disabled =
      currentPage >= totalPages;

   document.getElementById("timeslotsPagination").style.display = "block";
}

// Navigate timeslots pages
function goToTimeslotsPage(action) {
   const totalPages = Math.ceil(
      timeslotsPagination.total / timeslotsPagination.pageSize,
   );

   switch (action) {
      case "first":
         timeslotsPagination.currentPage = 1;
         break;
      case "prev":
         if (timeslotsPagination.currentPage > 1) {
            timeslotsPagination.currentPage--;
         }
         break;
      case "next":
         if (timeslotsPagination.currentPage < totalPages) {
            timeslotsPagination.currentPage++;
         }
         break;
      case "last":
         timeslotsPagination.currentPage = totalPages;
         break;
   }

   loadTimeslots();
}

// Change timeslots page size
function changeTimeslotsPageSize() {
   const select = document.getElementById("timeslotsPageSize");
   timeslotsPagination.pageSize =
      select.value === "all" ? "all" : parseInt(select.value);
   timeslotsPagination.currentPage = 1;
   loadTimeslots();
}

// Track selected timeslots for bulk operations
const selectedTimeslots = new Set();

// Update bulk delete button visibility
function updateBulkDeleteButton() {
   const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
   const bulkEditBtn = document.getElementById("bulkEditBtn");
   const selectedCount = document.getElementById("selectedCount");
   const selectedCountEdit = document.getElementById("selectedCountEdit");

   if (selectedTimeslots.size > 0) {
      bulkDeleteBtn.style.display = "block";
      bulkEditBtn.style.display = "block";
      selectedCount.textContent = selectedTimeslots.size;
      selectedCountEdit.textContent = selectedTimeslots.size;
   } else {
      bulkDeleteBtn.style.display = "none";
      bulkEditBtn.style.display = "none";
   }
}

// Toggle timeslot selection
function toggleTimeslotSelection(id, checkbox) {
   if (checkbox.checked) {
      selectedTimeslots.add(id);
   } else {
      selectedTimeslots.delete(id);
   }
   updateBulkDeleteButton();
}

// Select all timeslots
function toggleSelectAll(checkbox) {
   const checkboxes = document.querySelectorAll(".timeslot-checkbox");
   selectedTimeslots.clear();

   checkboxes.forEach((cb) => {
      cb.checked = checkbox.checked;
      if (checkbox.checked) {
         selectedTimeslots.add(parseInt(cb.dataset.id));
      }
   });

   updateBulkDeleteButton();
}

// Display timeslots
function displayTimeslots() {
   const container = document.getElementById("timeslotsTableContainer");

   if (allData.timeslots.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; padding: 40px; color: #666;">Noch keine Zeitslots erstellt.</p>';
      selectedTimeslots.clear();
      updateBulkDeleteButton();
      return;
   }

   container.innerHTML = `
       <div class="table-container">
           <table>
               <thead>
                   <tr>
                       <th style="width: 40px;">
                           <input type="checkbox" onchange="toggleSelectAll(this)" title="Alle auswählen">
                       </th>
                       <th style="width: 40px;">★</th>
                       <th>Datum</th>
                       <th>Uhrzeit</th>
                       <th>Ort</th>
                       <th>Typ</th>
                       <th>Kapazität</th>
                       <th>Teilnehmer</th>
                       <th>Status</th>
                       <th>Aktionen</th>
                   </tr>
               </thead>
               <tbody>
                   ${allData.timeslots
                      .map((slot) => {
                         const startDate = new Date(slot.start_time);
                         const endDate = new Date(slot.end_time);
                         const dateStr = startDate.toLocaleDateString("de-DE", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                         });
                         const timeStr = `${startDate.toLocaleTimeString(
                            "de-DE",
                            {
                               hour: "2-digit",
                               minute: "2-digit",
                            },
                         )} - ${endDate.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                         })}`;

                         const activeBookingsForThisSlot =
                            allData.bookings.filter(
                               (b) =>
                                  b.timeslot_id === slot.id &&
                                  b.status === "active",
                            );
                         const hasActiveBookings =
                            activeBookingsForThisSlot.length > 0;

                         // Determine status based on capacity
                         let statusBadge =
                            '<span class="badge badge-success">Verfügbar</span>';
                         let totalCapacity = slot.capacity;

                         // Check if timeslot has variant capacities and what type it currently is
                         const hasVariantCapacities =
                            slot.primary_capacity !== null ||
                            slot.followup_capacity !== null;

                         if (hasVariantCapacities) {
                            const primaryBookings =
                               activeBookingsForThisSlot.filter(
                                  (b) => !b.is_followup,
                               ).length;
                            const followupBookings =
                               activeBookingsForThisSlot.filter(
                                  (b) => b.is_followup,
                               ).length;
                            const primaryCap =
                               slot.primary_capacity !== null
                                  ? slot.primary_capacity
                                  : Infinity;
                            const followupCap =
                               slot.followup_capacity !== null
                                  ? slot.followup_capacity
                                  : Infinity;

                            // Check status based on current appointment_type
                            if (slot.appointment_type === "primary") {
                               // Only consider primary capacity
                               if (primaryBookings >= primaryCap) {
                                  statusBadge =
                                     '<span class="badge badge-danger">Ausgebucht</span>';
                               } else if (primaryBookings > 0) {
                                  statusBadge =
                                     '<span class="badge badge-warning">Teilweise gebucht</span>';
                               }
                            } else if (slot.appointment_type === "followup") {
                               // Only consider followup capacity
                               if (followupBookings >= followupCap) {
                                  statusBadge =
                                     '<span class="badge badge-danger">Ausgebucht</span>';
                               } else if (followupBookings > 0) {
                                  statusBadge =
                                     '<span class="badge badge-warning">Teilweise gebucht</span>';
                               }
                            } else {
                               // Still dual - check both capacities
                               if (
                                  primaryBookings >= primaryCap &&
                                  followupBookings >= followupCap
                               ) {
                                  statusBadge =
                                     '<span class="badge badge-danger">Ausgebucht</span>';
                               } else if (
                                  primaryBookings > 0 ||
                                  followupBookings > 0
                               ) {
                                  statusBadge =
                                     '<span class="badge badge-warning">Teilweise gebucht</span>';
                               }
                            }
                         } else if (totalCapacity) {
                            // Singular capacity
                            if (
                               activeBookingsForThisSlot.length >= totalCapacity
                            ) {
                               statusBadge =
                                  '<span class="badge badge-danger">Ausgebucht</span>';
                            } else if (activeBookingsForThisSlot.length > 0) {
                               statusBadge =
                                  '<span class="badge badge-warning">Teilweise gebucht</span>';
                            }
                         } else {
                            // No capacity limit
                            if (hasActiveBookings) {
                               statusBadge =
                                  '<span class="badge badge-info">Gebucht</span>';
                            }
                         }

                         let typeBadge = "";
                         if (slot.appointment_type === "primary") {
                            typeBadge =
                               '<span class="badge badge-info">Haupttermin</span>';
                         } else if (slot.appointment_type === "followup") {
                            typeBadge =
                               '<span class="badge badge-success">Folgetermin</span>';
                         } else if (slot.appointment_type === "dual") {
                            typeBadge =
                               '<span class="badge badge-warning">Dual</span>';
                         }

                         // Show original type if it's different (e.g., was dual, now primary)
                         if (
                            slot.original_type &&
                            slot.original_type !== slot.appointment_type
                         ) {
                            typeBadge +=
                               ' <span class="badge badge-secondary" style="font-size: 0.85em;">war: ' +
                               (slot.original_type === "dual"
                                  ? "Dual"
                                  : slot.original_type === "primary"
                                    ? "Haupttermin"
                                    : "Folgetermin") +
                               "</span>";
                         }

                         const activeBookingsForSlot = allData.bookings.filter(
                            (b) =>
                               b.timeslot_id === slot.id &&
                               b.status === "active",
                         );

                         // Show capacity - handle dual appointments with variant capacities
                         let capacityStr;
                         const hasVariantCapacitiesForDisplay =
                            slot.primary_capacity !== null ||
                            slot.followup_capacity !== null;

                         if (hasVariantCapacitiesForDisplay) {
                            const primaryBookings =
                               activeBookingsForSlot.filter(
                                  (b) => !b.is_followup,
                               ).length;
                            const followupBookings =
                               activeBookingsForSlot.filter(
                                  (b) => b.is_followup,
                               ).length;

                            const primaryCap =
                               slot.primary_capacity !== null
                                  ? slot.primary_capacity
                                  : "∞";
                            const followupCap =
                               slot.followup_capacity !== null
                                  ? slot.followup_capacity
                                  : "∞";

                            // Show capacity based on current appointment_type
                            if (slot.appointment_type === "primary") {
                               // Only show primary capacity
                               capacityStr = `${primaryBookings}/${primaryCap}`;
                            } else if (slot.appointment_type === "followup") {
                               // Only show followup capacity
                               capacityStr = `${followupBookings}/${followupCap}`;
                            } else {
                               // Still dual - show both capacities
                               capacityStr = `
                                  <span style="color: #17a2b8; font-weight: 500;">H: ${primaryBookings}/${primaryCap}</span>
                                  <span style="color: #999; margin: 0 4px;">|</span>
                                  <span style="color: #28a745; font-weight: 500;">F: ${followupBookings}/${followupCap}</span>
                               `;
                            }
                         } else if (slot.capacity) {
                            // Singular capacity
                            capacityStr = `${activeBookingsForSlot.length}/${slot.capacity}`;
                         } else {
                            // No capacity limit
                            capacityStr = `${activeBookingsForSlot.length}/∞`;
                         }

                         // Show participant list or link to modal
                         let participantsList = "-";
                         if (activeBookingsForSlot.length > 0) {
                            if (activeBookingsForSlot.length <= 2) {
                               // Show names directly if 2 or fewer
                               participantsList = activeBookingsForSlot
                                  .map((b) => `${b.name}`)
                                  .join(", ");
                            } else {
                               // Show link to modal if more than 2
                               participantsList = `<a href="#" onclick="showTimeslotParticipantsModal(${slot.id}); return false;" style="color: #667eea; text-decoration: underline;">
                                  ${activeBookingsForSlot.length} Teilnehmer anzeigen
                               </a>`;
                            }
                         }

                         const isSelected = selectedTimeslots.has(slot.id);
                         const isFeatured = slot.is_featured === 1;
                         return `
                           <tr>
                               <td>
                                   <input type="checkbox"
                                          class="timeslot-checkbox"
                                          data-id="${slot.id}"
                                          ${isSelected ? "checked" : ""}
                                          onchange="toggleTimeslotSelection(${slot.id}, this)">
                               </td>
                               <td>
                                   <button
                                       class="btn btn-sm"
                                       onclick="toggleFeaturedTimeslot(${slot.id})"
                                       title="${isFeatured ? "Als empfohlenen Termin entfernen" : "Als empfohlenen Termin markieren"}"
                                       style="
                                           background: none;
                                           border: none;
                                           font-size: 20px;
                                           cursor: pointer;
                                           padding: 4px 8px;
                                           color: ${isFeatured ? "#ffc107" : "#ccc"};
                                           transition: all 0.2s;
                                       "
                                       onmouseover="this.style.transform='scale(1.2)'"
                                       onmouseout="this.style.transform='scale(1)'"
                                   >
                                       ${isFeatured ? "★" : "☆"}
                                   </button>
                               </td>
                               <td>${dateStr}</td>
                               <td>${timeStr}</td>
                               <td>${slot.location || "-"}</td>
                               <td>${typeBadge}</td>
                               <td>${capacityStr}</td>
                               <td>${participantsList}</td>
                               <td>${statusBadge}</td>
                               <td>
                                   <button class="btn btn-secondary btn-sm" style="margin-bottom:10px" onclick="editTimeslot(${slot.id})">
                                       Bearbeiten
                                   </button>
                                   ${
                                      hasActiveBookings
                                         ? `<button class="btn btn-warning btn-sm" onclick="cancelBookingsForTimeslot(${slot.id})">
                                           Stornieren
                                          </button>`
                                         : `<button class="btn btn-danger btn-sm" onclick="deleteTimeslot(${slot.id})">
                                           Löschen
                                          </button>`
                                   }
                               </td>
                           </tr>
                       `;
                      })
                      .join("")}
               </tbody>
           </table>
       </div>
   `;
}

// Load bookings
async function loadBookings() {
   try {
      const response = await fetch(BASE_PATH + "/api/admin/bookings");
      if (!response.ok) throw new Error("Failed to load bookings");

      allData.bookings = await response.json();
      displayBookings();
      // Re-display timeslots if they're already loaded to update participant counts
      if (allData.timeslots && allData.timeslots.length > 0) {
         displayTimeslots();
      }
   } catch (error) {
      console.error("Error loading bookings:", error);
   }
}

// Display bookings
function displayBookings() {
   const container = document.getElementById("bookingsTableContainer");

   if (allData.bookings.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; padding: 40px; color: #666;">Noch keine Buchungen vorhanden.</p>';
      return;
   }

   container.innerHTML = `
       <div class="table-container">
           <table>
               <thead>
                   <tr>
                       <th>Teilnehmer</th>
                       <th>E-Mail</th>
                       <th>Termin</th>
                       <th>Ort</th>
                       <th>Status</th>
                       <th>Gebucht am</th>
                       <th>Aktionen</th>
                   </tr>
               </thead>
               <tbody>
                   ${allData.bookings
                      .map((booking) => {
                         const startDate = new Date(booking.start_time);
                         const dateTimeStr = startDate.toLocaleString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                         });
                         const createdDate = new Date(
                            booking.created_at,
                         ).toLocaleDateString("de-DE");

                         const statusBadge =
                            booking.status === "active"
                               ? '<span class="badge badge-success">Aktiv</span>'
                               : '<span class="badge badge-danger">Storniert</span>';

                         return `
                           <tr>
                               <td>${booking.name}</td>
                               <td>${booking.email}</td>
                               <td>${dateTimeStr}</td>
                               <td>${booking.location || "-"}</td>
                               <td>${statusBadge}</td>
                               <td>${createdDate}</td>
                               <td>
                                   <button class="btn btn-secondary btn-sm" onclick="showSendEmailModal('${booking.email}', '${booking.name.replace(/'/g, "\\'")}')">
                                       ✉️ Email
                                   </button>
                               </td>
                           </tr>
                       `;
                      })
                      .join("")}
               </tbody>
           </table>
       </div>
   `;
}

// Load logs
async function loadLogs(page = null) {
   const container = document.getElementById("logsContainer");
   container.innerHTML =
      '<div class="loading"><div class="loading-spinner"></div><p>Lade Protokoll...</p></div>';

   try {
      if (page !== null) {
         logsPagination.currentPage = page;
      }

      const pageSize = logsPagination.pageSize;
      const offset = (logsPagination.currentPage - 1) * pageSize;

      let url = BASE_PATH + "/api/admin/logs";
      if (pageSize !== "all") {
         url += `?limit=${pageSize}&offset=${offset}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load logs");

      const data = await response.json();
      // Handle both old format (array) and new format (paginated object)
      if (Array.isArray(data)) {
         allData.logs = data;
         logsPagination.total = data.length;
      } else {
         allData.logs = data.logs;
         logsPagination.total = data.total;
      }

      displayLogs();
      updateLogsPaginationUI();
   } catch (error) {
      console.error("Error loading logs:", error);
      container.innerHTML =
         '<p style="color: #dc3545; text-align: center;">Fehler beim Laden des Protokolls.</p>';
   }
}

// Update pagination UI for logs
function updateLogsPaginationUI() {
   const pageSize = logsPagination.pageSize;
   if (pageSize === "all") {
      document.getElementById("logsPagination").style.display = "none";
      return;
   }

   const totalPages = Math.ceil(logsPagination.total / pageSize);
   const currentPage = logsPagination.currentPage;
   const start = (currentPage - 1) * pageSize + 1;
   const end = Math.min(currentPage * pageSize, logsPagination.total);

   document.getElementById("logsRangeStart").textContent =
      logsPagination.total > 0 ? start : 0;
   document.getElementById("logsRangeEnd").textContent = end;
   document.getElementById("logsTotal").textContent = logsPagination.total;
   document.getElementById("logsCurrentPage").textContent = currentPage;
   document.getElementById("logsTotalPages").textContent = totalPages;

   // Enable/disable buttons
   document.getElementById("logsFirstBtn").disabled = currentPage === 1;
   document.getElementById("logsPrevBtn").disabled = currentPage === 1;
   document.getElementById("logsNextBtn").disabled = currentPage >= totalPages;
   document.getElementById("logsLastBtn").disabled = currentPage >= totalPages;

   document.getElementById("logsPagination").style.display = "block";
}

// Navigate logs pages
function goToLogsPage(action) {
   const totalPages = Math.ceil(logsPagination.total / logsPagination.pageSize);

   switch (action) {
      case "first":
         logsPagination.currentPage = 1;
         break;
      case "prev":
         if (logsPagination.currentPage > 1) {
            logsPagination.currentPage--;
         }
         break;
      case "next":
         if (logsPagination.currentPage < totalPages) {
            logsPagination.currentPage++;
         }
         break;
      case "last":
         logsPagination.currentPage = totalPages;
         break;
   }

   loadLogs();
}

// Change logs page size
function changeLogsPageSize() {
   const select = document.getElementById("logsPageSize");
   logsPagination.pageSize =
      select.value === "all" ? "all" : parseInt(select.value);
   logsPagination.currentPage = 1;
   loadLogs();
}

// Display logs
function displayLogs() {
   const container = document.getElementById("logsContainer");

   if (allData.logs.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; padding: 40px; color: #666;">Keine Protokolleinträge vorhanden.</p>';
      return;
   }

   container.innerHTML = allData.logs
      .map((log) => {
         const timestamp = new Date(log.timestamp).toLocaleString("de-DE");
         return `
           <div class="log-entry">
               <span class="log-timestamp">[${timestamp}]</span>
               <span class="log-action">${log.action_type} ${log.action_path}</span>
               <span>${log.user_type} - ${log.ip_address}</span>
           </div>
       `;
      })
      .join("");
}

// Update statistics and progress
function updateStatistics() {
   // Get participant goal from config (default 80)
   const participantGoal = parseInt(window.PARTICIPANT_GOAL || "80", 10);
   document.getElementById("participantGoal").textContent = participantGoal;

   // Update participant count (count unique participants)
   const uniqueParticipants = new Set(allData.participants.map((p) => p.id));
   document.getElementById("participantCount").textContent =
      uniqueParticipants.size;

   // Calculate timeslot statistics using all timeslots (not paginated)
   // Safeguard: ensure timeslotsForStats exists and is an array
   const timeslotsForStats = Array.isArray(allData.timeslotsForStats)
      ? allData.timeslotsForStats
      : [];

   // Count unique timeslots (may have duplicates if multiple bookings per slot)
   const uniqueTimeslotIds = new Set(timeslotsForStats.map((t) => t.id));
   const totalSlots = uniqueTimeslotIds.size;

   // Count unique timeslots that have bookings
   const timeslotsWithBookings = new Set(
      timeslotsForStats.filter((t) => t.booking_id).map((t) => t.id),
   );
   const bookedSlots = timeslotsWithBookings.size;
   const availableSlots = totalSlots - bookedSlots;

   console.log("Timeslot stats:", {
      totalSlots,
      bookedSlots,
      availableSlots,
      timeslotsCount: timeslotsForStats.length,
   });

   document.getElementById("slotsInfo").textContent =
      `${bookedSlots} / ${totalSlots}`;
   document.getElementById("availableInfo").textContent = availableSlots;

   // Calculate participant statistics with result status
   const participantBookings = {};
   const now = new Date();

   allData.bookings.forEach((booking) => {
      if (booking.status === "confirmed" || booking.status === "active") {
         if (!participantBookings[booking.participant_id]) {
            participantBookings[booking.participant_id] = {
               primary: null,
               followup: null,
            };
         }

         const bookingData = {
            id: booking.id,
            isPast: new Date(booking.start_time) < now,
            resultStatus: booking.result_status,
            startTime: booking.start_time,
            appointmentType: booking.appointment_type,
         };

         if (booking.appointment_type === "primary") {
            participantBookings[booking.participant_id].primary = bookingData;
         } else if (booking.appointment_type === "followup") {
            participantBookings[booking.participant_id].followup = bookingData;
         }
      }
   });

   // Count participants by new status categories
   let bothFinished = 0; // Both appointments finished (excluding no-shows)
   let waitingForSecond = 0; // First finished, waiting for second
   let noShowSecond = 0; // First finished, no-show on second
   let dataIssues = 0; // Any appointment had data issues

   // Track participants in each category for tooltips
   const bothFinishedList = [];
   const waitingForSecondList = [];
   const noShowSecondList = [];
   const dataIssuesList = [];

   allData.participants.forEach((participant) => {
      const bookings = participantBookings[participant.id];
      if (bookings) {
         const hasPrimary = bookings.primary !== null;
         const hasFollowup = bookings.followup !== null;

         if (hasPrimary && hasFollowup) {
            const primaryPast = bookings.primary.isPast;
            const followupPast = bookings.followup.isPast;
            const primaryResult = bookings.primary.resultStatus;
            const followupResult = bookings.followup.resultStatus;

            // Both appointments finished
            if (
               primaryPast &&
               followupPast &&
               primaryResult &&
               followupResult
            ) {
               // Check for no-shows
               if (
                  primaryResult === "no_show" ||
                  followupResult === "no_show"
               ) {
                  // Exclude no-shows from "both finished"
               } else {
                  // Both finished (not no-shows)
                  bothFinished++;
                  bothFinishedList.push({
                     name: participant.name,
                     email: participant.email,
                  });
               }

               // Check for data issues in either appointment
               if (
                  primaryResult === "unusable_data" ||
                  followupResult === "unusable_data" ||
                  primaryResult === "issues_arised" ||
                  followupResult === "issues_arised"
               ) {
                  dataIssues++;
                  dataIssuesList.push({
                     name: participant.name,
                     primaryStatus: primaryResult,
                     followupStatus: followupResult,
                     primaryPast: primaryPast,
                     followupPast: followupPast,
                  });
               }
            } else if (primaryPast && primaryResult) {
               // Primary finished, followup either not past or not reviewed yet
               if (!followupPast) {
                  // Followup in future - waiting for second
                  waitingForSecond++;
                  waitingForSecondList.push({
                     name: participant.name,
                     nextAppointment: bookings.followup.startTime,
                  });
               }
               // If followup is past but not reviewed, we don't count it yet

               // Check if followup was a no-show
               if (followupResult === "no_show") {
                  noShowSecond++;
                  noShowSecondList.push({
                     name: participant.name,
                  });
               }

               // Check for data issues in primary
               if (
                  primaryResult === "unusable_data" ||
                  primaryResult === "issues_arised"
               ) {
                  dataIssues++;
                  dataIssuesList.push({
                     name: participant.name,
                     primaryStatus: primaryResult,
                     followupStatus: followupResult,
                     primaryPast: primaryPast,
                     followupPast: followupPast,
                  });
               }
            }
         } else if (hasPrimary && !hasFollowup) {
            // Only primary appointment, no followup scheduled
            const primaryPast = bookings.primary.isPast;
            const primaryResult = bookings.primary.resultStatus;

            if (primaryPast && primaryResult && primaryResult !== "no_show") {
               // Primary finished, waiting for second to be scheduled
               waitingForSecond++;
               waitingForSecondList.push({
                  name: participant.name,
                  nextAppointment: null,
               });

               // Check for data issues
               if (
                  primaryResult === "unusable_data" ||
                  primaryResult === "issues_arised"
               ) {
                  dataIssues++;
                  dataIssuesList.push({
                     name: participant.name,
                     primaryStatus: primaryResult,
                     followupStatus: null,
                     primaryPast: primaryPast,
                     followupPast: false,
                  });
               }
            }
         }
      }
   });

   // Calculate total completed for progress bar (both finished)
   const totalCompleted = bothFinished;

   // Update UI
   document.getElementById("bothFinished").textContent = bothFinished;
   document.getElementById("waitingForSecond").textContent = waitingForSecond;
   document.getElementById("noShowSecond").textContent = noShowSecond;
   document.getElementById("dataIssues").textContent = dataIssues;

   // Setup tooltips for status cards
   setupStatusTooltips(
      bothFinishedList,
      waitingForSecondList,
      noShowSecondList,
      dataIssuesList,
   );

   // Update progress bar - just show completed participants
   const totalPercentage = Math.min(
      100,
      Math.round((totalCompleted / participantGoal) * 100),
   );

   const progressBar = document.getElementById("progressBarFillSuccess");
   const progressText = document.getElementById("progressPercentage");

   progressBar.style.width = totalPercentage + "%";
   progressBar.style.borderRadius = "12px";
   progressText.textContent = totalPercentage + "%";

   // Hide the issues bar since we're only showing completed count
   const issuesBar = document.getElementById("progressBarFillIssues");
   issuesBar.style.width = "0%";
}

// Function to setup tooltips for status cards
function setupStatusTooltips(
   bothFinishedList,
   waitingForSecondList,
   noShowSecondList,
   dataIssuesList,
) {
   // Helper to create uniform tooltip
   function createTooltip(cardId, content) {
      const card = document.getElementById(cardId);
      if (!card) {
         console.log("Card not found:", cardId);
         return;
      }

      // Remove existing tooltip
      const existingTooltip = card.querySelector(".status-tooltip");
      if (existingTooltip) existingTooltip.remove();

      if (!content || content.trim() === "") {
         console.log("No content for:", cardId);
         return;
      }

      // Clone the card to remove all event listeners
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      const freshCard = document.getElementById(cardId);

      const tooltip = document.createElement("div");
      tooltip.className = "status-tooltip";
      tooltip.style.cssText = `
           position: absolute;
           bottom: 110%;
           left: 50%;
           transform: translateX(-50%);
           background: white;
           border: 1px solid #d1d5db;
           border-radius: 6px;
           padding: 8px 10px;
           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
           z-index: 1000;
           min-width: 200px;
           max-width: 350px;
           display: none;
           max-height: 300px;
           overflow-y: auto;
           font-size: 11px;
           line-height: 1.4;
           white-space: pre-line;
       `;
      tooltip.innerHTML = content;
      freshCard.appendChild(tooltip);

      freshCard.addEventListener("mouseenter", () => {
         tooltip.style.display = "block";
      });
      freshCard.addEventListener("mouseleave", () => {
         tooltip.style.display = "none";
      });

      console.log(
         "Created tooltip for:",
         cardId,
         "with content length:",
         content.length,
      );
   }

   // Helper to get compact status badge
   function getCompactBadge(status, isPast) {
      if (!isPast)
         return '<span style="padding:2px 6px;background:#e5e7eb;color:#374151;border-radius:3px;font-size:9px;font-weight:600;">waiting</span>';
      switch (status) {
         case "successful":
            return '<span style="padding:2px 6px;background:#d1fae5;color:#065f46;border-radius:3px;font-size:9px;font-weight:600;">success</span>';
         case "unusable_data":
         case "issues_arised":
            return '<span style="padding:2px 6px;background:#fef3c7;color:#92400e;border-radius:3px;font-size:9px;font-weight:600;">issues</span>';
         case "no_show":
            return '<span style="padding:2px 6px;background:#fee2e2;color:#991b1b;border-radius:3px;font-size:9px;font-weight:600;">no-show</span>';
         default:
            return '<span style="padding:2px 6px;background:#e5e7eb;color:#374151;border-radius:3px;font-size:9px;font-weight:600;">unknown</span>';
      }
   }

   // Both Finished tooltip - deduplicate by name
   if (bothFinishedList.length) {
      const uniqueNames = [...new Set(bothFinishedList.map((p) => p.name))];
      const content = uniqueNames.join("\n");
      createTooltip("bothFinishedCard", content);
   }

   // Waiting for Second tooltip - deduplicate by name
   if (waitingForSecondList.length) {
      const seen = new Set();
      const uniqueList = waitingForSecondList.filter((p) => {
         if (seen.has(p.name)) return false;
         seen.add(p.name);
         return true;
      });

      const content = uniqueList
         .map((p) => {
            if (p.nextAppointment) {
               const date = new Date(p.nextAppointment);
               const dateStr = date.toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
               });
               return `${p.name} → ${dateStr}`;
            } else {
               return `${p.name} → nicht geplant`;
            }
         })
         .join("\n");
      createTooltip("waitingForSecondCard", content);
   }

   // No-show tooltip - deduplicate by name
   if (noShowSecondList.length) {
      const uniqueNames = [...new Set(noShowSecondList.map((p) => p.name))];
      const content = uniqueNames.join("\n");
      createTooltip("noShowSecondCard", content);
   }

   // Data Issues tooltip - deduplicate by name
   if (dataIssuesList.length) {
      const seen = new Set();
      const uniqueList = dataIssuesList.filter((p) => {
         if (seen.has(p.name)) return false;
         seen.add(p.name);
         return true;
      });

      let content = '<div style="font-size:11px;">';
      uniqueList.forEach((p, idx) => {
         if (idx > 0)
            content +=
               '<hr style="margin:4px 0;border:none;border-top:1px solid #e5e7eb;">';
         content += `<div style="margin-bottom:2px;display:flex;gap:6px;align-items:center;">
               <span style="font-weight:600;color:#111827;">${p.name}</span>
               ${getCompactBadge(p.primaryStatus, p.primaryPast)}
               ${getCompactBadge(p.followupStatus, p.followupPast)}
           </div>`;
      });
      content += "</div>";
      createTooltip("dataIssuesCard", content);
   }
}

// Display upcoming appointments
function displayUpcomingAppointments() {
   const container = document.getElementById("upcomingAppointments");
   const upcoming = allData.bookings
      .filter(
         (b) => b.status === "active" && new Date(b.start_time) > new Date(),
      )
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 5);

   if (upcoming.length === 0) {
      container.innerHTML =
         '<p style="text-align: center; color: #666;">Keine bevorstehenden Termine.</p>';
      return;
   }

   container.innerHTML = `
       <div class="table-container">
           <table>
               <thead>
                   <tr>
                       <th>Termin</th>
                       <th>Teilnehmer</th>
                       <th>E-Mail</th>
                       <th>Ort</th>
                   </tr>
               </thead>
               <tbody>
                   ${upcoming
                      .map((booking) => {
                         const dateTimeStr = new Date(
                            booking.start_time,
                         ).toLocaleString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                         });

                         return `
                           <tr>
                               <td>${dateTimeStr}</td>
                               <td>${booking.name}</td>
                               <td>${booking.email}</td>
                               <td>${booking.location || "-"}</td>
                           </tr>
                       `;
                      })
                      .join("")}
               </tbody>
           </table>
       </div>
   `;
}

// Show create timeslot modal
function showCreateTimeslotModal() {
   document.getElementById("timeslotModalTitle").textContent = "Neuer Zeitslot";
   document.getElementById("timeslotForm").reset();
   document.getElementById("timeslotId").value = "";
   // Explicitly clear datetime fields (browser may persist these)
   document.getElementById("startTime").value = "";
   document.getElementById("endTime").value = "";
   document.getElementById("timeslotModal").classList.add("active");
}

// Edit timeslot
function editTimeslot(id) {
   const slot = allData.timeslots.find((s) => s.id === id);
   if (!slot) return;

   document.getElementById("timeslotModalTitle").textContent =
      "Zeitslot bearbeiten";
   document.getElementById("timeslotId").value = slot.id;

   // Format datetime for input (datetime-local expects local time, not UTC)
   const startDate = new Date(slot.start_time);
   const endDate = new Date(slot.end_time);

   // Convert to local datetime string format: YYYY-MM-DDTHH:mm
   const formatLocalDateTime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
   };

   const startTime = formatLocalDateTime(startDate);
   const endTime = formatLocalDateTime(endDate);

   document.getElementById("startTime").value = startTime;
   document.getElementById("endTime").value = endTime;
   document.getElementById("location").value = slot.location || "";
   document.getElementById("appointmentType").value =
      slot.appointment_type || "dual";
   document.getElementById("capacity").value = slot.capacity || "";
   document.getElementById("primaryCapacity").value =
      slot.primary_capacity || "";
   document.getElementById("followupCapacity").value =
      slot.followup_capacity || "";

   // Show/hide dual capacity fields based on appointment type
   toggleDualCapacityFields();

   document.getElementById("timeslotModal").classList.add("active");
}

// Toggle dual capacity fields visibility based on appointment type
function toggleDualCapacityFields() {
   const appointmentType = document.getElementById("appointmentType").value;
   const dualFields = document.getElementById("dualCapacityFields");
   const bulkAppointmentType = document.getElementById(
      "bulkAppointmentType",
   )?.value;
   const bulkDualFields = document.getElementById("bulkDualCapacityFields");

   if (dualFields) {
      dualFields.style.display = appointmentType === "dual" ? "block" : "none";
   }

   if (bulkDualFields && bulkAppointmentType) {
      bulkDualFields.style.display =
         bulkAppointmentType === "dual" ? "block" : "none";
   }
}

// Close timeslot modal
function closeTimeslotModal() {
   document.getElementById("timeslotModal").classList.remove("active");
   // Reset form
   document.getElementById("timeslotForm").reset();
   document.getElementById("timeslotId").value = "";
   document.getElementById("timeslotModalTitle").textContent = "Neuer Zeitslot";
}

// Show bulk create modal
function showBulkCreateModal() {
   const modal = document.getElementById("bulkCreateModal");
   modal.classList.add("active");
   // Scroll modal content to top
   const modalBody = modal.querySelector(".modal-body");
   if (modalBody) {
      modalBody.scrollTop = 0;
   }
}

// Close bulk create modal
function closeBulkCreateModal() {
   document.getElementById("bulkCreateModal").classList.remove("active");
}

// Save timeslot
async function saveTimeslot() {
   const id = document.getElementById("timeslotId").value;
   const startTime = document.getElementById("startTime").value;
   const endTime = document.getElementById("endTime").value;
   const location = document.getElementById("location").value;
   const appointmentType = document.getElementById("appointmentType").value;
   const capacityInput = document.getElementById("capacity").value;
   const capacity = capacityInput ? parseInt(capacityInput) : null;
   const primaryCapacityInput =
      document.getElementById("primaryCapacity").value;
   const primaryCapacity = primaryCapacityInput
      ? parseInt(primaryCapacityInput)
      : null;
   const followupCapacityInput =
      document.getElementById("followupCapacity").value;
   const followupCapacity = followupCapacityInput
      ? parseInt(followupCapacityInput)
      : null;

   if (!startTime || !endTime) {
      showDashboardAlert("Bitte füllen Sie alle Pflichtfelder aus.", "error");
      return;
   }

   const btn = document.getElementById("saveTimeslotBtn");
   btn.disabled = true;
   btn.textContent = "Wird gespeichert...";

   try {
      const url = id
         ? BASE_PATH + `/api/admin/timeslots/${id}`
         : BASE_PATH + "/api/admin/timeslots";
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
         method,
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            startTime,
            endTime,
            location,
            appointmentType,
            capacity,
            primaryCapacity,
            followupCapacity,
         }),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Speichern");
      }

      closeTimeslotModal();

      let message = id
         ? "Zeitslot erfolgreich aktualisiert"
         : "Zeitslot erfolgreich erstellt";

      if (id && data.notifiedParticipants > 0) {
         message += ` (${data.notifiedParticipants} Teilnehmer über Änderungen benachrichtigt)`;
      }

      showDashboardAlert(message, "success");
      // Reload all data and refresh displays
      await loadBookings();
      await loadTimeslots();
      updateStatistics();
      displayUpcomingAppointments();
   } catch (error) {
      console.error("Error saving timeslot:", error);
      showDashboardAlert(error.message, "error");
   } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
   }
}

// Cancel all bookings for a timeslot
async function cancelBookingsForTimeslot(id) {
   const slot = allData.timeslots.find((s) => s.id === id);
   const affectedBookings = allData.bookings.filter(
      (b) => b.timeslot_id === id && b.status === "active",
   );

   const confirmMessage = `Möchten Sie alle ${affectedBookings.length} Buchung(en) für diesen Zeitslot stornieren?\n\nDie Teilnehmer werden per E-Mail benachrichtigt und der Zeitslot wird wieder verfügbar.`;

   if (!confirm(confirmMessage)) {
      return;
   }

   try {
      const response = await fetch(
         BASE_PATH + `/api/admin/timeslots/${id}/cancel-bookings`,
         {
            method: "POST",
         },
      );

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Stornieren");
      }

      let message = "Buchungen erfolgreich storniert";
      if (data.notifiedParticipants > 0) {
         message += ` (${data.notifiedParticipants} Teilnehmer benachrichtigt)`;
      }

      showDashboardAlert(message, "success");
      // Reload all data and refresh displays
      await loadBookings();
      await loadTimeslots();
      updateStatistics();
      displayUpcomingAppointments();
   } catch (error) {
      console.error("Error cancelling bookings:", error);
      showDashboardAlert(error.message, "error");
   }
}

// Toggle featured status for a timeslot
async function toggleFeaturedTimeslot(id) {
   try {
      const response = await fetch(
         BASE_PATH + `/api/admin/timeslots/${id}/toggle-featured`,
         {
            method: "POST",
         },
      );

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Ändern des Status");
      }

      showDashboardAlert(data.message, "success");
      await loadTimeslots();
   } catch (error) {
      console.error("Error toggling featured status:", error);
      showDashboardAlert(error.message, "error");
   }
}

// Delete timeslot
async function deleteTimeslot(id) {
   if (!confirm("Möchten Sie diesen Zeitslot wirklich löschen?")) {
      return;
   }

   try {
      const response = await fetch(`${BASE_PATH}/api/admin/timeslots/${id}`, {
         method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Löschen");
      }

      showDashboardAlert("Zeitslot erfolgreich gelöscht", "success");
      // Reload all data and refresh displays
      await loadBookings();
      await loadTimeslots();
      updateStatistics();
      displayUpcomingAppointments();
   } catch (error) {
      console.error("Error deleting timeslot:", error);
      showDashboardAlert(error.message, "error");
   }
}

// Show bulk edit modal
function showBulkEditModal() {
   if (selectedTimeslots.size === 0) {
      showDashboardAlert(
         "Bitte wählen Sie mindestens einen Zeitslot aus.",
         "warning",
      );
      return;
   }

   // Update count in modal
   document.getElementById("bulkEditCount").textContent =
      selectedTimeslots.size;

   // Reset form
   document.getElementById("bulkEditForm").reset();

   // Show modal
   document.getElementById("bulkEditModal").style.display = "flex";
}

// Close bulk edit modal
function closeBulkEditModal() {
   document.getElementById("bulkEditModal").style.display = "none";
}

// Apply bulk edit changes
async function applyBulkEdit() {
   if (selectedTimeslots.size === 0) {
      showDashboardAlert(
         "Bitte wählen Sie mindestens einen Zeitslot aus.",
         "warning",
      );
      return;
   }

   const location = document.getElementById("bulkEditLocation").value.trim();
   const appointmentType = document.getElementById(
      "bulkEditAppointmentType",
   ).value;
   const capacityInput = document.getElementById("bulkEditCapacity").value;
   const capacity = capacityInput ? parseInt(capacityInput) : null;

   // Check if at least one field is being updated
   if (!location && !appointmentType && capacity === null) {
      showDashboardAlert(
         "Bitte geben Sie mindestens ein Feld zum Aktualisieren an.",
         "warning",
      );
      return;
   }

   // Build updates object
   const updates = {};
   if (location) {
      updates.location = location;
   }
   if (appointmentType) {
      updates.appointmentType = appointmentType;
   }
   if (capacity !== null) {
      updates.capacity = capacity;
   }

   const btn = document.getElementById("bulkEditSubmitBtn");
   const originalText = btn.innerHTML;
   btn.disabled = true;
   btn.innerHTML = "Wird aktualisiert...";

   try {
      const response = await fetch(
         BASE_PATH + "/api/admin/timeslots/bulk-edit",
         {
            method: "PUT",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               ids: Array.from(selectedTimeslots),
               updates: updates,
            }),
         },
      );

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Aktualisieren");
      }

      let message = `${data.updated} Zeitslot(s) erfolgreich aktualisiert`;
      if (data.failed > 0) {
         message += `, ${data.failed} fehlgeschlagen`;
      }
      if (data.notifiedParticipants > 0) {
         message += `. ${data.notifiedParticipants} Teilnehmer wurden benachrichtigt.`;
      }

      showDashboardAlert(message, data.failed > 0 ? "warning" : "success");

      // Close modal
      closeBulkEditModal();

      // Clear selection
      selectedTimeslots.clear();
      updateBulkDeleteButton();

      // Reload all data and refresh displays
      await loadBookings();
      await loadTimeslots();
      updateStatistics();
      displayUpcomingAppointments();
   } catch (error) {
      console.error("Error bulk editing timeslots:", error);
      showDashboardAlert(error.message, "error");
   } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
   }
}

// Bulk delete selected timeslots
async function bulkDeleteSelectedTimeslots() {
   if (selectedTimeslots.size === 0) {
      showDashboardAlert(
         "Bitte wählen Sie mindestens einen Zeitslot aus.",
         "warning",
      );
      return;
   }

   const count = selectedTimeslots.size;
   const confirmMessage = `Möchten Sie wirklich ${count} Zeitslot(s) löschen?\n\nAlle zugehörigen Buchungen werden ebenfalls gelöscht und die Teilnehmer werden benachrichtigt.`;

   if (!confirm(confirmMessage)) {
      return;
   }

   const btn = document.getElementById("bulkDeleteBtn");
   const originalText = btn.innerHTML;
   btn.disabled = true;
   btn.innerHTML = "Wird gelöscht...";

   try {
      const response = await fetch(BASE_PATH + "/api/admin/timeslots/bulk", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            ids: Array.from(selectedTimeslots),
         }),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Löschen");
      }

      let message = `${data.deleted} Zeitslot(s) erfolgreich gelöscht`;
      if (data.failed > 0) {
         message += `, ${data.failed} fehlgeschlagen`;
      }

      showDashboardAlert(message, data.failed > 0 ? "warning" : "success");

      // Clear selection
      selectedTimeslots.clear();
      updateBulkDeleteButton();

      // Reload all data and refresh displays
      await loadBookings();
      await loadTimeslots();
      updateStatistics();
      displayUpcomingAppointments();
   } catch (error) {
      console.error("Error bulk deleting timeslots:", error);
      showDashboardAlert(error.message, "error");
   } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
   }
}

// Preview bulk create
function addWorkingHoursRow() {
   const container = document.getElementById("workingHoursContainer");
   const row = document.createElement("div");
   row.className = "working-hours-row";
   row.style.cssText =
      "display: flex; gap: 10px; align-items: center; margin-bottom: 10px;";
   row.innerHTML = `
      <input type="time" class="working-hours-start" value="09:00" required style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px;">
      <span>bis</span>
      <input type="time" class="working-hours-end" value="17:00" required style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px;">
      <button type="button" class="btn btn-danger btn-sm" onclick="removeWorkingHoursRow(this)">Entfernen</button>
   `;
   container.appendChild(row);
   updateRemoveButtonsVisibility();
}

function removeWorkingHoursRow(button) {
   const row = button.closest(".working-hours-row");
   row.remove();
   updateRemoveButtonsVisibility();
}

function updateRemoveButtonsVisibility() {
   const rows = document.querySelectorAll(".working-hours-row");
   rows.forEach((row, index) => {
      const removeBtn = row.querySelector(".btn-danger");
      if (rows.length === 1) {
         removeBtn.style.visibility = "hidden";
      } else {
         removeBtn.style.visibility = "visible";
      }
   });
}

function getWorkingHours() {
   const rows = document.querySelectorAll(".working-hours-row");
   const workingHours = [];
   rows.forEach((row) => {
      const start = row.querySelector(".working-hours-start").value;
      const end = row.querySelector(".working-hours-end").value;
      if (start && end) {
         workingHours.push({ start, end });
      }
   });
   return workingHours;
}

function getSelectedWeekdays() {
   const checkboxes = document.querySelectorAll(
      'input[name="weekday"]:checked',
   );
   return Array.from(checkboxes).map((cb) => parseInt(cb.value));
}

function previewBulkCreate() {
   const startDate = document.getElementById("bulkStartDate").value;
   const endDate = document.getElementById("bulkEndDate").value;
   const duration = parseInt(document.getElementById("bulkDuration").value);
   const breakTime = parseInt(document.getElementById("bulkBreak").value);
   const weekdays = getSelectedWeekdays();
   const workingHours = getWorkingHours();

   if (
      !startDate ||
      !endDate ||
      !duration ||
      weekdays.length === 0 ||
      workingHours.length === 0
   ) {
      showDashboardAlert("Bitte füllen Sie alle Pflichtfelder aus.", "warning");
      return;
   }

   // Validate working hours
   for (const hours of workingHours) {
      if (hours.start >= hours.end) {
         showDashboardAlert(
            "Ungültige Arbeitszeiten: Die Endzeit muss nach der Startzeit liegen.",
            "warning",
         );
         return;
      }
   }

   const start = new Date(startDate + "T00:00:00");
   const end = new Date(endDate + "T23:59:59");
   const slots = [];

   // Iterate through each day in the date range
   let currentDate = new Date(start);
   while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();

      // Check if this day is in the selected weekdays
      if (weekdays.includes(dayOfWeek)) {
         // For each working hours range on this day
         for (const hours of workingHours) {
            // Parse working hours
            const [startHour, startMinute] = hours.start.split(":").map(Number);
            const [endHour, endMinute] = hours.end.split(":").map(Number);

            // Create datetime for this working period
            let currentTime = new Date(currentDate);
            currentTime.setHours(startHour, startMinute, 0, 0);

            const workingEnd = new Date(currentDate);
            workingEnd.setHours(endHour, endMinute, 0, 0);

            // Generate slots within this working period
            while (currentTime < workingEnd) {
               const slotEnd = new Date(
                  currentTime.getTime() + duration * 60000,
               );

               if (slotEnd <= workingEnd) {
                  slots.push({
                     start: new Date(currentTime),
                     end: slotEnd,
                  });
               }

               // Move to next slot (duration + break)
               currentTime = new Date(slotEnd.getTime() + breakTime * 60000);
            }
         }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
   }

   const previewContainer = document.getElementById("bulkPreview");
   if (slots.length === 0) {
      previewContainer.innerHTML =
         '<div class="alert alert-warning">Keine Zeitslots würden mit diesen Einstellungen erstellt.</div>';
      return;
   }

   const weekdayNames = [
      "Sonntag",
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      "Freitag",
      "Samstag",
   ];
   const selectedWeekdayNames = weekdays.map((d) => weekdayNames[d]).join(", ");

   previewContainer.innerHTML = `
      <div class="alert alert-info">
         <strong>Vorschau:</strong> Es werden ${slots.length} Zeitslots erstellt.<br>
         <strong>Wochentage:</strong> ${selectedWeekdayNames}<br>
         <strong>Arbeitszeiten:</strong> ${workingHours.map((h) => `${h.start} - ${h.end}`).join(", ")}
      </div>
      <div class="table-container">
         <table>
            <thead>
               <tr>
                  <th>#</th>
                  <th>Datum</th>
                  <th>Wochentag</th>
                  <th>Startzeit</th>
                  <th>Endzeit</th>
               </tr>
            </thead>
            <tbody>
               ${slots
                  .slice(0, 10)
                  .map(
                     (slot, index) => `
                  <tr>
                     <td>${index + 1}</td>
                     <td>${slot.start.toLocaleDateString("de-DE")}</td>
                     <td>${weekdayNames[slot.start.getDay()]}</td>
                     <td>${slot.start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td>
                     <td>${slot.end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
               `,
                  )
                  .join("")}
               ${slots.length > 10 ? `<tr><td colspan="5" style="text-align: center; color: #666;">... und ${slots.length - 10} weitere</td></tr>` : ""}
            </tbody>
         </table>
      </div>
   `;
}

// Show questionnaire modal
function showQuestionnaireModal(participantName, questionnaireDetails) {
   const modal = document.getElementById("questionnaireModal");
   if (!modal) {
      // Create modal if it doesn't exist
      const modalHtml = `
         <div id="questionnaireModal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
               <div class="modal-header">
                  <h2 id="questionnaireModalTitle">Fragebogen</h2>
                  <button class="modal-close" onclick="closeQuestionnaireModal()">×</button>
               </div>
               <div class="modal-body" id="questionnaireModalContent"></div>
            </div>
         </div>
      `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
   }

   document.getElementById("questionnaireModalTitle").textContent =
      `Fragebogen - ${participantName}`;
   document.getElementById("questionnaireModalContent").innerHTML = `
      <div style="line-height: 1.8;">
         ${questionnaireDetails}
      </div>
   `;
   document.getElementById("questionnaireModal").classList.add("active");
}

// Close questionnaire modal
function closeQuestionnaireModal() {
   const modal = document.getElementById("questionnaireModal");
   if (modal) {
      modal.classList.remove("active");
   }
}

// Show timeslot participants modal
function showTimeslotParticipantsModal(timeslotId) {
   const slot = allData.timeslots.find((s) => s.id === timeslotId);
   if (!slot) return;

   const bookings = allData.bookings.filter(
      (b) => b.timeslot_id === timeslotId && b.status === "active",
   );

   if (bookings.length === 0) return;

   const modal = document.getElementById("timeslotParticipantsModal");
   if (!modal) {
      // Create modal if it doesn't exist
      const modalHtml = `
         <div id="timeslotParticipantsModal" class="modal">
            <div class="modal-content" style="max-width: 700px;">
               <div class="modal-header">
                  <h2 id="timeslotParticipantsModalTitle">Teilnehmer</h2>
                  <button class="modal-close" onclick="closeTimeslotParticipantsModal()">×</button>
               </div>
               <div class="modal-body" id="timeslotParticipantsModalContent"></div>
            </div>
         </div>
      `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
   }

   const startTime = new Date(slot.start_time);
   const endTime = new Date(slot.end_time);
   const dateStr = startTime.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
   });
   const timeStr = `${startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;

   document.getElementById("timeslotParticipantsModalTitle").textContent =
      `Teilnehmer - ${dateStr}, ${timeStr}`;

   // Format questionnaire data
   const visionMap = {
      none: "Keine Sehhilfe",
      glasses: "Brille",
      contacts: "Kontaktlinsen",
   };

   const participantsHtml = bookings
      .map((b) => {
         const hasQuestionnaire =
            b.vision_correction ||
            b.study_subject ||
            b.vr_experience ||
            b.motion_sickness;
         let questionnaireInfo = "";

         if (hasQuestionnaire) {
            questionnaireInfo = `
            <div style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 13px;">
               <strong>Fragebogen:</strong><br>
               <span style="color: #666;">
                  👁️ ${visionMap[b.vision_correction] || b.vision_correction || "n/a"} |
                  📚 ${b.study_subject || "n/a"} |
                  🥽 VR: ${b.vr_experience || "n/a"}/5 |
                  🤢 Übelkeit: ${b.motion_sickness || "n/a"}/5
               </span>
            </div>
         `;
         }

         return `
         <div style="border: 1px solid #e0e0e0; padding: 12px; margin: 8px 0; border-radius: 6px; background: #fff;">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${b.name}</div>
            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">${b.email}</div>
            ${b.is_followup ? '<span class="badge badge-success" style="font-size: 11px;">Folgetermin</span>' : '<span class="badge badge-info" style="font-size: 11px;">Haupttermin</span>'}
            ${questionnaireInfo}
         </div>
      `;
      })
      .join("");

   document.getElementById("timeslotParticipantsModalContent").innerHTML =
      participantsHtml;
   document.getElementById("timeslotParticipantsModal").classList.add("active");
}

// Close timeslot participants modal
function closeTimeslotParticipantsModal() {
   const modal = document.getElementById("timeslotParticipantsModal");
   if (modal) {
      modal.classList.remove("active");
   }
}

// Delete participant
async function deleteParticipant(id, name) {
   const confirmMessage = `Möchten Sie den Teilnehmer "${name}" wirklich löschen?\n\nAlle zugehörigen Buchungen werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`;

   if (!confirm(confirmMessage)) {
      return;
   }

   try {
      const response = await fetch(
         `${BASE_PATH}/api/admin/participants/${id}`,
         {
            method: "DELETE",
         },
      );

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Löschen");
      }

      showDashboardAlert(
         `Teilnehmer "${name}" erfolgreich gelöscht`,
         "success",
      );
      // Reload all data and refresh displays
      await loadParticipants();
      await loadBookings();
      await loadTimeslots();
      updateStatistics();
      displayUpcomingAppointments();
   } catch (error) {
      console.error("Error deleting participant:", error);
      showDashboardAlert(error.message, "error");
   }
}

// Show send email modal
function showSendEmailModal(email, name) {
   document.getElementById("recipientEmail").value = email;
   document.getElementById("recipientName").value = name;
   document.getElementById("recipientDisplay").textContent =
      `${name} (${email})`;
   document.getElementById("emailSubject").value = "";
   document.getElementById("emailMessage").value = "";
   document.getElementById("sendEmailModal").style.display = "flex";
}

// Close send email modal
function closeSendEmailModal() {
   document.getElementById("sendEmailModal").style.display = "none";
   document.getElementById("sendEmailForm").reset();
}

// Send custom email
async function sendCustomEmail() {
   const email = document.getElementById("recipientEmail").value;
   const name = document.getElementById("recipientName").value;
   const subject = document.getElementById("emailSubject").value.trim();
   const message = document.getElementById("emailMessage").value.trim();

   if (!subject || !message) {
      showDashboardAlert("Bitte füllen Sie alle Felder aus.", "warning");
      return;
   }

   const btn = document.getElementById("sendEmailBtn");
   const originalText = btn.textContent;
   btn.disabled = true;
   btn.textContent = "Wird gesendet...";

   try {
      const response = await fetch(BASE_PATH + "/api/admin/send-email", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            email,
            name,
            subject,
            message,
         }),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || "Fehler beim Senden");
      }

      showDashboardAlert("Email erfolgreich gesendet", "success");
      closeSendEmailModal();
   } catch (error) {
      console.error("Error sending email:", error);
      showDashboardAlert(error.message, "error");
   } finally {
      btn.disabled = false;
      btn.textContent = originalText;
   }
}

// Close modal when clicking outside
window.onclick = function (event) {
   const timeslotModal = document.getElementById("timeslotModal");
   const emailModal = document.getElementById("sendEmailModal");
   const dayDetailsModal = document.getElementById("dayDetailsModal");
   const bulkCreateModal = document.getElementById("bulkCreateModal");
   const questionnaireModal = document.getElementById("questionnaireModal");
   const timeslotParticipantsModal = document.getElementById(
      "timeslotParticipantsModal",
   );

   if (event.target === timeslotModal) {
      closeTimeslotModal();
   }
   if (event.target === emailModal) {
      closeSendEmailModal();
   }
   if (event.target === dayDetailsModal) {
      closeDayDetailsModal();
   }
   if (event.target === bulkCreateModal) {
      closeBulkCreateModal();
   }
   if (event.target === questionnaireModal) {
      closeQuestionnaireModal();
   }
   if (event.target === timeslotParticipantsModal) {
      closeTimeslotParticipantsModal();
   }
};

// ===== CALENDAR VIEW FUNCTIONS =====

// Render calendar
function renderCalendar() {
   const year = calendarState.year;
   const month = calendarState.month;

   // Update month/year display
   const monthNames = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
   ];
   document.getElementById("calendarMonthYear").textContent =
      `${monthNames[month]} ${year}`;

   // Get first day of month and number of days
   const firstDay = new Date(year, month, 1);
   const lastDay = new Date(year, month + 1, 0);
   const daysInMonth = lastDay.getDate();
   const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
   const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Adjust so Monday = 0

   // Create calendar grid
   let html =
      '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e0e0e0; border: 1px solid #e0e0e0;">';

   // Day headers
   const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
   dayNames.forEach((day) => {
      html += `<div style="background: #667eea; color: white; padding: 10px; text-align: center; font-weight: 600;">${day}</div>`;
   });

   // Empty cells before first day
   for (let i = 0; i < adjustedStartDay; i++) {
      html += '<div style="background: #f5f7fa; min-height: 100px;"></div>';
   }

   // Days of month
   const today = new Date();
   const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() === month;

   for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Use local date format to avoid timezone issues
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = isCurrentMonth && today.getDate() === day;

      // Filter timeslots for this day
      const dayTimeslots = allData.timeslots.filter((slot) => {
         const slotDate = new Date(slot.start_time);
         return (
            slotDate.getFullYear() === year &&
            slotDate.getMonth() === month &&
            slotDate.getDate() === day
         );
      });

      // Helper to check if a timeslot has active bookings
      const hasBooking = (slotId) =>
         allData.bookings.some(
            (b) => b.timeslot_id === slotId && b.status === "active",
         );

      // Count by type and status - check bookings from separate array
      const availableDual = dayTimeslots.filter(
         (s) => s.appointment_type === "dual" && !hasBooking(s.id),
      ).length;
      const availablePrimary = dayTimeslots.filter(
         (s) => s.appointment_type === "primary" && !hasBooking(s.id),
      ).length;
      const availableFollowup = dayTimeslots.filter(
         (s) => s.appointment_type === "followup" && !hasBooking(s.id),
      ).length;

      // Count booked by original type to show what was booked
      const bookedPrimary = dayTimeslots.filter(
         (s) =>
            hasBooking(s.id) &&
            (s.original_type === "primary" || s.appointment_type === "primary"),
      ).length;
      const bookedFollowup = dayTimeslots.filter(
         (s) =>
            hasBooking(s.id) &&
            (s.original_type === "followup" ||
               s.appointment_type === "followup"),
      ).length;
      const bookedDual = dayTimeslots.filter(
         (s) => hasBooking(s.id) && s.original_type === "dual",
      ).length;
      const totalBooked = dayTimeslots.filter((s) => hasBooking(s.id)).length;

      const todayBorder = isToday ? "border: 3px solid #667eea;" : "";

      // Build booking summary text
      let bookingSummary = "";
      if (totalBooked > 0) {
         const parts = [];
         if (bookedDual > 0) parts.push(`${bookedDual} Dual`);
         if (bookedPrimary > 0) parts.push(`${bookedPrimary} H`);
         if (bookedFollowup > 0) parts.push(`${bookedFollowup} F`);
         bookingSummary = parts.length > 0 ? ` (${parts.join(", ")})` : "";
      }

      html += `
         <div style="background: white; min-height: 100px; padding: 5px; ${todayBorder}">
            <div style="font-weight: 600; margin-bottom: 5px; ${isToday ? "color: #667eea;" : ""}">${day}</div>
            ${availableDual > 0 ? `<div style="background: #4a5568; color: white; padding: 2px 5px; margin: 2px 0; border-radius: 3px; font-size: 11px;">📅 ${availableDual} Dual</div>` : ""}
            ${availablePrimary > 0 ? `<div style="background: #667eea; color: white; padding: 2px 5px; margin: 2px 0; border-radius: 3px; font-size: 11px;">📅 ${availablePrimary} Haupt</div>` : ""}
            ${availableFollowup > 0 ? `<div style="background: #48bb78; color: white; padding: 2px 5px; margin: 2px 0; border-radius: 3px; font-size: 11px;">📅 ${availableFollowup} Folge</div>` : ""}
            ${totalBooked > 0 ? `<div class="booking-badge" onclick="event.stopPropagation(); showDayDetails('${dateStr}')" style="background: #ed8936; color: white; padding: 2px 5px; margin: 2px 0; border-radius: 3px; font-size: 11px; cursor: pointer; user-select: none;">✓ ${totalBooked} gebucht${bookingSummary}</div>` : ""}
         </div>
      `;
   }

   html += "</div>";

   document.getElementById("calendarGrid").innerHTML = html;
}

// Change calendar month
function changeCalendarMonth(delta) {
   calendarState.month += delta;
   if (calendarState.month > 11) {
      calendarState.month = 0;
      calendarState.year++;
   } else if (calendarState.month < 0) {
      calendarState.month = 11;
      calendarState.year--;
   }
   renderCalendar();
}

// Go to current month
function goToCurrentMonth() {
   const now = new Date();
   calendarState.year = now.getFullYear();
   calendarState.month = now.getMonth();
   renderCalendar();
}

// Load all timeslots for calendar (no pagination)
async function loadTimeslotsForCalendar() {
   try {
      const response = await fetch(BASE_PATH + "/api/admin/timeslots");
      if (!response.ok) throw new Error("Failed to load timeslots");

      const data = await response.json();
      // Handle both old format (array) and new format (paginated object)
      if (Array.isArray(data)) {
         allData.timeslots = data;
      } else {
         allData.timeslots = data.timeslots;
      }

      renderCalendar();
   } catch (error) {
      console.error("Error loading timeslots for calendar:", error);
      showDashboardAlert("Fehler beim Laden der Termine", "danger");
   }
}

// Show details for a specific day
function showDayDetails(dateStr) {
   // Parse dateStr as YYYY-MM-DD in local time
   const [year, month, day] = dateStr.split("-").map(Number);

   console.log("showDayDetails called:", {
      dateStr,
      year,
      month,
      day,
   });
   console.log("Total timeslots in allData:", allData.timeslots.length);

   const dayTimeslots = allData.timeslots.filter((slot) => {
      const slotDate = new Date(slot.start_time);
      const matches =
         slotDate.getFullYear() === year &&
         slotDate.getMonth() === month - 1 &&
         slotDate.getDate() === day;
      if (matches) {
         console.log("Matched slot:", {
            id: slot.id,
            start: slot.start_time,
            year: slotDate.getFullYear(),
            month: slotDate.getMonth(),
            day: slotDate.getDate(),
         });
      }
      return matches;
   });

   console.log("Filtered dayTimeslots:", dayTimeslots.length);

   if (dayTimeslots.length === 0) {
      console.error("No timeslots found for date:", dateStr);
      console.error("This should not happen if badge was clicked!");
      showDashboardAlert("Keine Termine für diesen Tag", "info");
      return;
   }

   // Format date
   const date = new Date(year, month - 1, day);
   const dateFormatted = date.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
   });

   // Separate booked and available timeslots by checking bookings data
   // Now that timeslots don't include booking data via JOIN, we check allData.bookings
   const bookedSlots = dayTimeslots.filter((slot) =>
      allData.bookings.some(
         (b) => b.timeslot_id === slot.id && b.status === "active",
      ),
   );
   const availableSlots = dayTimeslots.filter(
      (slot) =>
         !allData.bookings.some(
            (b) => b.timeslot_id === slot.id && b.status === "active",
         ),
   );

   // Build list of timeslots
   let details = `<div style="margin-bottom: 20px;">`;

   // Show booked appointments first
   if (bookedSlots.length > 0) {
      details += `<h4 style="color: #ed8936; margin-bottom: 10px; border-bottom: 2px solid #ed8936; padding-bottom: 5px;">✓ Gebuchte Termine (${bookedSlots.length})</h4>`;

      bookedSlots
         .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
         .forEach((slot) => {
            const startTime = new Date(slot.start_time);
            const endTime = new Date(slot.end_time);
            const timeStr = `${startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;

            // Get booking and participant info from separate bookings array
            const bookings = allData.bookings.filter(
               (b) => b.timeslot_id === slot.id && b.status === "active",
            );
            const participants = bookings.map((b) => `${b.name}`).join(", ");
            const emails = bookings.map((b) => b.email).join(", ");
            const firstBooking = bookings[0] || {};

            // Format questionnaire data
            const visionMap = {
               none: "Keine Sehhilfe",
               glasses: "Brille",
               contacts: "Kontaktlinsen",
            };
            const questionnaireInfo = bookings
               .map((b) => {
                  if (
                     !b.vision_correction &&
                     !b.study_subject &&
                     !b.vr_experience &&
                     !b.motion_sickness
                  ) {
                     return `<div style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 13px;">
                        <strong>${b.name}:</strong> <span style="color: #999;">Keine Fragebogendaten</span>
                     </div>`;
                  }
                  return `<div style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 13px;">
                     <strong>${b.name}:</strong><br>
                     <span style="color: #666;">
                        👁️ ${visionMap[b.vision_correction] || b.vision_correction || "n/a"} |
                        📚 ${b.study_subject || "n/a"} |
                        🥽 VR: ${b.vr_experience || "n/a"}/5 |
                        🤢 Übelkeit: ${b.motion_sickness || "n/a"}/5
                     </span>
                  </div>`;
               })
               .join("");

            let typeLabel = "";
            let typeColor = "#4a5568";
            if (slot.appointment_type === "primary") {
               typeLabel = "Haupttermin";
               typeColor = "#667eea";
            } else if (slot.appointment_type === "followup") {
               typeLabel = "Folgetermin";
               typeColor = "#48bb78";
            } else if (slot.appointment_type === "dual") {
               typeLabel = "Dual";
               typeColor = "#4a5568";
            }

            // Show original type if different
            let originalInfo = "";
            if (
               slot.original_type &&
               slot.original_type !== slot.appointment_type
            ) {
               let originalLabel =
                  slot.original_type === "dual"
                     ? "Dual"
                     : slot.original_type === "primary"
                       ? "Haupt"
                       : "Folge";
               originalInfo = ` <span style="color: #999; font-size: 12px;">(urspr. ${originalLabel})</span>`;
            }

            details += `
            <div style="border: 1px solid #e0e0e0; padding: 12px; margin: 8px 0; border-radius: 6px; background: #fff8f0;">
               <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                  <div style="flex: 1; min-width: 200px;">
                     <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${timeStr}</div>
                     <div style="color: #333; margin-bottom: 4px;">
                        <strong>${participants || "Unbekannt"}</strong>
                     </div>
                     <div style="color: #666; font-size: 14px; margin-bottom: 4px;">${emails || "Keine Email"}</div>
                     <div style="color: #666; font-size: 14px;">${slot.location || "Kein Ort"}</div>
                     <div style="margin-top: 6px;">
                        <span style="background: ${typeColor}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: 500;">${typeLabel}</span>${originalInfo}
                     </div>
                     ${questionnaireInfo}
                  </div>
                  <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                     <button class="btn btn-secondary btn-sm" onclick="closeDayDetailsModal(); editTimeslot(${slot.id})">Bearbeiten</button>
                     <button class="btn btn-secondary btn-sm" onclick="closeDayDetailsModal(); showSendEmailModal('${firstBooking.email || ""}', '${(firstBooking.name || "").replace(/'/g, "\\'")}')">✉️ Email</button>
                  </div>
               </div>
            </div>
         `;
         });
   }

   // Show available timeslots
   if (availableSlots.length > 0) {
      details += `<h4 style="color: #48bb78; margin: 20px 0 10px 0; border-bottom: 2px solid #48bb78; padding-bottom: 5px;">📅 Verfügbare Zeitslots (${availableSlots.length})</h4>`;

      availableSlots
         .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
         .forEach((slot) => {
            const startTime = new Date(slot.start_time);
            const endTime = new Date(slot.end_time);
            const timeStr = `${startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;

            let typeLabel = "";
            let typeColor = "#4a5568";
            if (slot.appointment_type === "primary") {
               typeLabel = "Nur Haupttermin";
               typeColor = "#667eea";
            } else if (slot.appointment_type === "followup") {
               typeLabel = "Nur Folgetermin";
               typeColor = "#48bb78";
            } else if (slot.appointment_type === "dual") {
               typeLabel = "Dual (Haupt + Folge)";
               typeColor = "#4a5568";
            }

            details += `
            <div style="border: 1px solid #e0e0e0; padding: 10px; margin: 8px 0; border-radius: 6px; background: #f9fffe;">
               <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                  <div>
                     <div style="font-weight: 600; margin-bottom: 4px;">${timeStr}</div>
                     <div style="color: #666; font-size: 14px; margin-bottom: 4px;">${slot.location || "Kein Ort"}</div>
                     <div>
                        <span style="background: ${typeColor}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: 500;">${typeLabel}</span>
                     </div>
                  </div>
                  <div>
                     <button class="btn btn-secondary btn-sm" onclick="closeDayDetailsModal(); editTimeslot(${slot.id})">Bearbeiten</button>
                  </div>
               </div>
            </div>
         `;
         });
   }

   details += "</div>";

   // Update modal content
   document.getElementById("dayDetailsTitle").textContent = dateFormatted;
   document.getElementById("dayDetailsContent").innerHTML = details;
   document.getElementById("dayDetailsModal").classList.add("active");
}

// Close day details modal
function closeDayDetailsModal() {
   const modal = document.getElementById("dayDetailsModal");
   if (modal) {
      modal.classList.remove("active");
   }
}

// Load unreviewed appointments
async function loadUnreviewedAppointments() {
   try {
      console.log("Loading unreviewed appointments...");
      const response = await fetch(
         BASE_PATH + "/api/admin/bookings/unreviewed",
      );
      console.log("Response status:", response.status);

      if (!response.ok) {
         const errorText = await response.text();
         console.error("Error response:", errorText);
         throw new Error("Failed to load unreviewed appointments");
      }

      const appointments = await response.json();
      console.log("Loaded appointments:", appointments.length, appointments);
      allData.unreviewedAppointments = appointments;
      displayUnreviewedAppointments();
      updateReviewTabBadge();
   } catch (error) {
      console.error("Error loading unreviewed appointments:", error);
      document.getElementById("unreviewedContainer").innerHTML = `
         <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; color: #856404;">
            <strong>Fehler beim Laden:</strong> ${error.message}
            <br><br>
            <small>Bitte überprüfen Sie die Browser-Konsole (F12) für Details.</small>
         </div>
      `;
      showDashboardAlert(
         "Fehler beim Laden der unbewerteten Termine",
         "danger",
      );
   }
}

// Display unreviewed appointments
function displayUnreviewedAppointments() {
   const container = document.getElementById("unreviewedContainer");
   console.log(
      "Displaying unreviewed appointments, count:",
      allData.unreviewedAppointments.length,
   );

   if (
      !allData.unreviewedAppointments ||
      allData.unreviewedAppointments.length === 0
   ) {
      container.innerHTML = `
         <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h3>Alle Termine bewertet!</h3>
            <p>Es gibt keine vergangenen Termine, die noch bewertet werden müssen.</p>
         </div>
      `;
      return;
   }

   let html = `
      <div style="margin-bottom: 15px; color: #666;">
         <strong>${allData.unreviewedAppointments.length}</strong> Termine warten auf Bewertung
      </div>
   `;

   allData.unreviewedAppointments.forEach((appointment) => {
      const startTime = new Date(appointment.start_time);
      const endTime = new Date(appointment.end_time);
      const dateStr = startTime.toLocaleDateString("de-DE", {
         weekday: "long",
         year: "numeric",
         month: "long",
         day: "numeric",
      });
      const timeStr = `${startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;

      const typeLabel =
         appointment.appointment_type === "primary"
            ? "Haupttermin"
            : appointment.appointment_type === "followup"
              ? "Folgetermin"
              : "Dual";
      const typeClass =
         appointment.appointment_type === "primary"
            ? "type-primary"
            : appointment.appointment_type === "followup"
              ? "type-followup"
              : "type-dual";

      html += `
         <div class="appointment-card" id="appointment-${appointment.id}">
            <div class="appointment-header">
               <div>
                  <div class="appointment-time">${timeStr}</div>
                  <div style="color: #666; font-size: 14px; margin-top: 4px;">${dateStr}</div>
               </div>
               <span class="appointment-type-badge ${typeClass}">${typeLabel}</span>
            </div>
            <div style="margin-bottom: 12px;">
               <div style="font-weight: 600; margin-bottom: 4px;">${appointment.name}</div>
               <div style="color: #666; font-size: 14px;">${appointment.email}</div>
               <div style="color: #666; font-size: 14px;">${appointment.location || "Kein Ort"}</div>
            </div>
            <div style="border-top: 1px solid #e0e0e0; padding-top: 12px;">
               <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #555;">Wie ist der Termin verlaufen?</div>
               <div class="result-status-buttons">
                  <button class="result-btn result-btn-success" onclick="markAppointmentResult(${appointment.id}, 'successful')">
                     ✅ Erfolgreich
                  </button>
                  <button class="result-btn result-btn-issues" onclick="markAppointmentResult(${appointment.id}, 'issues_arised')">
                     ⚠️ Probleme aufgetreten
                  </button>
                  <button class="result-btn result-btn-unusable" onclick="markAppointmentResult(${appointment.id}, 'unusable_data')">
                     ❌ Daten unbrauchbar
                  </button>
                  <button class="result-btn result-btn-noshow" onclick="markAppointmentResult(${appointment.id}, 'no_show')">
                     👻 Nicht erschienen
                  </button>
               </div>
            </div>
         </div>
      `;
   });

   container.innerHTML = html;
}

// Mark appointment result
async function markAppointmentResult(bookingId, resultStatus) {
   try {
      const response = await fetch(
         BASE_PATH + `/api/admin/bookings/${bookingId}/result-status`,
         {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resultStatus }),
         },
      );

      if (!response.ok) throw new Error("Failed to update result status");

      const data = await response.json();

      // Remove the card with animation
      const card = document.getElementById(`appointment-${bookingId}`);
      if (card) {
         card.style.transition = "all 0.3s ease";
         card.style.opacity = "0";
         card.style.transform = "translateX(20px)";
         setTimeout(() => {
            // Reload data and update display
            loadUnreviewedAppointments();
            loadBookings().then(() => {
               updateStatistics();
            });
         }, 300);
      }

      const statusLabels = {
         successful: "als erfolgreich",
         issues_arised: "mit Problemen",
         unusable_data: "als unbrauchbar",
         no_show: "als nicht erschienen",
      };

      showDashboardAlert(
         `Termin ${statusLabels[resultStatus]} markiert`,
         "success",
      );
   } catch (error) {
      console.error("Error updating result status:", error);
      showDashboardAlert("Fehler beim Aktualisieren des Status", "danger");
   }
}
