# Habit Tracker - Mermaid Diagrams

Dokumentasi visual untuk sistem Habit & Task Tracker dengan arsitektur AWS Serverless.

---

## 1. System Architecture Diagram (Alur Kerja Sistem)

Diagram ini menunjukkan alur kerja keseluruhan sistem dari frontend hingga backend dan database.

```mermaid
graph TB
    User["👤 User"]
    
    subgraph Frontend["Frontend (React + Vite + S3)"]
        LoginPage["🔐 Login Page"]
        RegisterPage["📝 Register Page"]
        HomeView["🏠 Home View"]
        CalendarView["📅 Calendar View"]
        AnalyticsView["📊 Analytics View"]
        SettingsView["⚙️ Settings View"]
        TaskModal["📋 Task Modal"]
        Store["🎯 Zustand Store"]
    end
    
    subgraph Auth["Authentication (AWS Cognito)"]
        CognitoUI["🔑 Cognito Auth UI"]
        UserPool["👥 User Pool"]
        JWT["🔒 JWT Token"]
    end
    
    subgraph APIGateway["API Gateway (HTTP API)"]
        HealthCheck["✅ Health Check"]
        TaskEndpoints["📝 Task Endpoints"]
        HabitEndpoints["🎯 Habit Endpoints"]
        DashboardEndpoints["📊 Dashboard Endpoints"]
        UploadEndpoints["📤 Upload Endpoints"]
    end
    
    subgraph Backend["Backend (AWS Lambda Functions)"]
        TaskController["📝 Task Controller"]
        HabitController["🎯 Habit Controller"]
        DashboardController["📊 Dashboard Controller"]
        AuthMiddleware["🔐 Auth Middleware<br/>JWT Verification"]
        S3Service["💾 S3 Service<br/>File Upload/Download"]
    end
    
    subgraph Database["Database (AWS DynamoDB)"]
        UsersTable["👤 Users Table"]
        TasksTable["📝 Tasks Table"]
        HabitsTable["🎯 Habits Table"]
        LogsTable["📋 Logs Table"]
    end
    
    subgraph Storage["Storage (AWS S3)"]
        WebBucket["🌐 Web Hosting Bucket"]
        AttachmentsBucket["📎 Attachments Bucket"]
    end
    
    User -->|Visits| Frontend
    User -->|Sign In/Sign Up| Auth
    
    LoginPage -->|Calls| CognitoUI
    RegisterPage -->|Calls| CognitoUI
    CognitoUI -->|Authenticates| UserPool
    UserPool -->|Returns| JWT
    
    Store -->|Fetches Auth| JWT
    Store -->|Manages State| HomeView
    Store -->|Manages State| CalendarView
    Store -->|Manages State| AnalyticsView
    Store -->|Manages State| SettingsView
    
    HomeView -->|Shows| TaskModal
    CalendarView -->|Shows| TaskModal
    
    Frontend -->|API Calls with JWT| APIGateway
    
    APIGateway -->|Routes to| TaskEndpoints
    APIGateway -->|Routes to| HabitEndpoints
    APIGateway -->|Routes to| DashboardEndpoints
    APIGateway -->|Routes to| UploadEndpoints
    
    TaskEndpoints -->|Verifies JWT| AuthMiddleware
    HabitEndpoints -->|Verifies JWT| AuthMiddleware
    DashboardEndpoints -->|Verifies JWT| AuthMiddleware
    UploadEndpoints -->|Verifies JWT| AuthMiddleware
    
    AuthMiddleware -->|Routes to| TaskController
    AuthMiddleware -->|Routes to| HabitController
    AuthMiddleware -->|Routes to| DashboardController
    AuthMiddleware -->|Routes to| S3Service
    
    TaskController -->|CRUD Operations| TasksTable
    HabitController -->|CRUD Operations| HabitsTable
    HabitController -->|Logs Completion| LogsTable
    DashboardController -->|Queries| HabitsTable
    DashboardController -->|Queries| LogsTable
    
    TaskController -->|Stores UserID| UsersTable
    HabitController -->|Stores UserID| UsersTable
    
    S3Service -->|Upload/Download| AttachmentsBucket
    Frontend -->|Static Assets| WebBucket
    
    style Frontend fill:#e1f5ff
    style Auth fill:#fff3e0
    style APIGateway fill:#f3e5f5
    style Backend fill:#e8f5e9
    style Database fill:#fce4ec
    style Storage fill:#fff9c4
```

