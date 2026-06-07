# Analysis of `habit-tracker` and Upgrade Goal

## Analysis of Current Files
Currently, the `habit-tracker` is a purely static front-end application:
1. **`index.html`**: A single-page application structure styled with Tailwind CSS (via CDN). It has multiple views (Dashboard, Calendar, Analytics/Habits, Settings) all contained within the same file.
2. **`app.js`**: Contains ~1000 lines of Vanilla JavaScript. It manages the state (Theme, Tasks, Habits) entirely in the browser's `localStorage`. It handles all DOM manipulations, modal toggling, and rendering of the dashboard and calendar.
3. **`styles.css`**: Additional custom CSS for scrollbars and transitions.
4. **`DESIGN.md`**: Design tokens and instructions for static deployment.

**The Problem**: Because it uses `localStorage`, data is tied to the user's specific browser and device. It lacks a centralized database, meaning it cannot be accessed across different devices, nor can it support multiple users effectively.

## User Review Required
> [!IMPORTANT]
> **Stack Choice**: I propose keeping your excellent frontend design (Vanilla JS + Tailwind) but moving it into a dedicated `frontend/` folder. I will then create a Node.js + Express `backend/` that uses a database (SQLite is recommended for zero-configuration, but we can use PostgreSQL if you prefer). I will rewrite the `localStorage` parts of `app.js` to communicate with the new backend APIs via HTTP requests.
> **Does this approach (Express.js + SQLite/PostgreSQL + Modified Vanilla Frontend) sound good to you? Or would you prefer a complete rewrite into a modern framework like Next.js/React?**

## Proposed Implementation Plan

### 1. Structure Reorganization
We will separate the project into two distinct directories:
#### [NEW] `frontend/`
- Move `index.html`, `styles.css`, `app.js`, and `DESIGN.md` here.
#### [NEW] `backend/`
- Initialize a new Node.js project.

### 2. Backend Development (Node.js + Express)
- Install `express`, `cors`, and `sqlite3` (or `pg` for PostgreSQL).
- Create a database schema with two tables: `tasks` and `habits`.
- Create REST API endpoints:
  - `GET /api/tasks`, `POST /api/tasks`, `DELETE /api/tasks/:id`
  - `GET /api/habits`, `PUT /api/habits/:id`
- Initialize the database with the default data provided in your `app.js` if it's empty.

### 3. Frontend Integration (`app.js` Upgrade)
- Refactor the `loadState()` function to `fetch()` data from `http://localhost:3000/api/...` instead of reading from `localStorage`.
- Refactor `saveTasks()` and `saveHabits()` to send `POST`/`PUT`/`DELETE` requests to the backend whenever a task is created/deleted or a habit streak is updated.
- Maintain all the existing UI logic, animations, and modal functionality.

## Verification Plan
1. Start the Express backend server on port 3000.
2. Serve the frontend (using a simple HTTP server or Vite).
3. Create a new task and toggle a habit, then refresh the page to verify that the data persists in the actual database rather than local storage.
