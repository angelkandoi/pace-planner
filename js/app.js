/**
 * Pace Planner - Application Orchestrator (App)
 * Single-Page navigation router, live digital clock, dynamic dashboard widgets,
 * global keyboard shortcuts, and view orchestration.
 */

const App = (() => {
  let activeSection = 'dashboard';
  let clockInterval = null;

  function init() {
    // 1. Initialize Storage first (seed defaults if new installation)
    StorageService.initStorage();

    // 2. Initialize Theme
    ThemeManager.init();

    // 3. Initialize Domain Services
    TaskManager.init();
    CalendarManager.init();
    PomodoroTimer.init();
    HolidaysService.init();
    StatsEngine.init();
    SettingsManager.init();

    // 4. Setup Navigation & Layout
    setupNavigation();
    setupMobileDrawer();
    setupGlobalShortcuts();
    startLiveClock();
    updateGreeting();

    // 5. Render Initial Views
    TaskManager.renderTasksView();
    renderDashboard();

    // 6. Handle initial route from URL Hash
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && ['dashboard', 'tasks', 'calendar', 'pomodoro', 'holidays', 'statistics', 'settings'].includes(hash)) {
      navigateTo(hash);
    } else {
      navigateTo('dashboard');
    }

    // 7. Listen for data updates to keep Dashboard in sync
    window.addEventListener('pace-planner:tasks-changed', () => {
      renderDashboard();
    });

    window.addEventListener('pace-planner:pomodoro-completed', () => {
      renderDashboard();
    });

    // Quick add floating or header button
    const quickAddBtns = document.querySelectorAll('[data-action="quick-add-task"]');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        TaskManager.openTaskCreateModal();
      });
    });

    // Quick theme toggle button in header
    const themeToggleBtn = document.getElementById('quick-theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        ThemeManager.toggle();
      });
    }

    console.log('[Pace Planner] Initialized successfully.');
  }

  // --- Live Clock & Greeting ---

  function startLiveClock() {
    updateClock();
    clearInterval(clockInterval);
    clockInterval = setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    
    // Live Time
    const timeEl = document.getElementById('dash-live-time');
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }

    // Header mini time
    const headerTimeEl = document.getElementById('header-live-time');
    if (headerTimeEl) {
      headerTimeEl.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }

    // Live Date
    const dateEl = document.getElementById('dash-live-date');
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  function updateGreeting() {
    const greetingEl = document.getElementById('dash-greeting-text');
    const greetingSubEl = document.getElementById('dash-greeting-sub');
    if (!greetingEl) return;

    const settings = StorageService.getSettings();
    const userName = settings.userName || 'Achiever';
    const { text, icon } = Utils.getGreeting();

    greetingEl.innerHTML = `${icon} ${text}, <span class="highlight-name">${Utils.escapeHtml(userName)}</span>`;
    
    if (greetingSubEl) {
      greetingSubEl.textContent = "Your personal productivity dashboard for daily tasks, Pomodoro focus, and planning.";
    }
  }

  // --- Navigation Router ---

  function setupNavigation() {
    // Top, Sidebar, and Mobile Nav Links
    document.querySelectorAll('[data-nav-target]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-nav-target');
        navigateTo(target);
      });
    });

    // Hash change event (browser back/forward)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && hash !== activeSection) {
        navigateTo(hash, false);
      }
    });
  }

  function navigateTo(sectionId, updateHash = true) {
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (!targetSection) return;

    // Hide all sections
    document.querySelectorAll('.app-section').forEach(sec => {
      sec.classList.remove('is-active');
    });

    // Show target section
    targetSection.classList.add('is-active');
    activeSection = sectionId;

    if (updateHash) {
      history.pushState(null, null, `#${sectionId}`);
    }

    // Update active states on nav items
    document.querySelectorAll('[data-nav-target]').forEach(link => {
      if (link.getAttribute('data-nav-target') === sectionId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile drawer if open
    closeMobileDrawer();

    // Section-specific refresh on view
    if (sectionId === 'dashboard') {
      renderDashboard();
    } else if (sectionId === 'tasks') {
      TaskManager.renderTasksView();
    } else if (sectionId === 'calendar') {
      CalendarManager.renderCalendar();
    } else if (sectionId === 'pomodoro') {
      PomodoroTimer.renderHistory();
    } else if (sectionId === 'statistics') {
      StatsEngine.renderStatistics();
    }

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Mobile Drawer ---

  function setupMobileDrawer() {
    const toggleBtn = document.getElementById('mobile-drawer-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-backdrop');
    const closeBtn = document.getElementById('sidebar-close-btn');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('is-open');
        overlay.classList.toggle('is-open');
      });

      overlay.addEventListener('click', closeMobileDrawer);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeMobileDrawer);
    }
  }

  function closeMobileDrawer() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
  }

  // --- Global Keyboard Shortcuts ---

  function setupGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // ESC: Close open modals or drawers
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal-backdrop.is-open');
        if (openModal) {
          openModal.classList.remove('is-open');
          return;
        }
        closeMobileDrawer();
        return;
      }

      // If user is currently typing in an input, do not trigger single-key hotkeys
      if (isInput) return;

      // 'N': Quick New Task
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        TaskManager.openTaskCreateModal();
        return;
      }

      // '/': Focus Search
      if (e.key === '/') {
        e.preventDefault();
        navigateTo('tasks');
        setTimeout(() => {
          const search = document.getElementById('tasks-search-input');
          if (search) search.focus();
        }, 100);
        return;
      }
    });
  }

  // --- Dashboard Dynamic Content ---

  function renderDashboard() {
    updateGreeting();

    const tasks = TaskManager.getAllTasks();
    const todayStr = Utils.getTodayString();

    // 1. Today's Schedule Widget
    renderDashboardSchedule(tasks, todayStr);

    // 2. Upcoming Tasks Widget
    renderDashboardUpcoming(tasks, todayStr);

    // 3. Stats Engine updates dashboard cards and ring
    StatsEngine.renderStatistics();
  }

  function renderDashboardSchedule(tasks, todayStr) {
    const container = document.getElementById('dash-today-schedule');
    if (!container) return;

    const todayTasks = tasks.filter(t => t.dueDate === todayStr);

    if (todayTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem;">
          <div class="empty-state-icon">☕</div>
          <p class="empty-state-title" style="font-size: 0.95rem;">No tasks scheduled for today</p>
          <p class="empty-state-subtitle" style="font-size: 0.8rem;">Add tasks to organize your day.</p>
          <button class="btn btn-secondary btn-sm" data-action="quick-add-task" style="margin-top: 0.5rem;">+ Add Task</button>
        </div>
      `;
      const addBtn = container.querySelector('[data-action="quick-add-task"]');
      if (addBtn) addBtn.onclick = () => TaskManager.openTaskCreateModal(todayStr);
      return;
    }

    // Sort by due time
    todayTasks.sort((a, b) => (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59'));

    container.innerHTML = todayTasks.map(t => {
      const isCompleted = t.status === 'Completed';
      const formattedTime = t.dueTime ? Utils.formatTime(t.dueTime) : 'All Day';

      return `
        <div class="dash-schedule-item ${isCompleted ? 'is-completed' : ''}">
          <div class="schedule-time-badge">${formattedTime}</div>
          <div class="schedule-content">
            <span class="schedule-title ${isCompleted ? 'strikethrough' : ''}">${Utils.escapeHtml(t.title)}</span>
            <div class="schedule-meta">
              <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
              <span class="badge badge-category-${t.category.toLowerCase().replace(/\s+/g, '-')}">${Utils.escapeHtml(t.category)}</span>
            </div>
          </div>
          <label class="task-checkbox-container" title="${isCompleted ? 'Mark pending' : 'Mark complete'}">
            <input type="checkbox" class="dash-schedule-checkbox" data-id="${t.id}" ${isCompleted ? 'checked' : ''} />
            <span class="custom-checkbox"></span>
          </label>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.dash-schedule-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        TaskManager.toggleTaskStatus(id);
      });
    });
  }

  function renderDashboardUpcoming(tasks, todayStr) {
    const container = document.getElementById('dash-upcoming-tasks');
    if (!container) return;

    const upcomingTasks = tasks
      .filter(t => t.status === 'Pending' && Utils.isUpcoming(t.dueDate))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4);

    if (upcomingTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem;">
          <p class="empty-state-subtitle">No upcoming tasks scheduled.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = upcomingTasks.map(t => {
      const formattedDate = Utils.formatDate(t.dueDate, { relative: true });
      return `
        <div class="dash-upcoming-item" data-task-id="${t.id}">
          <div class="dash-upcoming-info">
            <span class="dash-upcoming-title">${Utils.escapeHtml(t.title)}</span>
            <span class="dash-upcoming-due">${formattedDate} ${t.dueTime ? `• ${Utils.formatTime(t.dueTime)}` : ''}</span>
          </div>
          <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.dash-upcoming-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-task-id');
        TaskManager.openTaskDetailModal(id);
      });
    });
  }

  return {
    init,
    navigateTo,
    updateGreeting,
    renderDashboard
  };
})();

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Attach to window
if (typeof window !== 'undefined') {
  window.App = App;
}
