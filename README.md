# Pace Planner — Modern Personal Productivity & Planning Dashboard

Pace Planner is an intelligent, lightweight personal productivity and daily planning platform. It empowers users to manage tasks with full CRUD capabilities, maintain focused deep work using the Pomodoro technique, plan visually with an interactive monthly calendar, track public holidays, and visualize productivity trends from a single unified interface.

Built completely client-side without external runtime dependencies, Pace Planner runs instantly in modern browsers and persists all user data locally.

---

## 🌟 Core Features

### 1. Unified Dynamic Dashboard
* **Personalized Greeting**: Dynamic greetings adjusted by the time of day with live digital clock (12-hour format with AM/PM) and full current date.
* **Real-time Metric Counters**: Immediate visibility into Today's Tasks, Pending Tasks, Completed Tasks, and an SVG circular progress ring displaying overall completion percentage.
* **Today's Schedule**: Chronological timeline of tasks due today.
* **Upcoming Tasks & Focus Launcher**: Quick-add shortcuts and instant 1-click Pomodoro focus session activation.
* **Next Holidays**: Real-time summary of upcoming national holidays.

### 2. Powerful Task Management (Full CRUD)
* **Creation & Editing**: Title, rich multi-line description, priority levels, category tagging, due date, due time, and comma-separated custom tags.
* **Task Priorities**: Four distinct priority tiers (`Urgent`, `High`, `Medium`, `Low`) with visual badges and glowing accents.
* **Task Views**:
  * All Tasks
  * Today's Tasks
  * Upcoming Tasks
  * Overdue Tasks (with automatic overdue detection and visual indicators)
  * Completed Tasks
  * Pending Tasks
* **Multi-Criteria Filtering**: Filter by Priority, Category, and Status.
* **Flexible Sorting**: Sort by Due Date, Priority (Urgent to Low), Created Date, or Alphabetical title order (with ascending/descending toggle).
* **Instant Global Search**: Debounced instant search querying task title, description, category, and tags simultaneously.

### 3. Interactive Calendar / Planner
* **Monthly Grid View**: Full calendar matrix with previous/next month navigation and a "Today" quick-jump button.
* **Workload Indicators**: Visual dot indicators (colored by task priority) and task completion ratios (e.g. `2/3`) directly on day cells.
* **Selected Day Agenda**: Clicking any date updates the side Day Agenda panel, displaying scheduled tasks and allowing direct scheduling for that date.

### 4. Pomodoro Focus System
* **Interval Modes**: 25-minute Focus Session, 5-minute Short Break, 15-minute Long Break.
* **Radial SVG Progress Display**: Smooth circular ring animation indicating time elapsed and remaining.
* **Dynamic Tab Title**: Updates browser tab title with remaining countdown (e.g. `(24:45) Focus • Pace Planner`).
* **Cycle Tracking**: Tracks session cycles (e.g. "Session 2 of 4") before triggering long breaks automatically.
* **Web Audio API Chimes**: Synthesizes pleasant musical audio notifications without requiring external audio file downloads.
* **Session History Log**: Records completed focus sessions with duration and timestamps.

