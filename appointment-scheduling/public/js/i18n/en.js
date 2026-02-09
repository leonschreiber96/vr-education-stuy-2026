// English translations
export const en = {
   // Language selector
   languageSelector: {
      title: "Choose Language / Sprache wählen",
      subtitle: "Please select your preferred language:",
      german: "Deutsch",
      english: "English",
      continue: "Continue",
   },

   // Header
   header: {
      title: "Study Participation – Learning Success in Multimedia Settings",
      compensation: "💰 €20 compensation for full participation",
   },

   // Language toggle
   languageToggle: {
      label: "Language:",
      german: "Deutsch",
      english: "English",
   },

   // Step indicator
   steps: {
      info: "Study Info",
      primary: "Main Appointment",
      followup: "Follow-up",
      data: "Enter Data",
   },

   // Step 0: Study Description
   studyDescription: {
      title: "🎓 About the Study",
      compensationBox: {
         title: "💰 Compensation: €20",
         text: "For full participation in both appointments",
      },
      tldr: {
         title: "Quick Summary (TL;DR)",
         items: [
            "Study on <strong>learning success in multimedia settings</strong>",
            "<strong>💰 €20 compensation</strong> for full participation",
            "<strong>Two appointments at different times:</strong>",
            "<strong>1st Appointment:</strong> English lecture + short knowledge test<br />Duration: approx. <strong>60 minutes</strong>",
            "<strong>2nd Appointment:</strong> short knowledge test<br />Duration: approx. <strong>15 minutes</strong>",
            "<strong>Location:</strong> MAR Building, TU Berlin (Marchstraße 23), unless otherwise specified",
            "Please arrive <strong>5 minutes before your appointment</strong>",
         ],
      },
      description: {
         title: "📋 Study Description",
         text1: "This study investigates learning success and memory performance when consuming lecture content through different media formats. Participants will watch a short lecture in English and complete two knowledge tests at different times about the presented content. During the first appointment, physiological measurements (ECG using an ECG belt) will also be conducted.",
         text2: "For full participation in <strong>both appointments</strong>, participants will receive a <strong>compensation of €20</strong>.",
      },
      procedure: {
         title: "📅 Procedure",
         intro: "The experiment consists of <strong>two appointments</strong> that take place at different times:",
         first: {
            title: "First Appointment:",
            text: "Watching an English-language lecture followed by a short knowledge test. Physiological measurements (ECG) will be conducted using an ECG belt during the lecture.<br />Total duration: approx. <strong>60 minutes</strong>.",
         },
         second: {
            title: "Second Appointment:",
            text: "Completing another short knowledge test to assess long-term learning success.<br />Duration: approx. <strong>15 minutes</strong>.",
         },
      },
      location: {
         title: "📍 Location",
         name: "MAR Building, TU Berlin",
         address: "Marchstraße 23, 10587 Berlin",
         note: "(Unless otherwise specified)",
      },
      requirements: {
         title: "✅ Participant Requirements",
         items: [
            "Current enrollment at a university or university degree, or enrollment within the last <strong>three years</strong>",
            "Sufficient <strong>English language skills</strong>",
            "Reliable participation in <strong>both appointments</strong>",
            "Punctual arrival (please arrive approx. <strong>5 minutes before appointment time</strong>)",
         ],
      },
      continueButton: "Proceed to Appointment Selection",
   },

   // Step 1: Primary Appointment
   primaryAppointment: {
      title: "Select Main Appointment",
      badge: "MAIN APPOINTMENT",
      infoBox: {
         title: "📌 Important Note",
         text1: "You must book both a main appointment and a follow-up appointment.",
         text2: "<strong>The follow-up appointment must be between 28 and 32 days after the main appointment.</strong>",
      },
      featured: {
         title: "Recommended Appointment (Very Important!)",
         description:
            "This first appointment lays the foundation for the study and is therefore particularly important. Currently, not all necessary slots are filled. Please consider whether you can prioritize this appointment over other possible choices, as it is really very important that enough people come together for this.",
         orChoose: "or select a different appointment below",
      },
      loading: "Loading appointments...",
      scrollHint: "↓ Scroll down to see all available appointments",
      backButton: "← Back to Study Info",
      continueButton: "Continue to Follow-up →",
      noTimeslotWarning: "Please select a main appointment.",
      noTimeslotsAvailable: "Currently no main appointments are available. Please check back later.",
      availableSlots: "available",
      selectButton: "Select",
   },

   // Step 2: Followup Appointment
   followupAppointment: {
      title: "Select Follow-up Appointment",
      badge: "FOLLOW-UP",
      selectedPrimary: "Your selected main appointment:",
      infoBox: {
         title: "✅ Select Follow-up",
         text1: "Please select a follow-up appointment that is <strong>29-31 days</strong> after your main appointment.",
         text2: "Only matching appointments will be displayed.",
      },
      loading: "Loading available follow-up appointments...",
      scrollHint: "↓ Scroll down to see all available appointments",
      backButton: "← Back to Main Appointment",
      continueButton: "Continue to Data Entry →",
      noTimeslotWarning: "Please select a follow-up appointment.",
      noTimeslotsAvailable:
         "Unfortunately, no suitable follow-up appointments (29-31 days after the main appointment) are available. Please select a different main appointment.",
      daysAfter: "{{days}} days after main appointment",
      availableSlots: "available",
      selectButton: "Select",
   },

   // Step 3: Personal Information
   personalInfo: {
      title: "Your Information & Pre-Study Questions",
      name: {
         label: "Name *",
         error: "Please enter your name.",
      },
      email: {
         label: "Email *",
         error: "Please enter a valid email address.",
      },
      questionnaire: {
         title: "📋 Pre-Study Questions",
      },
      visionCorrection: {
         label: "Vision Correction *",
         placeholder: "Please select...",
         options: {
            none: "No vision aid required",
            glasses: "Glasses",
            contacts: "Contact lenses",
         },
         hint: '<strong>Note:</strong> If you do not normally wear contact lenses but would be willing to use them for the study, please select "Contact lenses". This would be advantageous but is not a requirement for participation.',
      },
      studySubject: {
         label: "Field of Study (current or past) *",
         placeholder: "e.g., Computer Science, Psychology, Mechanical Engineering...",
         hint: "Please provide your main field of study, even if you have already graduated.",
      },
      vrExperience: {
         label: "Prior Experience with Virtual Reality (VR) *",
         min: "No experience",
         max: "Very experienced",
      },
      motionSickness: {
         label: "Susceptibility to Motion Sickness *",
         min: "Not susceptible at all",
         max: "Very susceptible",
         hint: "Have you experienced nausea during car rides, on ships, in VR, or during other motion in the past?",
      },
      tuBerlinEmployee: {
         label: "Are you a TU Berlin employee? *",
         placeholder: "Please select...",
         options: {
            yes: "Yes",
            no: "No",
         },
         warningTitle: "⚠️ Important Notice for TU Berlin Employees:",
         warningText:
            "For legal reasons, TU Berlin employees cannot receive monetary compensation for participation in this study.",
      },
      submitButton: "Complete Registration",
      submitting: "Submitting registration...",
   },

   // Success page
   success: {
      title: "✅ Registration Successful!",
      intro: "Thank you for your registration! You will receive a confirmation email shortly at:",
      appointments: {
         title: "📅 Your Appointments:",
         primary: "Main Appointment:",
         followup: "Follow-up Appointment:",
      },
      management: {
         title: "🔗 Manage Appointment",
         text: "You can manage your appointments via the following link (also included in the email):",
         button: "Manage Appointments",
      },
      important: {
         title: "⚠️ Important",
         items: [
            "Please arrive <strong>approx. 5 minutes before your appointment</strong>",
            "If you cannot attend, please use the management link to cancel",
            "You will receive a reminder email before each appointment",
         ],
      },
      newRegistration: "Start New Registration",
   },

   // Timeslot card
   timeslot: {
      spotsLeft: "{{count}} spots available",
      featured: "⭐ RECOMMENDED",
      select: "Select",
   },

   // Footer
   footer: {
      registered: "Already registered?",
      manage: "Manage Appointment",
      admin: "Admin Login",
   },

   // Alerts
   alerts: {
      error: "Error",
      warning: "Warning",
      success: "Success",
      info: "Information",
      loadingError: "Error loading appointments. Please try again later.",
      registrationError: "Error during registration. Please try again.",
      registrationSuccess: "Registration successful! You will receive a confirmation email shortly.",
   },

   // Manage page
   manage: {
      title: "Manage Appointments",
      subtitle: "Change or cancel your appointments",
      tokenInput: {
         title: "Please enter your confirmation code",
         description: "This code was sent to you via email.",
         placeholder: "Enter confirmation code",
         button: "Load Appointments",
      },
      loading: "Loading appointments...",
      participantInfo: {
         title: "Your Information",
         name: "Name:",
         email: "Email:",
      },
      prescreen: {
         title: "Questionnaire Data",
         description: "You can update your questionnaire responses here.",
         visionCorrection: {
            label: "Vision Correction",
            placeholder: "Please select",
            options: {
               none: "No vision aid",
               glasses: "Glasses",
               contacts: "Contact lenses",
            },
         },
         studySubject: {
            label: "Field of Study",
            placeholder: "e.g., Computer Science",
         },
         vrExperience: {
            label: "VR Experience (1 = none, 5 = very experienced)",
            placeholder: "Please select",
            options: {
               1: "1 - No experience",
               2: "2 - Little experience",
               3: "3 - Some experience",
               4: "4 - Much experience",
               5: "5 - Very experienced",
            },
         },
         motionSickness: {
            label: "Susceptibility to Motion Sickness (1 = not susceptible, 5 = very susceptible)",
            placeholder: "Please select",
            options: {
               1: "1 - Not susceptible",
               2: "2 - Slightly susceptible",
               3: "3 - Somewhat susceptible",
               4: "4 - Quite susceptible",
               5: "5 - Very susceptible",
            },
         },
         tuBerlinEmployee: {
            label: "Are you a TU Berlin employee? *",
            placeholder: "No answer",
            options: {
               yes: "Yes",
               no: "No",
               none: "No answer",
            },
            warningTitle: "⚠️ Important Notice for TU Berlin Employees:",
            warningText:
               "For legal reasons, TU Berlin employees cannot receive monetary compensation for participation in this study.",
         },
         updateButton: "Update Questionnaire Data",
         updateSuccess: "Questionnaire data successfully updated!",
         updateError: "Error updating questionnaire data. Please try again.",
      },
      appointments: {
         primary: {
            title: "Main Appointment",
            badge: "Main Appointment",
            date: "📅 Date:",
            time: "🕐 Time:",
            location: "📍 Location:",
            changeButton: "Change Main Appointment",
         },
         followup: {
            title: "Follow-up Appointment",
            badge: "Follow-up Appointment",
            date: "📅 Date:",
            time: "🕐 Time:",
            location: "📍 Location:",
            daysAfter: "⏱️ Time Difference:",
            changeButton: "Change Follow-up Appointment",
         },
      },
      actions: {
         title: "Actions",
         warning:
            "<strong>Warning:</strong> If you cancel your participation, <strong>both appointments</strong> will be cancelled. This cannot be undone!",
         cancelButton: "Cancel Both Appointments",
      },
      rescheduleModal: {
         title: "Change Appointment",
         currentAppointment: "Current Appointment",
         loading: "Loading available appointments...",
         cancelButton: "Cancel",
         confirmButton: "Confirm Change",
      },
      cancelModal: {
         title: "Cancel Appointments",
         warning: "<strong>Warning:</strong> You are about to cancel your participation completely.",
         description: "The following appointments will be cancelled:",
         primaryTitle: "Main Appointment",
         followupTitle: "Follow-up Appointment",
         confirmation: "Are you sure you want to cancel both appointments?",
         cancelButton: "Cancel",
         confirmButton: "Cancel Appointments",
      },
      footer: {
         home: "Back to Home",
         admin: "Admin Login",
      },
   },

   // Admin page
   admin: {
      login: {
         title: "🔐 Admin Login",
         username: "Username",
         password: "Password",
         button: "Sign In",
         logout: "Sign Out",
      },
      header: {
         title: "📊 Admin Dashboard",
      },
      tabs: {
         overview: "Overview",
         participants: "Participants",
         timeslots: "Time Slots",
         bookings: "Bookings",
         calendar: "Calendar",
         review: "Reviews",
         logs: "Logs",
      },
      bulkEmail: {
         button: "📧 Bulk Email to All Participants",
         modalTitle: "Bulk Email to All Participants",
         warning:
            "⚠️ This email will be sent to <strong>all registered participants</strong>. Each email contains a personalized link to appointment management.",
         subject: {
            label: "Subject (German) *",
            placeholder: "e.g., Important Information About the Study",
         },
         messageDE: {
            label: "Message (German) *",
            placeholder: "Your message in German to all participants...",
            info: "This text will be displayed first in the email.",
         },
         messageEN: {
            label: "Message (English) *",
            placeholder: "Your message in English to all participants...",
            info: "This text will be displayed after the German message.",
         },
         warning2:
            "⚠️ <strong>Warning:</strong> Make sure both languages convey the same content. The emails will be sent immediately!",
         confirmTitle: "Send Bulk Email",
         confirmMessage: "Are you sure you want to send this email to {{count}} participants?",
         cancelButton: "Cancel",
         sendButton: "📧 Send to All Participants",
         sending: "Sending emails...",
         successTitle: "Emails Successfully Sent",
         successMessage: "{{sent}} of {{total}} emails were successfully sent.",
         errorTitle: "Error Sending Emails",
         errorMessage: "There were problems sending some emails.",
         partialSuccess: "{{sent}} successful, {{failed}} failed",
      },
   },
};
