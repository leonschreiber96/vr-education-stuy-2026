// German translations
export const de = {
   // Language selector
   languageSelector: {
      title: "Sprache wählen / Choose Language",
      subtitle: "Bitte wählen Sie Ihre bevorzugte Sprache:",
      german: "Deutsch",
      english: "English",
      continue: "Weiter",
   },

   // Header
   header: {
      title: "Studienteilnahme – Lernerfolg in Multimedia-Settings",
      compensation: "💰 20 € Vergütung bei vollständiger Teilnahme",
   },

   // Language toggle
   languageToggle: {
      label: "Sprache:",
      german: "Deutsch",
      english: "English",
   },

   // Step indicator
   steps: {
      info: "Studieninfo",
      primary: "Haupttermin",
      followup: "Folgetermin",
      data: "Daten eingeben",
   },

   // Step 0: Study Description
   studyDescription: {
      title: "🎓 Über die Studie",
      compensationBox: {
         title: "💰 Vergütung: 20 €",
         text: "Bei vollständiger Teilnahme an beiden Terminen",
      },
      tldr: {
         title: "Kurz & Knapp (TL;DR)",
         items: [
            "Studie zum <strong>Lernerfolg in Multimedia-Settings</strong>",
            "<strong>💰 20 € Vergütung</strong> bei vollständiger Teilnahme",
            "<strong>Zwei zeitlich versetzte Termine:</strong>",
            "<strong>1. Termin:</strong> Englische Vorlesung + kurzer Wissenstest<br />Dauer: ca. <strong>60 Minuten</strong>",
            "<strong>2. Termin:</strong> kurzer Wissenstest<br />Dauer: ca. <strong>15 Minuten</strong>",
            "<strong>Ort:</strong> MAR-Gebäude der TU Berlin (Marchstraße 23), sofern nicht anders angegeben",
            "Bitte <strong>5 Minuten vor dem Termin erscheinen</strong>",
         ],
      },
      description: {
         title: "📋 Beschreibung des Experiments",
         text1: "In dieser Studie untersuchen wir den Lernerfolg und die Gedächtnisleistung beim Konsum von Vorlesungsinhalten über unterschiedliche Medienformate. Die TeilnehmerInnen sehen eine kurze Vorlesung in englischer Sprache und bearbeiten zwei zeitlich versetzte Wissenstests zu den vermittelten Inhalten. Während des ersten Termins werden außerdem physiologische Messungen (EKG mittels EKG-Gurt) durchgeführt.",
         text2: "Für die vollständige Teilnahme an <strong>beiden Terminen</strong> erhalten die TeilnehmerInnen eine <strong>Aufwandsentschädigung von 20 €</strong>.",
      },
      procedure: {
         title: "📅 Ablauf",
         intro: "Das Experiment besteht aus <strong>zwei Terminen</strong>, die zeitlich voneinander getrennt stattfinden:",
         first: {
            title: "Erster Termin:",
            text: "Ansehen einer englischsprachigen Vorlesung und anschließender kurzer Wissenstest. Während der Vorlesung werden physiologische Messungen (EKG) mittels eines EKG-Gurts durchgeführt.<br />Gesamtdauer: ca. <strong>60 Minuten</strong>.",
         },
         second: {
            title: "Zweiter Termin:",
            text: "Durchführung eines weiteren kurzen Wissenstests zur Erfassung des längerfristigen Lernerfolgs.<br />Dauer: ca. <strong>15 Minuten</strong>.",
         },
      },
      location: {
         title: "📍 Ort",
         name: "MAR-Gebäude der TU Berlin",
         address: "Marchstraße 23, 10587 Berlin",
         note: "(Sofern nicht anders angegeben)",
      },
      requirements: {
         title: "✅ Anforderungen an TeilnehmerInnen",
         items: [
            "Aktuelle Einschreibung an einer Hochschule oder Hochschulabschluss bzw. Einschreibung innerhalb der letzten <strong>drei Jahre</strong>",
            "Ausreichende <strong>englische Sprachkenntnisse</strong>",
            "Zuverlässige Teilnahme an <strong>beiden Terminen</strong>",
            "Pünktliches Erscheinen (bitte ca. <strong>5 Minuten vor Terminbeginn</strong>)",
         ],
      },
      continueButton: "Zur Terminauswahl",
   },

   // Step 1: Primary Appointment
   primaryAppointment: {
      title: "Haupttermin auswählen",
      badge: "HAUPTTERMIN",
      infoBox: {
         title: "📌 Wichtiger Hinweis",
         text1: "Sie müssen sowohl einen Haupttermin als auch einen Folgetermin buchen.",
         text2: "<strong>Der Folgetermin muss zwischen 28 und 32 Tagen nach dem Haupttermin liegen.</strong>",
      },
      featured: {
         title: "Empfohlener Termin (Sehr wichtig!)",
         description:
            "Dieser erste Termin legt das Fundament für die Studie und ist daher besonders wichtig. Aktuell sind nicht alle nötigen Plätze gefüllt. Bitte überlegen Sie deshalb, ob Sie diesen Termin über eine eventuelle andere Wahl priorisieren können, da es wirklich sehr wichtig ist, dass genug Menschen hierfür zusammenkommen.",
         orChoose: "oder wählen Sie einen anderen Termin unten",
      },
      loading: "Termine werden geladen...",
      scrollHint: "↓ Scrollen Sie nach unten, um alle verfügbaren Termine zu sehen",
      backButton: "← Zurück zur Studieninfo",
      continueButton: "Weiter zum Folgetermin →",
      noTimeslotWarning: "Bitte wählen Sie einen Haupttermin aus.",
      noTimeslotsAvailable: "Derzeit sind keine Haupttermine verfügbar. Bitte schauen Sie später noch einmal vorbei.",
      availableSlots: "verfügbar",
      selectButton: "Auswählen",
   },

   // Step 2: Followup Appointment
   followupAppointment: {
      title: "Folgetermin auswählen",
      badge: "FOLGETERMIN",
      selectedPrimary: "Ihr gewählter Haupttermin:",
      infoBox: {
         title: "✅ Folgetermin wählen",
         text1: "Bitte wählen Sie einen Folgetermin, der <strong>29-31 Tage</strong> nach Ihrem Haupttermin liegt.",
         text2: "Es werden nur passende Termine angezeigt.",
      },
      loading: "Verfügbare Folgetermine werden geladen...",
      scrollHint: "↓ Scrollen Sie nach unten, um alle verfügbaren Termine zu sehen",
      backButton: "← Zurück zum Haupttermin",
      continueButton: "Weiter zur Datenerfassung →",
      noTimeslotWarning: "Bitte wählen Sie einen Folgetermin aus.",
      noTimeslotsAvailable:
         "Leider sind keine passenden Folgetermine (29-31 Tage nach dem Haupttermin) verfügbar. Bitte wählen Sie einen anderen Haupttermin.",
      daysAfter: "{{days}} Tage nach dem Haupttermin",
      availableSlots: "verfügbar",
      selectButton: "Auswählen",
   },

   // Step 3: Personal Information
   personalInfo: {
      title: "Ihre Daten & Vorabfragen",
      name: {
         label: "Name *",
         error: "Bitte geben Sie einen Namen ein.",
      },
      email: {
         label: "E-Mail *",
         error: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      },
      questionnaire: {
         title: "📋 Vorabfragen zur Studie",
      },
      visionCorrection: {
         label: "Sehkorrektur *",
         placeholder: "Bitte wählen...",
         options: {
            none: "Keine Sehhilfe erforderlich",
            glasses: "Brille",
            contacts: "Kontaktlinsen",
         },
         hint: '<strong>Hinweis:</strong> Falls Sie normalerweise keine Kontaktlinsen tragen, aber bereit wären, diese für die Studie zu verwenden, wählen Sie bitte "Kontaktlinsen". Dies wäre von Vorteil, ist aber keine Voraussetzung für die Teilnahme.',
      },
      studySubject: {
         label: "Studienfach (aktuell oder in der Vergangenheit) *",
         placeholder: "z.B. Informatik, Psychologie, Maschinenbau...",
         hint: "Bitte geben Sie Ihr Hauptstudienfach an, auch wenn Sie bereits abgeschlossen haben.",
      },
      vrExperience: {
         label: "Vorerfahrung mit Virtual Reality (VR) *",
         min: "Keine Erfahrung",
         max: "Sehr viel Erfahrung",
      },
      motionSickness: {
         label: "Neigung zu Reiseübelkeit / Motion Sickness *",
         min: "Gar nicht anfällig",
         max: "Sehr anfällig",
         hint: "Haben Sie in der Vergangenheit Übelkeit bei Autofahrten, auf Schiffen, in VR oder bei anderen Bewegungen verspürt?",
      },
      tuBerlinEmployee: {
         label: "Sind Sie Mitarbeiter*in der TU Berlin? *",
         placeholder: "Bitte wählen...",
         options: {
            yes: "Ja",
            no: "Nein",
         },
         warningTitle: "⚠️ Wichtiger Hinweis für TU Berlin Mitarbeiter*innen:",
         warningText:
            "Aus rechtlichen Gründen können TU Berlin Mitarbeiter*innen keine monetäre Vergütung für die Teilnahme an dieser Studie erhalten.",
      },
      submitButton: "Anmeldung abschließen",
      submitting: "Anmeldung läuft...",
   },

   // Success page
   success: {
      title: "✅ Anmeldung erfolgreich!",
      intro: "Vielen Dank für Ihre Anmeldung! Sie erhalten in Kürze eine Bestätigungs-E-Mail an:",
      appointments: {
         title: "📅 Ihre Termine:",
         primary: "Haupttermin:",
         followup: "Folgetermin:",
      },
      management: {
         title: "🔗 Termin verwalten",
         text: "Sie können Ihre Termine über folgenden Link verwalten (auch in der E-Mail enthalten):",
         button: "Termine verwalten",
      },
      important: {
         title: "⚠️ Wichtig",
         items: [
            "Bitte erscheinen Sie <strong>ca. 5 Minuten vor Ihrem Termin</strong>",
            "Bei Verhinderung nutzen Sie bitte den Verwaltungs-Link zum Stornieren",
            "Sie erhalten vor jedem Termin eine Erinnerungs-E-Mail",
         ],
      },
      newRegistration: "Neue Anmeldung starten",
   },

   // Timeslot card
   timeslot: {
      spotsLeft: "{{count}} Plätze frei",
      featured: "⭐ EMPFOHLEN",
      select: "Auswählen",
   },

   // Footer
   footer: {
      registered: "Bereits angemeldet?",
      manage: "Termin verwalten",
      admin: "Admin Login",
   },

   // Alerts
   alerts: {
      error: "Fehler",
      warning: "Warnung",
      success: "Erfolg",
      info: "Information",
      loadingError: "Fehler beim Laden der Termine. Bitte versuchen Sie es später erneut.",
      registrationError: "Fehler bei der Anmeldung. Bitte versuchen Sie es erneut.",
      registrationSuccess: "Anmeldung erfolgreich! Sie erhalten in Kürze eine Bestätigungs-E-Mail.",
   },

   // Manage page
   manage: {
      title: "Termine verwalten",
      subtitle: "Ändern oder stornieren Sie Ihre Termine",
      tokenInput: {
         title: "Bitte geben Sie Ihren Bestätigungscode ein",
         description: "Dieser Code wurde Ihnen per E-Mail zugeschickt.",
         placeholder: "Bestätigungscode eingeben",
         button: "Termine laden",
      },
      loading: "Termine werden geladen...",
      participantInfo: {
         title: "Ihre Daten",
         name: "Name:",
         email: "E-Mail:",
      },
      prescreen: {
         title: "Fragebogen-Daten",
         description: "Sie können Ihre Angaben aus dem Fragebogen hier aktualisieren.",
         visionCorrection: {
            label: "Sehkorrektur",
            placeholder: "Bitte wählen",
            options: {
               none: "Keine Sehhilfe",
               glasses: "Brille",
               contacts: "Kontaktlinsen",
            },
         },
         studySubject: {
            label: "Studienfach",
            placeholder: "z.B. Informatik",
         },
         vrExperience: {
            label: "VR-Erfahrung (1 = keine, 5 = sehr erfahren)",
            placeholder: "Bitte wählen",
            options: {
               1: "1 - Keine Erfahrung",
               2: "2 - Wenig Erfahrung",
               3: "3 - Etwas Erfahrung",
               4: "4 - Viel Erfahrung",
               5: "5 - Sehr erfahren",
            },
         },
         motionSickness: {
            label: "Anfälligkeit für Reiseübelkeit (1 = nicht anfällig, 5 = sehr anfällig)",
            placeholder: "Bitte wählen",
            options: {
               1: "1 - Nicht anfällig",
               2: "2 - Wenig anfällig",
               3: "3 - Etwas anfällig",
               4: "4 - Ziemlich anfällig",
               5: "5 - Sehr anfällig",
            },
         },
         tuBerlinEmployee: {
            label: "Sind Sie Mitarbeiter*in der TU Berlin? *",
            placeholder: "Keine Angabe",
            options: {
               yes: "Ja",
               no: "Nein",
               none: "Keine Angabe",
            },
            warningTitle: "⚠️ Wichtiger Hinweis für TU Berlin Mitarbeiter*innen:",
            warningText:
               "Aus rechtlichen Gründen können TU Berlin Mitarbeiter*innen keine monetäre Vergütung für die Teilnahme an dieser Studie erhalten.",
         },
         updateButton: "Fragebogen-Daten aktualisieren",
         updateSuccess: "Fragebogen-Daten erfolgreich aktualisiert!",
         updateError: "Fehler beim Aktualisieren der Fragebogen-Daten. Bitte versuchen Sie es erneut.",
      },
      appointments: {
         primary: {
            title: "Haupttermin",
            badge: "Haupttermin",
            date: "📅 Datum:",
            time: "🕐 Uhrzeit:",
            location: "📍 Ort:",
            changeButton: "Haupttermin ändern",
         },
         followup: {
            title: "Folgetermin",
            badge: "Folgetermin",
            date: "📅 Datum:",
            time: "🕐 Uhrzeit:",
            location: "📍 Ort:",
            daysAfter: "⏱️ Abstand:",
            changeButton: "Folgetermin ändern",
         },
      },
      actions: {
         title: "Aktionen",
         warning:
            "<strong>Achtung:</strong> Wenn Sie Ihre Teilnahme absagen, werden <strong>beide Termine</strong> storniert. Dies kann nicht rückgängig gemacht werden!",
         cancelButton: "Beide Termine absagen",
      },
      rescheduleModal: {
         title: "Termin ändern",
         currentAppointment: "Aktueller Termin",
         loading: "Verfügbare Termine werden geladen...",
         cancelButton: "Abbrechen",
         confirmButton: "Änderung bestätigen",
      },
      cancelModal: {
         title: "Termine absagen",
         warning: "<strong>Achtung:</strong> Sie sind dabei, Ihre Teilnahme vollständig abzusagen.",
         description: "Folgende Termine werden storniert:",
         primaryTitle: "Haupttermin",
         followupTitle: "Folgetermin",
         confirmation: "Sind Sie sicher, dass Sie beide Termine absagen möchten?",
         cancelButton: "Abbrechen",
         confirmButton: "Termine absagen",
      },
      footer: {
         home: "Zur Startseite",
         admin: "Admin Login",
      },
   },

   // Admin page
   admin: {
      login: {
         title: "🔐 Admin Login",
         username: "Benutzername",
         password: "Passwort",
         button: "Anmelden",
         logout: "Abmelden",
      },
      header: {
         title: "📊 Admin Dashboard",
      },
      tabs: {
         overview: "Übersicht",
         participants: "Teilnehmer",
         timeslots: "Zeitslots",
         bookings: "Buchungen",
         calendar: "Kalender",
         review: "Bewertungen",
         logs: "Protokoll",
      },
      bulkEmail: {
         button: "📧 Massenmail an alle Teilnehmer",
         modalTitle: "Massenmail an alle Teilnehmer",
         warning:
            "⚠️ Diese E-Mail wird an <strong>alle registrierten Teilnehmer</strong> gesendet. Jede E-Mail enthält einen personalisierten Link zur Terminverwaltung.",
         subject: {
            label: "Betreff (Deutsch) *",
            placeholder: "z.B. Wichtige Information zur Studie",
         },
         messageDE: {
            label: "Nachricht (Deutsch) *",
            placeholder: "Ihre Nachricht auf Deutsch an alle Teilnehmer...",
            info: "Dieser Text wird zuerst in der E-Mail angezeigt.",
         },
         messageEN: {
            label: "Nachricht (Englisch) *",
            placeholder: "Your message in English to all participants...",
            info: "Dieser Text wird nach der deutschen Nachricht angezeigt.",
         },
         warning2:
            "⚠️ <strong>Warnung:</strong> Stellen Sie sicher, dass beide Sprachen den gleichen Inhalt vermitteln. Die E-Mails werden sofort versendet!",
         confirmTitle: "Massenmail senden",
         confirmMessage: "Sind Sie sicher, dass Sie diese E-Mail an {{count}} Teilnehmer senden möchten?",
         cancelButton: "Abbrechen",
         sendButton: "📧 An alle Teilnehmer senden",
         sending: "E-Mails werden versendet...",
         successTitle: "E-Mails erfolgreich versendet",
         successMessage: "{{sent}} von {{total}} E-Mails wurden erfolgreich versendet.",
         errorTitle: "Fehler beim Versenden",
         errorMessage: "Es gab Probleme beim Versenden einiger E-Mails.",
         partialSuccess: "{{sent}} erfolgreich, {{failed}} fehlgeschlagen",
      },
   },
};
