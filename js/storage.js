/**
 * Pace Planner - Storage Layer (StorageService)
 * Abstracted persistence interface over LocalStorage with schema validation,
 * error boundaries, export/import utilities, and initial data seeding.
 */

const StorageService = (() => {
  const PREFIX = 'pace_planner_';
  const KEYS = {
    TASKS: `${PREFIX}tasks`,
    POMODORO_SETTINGS: `${PREFIX}pomodoro_settings`,
    POMODORO_SESSIONS: `${PREFIX}pomodoro_sessions`,
    SETTINGS: `${PREFIX}settings`,
    INITIALIZED: `${PREFIX}has_initialized`,
    APP_VERSION: `${PREFIX}version`
  };

  const CURRENT_VERSION = '1.0.0';

  const DEFAULT_SETTINGS = {
    theme: 'system', // 'light' | 'dark' | 'system'
    defaultPriority: 'Medium',
    defaultCategory: 'Work',
    holidayCountry: 'IN',
    soundEnabled: true,
    soundVolume: 0.7,
    browserNotifications: false,
    userName: 'Achiever'
  };

  const DEFAULT_POMODORO_SETTINGS = {
    focusDuration: 25,       // minutes
    shortBreakDuration: 5,   // minutes
    longBreakDuration: 15,   // minutes
    longBreakInterval: 4,    // sessions before long break
    autoStartBreaks: false,
    autoStartFocus: false
  };

  /**
   * Low-level safe get
   */
  function get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item);
    } catch (err) {
      console.warn(`[StorageService] Failed to read key "${key}":`, err);
      return fallback;
    }
  }

  /**
   * Low-level safe set
   */
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[StorageService] Failed to write key "${key}":`, err);
      return false;
    }
  }

  /**
   * Low-level safe remove
   */
  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`[StorageService] Failed to remove key "${key}":`, err);
      return false;
    }
  }

  // --- Task Methods ---

  function getTasks() {
    const tasks = get(KEYS.TASKS, null);
    if (!tasks) {
      return [];
    }
    return tasks;
  }

  function saveTasks(tasks) {
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array');
    }
    return set(KEYS.TASKS, tasks);
  }

  // --- Pomodoro Methods ---

  function getPomodoroSettings() {
    const stored = get(KEYS.POMODORO_SETTINGS, {});
    return { ...DEFAULT_POMODORO_SETTINGS, ...stored };
  }

  function savePomodoroSettings(settings) {
    return set(KEYS.POMODORO_SETTINGS, settings);
  }

  function getPomodoroSessions() {
    return get(KEYS.POMODORO_SESSIONS, []);
  }

  function savePomodoroSessions(sessions) {
    if (!Array.isArray(sessions)) {
      throw new Error('Sessions must be an array');
    }
    return set(KEYS.POMODORO_SESSIONS, sessions);
  }

  function addPomodoroSession(session) {
    const sessions = getPomodoroSessions();
    sessions.push({
      id: Utils.generateId(),
      type: session.type || 'focus', // 'focus' | 'shortBreak' | 'longBreak'
      durationMinutes: session.durationMinutes || 25,
      completedAt: session.completedAt || new Date().toISOString()
    });
    savePomodoroSessions(sessions);
    return sessions;
  }

  // --- Settings Methods ---

  function getSettings() {
    const stored = get(KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  function saveSettings(settings) {
    return set(KEYS.SETTINGS, settings);
  }

  // --- Sample Seed Data Generator ---

  function generateSampleTasks() {
    const today = Utils.getTodayString();
    
    // Tomorrow
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tomorrowStr = `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`;

    // 3 days later
    const later = new Date();
    later.setDate(later.getDate() + 3);
    const laterStr = `${later.getFullYear()}-${String(later.getMonth() + 1).padStart(2, '0')}-${String(later.getDate()).padStart(2, '0')}`;

    // Yesterday for completed task
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

    return [
      {
        id: 'seed-task-1',
        title: 'Review quarterly project milestones and goals',
        description: 'Prepare executive summary of deliverables and align team sprint priorities.',
        priority: 'Urgent',
        category: 'Work',
        tags: ['Planning', 'Executive'],
        dueDate: today,
        dueTime: '15:00',
        status: 'Pending',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      },
      {
        id: 'seed-task-2',
        title: 'Complete 2 Pomodoro focus blocks on feature spec',
        description: 'Draft technical architecture notes, API payloads, and state design.',
        priority: 'High',
        category: 'Study',
        tags: ['DeepWork', 'Focus'],
        dueDate: today,
        dueTime: '18:30',
        status: 'Pending',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      },
      {
        id: 'seed-task-3',
        title: 'Morning 30-minute cardio & stretch routine',
        description: 'Hydrate well and finish core activation exercises.',
        priority: 'Medium',
        category: 'Health',
        tags: ['Wellness', 'Routine'],
        dueDate: today,
        dueTime: '08:00',
        status: 'Completed',
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: 'seed-task-4',
        title: 'Review team pull requests and code review comments',
        description: 'Verify test coverage and bundle performance on staging branch.',
        priority: 'High',
        category: 'Work',
        tags: ['Dev', 'Review'],
        dueDate: tomorrowStr,
        dueTime: '11:00',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      },
      {
        id: 'seed-task-5',
        title: 'Budget and expense tracking reconciliation',
        description: 'Export monthly card statements and update investment tracker spreadsheet.',
        priority: 'Low',
        category: 'Finance',
        tags: ['Monthly', 'Finance'],
        dueDate: laterStr,
        dueTime: '17:00',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      },
      {
        id: 'seed-task-6',
        title: 'Sync up with design mentor regarding UX feedback',
        description: 'Discuss spacing hierarchy, color contrasts, and accessibility guidelines.',
        priority: 'Medium',
        category: 'Personal',
        tags: ['Growth', 'Mentorship'],
        dueDate: yestStr,
        dueTime: '16:00',
        status: 'Completed',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }

  function generateSamplePomodoroSessions() {
    const now = Date.now();
    return [
      {
        id: 'seed-pomo-1',
        type: 'focus',
        durationMinutes: 25,
        completedAt: new Date(now - 86400000).toISOString()
      },
      {
        id: 'seed-pomo-2',
        type: 'focus',
        durationMinutes: 25,
        completedAt: new Date(now - 86400000 + 1800000).toISOString()
      },
      {
        id: 'seed-pomo-3',
        type: 'focus',
        durationMinutes: 25,
        completedAt: new Date(now - 7200000).toISOString()
      }
    ];
  }

  /**
   * Initializes starter data on initial run
   */
  function initStorage(force = false) {
    const isInitialized = get(KEYS.INITIALIZED, false);
    if (!isInitialized || force) {
      saveTasks(generateSampleTasks());
      savePomodoroSettings(DEFAULT_POMODORO_SETTINGS);
      savePomodoroSessions(generateSamplePomodoroSessions());
      saveSettings(DEFAULT_SETTINGS);
      set(KEYS.INITIALIZED, true);
      set(KEYS.APP_VERSION, CURRENT_VERSION);
      return true;
    }
    return false;
  }

  // --- Export / Import Management ---

  /**
   * Exports all application data into a structured JSON string
   */
  function exportAllData() {
    const payload = {
      version: CURRENT_VERSION,
      exportTimestamp: new Date().toISOString(),
      appName: 'Pace Planner',
      tasks: getTasks(),
      pomodoroSettings: getPomodoroSettings(),
      pomodoroSessions: getPomodoroSessions(),
      settings: getSettings()
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Validates and imports JSON data string
   */
  function importData(jsonString) {
    try {
      if (typeof jsonString !== 'string') {
        throw new Error('Input must be a valid JSON string');
      }

      const parsed = JSON.parse(jsonString);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format');
      }

      // Basic structure validation
      if (!Array.isArray(parsed.tasks)) {
        throw new Error('Imported data missing required "tasks" array');
      }

      // Validate each task minimally
      for (const t of parsed.tasks) {
        if (!t.title || typeof t.title !== 'string') {
          throw new Error('All tasks must contain a non-empty string title');
        }
        if (!t.id) {
          t.id = Utils.generateId();
        }
        if (!t.status) {
          t.status = 'Pending';
        }
      }

      // Apply tasks
      saveTasks(parsed.tasks);

      // Apply pomodoro settings if present
      if (parsed.pomodoroSettings && typeof parsed.pomodoroSettings === 'object') {
        savePomodoroSettings({ ...DEFAULT_POMODORO_SETTINGS, ...parsed.pomodoroSettings });
      }

      // Apply pomodoro sessions if present
      if (Array.isArray(parsed.pomodoroSessions)) {
        savePomodoroSessions(parsed.pomodoroSessions);
      }

      // Apply user settings if present
      if (parsed.settings && typeof parsed.settings === 'object') {
        saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      }

      return {
        success: true,
        taskCount: parsed.tasks.length,
        sessionCount: Array.isArray(parsed.pomodoroSessions) ? parsed.pomodoroSessions.length : 0
      };
    } catch (err) {
      console.error('[StorageService] Import error:', err);
      return {
        success: false,
        error: err.message || 'Unknown import error'
      };
    }
  }

  /**
   * Clears all Pace Planner data from storage
   */
  function clearAllData() {
    try {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      return true;
    } catch (e) {
      console.error('[StorageService] Clear error:', e);
      return false;
    }
  }

  return {
    KEYS,
    initStorage,
    getTasks,
    saveTasks,
    getPomodoroSettings,
    savePomodoroSettings,
    getPomodoroSessions,
    savePomodoroSessions,
    addPomodoroSession,
    getSettings,
    saveSettings,
    exportAllData,
    importData,
    clearAllData,
    DEFAULT_SETTINGS,
    DEFAULT_POMODORO_SETTINGS
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.StorageService = StorageService;
}
