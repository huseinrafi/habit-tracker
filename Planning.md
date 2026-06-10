# Architectural Re-Engineering & Product Implementation Roadmap

## Project: Full-Stack Habit and Task Tracker (TaskTracker Productivity System)

---

## 1. Executive Summary & System Architecture Flow

The TaskTracker Productivity System is built as a decoupled full-stack application consisting of a modern client-side Single Page Application (SPA) frontend and a serverless backend architecture.

### Current Technology Stack

* **Frontend**: React (Vite), Tailwind CSS (via CDN placeholder), Axios/Fetch client.
* **Backend**: Node.js, Serverless Framework (`serverless-offline` for local emulation), Prisma ORM.
* **Database**: Relational Database Engine (PostgreSQL/MySQL) accessed via Prisma client.

### End-to-End Application Flow Diagram**

[ Browser / Client UI (React) ]

│

│  (HTTPS JSON Requests + JWT Bearer Authorization Header)

▼

[ AWS API Gateway / Serverless Offline Router ]

│

│  (Invokes Lambda Handler Context)

▼

[ Express Application / Lambda Middleware Router ]

│

├───► [ authMiddleware ] ──► (Validates JWT Token / Injects req.user)

│

▼

[ Controller Logic / Route Handlers ]

│

│  (Queries via Prisma Client Instance)

▼

[ Prisma ORM Abstract Layer ]

│

▼

[ Relational Database (Multi-Tenant Schema Isolation) ]

### High-Level Architectural Principles

1. **Strict Statelessness**: The backend maintains no local session state. Multi-tenancy is completely handled via cryptographic token evaluation (JWT) containing secure claims (`userId`).
2. **Explicit Multi-Tenant Data Isolation**: Every transactional record stored in the database (`Task`, `Habit`, `HabitLog`) must map to a unique `userId` foreign key. Query filters explicitly append `where: { userId }` conditions across all operational lifecycles to prevent cross-account leakages.
3. **Encapsulated Component Architecture**: The user interface is driven by declarative UI state machines using React hooks, syncing local component boundaries with server state asynchronously.

---

## 2. Comprehensive Bug Diagnosis & Root Cause Analysis

Based on the operational logs, runtime errors, and visual interface rendering artifacts provided across the four production snapshots, the following core defects have been isolated and diagnosed:

### 2.1 Interface UI Component Bug: Template Literal Leaks

