/**
 * Pace Planner - Public Holidays Integration (HolidaysService)
 * Integrates Nager.Date REST API with country/year selector, local caching,
 * robust error/loading/empty states, retry button, and curated Indian national calendar fallback.
 */

const HolidaysService = (() => {
  const API_BASE = 'https://date.nager.at/api/v3';
  const CACHE_PREFIX = 'pace_planner_holiday_cache_';
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const SUPPORTED_COUNTRIES = [
    { code: 'IN', name: 'India (Default)' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'SG', name: 'Singapore' },
    { code: 'JP', name: 'Japan' }
  ];

  // High-fidelity curated Indian National / Gazetted Holidays for 2025 & 2026
  const CURATED_INDIAN_HOLIDAYS = {
    2025: [
      { date: '2025-01-26', name: 'Republic Day', localName: 'गणतंत्र दिवस', types: ['Gazetted', 'National'] },
      { date: '2025-03-14', name: 'Holi', localName: 'होली', types: ['Gazetted', 'Cultural'] },
      { date: '2025-03-31', name: 'Eid-ul-Fitr', localName: 'ईद-उल-फ़ित्र', types: ['Gazetted', 'Religious'] },
      { date: '2025-04-18', name: 'Good Friday', localName: 'गुड फ्राइडे', types: ['Gazetted', 'Religious'] },
      { date: '2025-05-12', name: 'Buddha Purnima', localName: 'बुद्ध पूर्णिमा', types: ['Gazetted', 'Religious'] },
      { date: '2025-06-07', name: 'Bakrid / Eid al-Adha', localName: 'बकरीद', types: ['Gazetted', 'Religious'] },
      { date: '2025-07-06', name: 'Muharram', localName: 'मोहर्रम', types: ['Gazetted', 'Religious'] },
      { date: '2025-08-15', name: 'Independence Day', localName: 'स्वतंत्रता दिवस', types: ['Gazetted', 'National'] },
      { date: '2025-09-05', name: 'Milad-un-Nabi', localName: 'ईद-ए-मिलाद', types: ['Gazetted', 'Religious'] },
      { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti', localName: 'गांधी जयंती', types: ['Gazetted', 'National'] },
      { date: '2025-10-02', name: 'Dussehra / Vijaya Dashami', localName: 'दशहरा', types: ['Gazetted', 'Cultural'] },
      { date: '2025-10-20', name: 'Diwali / Deepavali', localName: 'दीपावली', types: ['Gazetted', 'Festival'] },
      { date: '2025-11-05', name: 'Guru Nanak Jayanti', localName: 'गुरु नानक जयंती', types: ['Gazetted', 'Religious'] },
      { date: '2025-12-25', name: 'Christmas', localName: 'क्रिसमस', types: ['Gazetted', 'Religious'] }
    ],
    2026: [
      { date: '2026-01-26', name: 'Republic Day', localName: 'गणतंत्र दिवस', types: ['Gazetted', 'National'] },
      { date: '2026-03-04', name: 'Holi', localName: 'होली', types: ['Gazetted', 'Cultural'] },
      { date: '2026-03-20', name: 'Eid-ul-Fitr', localName: 'ईद-उल-फ़ित्र', types: ['Gazetted', 'Religious'] },
      { date: '2026-04-03', name: 'Good Friday', localName: 'गुड फ्राइडे', types: ['Gazetted', 'Religious'] },
      { date: '2026-05-01', name: 'Buddha Purnima', localName: 'बुद्ध पूर्णिमा', types: ['Gazetted', 'Religious'] },
      { date: '2026-05-27', name: 'Bakrid / Eid al-Adha', localName: 'बकरीद', types: ['Gazetted', 'Religious'] },
      { date: '2026-08-15', name: 'Independence Day', localName: 'स्वतंत्रता दिवस', types: ['Gazetted', 'National'] },
      { date: '2026-08-25', name: 'Milad-un-Nabi', localName: 'ईद-ए-मिलाद', types: ['Gazetted', 'Religious'] },
      { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', localName: 'गांधी जयंती', types: ['Gazetted', 'National'] },
      { date: '2026-10-20', name: 'Dussehra / Vijaya Dashami', localName: 'दशहरा', types: ['Gazetted', 'Cultural'] },
      { date: '2026-11-08', name: 'Diwali / Deepavali', localName: 'दीपावली', types: ['Gazetted', 'Festival'] },
      { date: '2026-11-24', name: 'Guru Nanak Jayanti', localName: 'गुरु नानक जयंती', types: ['Gazetted', 'Religious'] },
      { date: '2026-12-25', name: 'Christmas', localName: 'क्रिसमस', types: ['Gazetted', 'Religious'] }
    ]
  };

  let state = {
    country: 'IN',
    year: new Date().getFullYear(),
    holidays: [],
    isLoading: false,
    error: null,
    isFallback: false
  };

  function init() {
    const settings = StorageService.getSettings();
    state.country = settings.holidayCountry || 'IN';
    state.year = new Date().getFullYear();

    populateCountryDropdown();
    setupEventListeners();
    fetchHolidays();
  }

  function populateCountryDropdown() {
    const countrySelect = document.getElementById('holiday-country-select');
    if (!countrySelect) return;

    countrySelect.innerHTML = SUPPORTED_COUNTRIES.map(c =>
      `<option value="${c.code}" ${c.code === state.country ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    const yearSelect = document.getElementById('holiday-year-select');
    if (yearSelect) {
      const curYear = new Date().getFullYear();
      yearSelect.innerHTML = `
        <option value="${curYear}" ${state.year === curYear ? 'selected' : ''}>${curYear}</option>
        <option value="${curYear + 1}" ${state.year === curYear + 1 ? 'selected' : ''}>${curYear + 1}</option>
      `;
    }
  }

  function setupEventListeners() {
    const countrySelect = document.getElementById('holiday-country-select');
    const yearSelect = document.getElementById('holiday-year-select');
    const retryBtn = document.getElementById('holiday-retry-btn');

    if (countrySelect) {
      countrySelect.addEventListener('change', (e) => {
        state.country = e.target.value;
        const settings = StorageService.getSettings();
        settings.holidayCountry = state.country;
        StorageService.saveSettings(settings);
        fetchHolidays();
      });
    }

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        state.year = parseInt(e.target.value, 10);
        fetchHolidays();
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        fetchHolidays(true);
      });
    }
  }

  /**
   * Fetches public holidays for selected country and year
   */
  async function fetchHolidays(forceRefresh = false) {
    state.isLoading = true;
    state.error = null;
    state.isFallback = false;
    renderUI();

    const cacheKey = `${CACHE_PREFIX}${state.country}_${state.year}`;

    // Check LocalStorage cache
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { timestamp, data, isFallback } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data)) {
            state.holidays = data;
            state.isFallback = !!isFallback;
            state.isLoading = false;
            renderUI();
            updateDashboardHolidays();
            return;
          }
        }
      } catch (e) {
        console.warn('[HolidaysService] Cache read error:', e);
      }
    }

    // Attempt live API request
    try {
      const url = `${API_BASE}/PublicHolidays/${state.year}/${state.country}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.status === 204 || response.status === 404) {
        // Nager.Date returns 204 No Content for countries without dataset (e.g. IN)
        handleFallbackOrEmpty(cacheKey);
        return;
      }

      if (!response.ok) {
        throw new Error(`API returned HTTP status ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        handleFallbackOrEmpty(cacheKey);
        return;
      }

      state.holidays = data;
      state.isFallback = false;
      state.isLoading = false;

      // Save to cache
      saveToCache(cacheKey, data, false);
      renderUI();
      updateDashboardHolidays();
    } catch (err) {
      console.warn('[HolidaysService] Network/API issue:', err);
      // If network fails, try fallback for India or stored fallback
      handleFallbackOrError(err.message, cacheKey);
    }
  }

  function handleFallbackOrEmpty(cacheKey) {
    if (state.country === 'IN') {
      const curated = CURATED_INDIAN_HOLIDAYS[state.year] || CURATED_INDIAN_HOLIDAYS[2025];
      state.holidays = curated;
      state.isFallback = true;
      state.isLoading = false;
      state.error = null;
      saveToCache(cacheKey, curated, true);
    } else {
      state.holidays = [];
      state.isFallback = false;
      state.isLoading = false;
      state.error = null;
    }
    renderUI();
    updateDashboardHolidays();
  }

  function handleFallbackOrError(errorMsg, cacheKey) {
    if (state.country === 'IN') {
      const curated = CURATED_INDIAN_HOLIDAYS[state.year] || CURATED_INDIAN_HOLIDAYS[2025];
      state.holidays = curated;
      state.isFallback = true;
      state.isLoading = false;
      state.error = null;
      saveToCache(cacheKey, curated, true);
    } else {
      state.holidays = [];
      state.isLoading = false;
      state.error = errorMsg || 'Failed to fetch holiday data. Please check connection and retry.';
    }
    renderUI();
    updateDashboardHolidays();
  }

  function saveToCache(key, data, isFallback) {
    try {
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data,
        isFallback
      }));
    } catch (e) {
      // Storage might be full
    }
  }

  function renderUI() {
    const listContainer = document.getElementById('holidays-list-container');
    const statusNote = document.getElementById('holidays-status-note');
    const loadingEl = document.getElementById('holidays-loading-state');
    const errorEl = document.getElementById('holidays-error-state');
    const emptyEl = document.getElementById('holidays-empty-state');

    if (!listContainer) return;

    // Loading State
    if (loadingEl) loadingEl.style.display = state.isLoading ? 'flex' : 'none';
    if (errorEl) errorEl.style.display = (!state.isLoading && state.error) ? 'block' : 'none';
    if (emptyEl) emptyEl.style.display = (!state.isLoading && !state.error && state.holidays.length === 0) ? 'block' : 'none';

    if (statusNote) {
      if (state.isFallback) {
        statusNote.innerHTML = `
          <div class="alert alert-info">
            <span class="alert-icon">ℹ️</span>
            <div><strong>Curated Indian National Calendar</strong>: Nager.Date API does not index public holidays for IN; displaying officially gazetted Indian national holidays.</div>
          </div>
        `;
      } else {
        statusNote.innerHTML = '';
      }
    }

    if (state.isLoading || state.error || state.holidays.length === 0) {
      listContainer.innerHTML = '';
      return;
    }

    // Render list
    const today = Utils.getTodayString();

    listContainer.innerHTML = state.holidays.map(h => {
      const isPast = h.date < today;
      const isToday = h.date === today;
      const types = Array.isArray(h.types) ? h.types : (h.types ? [h.types] : ['Public']);
      const formattedDate = Utils.formatDate(h.date, { showYear: true, weekday: 'short' });

      // Days remaining calculation
      const targetDate = new Date(h.date + 'T00:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));

      let relativeBadge = '';
      if (isToday) {
        relativeBadge = '<span class="badge badge-success">Today!</span>';
      } else if (diffDays > 0) {
        relativeBadge = `<span class="badge badge-neutral">In ${diffDays} day${diffDays === 1 ? '' : 's'}</span>`;
      } else {
        relativeBadge = '<span class="badge badge-neutral" style="opacity: 0.6;">Passed</span>';
      }

      return `
        <div class="holiday-card ${isPast ? 'holiday-past' : ''} ${isToday ? 'holiday-today' : ''}">
          <div class="holiday-card-main">
            <div class="holiday-date-badge">
              <span class="holiday-date-day">${h.date.split('-')[2]}</span>
              <span class="holiday-date-month">${new Date(h.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div class="holiday-info">
              <div class="holiday-title-row">
                <h4 class="holiday-name">${Utils.escapeHtml(h.name)}</h4>
                ${h.localName && h.localName !== h.name ? `<span class="holiday-local-name">${Utils.escapeHtml(h.localName)}</span>` : ''}
              </div>
              <div class="holiday-meta">
                <span class="holiday-full-date">${formattedDate}</span>
                ${relativeBadge}
                ${types.map(t => `<span class="badge badge-category-study">${Utils.escapeHtml(t)}</span>`).join(' ')}
              </div>
            </div>
          </div>
          <div class="holiday-actions">
            <button class="btn btn-secondary btn-sm" data-action="add-holiday-task" data-name="${Utils.escapeHtml(h.name)}" data-date="${h.date}">
              <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Plan for this
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind "Plan for this" buttons
    listContainer.querySelectorAll('[data-action="add-holiday-task"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const date = btn.getAttribute('data-date');
        TaskManager.openTaskCreateModal(date);
        
        // Pre-fill title
        setTimeout(() => {
          const titleInput = document.getElementById('task-title-input');
          if (titleInput) {
            titleInput.value = `Holiday: ${name}`;
          }
          const catInput = document.getElementById('task-category-input');
          if (catInput) {
            catInput.value = 'Personal';
          }
        }, 150);
      });
    });
  }

  function updateDashboardHolidays() {
    const dashContainer = document.getElementById('dash-upcoming-holidays');
    if (!dashContainer) return;

    const today = Utils.getTodayString();
    const seen = new Set();
    const upcoming = [];
    for (const h of state.holidays) {
      if (h.date >= today) {
        const key = `${h.date}_${(h.name || '').toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          upcoming.push(h);
        }
      }
      if (upcoming.length >= 3) break;
    }

    if (upcoming.length === 0) {
      dashContainer.innerHTML = `
        <div class="empty-state" style="padding: 1rem;">
          <p class="empty-state-subtitle">No upcoming holidays remaining this year.</p>
        </div>
      `;
      return;
    }

    dashContainer.innerHTML = upcoming.map(h => {
      const formattedDate = Utils.formatDate(h.date, { relative: true });
      return `
        <div class="dash-holiday-item">
          <div class="dash-holiday-dot"></div>
          <div class="dash-holiday-content">
            <span class="dash-holiday-name">${Utils.escapeHtml(h.name)}</span>
            <span class="dash-holiday-date">${formattedDate}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  return {
    init,
    fetchHolidays,
    getHolidays: () => state.holidays,
    getUpcomingHolidays: (limit = 3) => {
      const today = Utils.getTodayString();
      return state.holidays.filter(h => h.date >= today).slice(0, limit);
    }
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.HolidaysService = HolidaysService;
}