---

## 2. Use Case Diagram

Diagram ini menunjukkan berbagai use case (kasus penggunaan) yang dapat dilakukan oleh user dalam sistem.

```mermaid
graph LR
    User["👤 User"]
    Admin["👨‍💼 System Admin"]
    
    User -->|UC1| Register["📝 Register Account"]
    User -->|UC2| Login["🔐 Login to System"]
    User -->|UC3| Logout["🚪 Logout"]
    User -->|UC4| CreateTask["➕ Create Task"]
    User -->|UC5| UpdateTask["✏️ Update Task"]
    User -->|UC6| DeleteTask["🗑️ Delete Task"]
    User -->|UC7| ViewTasks["👀 View All Tasks"]
    User -->|UC8| CreateHabit["➕ Create Habit"]
    User -->|UC9| DeleteHabit["🗑️ Delete Habit"]
    User -->|UC10| ViewHabits["👀 View All Habits"]
    User -->|UC11| CheckHabit["✅ Check-in Habit Daily"]
    User -->|UC12| LogCompletion["📝 Log Habit Completion"]
    User -->|UC13| ViewStreak["🔥 View Habit Streak"]
    User -->|UC14| ViewAnalytics["📊 View Weekly Analytics"]
    User -->|UC15| UploadFile["📤 Upload File/Attachment"]
    User -->|UC16| ViewProfile["👤 View Profile Info"]
    User -->|UC17| ChangeTheme["🌙 Change Theme Light/Dark"]
    
    Register -->|Includes| ValidateEmail["Validate Email Format"]
    Register -->|Includes| ValidatePassword["Validate Password Strength"]
    
    CreateTask -->|Includes| UploadAttachment["Upload Attachment Optional"]
    UpdateTask -->|Includes| UploadAttachment
    
    ViewTasks -->|Includes| FilterByType["Filter by Task Type"]
    ViewTasks -->|Includes| FilterByDate["Filter by Date Range"]
    
    ViewHabits -->|Includes| DisplayProgress["Display Progress"]
    
    CheckHabit -->|Extends| LogCompletion
    
    Admin -->|UC18| MonitorHealth["🏥 Monitor API Health"]
    Admin -->|UC19| ViewSystemStatus["📊 View System Status"]
    
    style User fill:#bbdefb
    style Admin fill:#c8e6c9
    style Register fill:#fff9c4
    style Login fill:#ffccbc
    style Logout fill:#ffccbc
```

---

## 3. User Authentication & Task Creation Sequence Diagram

Diagram ini menunjukkan sequence flow ketika user melakukan login, kemudian membuat task baru.

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 📱 Frontend<br/>React App
    participant Cognito as 🔐 AWS Cognito
    participant APIGW as 🚀 API Gateway
    participant Lambda as ⚡ Lambda<br/>Backend
    participant DynamoDB as 💾 DynamoDB
    
    autonumber
    
    User->>Frontend: 1. Opens LoginPage
    User->>Frontend: 2. Enters Email & Password
    
    Frontend->>Frontend: 3. Calls store.login()
    Frontend->>Cognito: 4. signIn(email, password)
    
    Cognito->>Cognito: 5. Validates Credentials
    Cognito->>Frontend: 6. Returns ID Token (JWT)
    
    Frontend->>Frontend: 7. Saves Token in Memory
    Frontend->>Frontend: 8. Updates Auth State
    Frontend->>Frontend: 9. Redirects to HomeView
    
    Frontend->>APIGW: 10. GET /health-check<br/>with JWT Token
    APIGW->>Lambda: 11. Routes to healthCheck Handler
    Lambda->>Lambda: 12. Returns {status: ok}
    Lambda->>APIGW: 13. 200 OK
    APIGW->>Frontend: 14. API Online ✅
    
    Frontend->>APIGW: 15. GET /habits<br/>with JWT Token
    APIGW->>Lambda: 16. Routes to getAllHabits Handler
    Lambda->>Lambda: 17. Verifies JWT Token
    
    Lambda->>DynamoDB: 18. Query Habits Table<br/>by userId
    DynamoDB->>Lambda: 19. Returns Habits List
    
    Lambda->>DynamoDB: 20. Query Logs Table<br/>by userId
    DynamoDB->>Lambda: 21. Returns Habit Logs
    
    Lambda->>APIGW: 22. Returns Habits + Logs
    APIGW->>Frontend: 23. Populates UI with Data
    
    User->>Frontend: 24. Clicks "New Task"
    Frontend->>Frontend: 25. Opens TaskModal
    
    User->>Frontend: 26. Enters Task Details<br/>(title, type, date, etc)
    User->>Frontend: 27. Clicks "Save"
    
    Frontend->>APIGW: 28. POST /tasks<br/>{ title, type, ... }<br/>with JWT Token
    
    APIGW->>Lambda: 29. Routes to createTask Handler
    Lambda->>Lambda: 30. Verifies JWT Token
    Lambda->>Lambda: 31. Validates Request Body
    Lambda->>Lambda: 32. Generates taskId (UUID)
    
    Lambda->>DynamoDB: 33. PutCommand to Tasks Table
    DynamoDB->>Lambda: 34. Task Created ✅
    
    Lambda->>APIGW: 35. Returns {status: success, data: {...}}
    APIGW->>Frontend: 36. 201 Created
    
    Frontend->>Frontend: 37. Adds Task to Store
    Frontend->>Frontend: 38. Updates UI
    Frontend->>User: 39. Shows Success Toast ✅
    
    Note over User,DynamoDB: Complete Flow: Login → API Check → Fetch Data → Create Task
