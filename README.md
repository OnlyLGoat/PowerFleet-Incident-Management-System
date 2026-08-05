# PowerFleet IMS — AI-Powered Incident Management System

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

### 🤖 AI-Powered Incident Diagnostics & Triage
- **AI Task Suggestions**: Automatically generates step-by-step diagnostic workflows for Technicians based on reported symptoms using advanced AI.
- **Smart Triage**: Automatically categorizes the priority (Low, Medium, High, Critical) and incident type based on the context of the user's report.
- **Similar Incident Detection**: Proactively surfaces historically resolved tickets with similar descriptions to accelerate the resolution process.

### ⏱️ SLA Compliance & Background Worker
- **Automated SLA Tracking**: Dedicated background cron jobs (`SlaService`) to monitor ticket progression and calculate Service Level Agreement (SLA) adherence (e.g., Warning Response, Breached Response, Met with Resolution Breached).
- **Graceful Fault Tolerance**: Safe loop executions designed to ignore concurrently deleted records and prevent cascading cron failures.

### 📋 Strict Sequential Sub-Tasks & Proof Management
- **Ordered Diagnostic Checklists**: Technicians must execute sub-tasks strictly in the sequential order set by the Support Manager. Subsequent steps are automatically locked until the previous one is marked complete.
- **Mandatory Proof Uploads**: Granular sub-task management where specific repair steps can be strictly enforced to require photo/document proof before they can be checked off.

### 🔐 Comprehensive Security & Audit Logging
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

## Role-Based Access Control

### 👤 Client Users
- Can **only** view incidents reported by them or belonging to their registered company fleet vehicles.
- Submit new incidents, post comments on their tickets, and track live status.
- Cannot alter incident priority/status or access internal technician tools.

### 🔧 Technicians
- Can **only** view incidents assigned directly to them.
- Access the dedicated Sub-Tasks widget to check off sequential repair steps and upload mandatory proof attachments.
- Cannot close, cancel, or reorder sub-tasks.

### 👑 Admins & Support Managers
- Full operational visibility across all system incidents, client accounts, vehicles, and technicians.
- Assign tickets to technicians and manually control status and priority.
- Generate, edit, and reorder diagnostic sub-tasks for technicians, and toggle required proof restrictions.

---

## API Endpoints Overview

| Scope                  | Examples |
| ---------------------- | ------------------------------------------------------------- |
| **Auth**               | `POST /api/auth/login`, `POST /api/auth/register`, `GET /me`  |
| **Incidents**          | `GET /api/incidents`, `POST /api/incidents`                   |
| **Tasks & Proofs**     | `PATCH /api/incidents/[id]/tasks/[taskId]`, `POST /tasks/reorder` |
| **AI Intelligence**    | `GET /api/ai/suggest-tasks`, `GET /api/ai/similar-incidents`  |
| **Cron & Background**  | `POST /api/cron/sla`                                          |

*All parameter parsing uses robust sanitization standards (e.g. `INC-048` cleanly maps to `48`) to ensure maximum resilience against faulty route payloads.*

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
