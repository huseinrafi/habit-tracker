# Arsitektur AWS — Habit Tracker

## Mermaid Diagram

```mermaid
graph TB
    subgraph "AWS Cloud"
        subgraph "Frontend"
            S3_Web["S3 Static Website<br/>habit-tracker-web-...-prod"]
            CF["CloudFront<br/>(optional)"]
        end

        subgraph "API Layer"
            APIGW["API Gateway HTTP API v2<br/>r12t2i4xh3.execute-api..."]
        end

        subgraph "Backend"
            LAMBDA["Lambda<br/>habit-tracker-api<br/>Node.js 22.x, 512MB"]
            AUTH["Auth Middleware<br/>(bypassed)"]
        end

        subgraph "Storage"
            DYNAMODB[("DynamoDB")]
            S3_ATTACH["S3 Attachments<br/>habit-tracker-attachments-..."]
        end

        subgraph "IAM"
            LAMBDA_ROLE["LabRole<br/>(Lambda Execution Role)"]
        end
    end

    subgraph "User"
        BROWSER["Browser"]
    end

    BROWSER -- "HTTP / static files" --> S3_Web
    BROWSER -- "GET/POST /api/*" --> APIGW
    APIGW -- "AWS_PROXY v2.0" --> LAMBDA
    LAMBDA --> AUTH
    LAMBDA --> DYNAMODB
    LAMBDA --> S3_ATTACH
    LAMBDA --> LAMBDA_ROLE

    DYNAMODB -->|"Tables"| T1["HabitTracker_Users"]
    DYNAMODB -->|"Tables"| T2["HabitTracker_Tasks"]
    DYNAMODB -->|"Tables"| T3["HabitTracker_Habits"]
    DYNAMODB -->|"Tables"| T4["HabitTracker_Logs"]
```

## Alur Request

```
Browser ──► S3 (static assets: HTML, JS, CSS)
   │
   └──► API Gateway ──► Lambda ──► Auth (bypass) ──► DynamoDB
                                                      │
                                                      └──► S3 (attachments)
```

## Komponen Utama

| Komponen | Fungsi |
|----------|--------|
| **S3 Web** | Hosting SPA (Vite build output), bucket policy public |
| **API Gateway HTTP API** | Entry point API, CORS enabled, forward ke Lambda |
| **Lambda** | Backend Express.js via serverless-http, IAM Role = LabRole |
| **DynamoDB** | 4 tabel NoSQL untuk Users, Tasks, Habits, Logs |
| **S3 Attachments** | Upload file user (gambar habit, dll) |

## Kelemahan / Next

- **Tidak ada CDN** — S3 langsung serving; bisa tambah CloudFront untuk caching + HTTPS custom domain.
- **Cold start Lambda** — request pertama lambat (Node.js + Express bundle).
- **Auth stubbed** — tidak ada JWT/register/login.
- **No CI/CD** — deploy manual via AWS CLI.
