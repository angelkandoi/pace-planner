/**
 * Pace Planner - Task Manager (TaskManager)
 * Full CRUD, views (All, Today, Upcoming, Overdue, Completed, Pending),
 * multi-criteria filters, multi-field sorting, and instant debounced search.
 */

const TaskManager = (() => {
  const PRIORITY_ORDER = {
    'Urgent': 4,
    'High': 3,
    'Medium': 2,
    'Low': 1
  };

  let state = {
    view: 'all',          // 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'pending'
    filterPriority: 'all',
    filterCategory: 'all',
    filterStatus: 'all',
    sortBy: 'dueDate',    // 'dueDate' | 'priority' | 'createdAt' | 'title'
    sortOrder: 'asc',     // 'asc' | 'desc'
    searchQuery: '',
    selectedTaskId: null
  };

  /**
   * Initializes TaskManager event listeners
   */
  function init() {
    setupEventListeners();
  }

  // --- CRUD Operations ---

  function getAllTasks() {
    return StorageService.getTasks();
  }

  function getTaskById(id) {
    const tasks = getAllTasks();
    return tasks.find(t => t.id === id) || null;
  }

  function createTask(taskData) {
    const tasks = getAllTasks();
    const now = new Date().toISOString();

    const newTask = {
      id: Utils.generateId(),
      title: (taskData.title || '').trim(),
      description: (taskData.description || '').trim(),
      priority: taskData.priority || 'Medium',
      category: taskData.category || 'Work',
      tags: Array.isArray(taskData.tags) ? taskData.tags : parseTags(taskData.tags),
      dueDate: taskData.dueDate || Utils.getTodayString(),
      dueTime: taskData.dueTime || '',
      status: taskData.status || 'Pending',
      createdAt: now,
      updatedAt: now,
      completedAt: taskData.status === 'Completed' ? now : null
    };

    if (!newTask.title) {
      throw new Error('Task title cannot be empty.');
    }

    tasks.unshift(newTask);
    StorageService.saveTasks(tasks);
    notifyChange('Task created successfully');
    return newTask;
  }

  function updateTask(id, updates) {
    const tasks = getAllTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Task not found');
    }

    const current = tasks[index];
    const updated = {
      ...current,
      ...updates,
      tags: Array.isArray(updates.tags) ? updates.tags : (updates.tags ? parseTags(updates.tags) : current.tags),
      updatedAt: new Date().toISOString()
    };

    // Update completedAt timestamp if status changed
    if (updates.status && updates.status !== current.status) {
      updated.completedAt = updates.status === 'Completed' ? new Date().toISOString() : null;
    }

    tasks[index] = updated;
    StorageService.saveTasks(tasks);
    notifyChange('Task updated successfully');
    return updated;
  }

  function deleteTask(id) {
    const tasks = getAllTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    const filtered = tasks.filter(t => t.id !== id);
    StorageService.saveTasks(filtered);
    notifyChange(`Task "${task.title.substring(0, 24)}..." deleted`);
    return true;
  }

  function toggleTaskStatus(id) {
    const task = getTaskById(id);
    if (!task) return null;

    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updated = updateTask(id, { status: newStatus });

    if (newStatus === 'Completed') {
      NotificationService.playSound('complete');
      NotificationService.showToast(`Completed: "${task.title}"`, 'success', 2500);
    } else {
      NotificationService.playSound('task-check');
      NotificationService.showToast(`Marked pending: "${task.title}"`, 'info', 2000);
    }

    return updated;
  }

  function parseTags(tagInput) {
    if (!tagInput) return [];
    if (Array.isArray(tagInput)) return tagInput;
    return tagInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);
  }

  function notifyChange(message = null) {
    window.dispatchEvent(new CustomEvent('pace-planner:tasks-changed', {
      detail: { tasks: getAllTasks(), message }
    }));
  }

  // --- Filtering, Sorting & Search ---

  function getCounts() {
    const tasks = getAllTasks();
    const today = Utils.getTodayString();

    let all = tasks.length;
    let todayCount = 0;
    let upcomingCount = 0;
    let overdueCount = 0;
    let completedCount = 0;
    let pendingCount = 0;

    tasks.forEach(t => {
      if (t.status === 'Completed') {
        completedCount++;
      } else {
        pendingCount++;
        if (Utils.isOverdue(t.dueDate, t.dueTime)) {
          overdueCount++;
        }
      }

      if (t.dueDate === today) {
        todayCount++;
      } else if (Utils.isUpcoming(t.dueDate)) {
        upcomingCount++;
      }
    });

    return {
      all,
      today: todayCount,
      upcoming: upcomingCount,
      overdue: overdueCount,
      completed: completedCount,
      pending: pendingCount,
      completionRate: all > 0 ? Math.round((completedCount / all) * 100) : 0
    };
  }

  function getFilteredTasks() {
    let tasks = getAllTasks();
    const today = Utils.getTodayString();

    // 1. View filter
    switch (state.view) {
      case 'today':
        tasks = tasks.filter(t => t.dueDate === today);
        break;
      case 'upcoming':
        tasks = tasks.filter(t => Utils.isUpcoming(t.dueDate));
        break;
      case 'overdue':
        tasks = tasks.filter(t => t.status === 'Pending' && Utils.isOverdue(t.dueDate, t.dueTime));
        break;
      case 'completed':
        tasks = tasks.filter(t => t.status === 'Completed');
        break;
      case 'pending':
        tasks = tasks.filter(t => t.status === 'Pending');
        break;
      case 'all':
      default:
        // No view filter
        break;
    }

    // 2. Priority filter
    if (state.filterPriority && state.filterPriority !== 'all') {
      tasks = tasks.filter(t => t.priority === state.filterPriority);
    }

    // 3. Category filter
    if (state.filterCategory && state.filterCategory !== 'all') {
      tasks = tasks.filter(t => t.category === state.filterCategory);
    }

    // 4. Status filter
    if (state.filterStatus && state.filterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === state.filterStatus);
    }

    // 5. Search query (title, description, category, tags)
    if (state.searchQuery && state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      tasks = tasks.filter(t => {
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchTags = (t.tags || []).some(tag => tag.toLowerCase().includes(q));
        return matchTitle || matchDesc || matchCat || matchTags;
      });
    }

    // 6. Sorting
    tasks.sort((a, b) => {
      let comparison = 0;
      if (state.sortBy === 'dueDate') {
        const aDue = (a.dueDate || '9999-99-99') + (a.dueTime || '23:59');
        const bDue = (b.dueDate || '9999-99-99') + (b.dueTime || '23:59');
        comparison = aDue.localeCompare(bDue);
      } else if (state.sortBy === 'priority') {
        const aP = PRIORITY_ORDER[a.priority] || 0;
        const bP = PRIORITY_ORDER[b.priority] || 0;
        comparison = bP - aP; // Default highest priority first
      } else if (state.sortBy === 'createdAt') {
        comparison = (b.createdAt || '').localeCompare(a.createdAt || '');
      } else if (state.sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      }

      return state.sortOrder === 'desc' ? -comparison : comparison;
    });

    return tasks;
  }

  // --- Rendering UI ---

  function renderTasksView() {
    const listEl = document.getElementById('tasks-list-container');
    if (!listEl) return;

    const filtered = getFilteredTasks();
    updateViewTabsBadge();
    updateFilterOptions();

    if (filtered.length === 0) {
      listEl.innerHTML = renderEmptyState();
      return;
    }

    listEl.innerHTML = filtered.map(t => renderTaskCard(t)).join('');
    bindTaskCardEvents(listEl);
  }

  function renderTaskCard(t) {
    const isCompleted = t.status === 'Completed';
    const isOverdue = !isCompleted && Utils.isOverdue(t.dueDate, t.dueTime);
    const formattedDate = Utils.formatDate(t.dueDate, { relative: true });
    const formattedTime = t.dueTime ? Utils.formatTime(t.dueTime) : '';

    const priorityBadgeClass = `badge-priority-${t.priority.toLowerCase()}`;
    const categoryBadgeClass = `badge-category-${t.category.toLowerCase().replace(/\s+/g, '-')}`;

    const tagsHtml = (t.tags || [])
      .map(tag => `<span class="task-tag">#${Utils.escapeHtml(tag)}</span>`)
      .join('');

    return `
      <div class="task-card ${isCompleted ? 'is-completed' : ''} ${isOverdue ? 'is-overdue' : ''}" data-task-id="${t.id}">
        <div class="task-card-header">
          <label class="task-checkbox-container" title="${isCompleted ? 'Mark pending' : 'Mark completed'}">
            <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${isCompleted ? 'checked' : ''} />
            <span class="custom-checkbox"></span>
          </label>
          <div class="task-title-group" data-action="view" data-id="${t.id}">
            <h4 class="task-title ${isCompleted ? 'strikethrough' : ''}">${Utils.escapeHtml(t.title)}</h4>
            ${t.description ? `<p class="task-desc-preview">${Utils.escapeHtml(t.description)}</p>` : ''}
          </div>
          <div class="task-actions">
            <button class="btn-icon btn-ghost" data-action="edit" data-id="${t.id}" title="Edit task">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-ghost btn-danger" data-action="delete" data-id="${t.id}" title="Delete task">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>

        <div class="task-card-meta">
          <div class="task-meta-left">
            <span class="badge ${priorityBadgeClass}">${t.priority}</span>
            <span class="badge ${categoryBadgeClass}">${Utils.escapeHtml(t.category)}</span>
            ${tagsHtml}
          </div>
          <div class="task-meta-right">
            ${isOverdue ? `<span class="badge badge-danger">Overdue</span>` : ''}
            <span class="task-due-info" title="${t.dueDate} ${t.dueTime}">
              <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${formattedDate} ${formattedTime ? `at ${formattedTime}` : ''}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function renderEmptyState() {
    let message = 'No tasks found.';
    let submessage = 'Create your first task or change active filters.';

    if (state.searchQuery) {
      message = `No tasks matching "${Utils.escapeHtml(state.searchQuery)}"`;
      submessage = 'Try searching for different keywords or clear filters.';
    } else if (state.view === 'today') {
      message = "You're all clear for today!";
      submessage = 'Great job staying on top of your schedule.';
    } else if (state.view === 'overdue') {
      message = 'No overdue tasks!';
      submessage = 'You are right on pace with your deadlines.';
    } else if (state.view === 'completed') {
      message = 'No completed tasks yet in this view.';
      submessage = 'Mark tasks done to celebrate your productivity.';
    }

    return `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">${message}</h3>
        <p class="empty-state-subtitle">${submessage}</p>
        <button class="btn btn-primary btn-sm" id="empty-state-add-btn">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add New Task
        </button>
      </div>
    `;
  }

  function bindTaskCardEvents(container) {
    // Checkboxes
    container.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        toggleTaskStatus(id);
      });
    });

    // Action buttons
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        if (action === 'view') {
          openTaskDetailModal(id);
        } else if (action === 'edit') {
          openTaskEditModal(id);
        } else if (action === 'delete') {
          confirmDeleteTask(id);
        }
      });
    });

    // Empty state button
    const emptyBtn = container.querySelector('#empty-state-add-btn');
    if (emptyBtn) {
      emptyBtn.addEventListener('click', () => openTaskCreateModal());
    }
  }

  function updateViewTabsBadge() {
    const counts = getCounts();
    const mapping = {
      'view-all': counts.all,
      'view-today': counts.today,
      'view-upcoming': counts.upcoming,
      'view-overdue': counts.overdue,
      'view-completed': counts.completed,
      'view-pending': counts.pending
    };

    Object.entries(mapping).forEach(([id, count]) => {
      const badge = document.querySelector(`[data-tab-target="${id}"] .tab-count`);
      if (badge) {
        badge.textContent = count;
        if (id === 'view-overdue' && count > 0) {
          badge.classList.add('badge-danger-glow');
        } else {
          badge.classList.remove('badge-danger-glow');
        }
      }
    });
  }

  function updateFilterOptions() {
    // Extract unique categories across all tasks
    const tasks = getAllTasks();
    const categories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean))).sort();
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      const current = catSelect.value;
      let opts = '<option value="all">All Categories</option>';
      categories.forEach(c => {
        opts += `<option value="${Utils.escapeHtml(c)}" ${current === c ? 'selected' : ''}>${Utils.escapeHtml(c)}</option>`;
      });
      catSelect.innerHTML = opts;
    }
  }

  // --- Modals & User Interactions ---

  function openTaskCreateModal(defaultDate = null) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    document.getElementById('task-modal-title').textContent = 'Create New Task';
    document.getElementById('task-id-input').value = '';
    const titleInput = document.getElementById('task-title-input');
    titleInput.value = '';
    titleInput.style.borderColor = '';
    document.getElementById('task-desc-input').value = '';
    
    const settings = StorageService.getSettings();
    document.getElementById('task-priority-input').value = settings.defaultPriority || 'Medium';
    document.getElementById('task-category-input').value = settings.defaultCategory || 'Work';
    document.getElementById('task-tags-input').value = '';
    document.getElementById('task-date-input').value = defaultDate || Utils.getTodayString();
    document.getElementById('task-time-input').value = '';
    document.getElementById('task-status-input').value = 'Pending';

    modal.classList.add('is-open');
    setTimeout(() => {
      document.getElementById('task-title-input').focus();
    }, 100);
  }

  function openTaskEditModal(id) {
    const task = getTaskById(id);
    if (!task) return;

    const modal = document.getElementById('task-modal');
    if (!modal) return;

    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-id-input').value = task.id;
    const titleInput = document.getElementById('task-title-input');
    titleInput.value = task.title;
    titleInput.style.borderColor = '';
    document.getElementById('task-desc-input').value = task.description || '';
    document.getElementById('task-priority-input').value = task.priority;
    document.getElementById('task-category-input').value = task.category;
    document.getElementById('task-tags-input').value = (task.tags || []).join(', ');
    document.getElementById('task-date-input').value = task.dueDate || Utils.getTodayString();
    document.getElementById('task-time-input').value = task.dueTime || '';
    document.getElementById('task-status-input').value = task.status || 'Pending';

    modal.classList.add('is-open');
    setTimeout(() => {
      document.getElementById('task-title-input').focus();
    }, 100);
  }

  function openTaskDetailModal(id) {
    const task = getTaskById(id);
    if (!task) return;

    const modal = document.getElementById('task-detail-modal');
    if (!modal) return;

    const content = document.getElementById('task-detail-content');
    const isCompleted = task.status === 'Completed';
    const isOverdue = !isCompleted && Utils.isOverdue(task.dueDate, task.dueTime);

    content.innerHTML = `
      <div class="task-detail-view">
        <div class="task-detail-header">
          <div class="task-detail-badges">
            <span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority} Priority</span>
            <span class="badge badge-category-${task.category.toLowerCase().replace(/\s+/g, '-')}">${Utils.escapeHtml(task.category)}</span>
            <span class="badge ${isCompleted ? 'badge-success' : (isOverdue ? 'badge-danger' : 'badge-neutral')}">${task.status}${isOverdue ? ' (Overdue)' : ''}</span>
          </div>
          <h2 class="task-detail-title ${isCompleted ? 'strikethrough' : ''}">${Utils.escapeHtml(task.title)}</h2>
        </div>

        ${task.description ? `
          <div class="task-detail-section">
            <label class="form-label">Description</label>
            <div class="task-detail-desc">${Utils.escapeHtml(task.description).replace(/\n/g, '<br/>')}</div>
          </div>
        ` : ''}

        <div class="task-detail-grid">
          <div class="task-detail-item">
            <span class="detail-label">Due Date</span>
            <span class="detail-value">${Utils.formatDate(task.dueDate, { showYear: true })} ${task.dueTime ? `at ${Utils.formatTime(task.dueTime)}` : ''}</span>
          </div>
          <div class="task-detail-item">
            <span class="detail-label">Tags</span>
            <div class="detail-value tags-row">
              ${(task.tags && task.tags.length > 0) ? task.tags.map(t => `<span class="task-tag">#${Utils.escapeHtml(t)}</span>`).join(' ') : '<em>None</em>'}
            </div>
          </div>
          <div class="task-detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">${new Date(task.createdAt).toLocaleString()}</span>
          </div>
          <div class="task-detail-item">
            <span class="detail-label">${isCompleted ? 'Completed At' : 'Last Updated'}</span>
            <span class="detail-value">${task.completedAt ? new Date(task.completedAt).toLocaleString() : new Date(task.updatedAt).toLocaleString()}</span>
          </div>
        </div>

        <div class="modal-footer" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <button class="btn btn-secondary" id="detail-toggle-status-btn">
            ${isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
          </button>
          <button class="btn btn-secondary" id="detail-edit-btn">Edit Task</button>
          <button class="btn btn-danger" id="detail-delete-btn">Delete Task</button>
          <button class="btn btn-ghost" id="detail-close-btn" style="margin-left:auto;">Close</button>
        </div>
      </div>
    `;

    modal.classList.add('is-open');

    // Attach listeners
    document.getElementById('detail-toggle-status-btn').onclick = () => {
      toggleTaskStatus(id);
      openTaskDetailModal(id); // re-render detail
    };
    document.getElementById('detail-edit-btn').onclick = () => {
      modal.classList.remove('is-open');
      openTaskEditModal(id);
    };
    document.getElementById('detail-delete-btn').onclick = () => {
      modal.classList.remove('is-open');
      confirmDeleteTask(id);
    };
    document.getElementById('detail-close-btn').onclick = () => {
      modal.classList.remove('is-open');
    };
  }

  function confirmDeleteTask(id) {
    const task = getTaskById(id);
    if (!task) return;

    Utils.showConfirmDialog({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete "${task.title}"? This action cannot be undone.`,
      confirmText: 'Delete Task',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        deleteTask(id);
        NotificationService.showToast('Task removed', 'info');
      }
    });
  }

  function setupEventListeners() {
    // Tab switching (All, Today, Upcoming, Overdue, Completed, Pending)
    document.querySelectorAll('.tab-btn[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn[data-tab-target]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.getAttribute('data-tab-target').replace('view-', '');
        state.view = target;
        renderTasksView();
      });
    });

    // Search input (debounced)
    const searchInput = document.getElementById('tasks-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        state.searchQuery = e.target.value;
        renderTasksView();
      }, 200));

      const clearSearchBtn = document.getElementById('tasks-clear-search');
      if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          state.searchQuery = '';
          renderTasksView();
          searchInput.focus();
        });
      }
    }

    // Filters
    const prioritySelect = document.getElementById('filter-priority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        state.filterPriority = e.target.value;
        renderTasksView();
      });
    }

    const categorySelect = document.getElementById('filter-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        state.filterCategory = e.target.value;
        renderTasksView();
      });
    }

    const statusSelect = document.getElementById('filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        state.filterStatus = e.target.value;
        renderTasksView();
      });
    }

    // Sorting
    const sortSelect = document.getElementById('sort-by-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTasksView();
      });
    }

    const sortOrderBtn = document.getElementById('sort-order-btn');
    if (sortOrderBtn) {
      sortOrderBtn.addEventListener('click', () => {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        sortOrderBtn.setAttribute('title', `Order: ${state.sortOrder.toUpperCase()}`);
        sortOrderBtn.innerHTML = state.sortOrder === 'asc' ? '↑' : '↓';
        renderTasksView();
      });
    }

    // Modal Form Submit
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('task-id-input').value;
        const titleInput = document.getElementById('task-title-input');
        const titleVal = (titleInput.value || '').trim();

        if (!titleVal) {
          titleInput.focus();
          titleInput.style.borderColor = 'var(--danger)';
          NotificationService.showToast('Please enter a task title.', 'warning');
          return;
        }
        titleInput.style.borderColor = '';

        const taskData = {
          title: titleVal,
          description: document.getElementById('task-desc-input').value,
          priority: document.getElementById('task-priority-input').value,
          category: document.getElementById('task-category-input').value,
          tags: document.getElementById('task-tags-input').value,
          dueDate: document.getElementById('task-date-input').value,
          dueTime: document.getElementById('task-time-input').value,
          status: document.getElementById('task-status-input').value
        };

        try {
          if (id) {
            updateTask(id, taskData);
            NotificationService.showToast('Task updated', 'success');
          } else {
            createTask(taskData);
            NotificationService.showToast('Task created', 'success');
          }
          document.getElementById('task-modal').classList.remove('is-open');
        } catch (err) {
          NotificationService.showToast(err.message || 'Error saving task', 'error');
        }
      });
    }

    // Close modal triggers
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => {
        const modal = el.closest('.modal-backdrop');
        if (modal) modal.classList.remove('is-open');
      });
    });

    // Listen to external task changes
    window.addEventListener('pace-planner:tasks-changed', () => {
      renderTasksView();
    });
  }

  return {
    init,
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    getCounts,
    getFilteredTasks,
    renderTasksView,
    openTaskCreateModal,
    openTaskEditModal,
    openTaskDetailModal,
    getState: () => ({ ...state }),
    setState: (updates) => { Object.assign(state, updates); renderTasksView(); }
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.TaskManager = TaskManager;
}
