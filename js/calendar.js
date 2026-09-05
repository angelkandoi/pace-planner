/**
 * Pace Planner - Calendar & Planner Manager (CalendarManager)
 * Monthly interactive planner, date selection, task-density badges,
 * day agenda panel, and direct date-based task creation.
 */

const CalendarManager = (() => {
  let currentDate = new Date();
  let selectedDateStr = Utils.getTodayString();

  function init() {
    setupEventListeners();
    renderCalendar();
  }

  function setupEventListeners() {
    const prevBtn = document.getElementById('cal-prev-btn');
    const nextBtn = document.getElementById('cal-next-btn');
    const todayBtn = document.getElementById('cal-today-btn');
    const addDateTaskBtn = document.getElementById('cal-add-task-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        selectedDateStr = Utils.getTodayString();
        renderCalendar();
      });
    }

    if (addDateTaskBtn) {
      addDateTaskBtn.addEventListener('click', () => {
        TaskManager.openTaskCreateModal(selectedDateStr);
      });
    }

    // Refresh when tasks are updated
    window.addEventListener('pace-planner:tasks-changed', () => {
      renderCalendar();
    });
  }

  function getTasksByDateMap() {
    const tasks = TaskManager.getAllTasks();
    const map = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    return map;
  }

  function renderCalendar() {
    const monthYearTitle = document.getElementById('cal-month-year');
    const gridContainer = document.getElementById('cal-days-grid');
    if (!gridContainer || !monthYearTitle) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    monthYearTitle.textContent = `${monthNames[month]} ${year}`;

    // Compute grid days
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const lastDate = new Date(year, month + 1, 0).getDate(); // last day of current month
    const prevLastDate = new Date(year, month, 0).getDate(); // last day of previous month

    const taskMap = getTasksByDateMap();
    const todayStr = Utils.getTodayString();

    let daysHtml = '';

    // Previous month filler days
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDate = prevLastDate - x + 1;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDate).padStart(2, '0')}`;
      const dayTasks = taskMap[dateStr] || [];

      daysHtml += renderDayCell(prevDate, dateStr, dayTasks, { isOtherMonth: true });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = taskMap[dateStr] || [];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDateStr;

      daysHtml += renderDayCell(i, dateStr, dayTasks, { isToday, isSelected });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const totalRendered = firstDayIndex + lastDate;
    const nextDays = totalRendered <= 35 ? 35 - totalRendered : (42 - totalRendered);
    for (let j = 1; j <= nextDays; j++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      const dayTasks = taskMap[dateStr] || [];

      daysHtml += renderDayCell(j, dateStr, dayTasks, { isOtherMonth: true });
    }

    gridContainer.innerHTML = daysHtml;

    // Attach click events on day cells
    gridContainer.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const targetDate = cell.getAttribute('data-date');
        selectDate(targetDate);
      });
    });

    renderDayAgenda();
  }

  function renderDayCell(dayNum, dateStr, tasks, flags = {}) {
    const { isOtherMonth, isToday, isSelected } = flags;
    const count = tasks.length;
    const completedCount = tasks.filter(t => t.status === 'Completed').length;
    const hasUrgent = tasks.some(t => t.priority === 'Urgent' && t.status !== 'Completed');
    const hasHigh = tasks.some(t => t.priority === 'High' && t.status !== 'Completed');

    let dotClass = '';
    if (hasUrgent) dotClass = 'dot-urgent';
    else if (hasHigh) dotClass = 'dot-high';
    else if (count > 0) dotClass = 'dot-regular';

    return `
      <div class="cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-date="${dateStr}" role="button" tabindex="0">
        <div class="cal-day-num">${dayNum}</div>
        ${count > 0 ? `
          <div class="cal-day-indicators">
            <span class="cal-day-dot ${dotClass}"></span>
            <span class="cal-day-badge">${completedCount}/${count}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  function selectDate(dateStr) {
    selectedDateStr = dateStr;
    renderCalendar();
  }

  function renderDayAgenda() {
    const agendaDateTitle = document.getElementById('cal-agenda-date');
    const agendaList = document.getElementById('cal-agenda-list');
    const agendaBadge = document.getElementById('cal-agenda-count');
    if (!agendaList || !agendaDateTitle) return;

    agendaDateTitle.textContent = Utils.formatDate(selectedDateStr, { showYear: true, weekday: 'long' });

    const taskMap = getTasksByDateMap();
    const tasks = taskMap[selectedDateStr] || [];

    if (agendaBadge) {
      agendaBadge.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
    }

    if (tasks.length === 0) {
      agendaList.innerHTML = `
        <div class="empty-state agenda-empty">
          <div class="empty-state-icon">📅</div>
          <p class="empty-state-title" style="font-size: 0.95rem;">No tasks on this date</p>
          <p class="empty-state-subtitle" style="font-size: 0.8rem;">Click below to schedule an activity.</p>
        </div>
      `;
      return;
    }

    agendaList.innerHTML = tasks.map(t => {
      const isCompleted = t.status === 'Completed';
      const isOverdue = !isCompleted && Utils.isOverdue(t.dueDate, t.dueTime);

      return `
        <div class="agenda-item ${isCompleted ? 'is-completed' : ''}" data-task-id="${t.id}">
          <label class="task-checkbox-container">
            <input type="checkbox" class="agenda-task-checkbox" data-id="${t.id}" ${isCompleted ? 'checked' : ''} />
            <span class="custom-checkbox"></span>
          </label>
          <div class="agenda-item-content">
            <span class="agenda-item-title ${isCompleted ? 'strikethrough' : ''}">${Utils.escapeHtml(t.title)}</span>
            <div class="agenda-item-meta">
              <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
              <span class="badge badge-category-${t.category.toLowerCase().replace(/\s+/g, '-')}">${Utils.escapeHtml(t.category)}</span>
              ${t.dueTime ? `<span class="agenda-time">${Utils.formatTime(t.dueTime)}</span>` : ''}
              ${isOverdue ? `<span class="badge badge-danger">Overdue</span>` : ''}
            </div>
          </div>
          <button class="btn-icon btn-ghost btn-sm" data-action="view-task" data-id="${t.id}" title="View details">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      `;
    }).join('');

    // Bind checkboxes and view buttons
    agendaList.querySelectorAll('.agenda-task-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        TaskManager.toggleTaskStatus(id);
      });
    });

    agendaList.querySelectorAll('[data-action="view-task"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        TaskManager.openTaskDetailModal(id);
      });
    });
  }

  return {
    init,
    renderCalendar,
    selectDate,
    getSelectedDate: () => selectedDateStr
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.CalendarManager = CalendarManager;
}
