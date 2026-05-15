# Task Management — React Frontend

Single-page application (SPA) for the Task Management & Analytics Platform, built with **React 18 + Vite + Tailwind CSS**.

Consumes both the **Laravel API** and **Node.js** services.

---

## Live URLs

| Service | URL |
|---|---|
| **Frontend** | `https://task-management-react-e9ni.onrender.com` |
| **GitHub** | `https://github.com/ryncrdl/task-management-react` |
| **Laravel API** | `https://task-management-laravel-api.onrender.com/api` |
| **Node.js Service** | `https://task-management-node-services.onrender.com` |

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | ^18.3 | UI framework |
| Vite | ^5.3 | Build tool & dev server |
| Tailwind CSS | ^3.4 | Utility-first styling |
| React Router | ^6.24 | SPA routing |
| Axios | ^1.7 | HTTP client |
| Recharts | ^2.12 | Charts / Analytics |
| Socket.io-client | ^4.8 | Real-time WebSocket events |

---

## Local Setup

### Prerequisites
- Node.js 20+
- npm
- Laravel API running at `http://localhost:8000`
- Node.js service running at `http://localhost:3000`

### 1 · Clone & Install

```bash
git clone https://github.com/ryncrdl/task-management-react.git
cd task-management-react
npm install
```

### 2 · Environment

```bash
cp .env.example .env
```

`.env` (local):
```dotenv
VITE_LARAVEL_API_URL=http://localhost:8000/api
VITE_NODE_API_URL=http://localhost:3000/api
VITE_NODE_WS_URL=http://localhost:3000
```

### 3 · Start

```bash
npm run dev
# App available at http://localhost:5173
```

### 4 · Build for Production

```bash
npm run build
# Output in dist/
```

---

## Test Credentials

```
Admin:   admin@test.com    / password123
Manager: manager@test.com  / password123
Member:  member@test.com   / password123
```

---

## Pages & Features

| Page | Route | Roles | Description |
|---|---|---|---|
| Login | `/login` | All | JWT login form |
| Dashboard | `/dashboard` | All | Task overview + team stats |
| Tasks | `/tasks` | All | Full task list with filters + pagination |
| Task Detail | `/tasks/:id` | All | View / edit task, activity log, comments |
| Teams | `/teams` | Admin / Manager | Create teams, manage members |
| Users | `/users` | Admin | Create / edit / toggle users |
| Analytics | `/analytics` | Admin / Manager | Charts: productivity, completion rates |
| Settings | `/settings` | All | Profile & preferences |
| Cron Jobs | `/cron-jobs` | Admin | Monitor & manually trigger cron jobs |

---

## Architecture

```
React SPA (Vite)
  │
  ├── laravelApi (Axios)  →  Laravel API  :8000
  │     Bearer: JWT
  │
  └── nodeApi (Axios)     →  Node.js Service  :3000
        Bearer: JWT
        WebSocket: Socket.io
```

### Auth Flow

1. User submits login → `POST /api/auth/login` (Laravel)
2. JWT stored in memory via `AuthContext`
3. Both Axios instances attach `Authorization: Bearer <token>` automatically
4. On `401` response → redirect to `/login`
5. Token refreshed on `419` via `POST /api/auth/refresh`

---

## Notification Queue UI (Admin)

The **Cron Jobs** page (`/cron-jobs`) lets admins:

- View notification job queue (pending / processing / sent / failed)
- Retry or delete individual jobs
- See job stats (total, sent, failed)
- Manually trigger any cron job:
  - **Notification Processor** (process queued emails now)
  - **Daily Digest**
  - **Deadline Reminder**
  - **Task Cleanup**
- Restart the entire cron scheduler

---

## Deployment (Render.com Static Site)

1. Create a **Static Site** and connect `ryncrdl/task-management-react`
2. **Build Command:** `npm run build`
3. **Publish Directory:** `dist`
4. Add environment variables:
   ```
   VITE_LARAVEL_API_URL=https://task-management-laravel-api.onrender.com/api
   VITE_NODE_API_URL=https://task-management-node-services.onrender.com/api
   VITE_NODE_WS_URL=https://task-management-node-services.onrender.com
   ```
5. Add a rewrite rule: `/* → /index.html` (200) for SPA routing

---

## Bonus Features Implemented

- ✅ Real-time task updates via Socket.io
- ✅ Activity log display on task detail page
- ✅ Comment system (add / view comments per task)
- ✅ Analytics charts with Recharts
- ✅ CSV / JSON / XLSX export modal
- ✅ Custom task filter presets (save & load)
- ✅ Cron job admin panel with manual triggers
- ✅ Toast notification system
- ✅ Loading states on all async operations
- ✅ Role-based UI (hide/show elements by role)
