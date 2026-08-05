# PowerFleet IMS — Incident Management System

> A state-of-the-art, AI-driven fleet incident management platform built with Next.js 16, React 19, TypeScript, Drizzle ORM, and PostgreSQL.

## Table of Contents

- [Overview](#overview)
- [Key Functionality & Features](#key-functionality--features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema & Roles](#database-schema--roles)
- [AI Intelligence Features](#ai-intelligence-features)
- [Role-Based Access Control](#role-based-access-control)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [CI/CD](#cicd)

---

## Overview

PowerFleet IMS allows fleet management companies to track, triage, and manage incidents reported by their clients. Clients can register, report incidents on their vehicles, and track their resolution. Internal staff (Technicians, Support Managers, Admins) handle, assign, and resolve incidents seamlessly with AI-driven diagnostics, SLA compliance tracking, and strict role-based access control.

---

## Key Functionality & Features

### AI-Powered Incident Diagnostics & Triage
- **AI Task Suggestions**: Automatically generates step-by-step diagnostic workflows for Technicians based on reported symptoms using advanced AI.
- **Smart Triage**: Automatically categorizes the priority (Low, Medium, High, Critical) and incident type based on the context of the user's report.
- **Similar Incident Detection**: Proactively surfaces historically resolved tickets with similar descriptions to accelerate the resolution process.

### SLA Compliance & Background Worker
- **Automated SLA Tracking**: Dedicated background cron jobs (`SlaService`) to monitor ticket progression and calculate Service Level Agreement (SLA) adherence (e.g., Warning Response, Breached Response, Met with Resolution Breached).
- **Graceful Fault Tolerance**: Safe loop executions designed to ignore concurrently deleted records and prevent cascading cron failures.

### Strict Sequential Sub-Tasks & Proof Management
- **Ordered Diagnostic Checklists**: Technicians must execute sub-tasks strictly in the sequential order set by the Support Manager. Subsequent steps are automatically locked until the previous one is marked complete.
- **Mandatory Proof Uploads**: Granular sub-task management where specific repair steps can be strictly enforced to require photo/document proof before they can be checked off.

### Comprehensive Security & Audit Logging
- **Automated Audit Wrapper**: All API routes are wrapped with an auditing higher-order function (`withAudit`) that tracks user IDs, IP addresses, attempted endpoints, and HTTP status codes into the `security_audit_events` table.
- **Soft-Delete Protocol**: Robust data preservation using `deletedAt` timestamps across all entities instead of redundant boolean flags. Soft-deleted resources become strictly invisible to everyone except Admins.

---

## Tech Stack

| Category       | Technology                               |
| -------------- | ---------------------------------------- |
| **Framework**  | Next.js 16 (App Router) + React 19       |
| **Language**   | TypeScript (strict mode)                 |
| **Styling**    | Tailwind CSS v4 + Framer Motion          |
| **Database**   | PostgreSQL via `postgres` driver         |
| **ORM**        | Drizzle ORM 0.45.x                       |
| **AI Layer**   | LangChain + @langchain/google-genai      |
| **Auth**       | bcryptjs + JSON Web Tokens               |
| **Testing**    | Vitest 4.x + Supertest                   |
| **Linting**    | ESLint 9.x (`eslint-config-next`)        |
| **CI**         | GitHub Actions + SonarCloud Analysis     |

---

## Architecture

The project follows a layered architecture with clear separation of concerns, structured strictly according to UML specifications:

```text
HTTP Request
    │
    ▼
Next.js App Router (app/api/*/route.ts)
    │
    ▼
JWT Auth Middleware (middleware/auth.ts)
    │  • Extracts & verifies Bearer token
    │  • Dynamically resolves role permissions
    │
    ▼
Route Handlers (app/api/*/route.ts)
    │  • Wrapped in withAudit to log security events
    │  • Validates payloads using Zod
    │  • Delegates to static OOP Service classes
    │
    ▼
OOP Service Layer (lib/services/*)
    │  • Enforces sequential sub-task execution
    │  • Enforces soft-delete & user status validations
    │  • Contains core business logic
    │
    ▼
Database Layer (db/)
    │  • Drizzle ORM client
    │  • Postgres execution
```

---

## Database Schema & Roles

The system uses Class Table Inheritance (CTI) for role management, avoiding single-table boolean logic for cleaner relations.

### Project Tables
| Table | Description |
|---|---|
| **`users`** | Base abstract entity for all accounts. Stores name, email, credentials, and soft-delete states. |
| **`internal_users`** | Inherits `users`. Base entity for staff (Admin, Support Manager, Technician). |
| **`admins`** | Inherits `internal_users`. Highest privilege. Can manage users, client accounts, and system data. |
| **`support_managers`** | Inherits `internal_users`. Triage supervisors. Can reassign incidents, generate sub-tasks, and toggle proof rules. |
| **`technicians`** | Inherits `internal_users`. Field engineers. Can only view assigned tickets and execute checklists. |
| **`clients`** | Inherits `users`. External companies. Linked to multiple vehicles. Can report and comment on tickets. |
| **`vehicles`** | Fleet assets linked to clients. Tracks IMEI, VIN, and license plates. |
| **`incidents`** | Core entity for tickets. Stores priority, status, geo-location, assigned technician, SLA times, and reported vehicle. |
| **`incident_tasks`** | Diagnostic checklists. Supports strict sequential execution, locked statuses, and mandatory photo proofs. |
| **`incident_comments`** | Public and private chatter threads on an incident. |
| **`incident_internal_notes`** | Staff-only private notes. Supports pinning. |
| **`incident_attachments`** | Uploaded files and photos linked to incidents. |
| **`incident_events`** | Audit trail timeline of ticket activity (e.g., status changes, reassignments). |
| **`impact_links`** | Tracks cascading impact rules when a vehicle goes out of service. |
| **`generated_reports`** | Automated PDF/JSON exports tracking fleet resolution stats. |
| **`security_audit_events`** | System-wide audit log tracking IP addresses, endpoints, and status codes of all HTTP requests. |

---

## Role-Based Access Control

### Client Users
- Can **only** view incidents reported by them or belonging to their registered company fleet vehicles.
- Submit new incidents, post comments on their tickets, and track live status.
- Cannot alter incident priority/status or access internal technician tools.

### Technicians
- Can **only** view incidents assigned directly to them.
- Access the dedicated Sub-Tasks widget to check off sequential repair steps and upload mandatory proof attachments.
- Cannot close, cancel, or reorder sub-tasks.

### Admins & Support Managers
- Full operational visibility across all system incidents, client accounts, vehicles, and technicians.
- Assign tickets to technicians and manually control status and priority.
- Generate, edit, and reorder diagnostic sub-tasks for technicians, and toggle required proof restrictions.

---

## API Endpoints Overview

The Next.js App Router exposes the following highly structured REST API endpoints:

### Authentication & Users
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/me` | `GET` | Fetches the currently authenticated user's session and dynamically resolved CTI roles. |
| `/api/users` | `GET`, `POST` | Admin list of users and account creation. |
| `/api/users/[id]` | `PATCH`, `DELETE` | Update roles, lock accounts, or soft-delete users. |
| `/api/technicians` | `GET` | Fetches available technicians for Support Managers to assign. |

### Incidents
| Endpoint | Method | Description |
|---|---|---|
| `/api/incidents` | `GET`, `POST` | List incidents (role-filtered) and report new fleet incidents. |
| `/api/incidents/stats` | `GET` | Aggregated dashboard stats for revenue, SLA breaches, and ticket volume. |
| `/api/incidents/[id]` | `GET`, `PATCH`, `DELETE` | Fetch, update priority/status, or soft-delete a specific incident. |
| `/api/incidents/[id]/report` | `GET` | Generates a downloadable PDF report summarizing the incident. |

### Tasks & Workflows
| Endpoint | Method | Description |
|---|---|---|
| `/api/my-tasks` | `GET` | Fetch open sub-tasks directly assigned to the logged-in Technician. |
| `/api/incidents/[id]/tasks` | `GET`, `POST` | List sub-tasks or create a new diagnostic step. |
| `/api/incidents/[id]/tasks/[taskId]` | `PATCH`, `DELETE` | Check off a task, upload proof, or remove a task. Enforces sequence logic. |
| `/api/incidents/[id]/tasks/reorder` | `POST` | Support Manager route to adjust the `order` array of a checklist. |

### Attachments & Impact
| Endpoint | Method | Description |
|---|---|---|
| `/api/incidents/[id]/attachments` | `GET`, `POST` | List files or upload new photos/documents. |
| `/api/incidents/[id]/attachments/[attachmentId]` | `DELETE` | Remove a specific file from the incident record. |
| `/api/incidents/[id]/impact` | `GET`, `POST` | Link vehicle impacts and downstream delays. |
| `/api/uploads/[filename]` | `GET` | Serve static file uploads securely. |

### AI Intelligence 
| Endpoint | Method | Description |
|---|---|---|
| `/api/ai/suggest-tasks` | `GET` | Prompts GenAI to analyze the incident title/description and returns diagnostic tasks. |
| `/api/ai/approve` | `POST` | Bulk-saves Support Manager-approved AI sub-tasks into the database. |
| `/api/ai/similar-incidents` | `GET` | Semantic search for previously resolved tickets matching current vehicle symptoms. |
| `/api/ai/triage` | `GET` | Smart triage inference to categorize incident priority and type. |

### Background Workers & Audit
| Endpoint | Method | Description |
|---|---|---|
| `/api/cron/sla` | `POST` | Background worker route (protected via cron secret) that evaluates and flags SLA breaches. |
| `/api/audit-logs` | `GET` | Admin-only feed of all `security_audit_events` (logins, failed attempts, data breaches). |

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/OnlyLGoat/PowerFleet-Incident-Management-System.git
   cd powerfleet_ims
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Duplicate `.env.example` to `.env.local` and configure your database and JWT secrets.

4. **Initialize Database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

---

## CI/CD

- **GitHub Actions**: Linting (`npm run lint`), Typechecking (`tsc --noEmit`), and Vitest (`npm run test`) automatically run on PRs and pushes to `develop`/`main`.
- **SonarCloud**: Integrated for automated code quality gating, catching code smells, security vulnerabilities, and enforcing maximum Cognitive Complexity limits.

---
*Built for absolute performance, scale, and uncompromising security.*