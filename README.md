# ProcureFlow — Purchase Requisition System

A full-stack purchase requisition app built entirely on an **open-source stack** and designed to run on **free cloud tiers**.

- **Frontend** — React 18 + Vite + Tailwind CSS, with Framer Motion animations, Recharts analytics and react-hot-toast notifications. → deploys to **Vercel** (free).
- **Backend** — Node.js + Express REST API with JWT auth (bcrypt-hashed passwords). → deploys to **Render** (free).
- **Database** — PostgreSQL. → hosted free on **Neon**.

Everything here is MIT-licensed open source and the entire system runs at **$0/month**.

---

## ✨ Features

- **Real authentication** — register / login, JWT sessions, bcrypt password hashing, role-based access (requestor vs. admin).
- **Requestor experience** — submit requisitions with up to 40 line items + quantities, live catalog autocomplete, status tracking with admin feedback.
- **Admin / Receiver experience** — pending inbox with live badge, all-requests view with status filters, one-click approve/reject with notes.
- **Analytics dashboard** — server-side aggregated daily / weekly / monthly charts, status distribution pie, and top-requested-items ranking.
- **Rich, responsive UI** — animated sidebar, mobile drawer, skeleton loaders, modals, toasts, dark design system.

---

## 🏗 Architecture

```
┌──────────────────────────┐        HTTPS / JSON        ┌──────────────────────────┐
│   client/  (Vite+React)  │  ───────────────────────▶  │   server/  (Express API) │
│   Tailwind · Framer ·    │   Bearer JWT in header     │   JWT auth · bcrypt ·    │
│   Recharts               │  ◀───────────────────────  │   role middleware        │
│   → Vercel (static CDN)  │                            │   → Render (Node web)    │
└──────────────────────────┘                            └────────────┬─────────────┘
                                                                      │  pg pool (SSL)
                                                                      ▼
                                                          ┌──────────────────────────┐
                                                          │  PostgreSQL  → Neon free  │
                                                          │  users · catalog ·        │
                                                          │  requests · request_items │
                                                          └──────────────────────────┘
```

**Repo layout (monorepo):**

```
purchase-requisition-system/
├── client/                 # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── api/client.js        # typed fetch wrapper (token handling)
│   │   ├── context/AuthContext  # session / login state
│   │   ├── components/          # Shell, Modal, Reports, ui primitives
│   │   ├── pages/               # Login, RequestorDashboard, AdminDashboard
│   │   ├── App.jsx · main.jsx · index.css
│   ├── vite.config.js · tailwind.config.js · vercel.json
│
├── server/                 # Node + Express + Postgres API
│   ├── src/
│   │   ├── db/                  # pool.js, schema.sql, migrate.js, seed.js
│   │   ├── middleware/auth.js   # JWT sign/verify, requireRole
│   │   ├── routes/              # auth, items, requests, reports
│   │   └── index.js             # app entry
│   └── .env.example
│
└── render.yaml             # one-click Render blueprint for the API
```

**API endpoints**

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Get JWT |
| GET | `/api/auth/me` | user | Current user |
| GET | `/api/items?search=` | user | Catalog autocomplete |
| GET | `/api/requests?status=` | user | Own requests (requestor) / all (admin) |
| POST | `/api/requests` | user | Create requisition |
| PATCH | `/api/requests/:id/status` | admin | Approve / reject |
| GET | `/api/reports/summary` | admin | Aggregated analytics |

---

## 🚀 Local development

**Prerequisites:** Node 18+, and a Postgres database (local install, Docker, or a free Neon URL).

### 1. Database

Create a database and grab its connection string. Quick options:

```bash
# Local Postgres
createdb procureflow
# → postgres://postgres:postgres@localhost:5432/procureflow

# …or use a free Neon database: https://neon.tech  → copy the connection string
```

### 2. Backend

```bash
cd server
cp .env.example .env          # then edit DATABASE_URL (and set PGSSL=true for Neon)
npm install
npm run migrate               # create tables
npm run seed                  # demo users, catalog, 30 days of sample requests
npm run dev                   # API on http://localhost:4000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev                   # app on http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:4000`, so no CORS setup is needed locally.

### Demo logins

All seeded users share the password **`password123`**:

| Email | Role |
| ----- | ---- |
| `sarah@procureflow.dev` | Admin / Receiver |
| `mike@procureflow.dev` | Admin / Receiver |
| `alice@procureflow.dev` | Requestor (IT) |
| `bob@procureflow.dev` | Requestor (Finance) |
| `carol@procureflow.dev` | Requestor (HR) |
| `david@procureflow.dev` | Requestor (Operations) |

---

## ☁️ Deploy to free cloud

### Step 1 — Database (Neon, free)

1. Create a project at [neon.tech](https://neon.tech) and copy the **connection string** (`postgres://…?sslmode=require`).
2. From your machine, point `server/.env` at it (`PGSSL=true`) and run `npm run migrate && npm run seed` once to initialise it.

### Step 2 — API (Render, free)

Render auto-detects [`render.yaml`](render.yaml):

1. Push this repo to GitHub.
2. Render dashboard → **New + → Blueprint** → select the repo.
3. Set the two `sync:false` env vars in the dashboard:
   - `DATABASE_URL` → your Neon string
   - `CORS_ORIGIN` → your Vercel URL (fill in after Step 3, e.g. `https://procureflow.vercel.app`)
4. Deploy. Your API is live at `https://procureflow-api.onrender.com`.
   > Free Render web services sleep after inactivity; the first request after idle takes ~30s to wake.

### Step 3 — Frontend (Vercel, free)

1. Vercel → **Add New Project** → import the repo.
2. Set **Root Directory** to `client`.
3. Add an environment variable:
   - `VITE_API_URL` → your Render API origin (e.g. `https://procureflow-api.onrender.com`)
4. Deploy. Vercel builds with Vite and serves the SPA from its CDN.
5. Copy the resulting URL back into Render's `CORS_ORIGIN` and redeploy the API.

That's it — a fully open-source purchase requisition system running free in the cloud.

---

## 🧰 Tech stack

| Layer | Tech |
| ----- | ---- |
| UI | React 18, Vite, Tailwind CSS, Framer Motion, lucide-react, Recharts, react-hot-toast, date-fns |
| API | Node.js, Express, jsonwebtoken, bcryptjs, pg |
| Data | PostgreSQL |
| Hosting | Vercel (web) · Render (API) · Neon (Postgres) — all free tier |

## 🔒 Notes & next steps

- Passwords are bcrypt-hashed; JWTs are signed with `JWT_SECRET` (rotate in production).
- Possible extensions: email notifications, CSV/PDF export, audit log, budget limits per department, refresh tokens.
