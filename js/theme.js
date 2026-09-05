/**
 * Pace Planner - Theme Manager
 * Controls Light, Dark, and System Preference themes with instant reactivity,
 * LocalStorage persistence, and system media query listeners.
 */

const ThemeManager = (() => {
  const THEME_ATTR = 'data-theme';
  let mediaQuery = null;

  function init() {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const settings = StorageService.getSettings();
      if (settings.theme === 'system') {
        applyTheme('system');
      }
    });

    const settings = StorageService.getSettings();
    applyTheme(settings.theme || 'system');
  }

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function getEffectiveTheme(preference) {
    if (preference === 'system') {
      return getSystemTheme();
    }
    return preference === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(preference) {
    const effectiveTheme = getEffectiveTheme(preference);
    document.documentElement.setAttribute(THEME_ATTR, effectiveTheme);
    document.documentElement.setAttribute('data-theme-pref', preference);

    // Update browser theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0b0f19' : '#ffffff');

    // Update any theme toggler buttons in DOM
    updateThemeTogglers(preference, effectiveTheme);
  }

  function setTheme(preference) {
    const valid = ['light', 'dark', 'system'];
    if (!valid.includes(preference)) preference = 'system';

    const settings = StorageService.getSettings();
    settings.theme = preference;
    StorageService.saveSettings(settings);

    applyTheme(preference);

    // Dispatch global event
    window.dispatchEvent(new CustomEvent('pace-planner:theme-changed', {
      detail: { preference, effectiveTheme: getEffectiveTheme(preference) }
    }));
  }

  function toggle() {
    const settings = StorageService.getSettings();
    const effective = getEffectiveTheme(settings.theme);
    // Cycle: dark -> light -> dark
    const nextTheme = effective === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    NotificationService.showToast(`Theme changed to ${nextTheme} mode`, 'info', 2000);
  }

  function updateThemeTogglers(preference, effectiveTheme) {
    const quickToggleBtn = document.getElementById('quick-theme-toggle');
    if (quickToggleBtn) {
      quickToggleBtn.setAttribute('title', `Current: ${preference} (${effectiveTheme}). Click to switch.`);
      quickToggleBtn.innerHTML = effectiveTheme === 'dark'
        ? `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
        : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }

    // Sync radio or select in settings if available
    const themeSelect = document.getElementById('setting-theme');
    if (themeSelect && themeSelect.value !== preference) {
      themeSelect.value = preference;
    }
  }

  return {
    init,
    setTheme,
    toggle,
    getSystemTheme,
    getEffectiveTheme
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}
