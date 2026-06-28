# Career Connect — Full Stack Application

AI-powered job matching platform for job seekers.

## Tech Stack

| Layer      | Technology                             |
|------------|----------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS         |
| Backend    | Node.js + Express                      |
| Database   | PostgreSQL + Prisma ORM                |
| AI         | OpenAI GPT-4o                          |
| Auth       | JWT                                    |
| File Upload| Multer                                 |
| Scraping   | Cheerio + Axios                        |

---

## Features

1. **Auth** — Register / Login with JWT
2. **CV Upload & Enhancement** — AI rewrites CV for ATS compatibility with score
3. **Skills Assessment** — Proctored (camera + microphone + tab-switch detection), AI-generated, AI-scored
4. **AI Job Matching** — Scrapes Wuzzuf, LinkedIn, Indeed → AI matches to verified skills
5. **Cover Letter Generator** — AI generates personalized cover letter per job
6. **Applications Tracker** — Kanban + list view with status tracking

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- OpenAI API key

---

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/careerconnect"
JWT_SECRET="your-secret-key-at-least-32-chars"
OPENAI_API_KEY="sk-your-openai-api-key"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

---

### 3. Setup Database

```bash
cd backend
npx prisma generate
npx prisma db push
```

---

### 4. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

### 5. Seed Demo Jobs (optional)

After starting, visit:
```
GET http://localhost:5000/api/jobs/seed
```
Or click "Load Demo Jobs" in the UI.

---

## API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### CV
```
POST /api/cv           (multipart/form-data: cv file + jobTitle)
GET  /api/cv
GET  /api/cv/:id
GET  /api/cv/:id/download
```

### Assessments
```
POST /api/assessments              (create)
GET  /api/assessments
GET  /api/assessments/:id
POST /api/assessments/:id/start
POST /api/assessments/:id/proctor  (log proctoring events)
POST /api/assessments/:id/submit   (submit answers)
```

### Jobs
```
GET /api/jobs           (list + search + filter)
GET /api/jobs/matches   (AI matched for current user)
GET /api/jobs/:id
GET /api/jobs/seed      (seed demo data)
```

### Applications
```
GET    /api/applications
POST   /api/applications           (apply to job)
PATCH  /api/applications/:id       (update status)
DELETE /api/applications/:id
POST   /api/applications/cover-letter (generate AI cover letter)
```

### Profile
```
GET   /api/profile
PATCH /api/profile
```

---

## Project Structure

```
career-connect/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── cv.controller.js
│   │   │   ├── assessment.controller.js
│   │   │   ├── job.controller.js
│   │   │   └── application.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── error.middleware.js
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── openai.service.js
│   │   │   └── scraper.service.js
│   │   └── utils/prisma.js
│   └── uploads/
└── frontend/
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── CVPage.jsx
        │   ├── AssessmentPage.jsx
        │   ├── JobsPage.jsx
        │   ├── ApplicationsPage.jsx
        │   └── ProfilePage.jsx
        ├── components/layout/DashboardLayout.jsx
        ├── services/api.js
        └── store/auth.store.js
```

---

## Production Deployment

```bash
# Frontend build
cd frontend && npm run build

# Serve with nginx or deploy to Vercel

# Backend
NODE_ENV=production node src/index.js
# Or use PM2: pm2 start src/index.js --name career-connect-api
```
