# Task Management React Frontend

Single-page React application for the Task Management & Analytics Platform.

Consumes both the **Laravel API** and **Node.js** services.

## Live Deployment

> Update after deploying.

- **Frontend URL:** `https://your-frontend.render.com`

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | ^18.3 | UI framework |
| Vite | ^5.3 | Build tool |
| Tailwind CSS | ^3.4 | Styling |
| React Router | ^6.24 | SPA routing |
| Axios | ^1.7 | HTTP client |
| Recharts | ^2.12 | Charts/Analytics |

---

## Local Setup

### Prerequisites

- Node.js 20+
- Running Laravel API on port 8000
- Running Node.js services on port 3000

### Installation

```bash
# 1. Clone / navigate to the react project
cd task-management-react

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Set your API URLs in .env:
#    VITE_LARAVEL_API_URL=http://localhost:8000/api
#    VITE_NODE_API_URL=http://localhost:3000/api

# 5. Start development server
npm run dev
# Frontend at http://localhost:5173

# Build for production
npm run build
```

---

## Pages

| Page | Path | Roles |
|---|---|---|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All |
| Tasks List | `/tasks` | All |
| Task Detail | `/tasks/:id` | All |
| Teams | `/teams` | All |
| Users | `/users` | Admin, Manager |
| Analytics | `/analytics` | Admin, Manager |
| Settings | `/settings` | All |

---

## Features

- **JWT Auth** — token stored in `localStorage`, auto-injected on every request
- **Role-based UI** — menus and actions shown/hidden based on user role
- **Task management** — create, edit, update status, delete tasks
- **Status transitions** — enforced on UI matching backend rules
- **Filters & pagination** — filter by status, priority, assignee
- **Export modal** — download team tasks as CSV / JSON / Excel
- **Analytics charts** — bar + pie charts using Recharts
- **Toast notifications** — success/error feedback on all operations
- **Loading states** — spinners on all async operations
- **401 redirect** — auto-redirect to `/login` on expired token

---

## Demo Credentials

```
Admin:   admin@test.com    / password123
Manager: manager@test.com  / password123
Member:  member@test.com   / password123
```

---

## Deployment (Render Static Site)

1. Create a **Static Site** on Render
2. Set **Build Command:** `npm run build`
3. Set **Publish Directory:** `dist`
4. Add environment variables:
   - `VITE_LARAVEL_API_URL=https://your-laravel.render.com/api`
   - `VITE_NODE_API_URL=https://your-node.render.com/api`
5. Add redirect rule: `/* → /index.html` (for SPA routing)
