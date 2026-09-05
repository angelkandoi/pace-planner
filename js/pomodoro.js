/**
 * Pace Planner - Pomodoro Focus System (PomodoroTimer)
 * Circular SVG progress ring, audio chimes, cycle counter, session history,
 * automatic transition, and tab title updates.
 */

const PomodoroTimer = (() => {
  const CIRCLE_RADIUS = 90;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~565.487

  let state = {
    mode: 'focus', // 'focus' | 'shortBreak' | 'longBreak'
    status: 'idle', // 'idle' | 'running' | 'paused'
    timeRemaining: 25 * 60,
    totalDuration: 25 * 60,
    currentCycle: 1, // session 1 of N
    timerInterval: null
  };

  function init() {
    setupEventListeners();
    resetTimer(false);
    renderHistory();
  }

  function getSettings() {
    return StorageService.getPomodoroSettings();
  }

  function getDurationForMode(mode) {
    const settings = getSettings();
    switch (mode) {
      case 'shortBreak':
        return (settings.shortBreakDuration || 5) * 60;
      case 'longBreak':
        return (settings.longBreakDuration || 15) * 60;
      case 'focus':
      default:
        return (settings.focusDuration || 25) * 60;
    }
  }

  function setupEventListeners() {
    const startBtn = document.getElementById('pomo-start-btn');
    const pauseBtn = document.getElementById('pomo-pause-btn');
    const resetBtn = document.getElementById('pomo-reset-btn');
    const skipBtn = document.getElementById('pomo-skip-btn');

    const modeFocusBtn = document.getElementById('pomo-mode-focus');
    const modeShortBtn = document.getElementById('pomo-mode-short');
    const modeLongBtn = document.getElementById('pomo-mode-long');

    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
    if (resetBtn) resetBtn.addEventListener('click', () => resetTimer(true));
    if (skipBtn) skipBtn.addEventListener('click', skipSession);

    if (modeFocusBtn) modeFocusBtn.addEventListener('click', () => switchMode('focus'));
    if (modeShortBtn) modeShortBtn.addEventListener('click', () => switchMode('shortBreak'));
    if (modeLongBtn) modeLongBtn.addEventListener('click', () => switchMode('longBreak'));

    // Dashboard quick start
    const dashStartBtn = document.getElementById('dash-start-pomo-btn');
    if (dashStartBtn) {
      dashStartBtn.addEventListener('click', () => {
        // Navigate to Pomodoro view and start
        if (window.App) window.App.navigateTo('pomodoro');
        startTimer();
      });
    }

    // Clear history button
    const clearHistoryBtn = document.getElementById('pomo-clear-history-btn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        Utils.showConfirmDialog({
          title: 'Clear Focus History',
          message: 'Are you sure you want to clear your Pomodoro focus session history?',
          confirmText: 'Clear History',
          confirmClass: 'btn-danger',
          onConfirm: () => {
            StorageService.savePomodoroSessions([]);
            renderHistory();
            NotificationService.showToast('Pomodoro history cleared', 'info');
          }
        });
      });
    }
  }

  function startTimer() {
    if (state.status === 'running') return;

    state.status = 'running';
    NotificationService.playSound('start');

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      if (state.timeRemaining > 0) {
        state.timeRemaining--;
        updateDisplay();
      } else {
        handleSessionComplete();
      }
    }, 1000);

    updateControlsUI();
    updateDisplay();
  }

  function pauseTimer() {
    if (state.status !== 'running') return;

    state.status = 'paused';
    clearInterval(state.timerInterval);
    updateControlsUI();
    updateDisplay();
  }

  function resetTimer(manual = true) {
    clearInterval(state.timerInterval);
    state.status = 'idle';
    state.totalDuration = getDurationForMode(state.mode);
    state.timeRemaining = state.totalDuration;

    if (manual) {
      document.title = 'Pace Planner';
    }

    updateControlsUI();
    updateDisplay();
  }

  function switchMode(newMode, keepCycle = true) {
    if (state.status === 'running') {
      if (!confirm('Timer is active. Switch session mode?')) return;
    }

    clearInterval(state.timerInterval);
    state.mode = newMode;
    state.status = 'idle';
    state.totalDuration = getDurationForMode(newMode);
    state.timeRemaining = state.totalDuration;

    if (!keepCycle && newMode === 'focus') {
      state.currentCycle = 1;
    }

    updateModeButtons();
    updateControlsUI();
    updateDisplay();
  }

  function skipSession() {
    if (confirm('Skip current session?')) {
      advanceSession(false);
    }
  }

  function handleSessionComplete() {
    clearInterval(state.timerInterval);
    state.status = 'idle';

    const wasFocus = state.mode === 'focus';
    const durationMins = Math.round(state.totalDuration / 60);

    // Save session in history
    StorageService.addPomodoroSession({
      type: state.mode,
      durationMinutes: durationMins,
      completedAt: new Date().toISOString()
    });

    // Sound and visual alerts
    NotificationService.playSound('complete');
    
    const message = wasFocus
      ? `Focus session completed! Great work on staying disciplined.`
      : `Break completed! Ready to dive back in?`;

    NotificationService.showToast(message, 'success', 5000);
    NotificationService.showBrowserNotification('Pace Planner Timer', { body: message });

    renderHistory();
    
    // Broadcast event for statistics and dashboard
    window.dispatchEvent(new CustomEvent('pace-planner:pomodoro-completed', {
      detail: { mode: state.mode, durationMinutes: durationMins }
    }));

    advanceSession(true);
  }

  function advanceSession(autoSwitch = true) {
    const settings = getSettings();
    const cycleLimit = settings.longBreakInterval || 4;

    if (state.mode === 'focus') {
      if (state.currentCycle >= cycleLimit) {
        state.mode = 'longBreak';
        state.currentCycle = 1; // Reset cycle after long break
      } else {
        state.mode = 'shortBreak';
        state.currentCycle++;
      }
    } else {
      // Finished break, back to focus
      state.mode = 'focus';
    }

    state.totalDuration = getDurationForMode(state.mode);
    state.timeRemaining = state.totalDuration;

    updateModeButtons();
    updateControlsUI();
    updateDisplay();

    // Auto-start next session if enabled in settings
    if (autoSwitch) {
      const shouldAuto = (state.mode === 'focus' && settings.autoStartFocus) ||
                         (state.mode !== 'focus' && settings.autoStartBreaks);
      if (shouldAuto) {
        startTimer();
      }
    }
  }

  function updateDisplay() {
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Main timer text
    const timerTextEl = document.getElementById('pomo-timer-text');
    if (timerTextEl) {
      timerTextEl.textContent = formatted;
    }

    // Dashboard mini widget timer
    const dashPomoTime = document.getElementById('dash-pomo-time');
    if (dashPomoTime) {
      dashPomoTime.textContent = formatted;
    }

    // Circular progress ring
    const ringCircle = document.getElementById('pomo-progress-circle');
    if (ringCircle) {
      const fraction = state.totalDuration > 0 ? (state.timeRemaining / state.totalDuration) : 0;
      const offset = CIRCUMFERENCE * (1 - fraction);
      ringCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;
      ringCircle.style.strokeDashoffset = `${offset}`;
    }

    // Update document title
    const modeLabel = state.mode === 'focus' ? 'Focus' : (state.mode === 'shortBreak' ? 'Short Break' : 'Long Break');
    if (state.status === 'running') {
      document.title = `(${formatted}) ${modeLabel} • Pace Planner`;
    } else if (state.status === 'paused') {
      document.title = `[Paused] ${formatted} • Pace Planner`;
    } else {
      document.title = 'Pace Planner';
    }

    // Update cycle indicator
    const cycleEl = document.getElementById('pomo-cycle-indicator');
    const settings = getSettings();
    if (cycleEl) {
      cycleEl.textContent = `Session ${state.currentCycle} of ${settings.longBreakInterval || 4}`;
    }
  }

  function updateControlsUI() {
    const startBtn = document.getElementById('pomo-start-btn');
    const pauseBtn = document.getElementById('pomo-pause-btn');

    if (!startBtn || !pauseBtn) return;

    if (state.status === 'running') {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
    } else {
      startBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
      startBtn.textContent = state.status === 'paused' ? 'Resume' : 'Start Focus';
    }
  }

  function updateModeButtons() {
    const btns = {
      focus: document.getElementById('pomo-mode-focus'),
      shortBreak: document.getElementById('pomo-mode-short'),
      longBreak: document.getElementById('pomo-mode-long')
    };

    Object.entries(btns).forEach(([m, btn]) => {
      if (btn) {
        if (m === state.mode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });

    const statusBadge = document.getElementById('pomo-mode-badge');
    if (statusBadge) {
      const labels = {
        focus: 'Focus Session',
        shortBreak: 'Short Break',
        longBreak: 'Long Break'
      };
      statusBadge.textContent = labels[state.mode] || 'Focus';
      statusBadge.className = `badge badge-pomo-${state.mode.toLowerCase()}`;
    }
  }

  function renderHistory() {
    const listEl = document.getElementById('pomo-history-list');
    const totalCountEl = document.getElementById('pomo-total-sessions');
    const totalMinutesEl = document.getElementById('pomo-total-minutes');
    if (!listEl) return;

    const sessions = StorageService.getPomodoroSessions();
    const today = Utils.getTodayString();

    const todaySessions = sessions.filter(s => s.completedAt && s.completedAt.startsWith(today));
    const focusSessions = sessions.filter(s => s.type === 'focus');
    const totalMinutes = focusSessions.reduce((sum, s) => sum + (s.durationMinutes || 25), 0);

    if (totalCountEl) totalCountEl.textContent = todaySessions.filter(s => s.type === 'focus').length;
    if (totalMinutesEl) totalMinutesEl.textContent = Utils.formatMinutes(totalMinutes);

    if (sessions.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem;">
          <p class="empty-state-subtitle">No recorded sessions yet today. Start your first session above!</p>
        </div>
      `;
      return;
    }

    // Display 10 most recent sessions descending
    const recent = [...sessions].reverse().slice(0, 10);
    listEl.innerHTML = recent.map(s => {
      const typeLabels = {
        focus: 'Focus Session',
        shortBreak: 'Short Break',
        longBreak: 'Long Break'
      };
      const badgeClasses = {
        focus: 'badge-priority-urgent',
        shortBreak: 'badge-category-personal',
        longBreak: 'badge-category-study'
      };

      const dateObj = new Date(s.completedAt);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = Utils.formatDate(s.completedAt ? s.completedAt.substring(0, 10) : today, { relative: true });

      return `
        <div class="history-item">
          <div class="history-item-left">
            <span class="badge ${badgeClasses[s.type] || 'badge-neutral'}">${typeLabels[s.type] || 'Focus'}</span>
            <span class="history-duration">${s.durationMinutes || 25} mins</span>
          </div>
          <div class="history-item-right">
            <span class="history-time">${dateStr} at ${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  return {
    init,
    startTimer,
    pauseTimer,
    resetTimer,
    switchMode,
    renderHistory,
    getState: () => ({ ...state })
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.PomodoroTimer = PomodoroTimer;
}