```

---

## 4. Habit Completion & Analytics Sequence Diagram

Diagram ini menunjukkan sequence flow ketika user check-in/log habit dan view analytics.

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 📱 Frontend
    participant APIGW as 🚀 API Gateway
    participant Lambda as ⚡ Lambda
    participant DynamoDB as 💾 DynamoDB
    
    autonumber
    
    User->>Frontend: 1. Opens CalendarView
    User->>Frontend: 2. Clicks Habit to Check-in
    
    Frontend->>APIGW: 3. POST /habits/{habitId}/log<br/>{ dateCompleted }<br/>with JWT
    
    APIGW->>Lambda: 4. Routes to logHabitCompletion Handler
    Lambda->>Lambda: 5. Verifies JWT Token
    Lambda->>Lambda: 6. Extract userId from JWT
    
    Lambda->>DynamoDB: 7. GetCommand Habit from Habits Table<br/>by habitId
    DynamoDB->>Lambda: 8. Returns Habit Data
    
    Lambda->>Lambda: 9. Create Log Entry (UUID)
    Lambda->>Lambda: 10. Set dateCompleted#logId as SK
    
    Lambda->>DynamoDB: 11. PutCommand to Logs Table<br/>{ habitId, dateCompleted#logId, ... }
    DynamoDB->>Lambda: 12. Log Created ✅
    
    Lambda->>APIGW: 13. Returns {status: success, data: {...}}
    APIGW->>Frontend: 14. 200 OK with Log Data
    
    Frontend->>Frontend: 15. Updates UI<br/>Shows Checkmark ✅
    Frontend->>User: 16. Toast: "Habit Logged!"
    
    Note over Frontend: User Now Views Analytics
    
    User->>Frontend: 17. Opens AnalyticsView
    Frontend->>APIGW: 18. GET /dashboard/streak<br/>with JWT
    
    APIGW->>Lambda: 19. Routes to getStreak Handler
    Lambda->>Lambda: 20. Verifies JWT
    
    Lambda->>DynamoDB: 21. Query Logs Table<br/>by userId-date-index<br/>last 30 days
    DynamoDB->>Lambda: 22. Returns Recent Logs
    
    Lambda->>Lambda: 23. Calculate Streak:<br/>Count consecutive days
    Lambda->>Lambda: 24. Calculate Max Streak
    
    Lambda->>APIGW: 25. Returns {currentStreak, maxStreak, ...}
    APIGW->>Frontend: 26. 200 OK
    
    Frontend->>APIGW: 27. GET /dashboard/analytics<br/>with JWT
    
    APIGW->>Lambda: 28. Routes to getAnalytics Handler
    Lambda->>Lambda: 29. Verifies JWT
    
    Lambda->>DynamoDB: 30. Query Logs Table<br/>last 7 days
    DynamoDB->>Lambda: 31. Returns Weekly Data
    
    Lambda->>Lambda: 32. Aggregate by Habit:<br/>completion rates
    Lambda->>Lambda: 33. Calculate percentages
    
    Lambda->>APIGW: 34. Returns {dailyData, habitStats, ...}
    APIGW->>Frontend: 35. 200 OK
    
    Frontend->>Frontend: 36. Renders Charts & Stats
    Frontend->>User: 37. Displays Weekly Analytics 📊
```