### 5. Public Holidays Integration
* **REST API Integration**: Connects to the [Nager.Date REST API](https://date.nager.at) (`/api/v3/PublicHolidays/{year}/{country}`).
* **Multi-Country Support**: Selectable country selector (default: India `IN`, with USA, UK, Canada, Australia, Germany, France, Singapore, Japan).
* **Curated Fallback Engine**: Because Nager.Date returns HTTP 204 (No Content) for India, Pace Planner automatically activates a high-fidelity curated dataset of Indian national and gazetted holidays for 2025 and 2026.
* **Local Caching**: Caches holiday records in LocalStorage for 24 hours to optimize performance and prevent rate limiting.
* **Plan for Holiday**: 1-click button to create a task scheduled for any holiday.

### 6. Productivity Statistics & Charts
* **Productivity Streak**: Counts consecutive active days with completed tasks.
* **Key Metrics**: Tasks completed today, this week, this month, total focus minutes, and overdue tasks.
* **7-Day Trend Chart**: Pure CSS/SVG bar chart visualizing daily completed tasks over the last week.
* **Category Breakdown**: Horizontal progress bars showing completion rates per category.
* **Priority Distribution**: Segmented stacked bar and legend breakdown.

### 7. Modern Theme System
* **Deep Slate Dark Mode**: Tailored dark theme optimized for eye comfort and focus (`#090d16` background, `#141b2d` surface).
* **Crisp Light Mode**: High-contrast, clean workspace theme (`#f8fafc` background, `#ffffff` surface).
* **System Preference**: Listens to operating system `prefers-color-scheme` automatically.

### 8. Settings & Data Management
* **Configurable Intervals**: Adjust Focus, Short Break, and Long Break durations, as well as session cycles.
* **Audio & Notification Preferences**: Toggle synthesized chimes and adjust master volume.
* **JSON Export**: Download all application data (tasks, focus sessions, user preferences) as a structured `.json` backup file.
* **JSON Import**: Upload and validate JSON backup files before importing, with error boundaries preventing malformed data from corrupting the application.
* **Clear Data & Reset**: Safe confirmation modals for resetting to default demo data or wiping local storage.

### 9. Local Starter & Demo Data
When Pace Planner is first opened in a browser, it initializes a set of realistic starter tasks and sample focus sessions. This provides an immediately interactive, vibrant experience across the dashboard, calendar, and statistics charts. This data is strictly local demonstration data stored in your browser's `LocalStorage` and is never presented as real users, external production analytics, or business metrics. Users can freely create, modify, delete, clear, or export this data anytime via Settings.

---

## 🛠️ Technology Stack

* **Structure**: Semantic HTML5 with ARIA accessibility roles
* **Styling**: Vanilla CSS3 with CSS Custom Properties (Design Tokens), Flexbox, CSS Grid, Glassmorphism, and responsive media queries
* **Typography**: Outfit (Headings) and Inter (Body) from Google Fonts
* **Logic**: Modern modular JavaScript (ES6+)
* **Audio**: Browser Web Audio API (real-time frequency synthesis)
* **Data Storage**: Client-side `LocalStorage` with an abstracted `StorageService` layer
* **External API**: Nager.Date Public Holidays REST API

---

## 📁 Architecture & Directory Structure

```
Pace_Planner/
├── index.html              # Main single-page application shell
├── README.md               # Project Documentation
├── .gitignore              # Git ignore rules
│
├── css/
│   ├── style.css           # Design tokens, CSS variables, typography, resets, layout
│   ├── components.css      # Reusable UI components (buttons, cards, forms, modals, toasts, charts)
│   └── responsive.css      # Breakpoints for desktop, tablet, and mobile off-canvas navigation
│
├── js/
│   ├── utils.js            # ID generation, date/time formatting, HTML sanitization, debounce
│   ├── storage.js          # StorageService abstraction layer over LocalStorage
│   ├── notifications.js    # Toast notification system and Web Audio synthesizers
│   ├── theme.js            # ThemeManager (Dark / Light / System)
│   ├── tasks.js            # TaskManager (Full CRUD, views, filters, sorting, search)
│   ├── calendar.js         # CalendarManager (Monthly grid, date selection, day agenda)
│   ├── pomodoro.js         # PomodoroTimer (Focus/Break cycles, SVG progress ring, history)
│   ├── holidays.js         # HolidaysService (Nager.Date REST client, caching, Indian fallback)
│   ├── statistics.js       # StatsEngine (Productivity metrics, streak, SVG/CSS trend charts)
│   ├── settings.js         # SettingsManager (User preferences, JSON backup import/export)
│   └── app.js              # Application entry point, view router, live clock, shortcuts
│
└── assets/
    └── favicon.svg         # Modern vector logo and favicon
```

---

## 🚀 How to Run Locally

Because Pace Planner is built with vanilla web technologies, it runs on any HTTP server or even directly in the browser.

### Option 1: Using Python (Recommended)
Open a terminal in the project directory (`Pace_Planner`) and run:
```bash
# Python 3
python -m http.server 8000
```
Then visit: `http://localhost:8000`

### Option 2: Using Node.js (npx)
```bash
npx serve .
```

### Option 3: Direct File Execution
Open `index.html` directly in any modern browser (Chrome, Firefox, Edge, Safari). Note that some browsers restrict `fetch()` requests on the `file://` protocol; running via an HTTP server is recommended for the Holidays API.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>N</kbd> | Open New Task modal from any view |
| <kbd>/</kbd> | Navigate to Tasks view and focus the Search bar |
| <kbd>Escape</kbd> | Close any open modal or mobile navigation drawer |

---

## 🔒 Security & Data Integrity

1. **Input Sanitization**: All user inputs rendered into the DOM are sanitized via `Utils.escapeHtml` to prevent Cross-Site Scripting (XSS).
2. **Zero Credentials**: No secret API keys or authentication tokens are stored or exposed in client-side code.
3. **Storage Abstraction**: Application components never manipulate `localStorage` directly; all transactions flow through `StorageService` for validation.
4. **Import Validation**: Imported JSON files are verified for structure and array integrity before applying changes.
5. **Safe Confirmation**: Destructive actions (deleting tasks, clearing data) require explicit user confirmations.

---

## 🗺️ Future Roadmap

* **Phase 2**: Migration to React / Next.js with serverless backend APIs, PostgreSQL / MongoDB, and user authentication (JWT / sessions).
* **Phase 3**: AI-powered productivity assistant (natural-language task creation, smart priority recommendations, schedule optimization).
* **Phase 4**: Two-way Google Calendar / Outlook integration and recurring task automation.
* **Phase 5**: Team workspaces, shared project boards, and real-time collaboration.
* **Phase 6**: Advanced analytics exports (PDF / CSV), habit tracking, and gamification badges.
* **Phase 7**: Progressive Web App (PWA) with offline synchronization and native mobile shells.

---

## ⚠️ Known Limitations

* **Nager.Date India Holidays**: Nager.Date REST API does not index public holidays for India (`IN`) and returns HTTP 204. Pace Planner resolves this seamlessly with a curated fallback national calendar for India, while retaining live API queries for other countries.
* **Device Scoping**: In this MVP version, data is stored per browser/device via LocalStorage. Multi-device synchronization will be introduced with cloud authentication in Phase 2.
