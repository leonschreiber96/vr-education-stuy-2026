// Language Selector Component
// Shows a modal for first-time visitors to select their preferred language

import { setLanguage, t } from '../i18n/i18n.js';

/**
 * Show language selector modal
 * @param {Function} onLanguageSelected - Callback when language is selected
 */
export function showLanguageSelector(onLanguageSelected) {
  const modal = createLanguageSelectorModal();
  document.body.appendChild(modal);

  // Setup event listeners
  const germanBtn = modal.querySelector('#selectGerman');
  const englishBtn = modal.querySelector('#selectEnglish');

  germanBtn.addEventListener('click', () => {
    selectLanguage('de', modal, onLanguageSelected);
  });

  englishBtn.addEventListener('click', () => {
    selectLanguage('en', modal, onLanguageSelected);
  });

  // Prevent closing by clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Add fade-in animation
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
}

/**
 * Handle language selection
 */
function selectLanguage(lang, modal, callback) {
  setLanguage(lang);

  // Fade out modal
  modal.classList.remove('active');

  setTimeout(() => {
    modal.remove();
    if (callback) {
      callback(lang);
    }
  }, 300);
}

/**
 * Create the language selector modal DOM
 */
function createLanguageSelectorModal() {
  const modal = document.createElement('div');
  modal.className = 'language-selector-modal';
  modal.innerHTML = `
    <div class="language-selector-backdrop"></div>
    <div class="language-selector-content">
      <div class="language-selector-header">
        <h2>🌍 Sprache wählen / Choose Language</h2>
        <p>Bitte wählen Sie Ihre bevorzugte Sprache:</p>
        <p>Please select your preferred language:</p>
      </div>

      <div class="language-selector-buttons">
        <button id="selectGerman" class="language-btn german-btn">
          <span class="flag-icon">🇩🇪</span>
          <span class="language-name">Deutsch</span>
          <span class="language-subtitle">German</span>
        </button>

        <button id="selectEnglish" class="language-btn english-btn">
          <span class="flag-icon">🇬🇧</span>
          <span class="language-name">English</span>
          <span class="language-subtitle">Englisch</span>
        </button>
      </div>
    </div>
  `;

  return modal;
}

/**
 * Create language toggle in header
 */
export function createLanguageToggle() {
  const toggle = document.createElement('div');
  toggle.className = 'language-toggle';

  const updateToggle = () => {
    const currentLang = localStorage.getItem('preferredLanguage') || 'de';
    toggle.innerHTML = `
      <span class="language-toggle-label">${currentLang === 'de' ? 'Sprache:' : 'Language:'}</span>
      <button class="language-toggle-btn ${currentLang === 'de' ? 'active' : ''}" data-lang="de">
        Deutsch
      </button>
      <span class="language-toggle-separator">|</span>
      <button class="language-toggle-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">
        English
      </button>
    `;

    // Add event listeners
    const buttons = toggle.querySelectorAll('.language-toggle-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const newLang = btn.getAttribute('data-lang');
        setLanguage(newLang);
        window.location.reload(); // Reload page to apply translations
      });
    });
  };

  updateToggle();
  return toggle;
}

/**
 * Add language toggle to header
 */
export function addLanguageToggleToHeader() {
  const header = document.querySelector('.header');
  if (!header) {
    console.warn('Header element not found');
    return;
  }

  // Check if toggle already exists
  if (header.querySelector('.language-toggle')) {
    return;
  }

  const toggle = createLanguageToggle();
  header.appendChild(toggle);
}
