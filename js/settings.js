/**
 * Pace Planner - Settings & Data Management (SettingsManager)
 * Preferences configuration, JSON backup export, schema-validated import,
 * safe data destruction dialogs, and sample data restoration.
 */

const SettingsManager = (() => {
  function init() {
    loadSettingsIntoForm();
    setupEventListeners();
  }

  function loadSettingsIntoForm() {
    const settings = StorageService.getSettings();
    const pomo = StorageService.getPomodoroSettings();

    // Theme
    setInputValue('setting-theme', settings.theme || 'system');
    
    // User profile
    setInputValue('setting-username', settings.userName || 'Achiever');

    // Task defaults
    setInputValue('setting-default-priority', settings.defaultPriority || 'Medium');
    setInputValue('setting-default-category', settings.defaultCategory || 'Work');

    // Pomodoro defaults
    setInputValue('setting-pomo-focus', pomo.focusDuration || 25);
    setInputValue('setting-pomo-short', pomo.shortBreakDuration || 5);
    setInputValue('setting-pomo-long', pomo.longBreakDuration || 15);
    setInputValue('setting-pomo-interval', pomo.longBreakInterval || 4);

    // Audio & Notifications
    const soundToggle = document.getElementById('setting-sound-enabled');
    if (soundToggle) soundToggle.checked = settings.soundEnabled !== false;

    const volumeSlider = document.getElementById('setting-sound-volume');
    if (volumeSlider) volumeSlider.value = settings.soundVolume !== undefined ? settings.soundVolume : 0.7;

    const notifToggle = document.getElementById('setting-browser-notifs');
    if (notifToggle) {
      notifToggle.checked = settings.browserNotifications && ('Notification' in window && Notification.permission === 'granted');
    }
  }

  function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function setupEventListeners() {
    const form = document.getElementById('settings-form');
    if (form) {
      form.addEventListener('submit', handleSaveSettings);
    }

    // Direct theme change from settings dropdown
    const themeSelect = document.getElementById('setting-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        ThemeManager.setTheme(e.target.value);
      });
    }

    // Audio test button
    const testSoundBtn = document.getElementById('setting-test-sound-btn');
    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        NotificationService.playSound('complete');
      });
    }

    // Request browser notifications button/toggle
    const notifToggle = document.getElementById('setting-browser-notifs');
    if (notifToggle) {
      notifToggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
          const granted = await NotificationService.requestBrowserPermission();
          if (!granted) {
            e.target.checked = false;
          }
        }
      });
    }

    // Export Data
    const exportBtn = document.getElementById('settings-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', handleExport);
    }

    // Import Data
    const importBtn = document.getElementById('settings-import-btn');
    const importFileInput = document.getElementById('settings-import-file');
    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => {
        importFileInput.click();
      });

      importFileInput.addEventListener('change', handleFileSelected);
    }

    // Reset to Sample Data
    const resetSampleBtn = document.getElementById('settings-sample-data-btn');
    if (resetSampleBtn) {
      resetSampleBtn.addEventListener('click', () => {
        Utils.showConfirmDialog({
          title: 'Reset to Sample Data',
          message: 'This will replace your current tasks with fresh sample productivity data. Any unsaved custom tasks will be overwritten. Proceed?',
          confirmText: 'Load Sample Data',
          confirmClass: 'btn-primary',
          onConfirm: () => {
            StorageService.initStorage(true);
            window.location.reload();
          }
        });
      });
    }

    // Clear All Data
    const clearDataBtn = document.getElementById('settings-clear-data-btn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', handleClearData);
    }
  }

  function handleSaveSettings(e) {
    e.preventDefault();

    const currentSettings = StorageService.getSettings();
    const currentPomo = StorageService.getPomodoroSettings();

    const updatedSettings = {
      ...currentSettings,
      theme: document.getElementById('setting-theme').value,
      userName: document.getElementById('setting-username').value.trim() || 'Achiever',
      defaultPriority: document.getElementById('setting-default-priority').value,
      defaultCategory: document.getElementById('setting-default-category').value,
      soundEnabled: document.getElementById('setting-sound-enabled').checked,
      soundVolume: parseFloat(document.getElementById('setting-sound-volume').value),
      browserNotifications: document.getElementById('setting-browser-notifs').checked
    };

    const updatedPomo = {
      ...currentPomo,
      focusDuration: Math.max(1, parseInt(document.getElementById('setting-pomo-focus').value, 10) || 25),
      shortBreakDuration: Math.max(1, parseInt(document.getElementById('setting-pomo-short').value, 10) || 5),
      longBreakDuration: Math.max(1, parseInt(document.getElementById('setting-pomo-long').value, 10) || 15),
      longBreakInterval: Math.max(1, parseInt(document.getElementById('setting-pomo-interval').value, 10) || 4)
    };

    StorageService.saveSettings(updatedSettings);
    StorageService.savePomodoroSettings(updatedPomo);

    // Apply theme
    ThemeManager.setTheme(updatedSettings.theme);

    // Notify user
    NotificationService.playSound('task-check');
    NotificationService.showToast('Settings saved successfully!', 'success');

    // Notify app greeting
    if (window.App) window.App.updateGreeting();
  }

  function handleExport() {
    try {
      const dataStr = StorageService.exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const today = Utils.getTodayString();

      const a = document.createElement('a');
      a.href = url;
      a.download = `pace-planner-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      NotificationService.showToast('Data exported successfully!', 'success');
    } catch (err) {
      console.error('[SettingsManager] Export error:', err);
      NotificationService.showToast('Failed to export data.', 'error');
    }
  }

  function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target.result;
        const result = StorageService.importData(jsonContent);

        if (result.success) {
          NotificationService.showToast(`Imported ${result.taskCount} tasks and ${result.sessionCount} focus sessions!`, 'success', 4000);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          NotificationService.showToast(`Import failed: ${result.error}`, 'error', 5000);
        }
      } catch (err) {
        NotificationService.showToast('Invalid JSON file format.', 'error');
      }
      e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  }

  function handleClearData() {
    Utils.showConfirmDialog({
      title: 'Erase All Application Data',
      message: 'WARNING: This will permanently delete all your tasks, focus history logs, and custom preferences from your browser. Are you absolutely sure you want to erase everything?',
      confirmText: 'Erase Everything',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        StorageService.clearAllData();
        NotificationService.showToast('All local data erased.', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    });
  }

  return {
    init,
    loadSettingsIntoForm
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.SettingsManager = SettingsManager;
}
