# SevaLink AI — Community Needs Intelligence & Volunteer Matching System

A hackathon MVP that digitizes paper surveys using OCR, scores community needs by urgency, and intelligently matches available volunteers to tasks in real time.

---

## 🏗️ Project Structure

```
Google Solution Challenge/
└── sevalink-ai-backend/          ← FastAPI Python Backend
    ├── app/
    │   ├── main.py               ← FastAPI app entry point
    │   ├── database.py           ← SQLite / PostgreSQL connection
    │   ├── models/               ← SQLAlchemy ORM models
    │   ├── schemas/              ← Pydantic validation schemas
    │   ├── routers/              ← REST API endpoints
    │   ├── services/             ← Priority & Matching algorithms
    │   └── utils/                ← OCR extraction utilities
    ├── seed.py                   ← Demo data seeder
    └── requirements.txt

Smart Resource Allocation/        ← Next.js Frontend
    ├── app/
    │   ├── page.tsx              ← Landing page
    │   ├── dashboard/page.tsx    ← Command Center (live API data)
    │   ├── volunteer/page.tsx    ← Volunteer registration & matching
    │   └── ocr/page.tsx          ← Survey image upload (OCR)
    └── components/
        ├── Navbar.tsx
        └── NeedsMap.tsx          ← Leaflet map with live Need markers
```

---

## 🚀 Quick Start (Hackathon Demo Setup)

### Step 1 — Start the Python Backend

```powershell
cd "sevalink-ai-backend"

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server (hot-reload enabled)
uvicorn app.main:app --reload
```

The API will be live at: **http://localhost:8000**
Interactive Swagger docs at: **http://localhost:8000/docs**

---

### Step 2 — Seed the Demo Database

While the backend is running, open a second terminal:

```powershell
cd "sevalink-ai-backend"
.\venv\Scripts\activate
python seed.py
```

This inserts **7 community needs** and **7 volunteers** across Ahmedabad, Surat, Pune, Mumbai, and Delhi.

---

### Step 3 — Start the Next.js Frontend

```powershell
cd "Smart Resource Allocation"
npm install
npm run dev
```

Frontend live at: **http://localhost:3000**

---

## 🔑 Key Features

| Feature | Route | Description |
|---|---|---|
| **Landing Page** | `/` | Hero + feature cards |
| **Command Center** | `/dashboard` | Live crisis map + volunteer dispatch hub |
| **Volunteer Portal** | `/volunteer` | Register + get real-time mission matches |
| **OCR Survey Scan** | `/ocr` | Upload a paper survey image → auto-extract need data |

---

## 🧠 API Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/needs/upload` | Create a community need (JSON) |
| `POST` | `/api/needs/upload-image` | Upload a survey image (OCR) |
| `GET` | `/api/needs` | List all needs ordered by priority |
| `POST` | `/api/volunteers/` | Register a volunteer |
| `GET` | `/api/volunteers/` | List all volunteers |
| `GET` | `/api/matches/recommend/{need_id}` | Get top volunteers for a need |
| `GET` | `/api/matches/for-volunteer/{id}` | Get top needs matching a volunteer |

---

## ⚙️ OCR Setup (Tesseract)

For the OCR endpoint to work, Tesseract must be installed on your system:

- **Windows**: Download from [UB-Mannheim releases](https://github.com/UB-Mannheim/tesseract/wiki)
- After install, ensure `tesseract` is on your `PATH`

Survey image tips for best OCR accuracy:
- Write or print clearly: `Location: Ahmedabad`
- Include: `Urgency: Critical`
- Include: `People Affected: 300`
- Include keywords: Medical, Water, Food, Education

---

## 🔮 Extension Ideas (Post-Hackathon)

- **Gemini LLM integration**: Replace regex parsing with a Gemini API call for smarter OCR text extraction
- **WhatsApp Bot**: Twilio webhook → parse natural language → auto-trigger need creation
- **PostgreSQL on Cloud**: Deploy backend to Railway or Render with a free Postgres instance
- **Real geocoding**: Use Google Maps Geocoding API to convert location strings to lat/lng
- **Volunteer app**: React Native mobile app for field workers