---

## 5. File Upload Sequence Diagram

Diagram ini menunjukkan sequence flow ketika user upload file/attachment.

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 📱 Frontend
    participant APIGW as 🚀 API Gateway
    participant Lambda as ⚡ Lambda
    participant S3 as 🪣 AWS S3
    participant DynamoDB as 💾 DynamoDB
    
    autonumber
    
    User->>Frontend: 1. Clicks Upload Button
    Frontend->>Frontend: 2. File Input Dialog Opens
    
    User->>Frontend: 3. Selects File from Device
    Frontend->>Frontend: 4. Reads File as Base64
    
    alt Upload via Presigned URL (Preferred)
        Frontend->>APIGW: 5. GET /upload-url<br/>?fileName=X&contentType=Y<br/>with JWT
        
        APIGW->>Lambda: 6. Routes to getUploadUrl Handler
        Lambda->>Lambda: 7. Verifies JWT Token
        Lambda->>Lambda: 8. Generates UUID + fileKey
        
        Lambda->>S3: 9. Generate Presigned URL<br/>valid for 15 minutes
        S3->>Lambda: 10. Returns Presigned URL
        
        Lambda->>APIGW: 11. Returns {uploadUrl, fileKey}
        APIGW->>Frontend: 12. 200 OK
        
        Frontend->>S3: 13. Direct Upload to S3<br/>using Presigned URL
        S3->>Frontend: 14. 200 OK - Upload Complete ✅
        
    else Upload via Base64 API
        Frontend->>APIGW: 15. POST /upload<br/>{ fileName, contentType, fileBase64 }<br/>with JWT
        
        APIGW->>Lambda: 16. Routes to uploadFile Handler
        Lambda->>Lambda: 17. Verifies JWT Token
        Lambda->>Lambda: 18. Decode Base64 to Buffer
        
        Lambda->>S3: 19. PutObject to Attachments Bucket
        S3->>Lambda: 20. File Uploaded ✅
        
        Lambda->>S3: 21. Generate Download URL
        S3->>Lambda: 22. Returns Presigned Download URL
        
        Lambda->>APIGW: 23. Returns {url, fileKey}
    end
    
    APIGW->>Frontend: 24. 200 OK with File URL
    
    Frontend->>Frontend: 25. Update Task/Habit<br/>attachmentUrl = fileUrl
    
    Frontend->>APIGW: 26. PUT /tasks/{taskId}<br/>{ attachmentUrl: fileUrl }<br/>with JWT
    
    APIGW->>Lambda: 27. Routes to updateTask Handler
    Lambda->>Lambda: 28. Verifies JWT Token
    
    Lambda->>DynamoDB: 29. UpdateCommand Tasks Table<br/>set attachmentUrl
    DynamoDB->>Lambda: 30. Updated ✅
    
    Lambda->>APIGW: 31. Returns Updated Task
    APIGW->>Frontend: 32. 200 OK
    
    Frontend->>Frontend: 33. Update UI
    Frontend->>User: 34. Shows Success Toast 📤
