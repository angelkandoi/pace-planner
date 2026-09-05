/**
 * Pace Planner - Utility Functions
 * Helper methods for ID generation, date handling, string sanitization, and time computations.
 */

const Utils = (() => {
  /**
   * Generates a unique identifier (UUID v4 format with crypto fallback)
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'pp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Escapes HTML entities to prevent Cross-Site Scripting (XSS)
   */
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Returns today's date formatted as YYYY-MM-DD in local time
   */
  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formats a date string (YYYY-MM-DD) into user-friendly representation
   */
  function formatDate(dateStr, options = {}) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      
      const todayStr = getTodayString();
      if (options.relative) {
        if (dateStr === todayStr) return 'Today';
        
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        const tmrwStr = `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`;
        if (dateStr === tmrwStr) return 'Tomorrow';

        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
        if (dateStr === yestStr) return 'Yesterday';
      }

      return date.toLocaleDateString(undefined, {
        month: options.month || 'short',
        day: options.day || 'numeric',
        year: options.showYear ? 'numeric' : (date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined),
        weekday: options.weekday
      });
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Formats a time string (HH:MM in 24h) to user-friendly 12h format
   */
  function formatTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour is 12 AM
    return `${hours}:${minutes} ${ampm}`;
  }

  /**
   * Checks if date string (YYYY-MM-DD) is today
   */
  function isToday(dateStr) {
    return dateStr === getTodayString();
  }

  /**
   * Checks if date string is in the future
   */
  function isUpcoming(dateStr) {
    if (!dateStr) return false;
    return dateStr > getTodayString();
  }

  /**
   * Checks if task date & optional time is in the past
   */
  function isOverdue(dateStr, timeStr) {
    if (!dateStr) return false;
    const today = getTodayString();
    if (dateStr < today) return true;
    if (dateStr === today && timeStr) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      return timeStr < currentTime;
    }
    return false;
  }

  /**
   * Checks if date string is within the current week (Sunday - Saturday)
   */
  function isThisWeek(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    
    // Start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // End of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return date >= startOfWeek && date <= endOfWeek;
  }

  /**
   * Checks if date string is within the current month
   */
  function isThisMonth(dateStr) {
    if (!dateStr) return false;
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return dateStr.startsWith(currentYearMonth);
  }

  /**
   * Formats duration in minutes into clean readable string
   */
  function formatMinutes(minutes) {
    if (!minutes || minutes <= 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  }

  /**
   * Debounce function execution
   */
  function debounce(fn, waitMs = 250) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), waitMs);
    };
  }

  /**
   * Calculates productivity streak based on an array of completed date strings (YYYY-MM-DD)
   */
  function calculateStreak(completedDates) {
    if (!completedDates || completedDates.length === 0) return 0;
    
    // Distinct sorted dates descending
    const uniqueDates = Array.from(new Set(completedDates)).sort().reverse();
    const today = getTodayString();
    
    // Yesterday
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterday = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    
    // If neither today nor yesterday has a completed task, streak is 0
    if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date(uniqueDates[0] === today ? today + 'T00:00:00' : yesterday + 'T00:00:00');

    while (true) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (uniqueDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculates greeting message based on current hour
   */
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'Good morning', icon: '🌅' };
    } else if (hour >= 12 && hour < 17) {
      return { text: 'Good afternoon', icon: '☀️' };
    } else if (hour >= 17 && hour < 22) {
      return { text: 'Good evening', icon: '🌆' };
    } else {
      return { text: 'Burning the midnight oil', icon: '🌙' };
    }
  }

  /**
   * Displays an accessible, modern in-app confirmation modal
   */
  function showConfirmDialog(options = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      confirmClass = 'btn-danger',
      cancelText = 'Cancel',
      onConfirm = null,
      onCancel = null
    } = options;

    const modal = document.getElementById('confirm-modal');
    if (!modal) {
      if (window.confirm(message)) {
        if (typeof onConfirm === 'function') onConfirm();
      } else {
        if (typeof onCancel === 'function') onCancel();
      }
      return;
    }

    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-action');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    if (confirmBtn) {
      confirmBtn.textContent = confirmText;
      confirmBtn.className = `btn ${confirmClass}`;
    }

    if (cancelBtn) {
      cancelBtn.textContent = cancelText;
    }

    function cleanup() {
      modal.classList.remove('is-open');
      if (confirmBtn) confirmBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
      document.removeEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
      if (e.key === 'Escape') {
        cleanup();
        if (typeof onCancel === 'function') onCancel();
      }
    }

    if (confirmBtn) {
      confirmBtn.onclick = () => {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        cleanup();
        if (typeof onCancel === 'function') onCancel();
      };
    }

    document.addEventListener('keydown', handleKeydown);
    modal.classList.add('is-open');

    // Focus cancel button by default for safety on destructive actions
    if (cancelBtn) cancelBtn.focus();
  }

  return {
    generateId,
    escapeHtml,
    getTodayString,
    formatDate,
    formatTime,
    isToday,
    isUpcoming,
    isOverdue,
    isThisWeek,
    isThisMonth,
    formatMinutes,
    debounce,
    calculateStreak,
    getGreeting,
    showConfirmDialog
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}