* **Symptoms (Snapshot 1)**: String template placeholders like `${habit.title}${habit.currentStreak} Streak` and explicit code snippets `${sDate.toLocaleTimeString([], {...})}` render directly to the user as literal text.
* **Root Cause**: Syntactic error in React JSX interpolation. The developer inadvertently embedded expressions wrapped in standard single quotes (`'`) or double quotes (`"`) inside text blocks, or bypassed the JavaScript template evaluation context entirely.
* **Correction Blueprint**: Convert standard strings into true template literals wrapped in backticks (`` ` ``) embedded directly inside JSX curly braces, or extract logic directly out of text blocks:
  ```jsx
  /* INCORRECT */
  <div className="text-sm">${habit.title} ${habit.currentStreak} Streak</div>

  /* CORRECT */
  <div className="text-sm">{`${habit.title} ${habit.currentStreak} Streak`}</div>
  // OR simply:
  <div className="text-sm">{habit.title} {habit.currentStreak} Streak</div>
  ```

### 2.2 Calendar Temporal Anchor and Control Paralysis

* **Symptoms (Snapshot 2)**: The Calendar UI view remains statically locked on the historical range of `OCTOBER 23 – 29, 2023`. UI controls like `<`, `>`, `Today`, `Week`, `Month`, `Day` are non-functional and fail to re-render the grid. No scheduled tasks render within the hourly/daily columns.
* **Root Cause**: Hardcoded temporal ranges inside the calendar component's initial state definition without dynamic hook state attachment. Action event handlers (`onClick`) lack state dispatch methods (`setCurrentDate`) or do not perform dynamic range math (e.g., adding/subtracting days/months using libraries like `date-fns` or native JavaScript `Date` interfaces). Furthermore, tasks are not filtered by active window intervals.
* **Correction Blueprint**: Implement an operational date-state mechanism (`const [currentViewDate, setCurrentViewDate] = useState(new Date());`) and compute grid intervals dynamically relative to `currentViewDate`.

### 2.3 Habit Tracking Interface Skeleton Deficiency

* **Symptoms (Snapshot 3)**: Habit creation forms only supply a generic textual name string input field. The rendering grid displays an unpolished list layout displaying an archaic `"8 Total Check-ins"` metric instead of a chronological matrix representing a rolling week or month tracker.
* **Root Cause**: The data capture form lacks multi-variant inputs (dropdowns/select elements) for habit meta-parameters (type, repeatability frequencies). On the visualization side, the UI component does not map over an array of historical execution intervals to output corresponding filled grid boxes.
* **Correction Blueprint**: Refactor the container to map over a calculated 30-day index grid array, matching dates against indexed cross-reference check-in records (`HabitLog`).

### 2.4 Settings Workspace Displacement

* **Symptoms (Snapshot 4)**: The Settings navigation item reveals a raw text dump outlining internal markdown documentation (`# DESIGN TOKENS & PALETTE SETTINGS`, `# DESIGN.md`).
* **Root Cause**: Conceptual layout substitution placeholder error. Technical infrastructure specifications were hardcoded straight into the view template code instead of mapping standard profile management interfaces.
* **Correction Blueprint**: Re-architect the settings workspace layout to present dedicated responsive standard forms bound to dedicated user update API controllers.

---

## 3. Core Feature Specifications & Functional Requirements

The re-engineered system will systematically deploy the following feature vectors to resolve current functional voids:

### 3.1 Robust Cryptographic Authentication & Multi-Tenancy

* **Registration Workspace**: Interface form collecting user identity variables (`name`, `email`, `password`). The backend hashes raw passwords safely using `bcryptjs` before persisting records.
* **Secure Authentication Workflows**: Exchange mechanisms validation via an asymmetric/symmetric JWT token system. Successful credential mapping returns an encrypted token signature containing authenticated payload fields.
* **Storage & Injection Interceptor**: Persistent local state management inside the browser client leveraging `localStorage`. An outbound network interceptor abstracts Axios instances to append the Bearer Authorization header securely:
  ```javascript
  axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  ```

### 3.2 Advanced Task Management Subsystem

* **Comprehensive Data Input Parameters**:
  * **Task Title/Name**: Textual metadata identity.
  * **Operational Type/Category**: Customizable tags (e.g., Work, Personal, Education).
  * **Temporal Boundaries**: explicit mapping of `startDate` and `endDate` timestamps.
  * **Recurrence / Repeat Engine**: Selective mapping values supporting `DISABLE`, `DAILY`, `WEEKLY`, or `MONTHLY`.
  * **External Media Reference Binding**: Data string field capturing public URLs or file references.
* **State Control Workflows**: Full operational lifecycle pipeline allowing inline mutations, removals, and dynamic filtering by status and date bounds.

### 3.3 Advanced Habit & Streak Calculus Engine

* **Data Models**: Structural definitions for tracking habits over distinct scheduling types (Daily, Weekly, Monthly frequencies).
* **Real-time Active Streak Calculator**: Algorithm executed during summary dashboard assembly. For daily-tracked habits, it assesses completion states by checking logs sequentially backward from the current date.
* **Mathematical Representation of Current Streak**:
  Given an ordered list of distinct completion dates $D = \\{d_1, d_2, \\dots, d_n\\}$ where $d_1$ is the most recent date, sorted such that $d_i > d_{i+1}$:
  $$
  text{Current Streak} = \\sum_{i=1}^{k} 1
  $$

  where $k$ is the maximum integer satisfying the condition that the calendar day gap between the current day and $d_1$ is $\\le 1$, and the gap between consecutive elements $d_i$ and $d_{i+1}$ is exactly 1 day. If the gap between the current day and $d_1$ exceeds 1, the current streak resets to 0.

### 3.4 Interactive Calendar & Dynamic Attachment Grid Views

* **Temporal Mapping Layer**: Dynamically splits the user's active calendar range into a coordinate matrix grid. Tasks are allocated into the date cells based on overlapping intervals:
  $$
  text{Condition: } \\text{GridDate} \\ge \\text{Task.startDate} \\quad \\text{AND} \\quad \\text{GridDate} \\le \\text{Task.endDate}
  $$
* **Media Inline Render**: Detects string paths pointing to valid graphical file attachments (e.g., `.png`, `.jpg`, `.jpeg`), dynamically instantiating responsive image blocks within the calendar timeline workspace card wrapper.

### 3.5 Analytical Metric Performance Dashboards

* **Aggregation Layers**: Calculates real-time system performance scores by dividing completed actions against total expected occurrences within specified time scopes.
* **Visual Indicators**: Transforms raw database integers into comprehensive activity charts, visual heatmaps, and progress trackers.

---

## 4. Database Schema Design (Prisma Data Model)

To support multi-tenancy, extended properties, recurring schedules, and execution logging, the database structural configuration must be refactored to match the following schema mapping configuration:

```prisma
datasource db {
  provider = "postgresql" // Or "mysql" depending on targeted engine
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum RepeatType {
  DISABLE
  DAILY
  WEEKLY
  MONTHLY
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  nama      String
  tasks     Task[]
  habits    Habit[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Task {
  id          String     @id @default(uuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  type        String     @default("General")
  startDate   DateTime
  endDate     DateTime
  repeatType  RepeatType @default(DISABLE)
  attachment  String?    // Stores absolute URL or structural link references
  isCompleted Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([userId])
  @@map("tasks")
}

model Habit {
  id          String     @id @default(uuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  type        String     @default("Health")
  repeatType  RepeatType @default(DAILY)
  logs        HabitLog[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([userId])
  @@map("habits")
}

model HabitLog {
  id           String   @id @default(uuid())
  habitId      String
  habit        Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  logDate      DateTime // Strip time components (YYYY-MM-DD 00:00:00) to represent the track day
  createdAt    DateTime @default(now())

  @@unique([habitId, logDate]) // Prevents double check-ins on the same tracking node
  @@index([habitId])
  @@map("habit_logs")
}
```

## 5. RESTful API Endpoint Contracts

All communications occur via standard JSON payload schemas. All endpoints except Authentication routes require a valid header signature: `Authorization: Bearer <JWT_TOKEN>`.

### 5.1 Authentication Controller Interface

* `POST /api/auth/register`
  * **Payload** : `{"email": "user@domain.com", "password": "securepassword", "nama": "John Doe"}`
  * **Response (201)** : `{"status": "success", "token": "eyJhbGciOi..."}`
* `POST /api/auth/login`
  * **Payload** : `{"email": "user@domain.com", "password": "securepassword"}`
  * **Response (200)** : `{"status": "success", "token": "eyJhbGciOi..."}`

### 5.2 Task Resource Endpoint Pipeline

* `GET /api/tasks`
  * **Response (200)** : `{"status": "success", "data": [{"id": "...", "name": "ahmad", "repeatType": "DISABLE", ...}]}` (Implicitly scoped to JWT owner)
* `POST /api/tasks`
  * **Payload** : `{"name": "Task Alpha", "type": "Work", "startDate": "2026-06-08T00:00:00Z", "endDate": "2026-06-10T00:00:00Z", "repeatType": "WEEKLY", "attachment": "https://link-to-file.com"}`
  * **Response (201)** : `{"status": "success", "data": {...}}`
* `PUT /api/tasks/:id`
  * **Payload** : `{"isCompleted": true}` or partial structural property payload.
  * **Response (200)** : `{"status": "success", "data": {...}}`
* `DELETE /api/tasks/:id`
  * **Response (200)** : `{"status": "success", "message": "Task destroyed successfully"}`

### 5.3 Habit & Logging Management Engine

* `GET /api/habits`
  * **Response (200)** : returns current active habits including nested `logs` arrays or summary metadata parameters.
* `POST /api/habits`
  * **Payload** : `{"name": "Hydration Target", "type": "Health", "repeatType": "DAILY"}`
* `POST /api/habits/:id/check-in`
  * **Payload** : `{"date": "2026-06-08T00:00:00Z"}`
  * **Response (200)** : Creates a unique `HabitLog` entry or performs a toggle removal if checked in twice.

### 5.4 Profile & Analytical Aggregation Metrics

* `GET /api/analytics/summary`
  * **Response (200)** : `{"status": "success", "efficiencyRate": 84, "streakJourney": {"currentMax": 12, "activeDays": 5}}`
* `PUT /api/user/profile`
  * **Payload** : `{"nama": "Alex Rivera Updated"}`

## 6. Detailed Implementation Phasing & Roadmap

The correction and expansion execution map are divided into five targeted sequential iterations:

```
[ Phase 1: Foundation & Auth ] ──► [ Phase 2: Core Refactor ] ──► [ Phase 3: Matrix Views ]
                                                                             │
[ Phase 5: Deployment & QA ]   ◄── [ Phase 4: Profiling & Charts ] ◄────────┘
```

### Phase 1: Cryptographic Multi-Tenancy Core Foundation (Backend & Frontend)

1. **Database Provisioning** : Inject the new Prisma schema variables into the target server instance, executing migrations (`npx prisma migrate dev`).
2. **Auth Routing** : Code the `/api/auth` endpoints. Wire up the password cryptography modules (`bcryptjs`) and token lifecycle modules (`jsonwebtoken`).
3. **Client-Side Vault Interceptor** : Setup local storage variables in the frontend and configure axios instances to bind credentials automatically across all network operational loops. Replace the dummy authentication notice with automatic route redirection structures.

### Phase 2: Core Resource Controller Refactoring & UI Variable Correction

1. **Template Bug Fix** : Audit the frontend codebase. Identify all occurrences of un-evaluated string literals (`${...}`) and wrap them securely within correct JSX expressions.
2. **Data Schema Adaptation** : Upgrade the frontend forms for tasks and habits to support multi-select inputs for frequency, categories, start/end dates, and image attachments.
3. **Controller Logic Implementation** : Build out the corresponding backend endpoints for CRUD handling of Tasks and Habits, making sure all queries are filtered safely by the authenticated user's ID.

### Phase 3: Matrix Grid Visualizations & Interactive Calendar Layouts

1. **Dynamic Calendar Re-engineering** : Remove hardcoded time variables from the calendar layout view. Set up an internal React reference hook to handle shifting calendar windows (`currentViewDate`). Implement dynamic day coordinate tracking to correctly map tasks into their respective date blocks.
2. **Media Embedding Integration** : Add an inline layout renderer within the task details component that checks for valid image URLs and dynamically embeds them into the layout structure.
3. **Habit Completion Matrix Grid** : Build a responsive tracker container displaying either a rolling 7-day row or a complete 30-day grid box display, using distinct visual styling states to reflect verified completion records (`HabitLog`).

### Phase 4: Analytical Calculations & Settings Panel Re-Architecting

1. **Streak Engine Deployment** : Add a specialized utility function within the dashboard data fetching pipeline that calculates current and historical habit completion streaks.
2. **Visual Metric Charts** : Set up a responsive analytical reporting section using dynamic styled blocks or accessible SVG elements to display real-time productivity rates based on completed items.
3. **Settings Panel Overhaul** : Remove the hardcoded text instructions file display entirely. Build an editable profile settings workspace featuring secure update forms for the user's name and password.

### Phase 5: System Verification, Optimization & Deployment Documentation

1. **Integration Testing Check-ins** : Build a dedicated route handler at `/api/health-check` to replace the broken path. This ensures the frontend's system health monitor receives a clean confirmation response.
2. **Security Audit** : Verify that all database calls strictly enforce multi-tenant isolation rules, ensuring users cannot view or modify data belonging to other accounts.
3. **Serverless Production Shipping** : Run a clean build of the optimized web application assets (`npm run build`), review environmental variables configuration keys, and deploy the entire serverless application bundle to the target production host.