```

---

## 6. Data Relationships Diagram

Diagram ini menunjukkan hubungan antara entities dalam DynamoDB.

```mermaid
erDiagram
    USERS ||--o{ TASKS : owns
    USERS ||--o{ HABITS : owns
    USERS ||--o{ LOGS : owns
    HABITS ||--o{ LOGS : tracked-by
    TASKS ||--o{ ATTACHMENTS : contains
    
    USERS {
        string userId PK
        string email
        string name
        string createdAt
        datetime lastLogin
    }
    
    TASKS {
        string userId PK
        string taskId SK
        string title
        string type
        date startDate
        date endDate
        string repeatableType
        string attachmentUrl
        datetime completedAt
        datetime createdAt
        datetime updatedAt
    }
    
    HABITS {
        string userId PK
        string habitId SK
        string title
        string type
        string repeatableType
        datetime createdAt
        datetime updatedAt
    }
    
    LOGS {
        string habitId PK
        string dateCompleted#logId SK
        date dateCompleted
        string logId
        datetime createdAt
    }
    
    ATTACHMENTS {
        string fileKey
        string fileName
        string s3Url
        datetime uploadedAt
    }
```

---

## 7. Authentication Flow Diagram

Diagram ini menunjukkan detail alur otentikasi menggunakan AWS Cognito dan JWT.

```mermaid
graph TD
    subgraph Registration
        A1["1. User Fills Registration Form"]
        A2["2. Frontend: signUp API Call"]
        A3["3. Cognito: Pre-SignUp Lambda Trigger"]
        A4["4. Auto-Confirm User"]
        A5["5. User Created in User Pool"]
        A6["6. Auto-Login with Credentials"]
    end
    
    subgraph Authentication
        B1["1. User Enters Email & Password"]
        B2["2. Frontend: signIn API Call"]
        B3["3. Cognito: Verify Credentials"]
        B4["3a. Success: Generate Tokens"]
        B4a["- ID Token JWT"]
        B4b["- Access Token JWT"]
        B4c["- Refresh Token"]
        B5["4. Frontend: Store Tokens in Memory"]
    end
    
    subgraph ProtectedRequests
        C1["1. Frontend Makes API Request"]
        C2["2. Get ID Token from Memory"]
        C3["3. Add Authorization Header<br/>******"]
        C4["4. Send Request to API Gateway"]
        C5["5. Lambda: Verify JWT"]
        C6["6. Extract userId, email, name<br/>from JWT payload"]
        C7["7. Execute Handler Function"]
        C8["8. Return Response with Data"]
    end
    
    subgraph TokenRefresh
        D1["1. ID Token Expires<br/>after 1 hour"]
        D2["2. Frontend: Use Refresh Token"]
        D3["3. Cognito: Generate New ID Token"]
        D4["4. Frontend: Update Token in Memory"]
        D5["5. Retry Failed Request"]
    end
    
    subgraph Logout
        E1["1. User Clicks Logout"]
        E2["2. Frontend: signOut API Call"]
        E3["3. Cognito: Invalidate Session"]
        E4["4. Clear Tokens from Memory"]
        E5["5. Clear Store Data"]
        E6["6. Redirect to LoginPage"]
    end
    
    A1 --> A2 --> A3 --> A4 --> A5 --> A6
    B1 --> B2 --> B3 --> B4
    B4 --> B4a
    B4 --> B4b
    B4 --> B4c
    B4a --> B5
    
    B5 --> C1
    C1 --> C2 --> C3 --> C4 --> C5 --> C6 --> C7 --> C8
    
    C8 -.->|Token Expires| D1
    D1 --> D2 --> D3 --> D4 --> D5
    
    C8 -.->|User Action| E1
    E1 --> E2 --> E3 --> E4 --> E5 --> E6
    
    style Registration fill:#c8e6c9
    style Authentication fill:#bbdefb
    style ProtectedRequests fill:#fff9c4
    style TokenRefresh fill:#ffccbc
    style Logout fill:#ffccbc
```

---

## Summary

Sistem Habit Tracker menggunakan arsitektur **True Serverless** dengan komponen:

| Komponen | Teknologi | Role |
|----------|-----------|------|
| **Frontend** | React 19 + Vite + Zustand | UI, State Management, Auth |
| **Authentication** | AWS Cognito + JWT | User Registration, Login, Token Management |
| **Backend** | Node.js Lambda Functions | Business Logic, Data Operations |
| **API** | API Gateway HTTP API | Request Routing, CORS |
| **Database** | DynamoDB | Data Storage (Pay-Per-Request) |
| **Storage** | AWS S3 | File Uploads, Static Website |

**Key Features:**
- ✅ True Serverless (Individual Lambda per Endpoint)
- ✅ JWT-based Authentication
- ✅ Real-time Task & Habit Tracking
- ✅ Analytics & Streak Calculation
- ✅ File Upload Support
- ✅ Dark/Light Theme Toggle
- ✅ Responsive UI Design
