/**
 * Pace Planner - Productivity Statistics (StatsEngine)
 * Computes completion metrics, focus hours, active streaks,
 * and renders pure SVG/CSS 7-day productivity trend & category breakdown charts.
 */

const StatsEngine = (() => {
  function init() {
    setupEventListeners();
    renderStatistics();
  }

  function setupEventListeners() {
    window.addEventListener('pace-planner:tasks-changed', () => {
      renderStatistics();
    });

    window.addEventListener('pace-planner:pomodoro-completed', () => {
      renderStatistics();
    });
  }

  function getMetrics() {
    const tasks = TaskManager.getAllTasks();
    const pomoSessions = StorageService.getPomodoroSessions();
    const todayStr = Utils.getTodayString();

    let completedToday = 0;
    let completedThisWeek = 0;
    let completedThisMonth = 0;
    let totalCompleted = 0;
    let totalPending = 0;
    let overdueCount = 0;

    const completedDates = [];

    tasks.forEach(t => {
      if (t.status === 'Completed') {
        totalCompleted++;
        const compDate = t.completedAt ? t.completedAt.substring(0, 10) : t.dueDate;
        if (compDate) {
          completedDates.push(compDate);
          if (compDate === todayStr) completedToday++;
          if (Utils.isThisWeek(compDate)) completedThisWeek++;
          if (Utils.isThisMonth(compDate)) completedThisMonth++;
        }
      } else {
        totalPending++;
        if (Utils.isOverdue(t.dueDate, t.dueTime)) {
          overdueCount++;
        }
      }
    });

    const totalTasks = totalCompleted + totalPending;
    const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    // Pomodoro stats
    const focusSessions = pomoSessions.filter(s => s.type === 'focus');
    const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.durationMinutes || 25), 0);
    const todayFocusSessions = focusSessions.filter(s => s.completedAt && s.completedAt.startsWith(todayStr));
    const todayFocusMinutes = todayFocusSessions.reduce((acc, s) => acc + (s.durationMinutes || 25), 0);

    // Productivity streak
    const streak = Utils.calculateStreak(completedDates);

    return {
      completedToday,
      completedThisWeek,
      completedThisMonth,
      totalCompleted,
      totalPending,
      overdueCount,
      completionRate,
      focusSessionsCount: focusSessions.length,
      totalFocusMinutes,
      todayFocusMinutes,
      todayFocusCount: todayFocusSessions.length,
      streak,
      totalTasks
    };
  }

  function getDailyTrendData(daysCount = 7) {
    const tasks = TaskManager.getAllTasks();
    const trend = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });

      // Count tasks completed on this date
      const count = tasks.filter(t => {
        if (t.status !== 'Completed') return false;
        const compDate = t.completedAt ? t.completedAt.substring(0, 10) : t.dueDate;
        return compDate === dateStr;
      }).length;

      trend.push({ dateStr, dayLabel, count });
    }

    return trend;
  }

  function getCategoryBreakdown() {
    const tasks = TaskManager.getAllTasks();
    const catMap = {};

    tasks.forEach(t => {
      const cat = t.category || 'Uncategorized';
      if (!catMap[cat]) {
        catMap[cat] = { total: 0, completed: 0 };
      }
      catMap[cat].total++;
      if (t.status === 'Completed') {
        catMap[cat].completed++;
      }
    });

    return catMap;
  }

  function getPriorityBreakdown() {
    const tasks = TaskManager.getAllTasks();
    const pMap = { Urgent: 0, High: 0, Medium: 0, Low: 0 };

    tasks.forEach(t => {
      if (pMap[t.priority] !== undefined) {
        pMap[t.priority]++;
      }
    });

    return pMap;
  }

  function renderStatistics() {
    const metrics = getMetrics();

    // 1. Metric Stat Cards
    setText('stat-completed-today', metrics.completedToday);
    setText('stat-completed-week', metrics.completedThisWeek);
    setText('stat-completed-month', metrics.completedThisMonth);
    setText('stat-completion-rate', `${metrics.completionRate}%`);
    setText('stat-focus-time', Utils.formatMinutes(metrics.totalFocusMinutes));
    setText('stat-pomodoro-count', metrics.focusSessionsCount);
    setText('stat-pending-tasks', metrics.totalPending);
    setText('stat-overdue-tasks', metrics.overdueCount);
    setText('stat-streak-days', `${metrics.streak} ${metrics.streak === 1 ? 'day' : 'days'}`);

    // Update Dashboard metric values
    setText('dash-stat-today-count', metrics.completedToday);
    setText('dash-stat-pending-count', metrics.totalPending);
    setText('dash-stat-completed-count', metrics.totalCompleted);
    setText('dash-stat-completion-rate', `${metrics.completionRate}%`);
    setText('dash-streak-badge', `${metrics.streak} Day Streak 🔥`);

    const dashRingCircle = document.getElementById('dash-completion-ring');
    if (dashRingCircle) {
      const circumference = 2 * Math.PI * 40; // r=40 -> 251.3
      const offset = circumference * (1 - metrics.completionRate / 100);
      dashRingCircle.style.strokeDasharray = `${circumference}`;
      dashRingCircle.style.strokeDashoffset = `${offset}`;
    }

    // 2. Render 7-Day Trend Chart
    renderTrendChart();

    // 3. Render Category Breakdown
    renderCategoryBreakdown();

    // 4. Render Priority Distribution
    renderPriorityDistribution();
  }

  function setText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
  }

  function renderTrendChart() {
    const chartContainer = document.getElementById('stats-trend-chart');
    if (!chartContainer) return;

    const trend = getDailyTrendData(7);
    const maxCount = Math.max(...trend.map(t => t.count), 4); // minimum 4 for nice scale

    chartContainer.innerHTML = `
      <div class="trend-chart-bars">
        ${trend.map(item => {
          const heightPercent = Math.max(Math.round((item.count / maxCount) * 100), 6);
          const isToday = item.dayLabel === 'Today';
          return `
            <div class="trend-bar-group ${isToday ? 'is-today' : ''}" title="${item.dayLabel} (${item.dateStr}): ${item.count} tasks completed">
              <span class="trend-bar-count">${item.count}</span>
              <div class="trend-bar-track">
                <div class="trend-bar-fill" style="height: ${heightPercent}%;"></div>
              </div>
              <span class="trend-bar-label">${item.dayLabel}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderCategoryBreakdown() {
    const container = document.getElementById('stats-category-breakdown');
    if (!container) return;

    const breakdown = getCategoryBreakdown();
    const categories = Object.keys(breakdown);

    if (categories.length === 0) {
      container.innerHTML = '<p class="text-muted">No categorized tasks yet.</p>';
      return;
    }

    container.innerHTML = categories.map(cat => {
      const { total, completed } = breakdown[cat];
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const catSlug = cat.toLowerCase().replace(/\s+/g, '-');

      return `
        <div class="category-stat-row">
          <div class="cat-stat-header">
            <span class="cat-stat-name">
              <span class="badge badge-category-${catSlug}">${Utils.escapeHtml(cat)}</span>
            </span>
            <span class="cat-stat-numbers">${completed}/${total} completed (${rate}%)</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill progress-cat-${catSlug}" style="width: ${rate}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderPriorityDistribution() {
    const container = document.getElementById('stats-priority-breakdown');
    if (!container) return;

    const pMap = getPriorityBreakdown();
    const total = Object.values(pMap).reduce((a, b) => a + b, 0);

    if (total === 0) {
      container.innerHTML = '<p class="text-muted">No priority data.</p>';
      return;
    }

    const priorities = [
      { key: 'Urgent', label: 'Urgent', colorClass: 'badge-priority-urgent' },
      { key: 'High', label: 'High', colorClass: 'badge-priority-high' },
      { key: 'Medium', label: 'Medium', colorClass: 'badge-priority-medium' },
      { key: 'Low', label: 'Low', colorClass: 'badge-priority-low' }
    ];

    container.innerHTML = `
      <div class="priority-stacked-bar">
        ${priorities.map(p => {
          const count = pMap[p.key] || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
          if (count === 0) return '';
          return `<div class="p-stack-segment segment-${p.key.toLowerCase()}" style="width: ${pct}%;" title="${p.label}: ${count} (${pct}%)"></div>`;
        }).join('')}
      </div>
      <div class="priority-legend">
        ${priorities.map(p => {
          const count = pMap[p.key] || 0;
          return `
            <div class="p-legend-item">
              <span class="p-legend-color color-${p.key.toLowerCase()}"></span>
              <span class="p-legend-text">${p.label}: <strong>${count}</strong></span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return {
    init,
    getMetrics,
    renderStatistics
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.StatsEngine = StatsEngine;
}
