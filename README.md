# 🌟 SevaLink AI: Smart Resource Allocation System

SevaLink AI is an intelligent, real-time disaster relief and community resource management platform. Designed for high-stress, rapid-response scenarios, the platform uses intelligent algorithms to pair critical community needs (e.g., Water, Medical, Logistics) with the most optimal, locally-available volunteers based on geographic proximity and skill sets.

## 🚀 Key Features

* **Intelligent Assignment Engine:** Uses optimized matching algorithms (including the Hungarian matching algorithm) and enhanced skill-and-location-based heuristics to instantly allocate volunteers to crisis zones.
* **Interactive Crisis Map:** A live geographic heatmap visualizing real-time crisis density across India, clustering needs so coordinators can visually prioritize aid deployment.
* **Real-time Telemetry Dashboard:** Live tracking of system stability, remaining free volunteers, active vs. resolved needs, and an integrated Indian Standard Time (IST) tracking system.
* **Predictive Simulation Mode:** Allows administrators to inject simulated "future crises" into the system to test load capacity, run simulated allocations, and visualize "what-if" scenarios without disrupting real operations.
* **Zero-Latency Assignment:** Built for speed during critical times. The matching engine evaluates hundreds of candidates in milliseconds to provide priority dispatch routing.

## 🛠️ Technology Stack

* **Frontend:** React.js, Vite, Tailwind CSS, Recharts, Chart.js, Lucide Icons.
* **Backend:** FastAPI (Python), SQLite (Lightweight & portable database), Scipy/Numpy (Hungarian Algorithm processing).
* **Location Processing:** Geopy & real-world coordinate mapping.

## ⚙️ Quick Start Guide

### 1. Start the Backend (FastAPI)
```bash
cd sevalink-ai-backend
python -m venv env
source env/bin/activate  # (On Windows: env\Scripts\activate)
pip install -r requirements.txt

# Start the API server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Seed the Demo Database
In a new terminal window, populate the database with hackathon-ready test data (9 needs spread across India, 20 volunteers):
```bash
cd sevalink-ai-backend
python seed.py
```

### 3. Start the Frontend (React/Vite)
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5174` in your browser to access the live Mission Control Dashboard.

## 💡 Demo Workflow

1. **Dashboard Overview:** View live telemetry and the IST clock. Notice the "Free Volunteers" count automatically calculates based on registered individuals vs. assigned tasks.
2. **Crisis Map:** Click the "Map" tab to see the heatmap. Observe the dense cluster of 3 unique coordinates specifically generated in Ahmedabad.
3. **Run Allocation Matcher:** Click the "Run Allocation Matcher" button in the Priority Actions panel. Watch the system perform global optimization and visually embed assignment cards showing *Who* is going *Where*.
4. **Predictive Simulations:** Expand the "Simulations" tab on the right, run a simulation, and see the map populate with yellow theoretical data points.
5. **Add Custom Needs:** Click the `+ Report New Need` button to dynamically inject a custom event into the live system.

---
*Built for rapid disaster response. Every second counts.*
