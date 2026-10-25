# INCUBRIX SCRIPT & VOICEOVER TO B-ROLL VIDEO ENGINE

An enterprise-grade, full-stack creative web engine that transforms written scripts or uploaded audio voiceovers into fully rendered, captioned B-roll videos. 

Built for **IncuBrix Engineering Assessment 3**, this system features neural speech synthesis, intelligent sentence timing segmentation, modular footage provider discovery with rights verification, deterministic procedural fallback graphics, SubRip caption generation, and multi-aspect ratio video rendering (16:9, 9:16, 1:1) powered by FFmpeg and FFprobe.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │    React 18 + TypeScript + Vite UI    │
                      │  (Charcoal, Lime & Coral Design System) │
                      └──────────────────┬────────────────────┘
                                         │ HTTP / REST / JSON
                                         ▼
                      ┌───────────────────────────────────────┐
                      │       FastAPI Backend Application     │
                      │   - Pydantic v2 Request Validation    │
                      │   - Structured JSON Logging & Corr ID │
                      │   - Idempotency-Key Deduplication     │
                      │   - Health & Readiness Probes         │
                      └───────┬───────────────────────┬───────┘
                              │                       │
               ┌──────────────▼──────────┐     ┌──────▼──────────────────┐
               │  Async SQLite Database  │     │  Persistent Job Queue   │
               │  & SQLAlchemy Repos     │     │  & Async Worker Loop    │
               └─────────────────────────┘     └──────┬──────────────────┘
                                                      │
         ┌─────────────────────────┬──────────────────┴───────────────┬─────────────────────────┐
         ▼                         ▼                                  ▼                         ▼
┌──────────────────┐    ┌────────────────────┐            ┌──────────────────────┐    ┌───────────────────┐
│ Speech Synthesis │    │   Scene Planner    │            │   Footage Selector   │    │  Video Rendering  │
│ - EdgeTTS Neural │    │ - Semantic Bounds  │            │ - Pexels Stock API   │    │ - FFmpeg 9.0 Core │
│ - Tone Generator │    │ - Timing Continuity│            │ - Pixabay Stock API  │    │ - 16:9, 9:16, 1:1 │
│ - FFprobe Audio  │    │ - Non-overlapping  │            │ - Local Procedural   │    │ - Burn-in Captions│
└──────────────────┘    └────────────────────┘            └──────────────────────┘    └───────────────────┘
```

---

## 1. Prerequisites (Windows)

The application has been tested on Windows 10/11 and Linux with zero paid dependencies required:

1. **Python 3.11+** (Python 3.14 tested and supported).
2. **Node.js 20+** and `npm`.
3. **FFmpeg & FFprobe** (Automatically detected from WinGet, PATH, or configured via `.env`).
4. **Git**.
5. *(Optional)* Docker and Docker Compose.

---

## 2. Windows Quickstart (Step-by-Step)

Open PowerShell and follow these exact commands:

### Step 1: Clone or Navigate to Project Directory
```powershell
cd c:\Users\HAI\OneDrive\Pictures\INCUBRIX
```

### Step 2: Set Up Backend Virtual Environment
```powershell
# Create Python virtual environment
py -m venv backend\venv

# Activate virtual environment (if execution policy permits)
.\backend\venv\Scripts\Activate.ps1

# Install backend dependencies
.\backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

### Step 3: Install Frontend Dependencies
```powershell
cd frontend
npm.cmd install
cd ..
```

### Step 4: Configure Environment Settings
```powershell
# Copy the example configuration
Copy-Item .env.example .env
```
*(All defaults work out-of-the-box without paid API keys!)*

---

## 3. Running the Application

### Option A: Running Locally (Recommended for Development)

Open two terminal tabs:

**Terminal 1 (FastAPI Backend):**
```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend Swagger Docs will be available at:* `http://127.0.0.1:8000/docs`

**Terminal 2 (React Vite Frontend):**
```powershell
cd frontend
npm.cmd run dev
```
*Frontend Studio Dashboard will open at:* `http://localhost:5173`

---

### Option B: Running with Docker Compose

If Docker Desktop is running on your machine:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- MinIO Storage Console: `http://localhost:9001` (User: `incubrixadmin`, Pass: `incubrixpassword2026`)

---

## 4. Running Automated Tests

Run the Pytest suite covering all 15 integration workflows:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

Tests include:
- Script input and audio upload validation
- Unsupported and corrupted audio detection
- Monotonic, non-overlapping sentence timing coverage
- SubRip (`.srt`) syntax validation
- Footage provider deduplication and rights verification
- FFmpeg multi-aspect ratio rendering (16:9, 9:16, 1:1) and FFprobe stream verification
- End-to-end video generation and partial scene replacement rerendering
- Health and readiness status checks
- Idempotency key deduplication

---

## 5. CLI Batch Runner

You can process scripts or audio files in batch mode directly from the command line:

```powershell
# Run a sample script
.\backend\venv\Scripts\python.exe backend/cli.py --input test_pack/sample_scripts/tech_innovation.json --output-dir test_pack/outputs

# Run on an entire directory of scripts
.\backend\venv\Scripts\python.exe backend/cli.py --input test_pack/sample_scripts --output-dir test_pack/outputs
```

Outputs will be saved in `test_pack/outputs/<ProjectName>/`:
- `video_16x9.mp4`
- `captions.srt`
- `timeline.json`
- `manifest.json`

---

## 6. API Reference

All routes are mounted under `/api/v1/`:

### Submit Job
`POST /api/v1/broll/jobs`
```json
{
  "project_name": "AI Explainer",
  "script": "Artificial intelligence creates beautiful B-roll video assets automatically.",
  "voice": "en-US-AriaNeural",
  "aspect_ratios": ["16:9", "9:16"],
  "style": "bright, modern, real-world footage",
  "avoid": ["realistic generated faces"],
  "captions": {
    "burn_in": true,
    "srt": true
  }
}
```
**Response:** `HTTP 202 Accepted`
```json
{
  "job_id": "912c5c33-9523-406b-b5c6-ae01423b7562",
  "project_name": "AI Explainer",
  "status": "queued",
  "progress": 0,
  "stage": "queued",
  "aspect_ratios": ["16:9", "9:16"]
}
```

### Inspect Job Status
`GET /api/v1/jobs/{job_id}`

### Replace Scene Footage & Rerender
`POST /api/v1/jobs/{job_id}/scenes/{scene_id}/replace`
```json
{
  "visual_hint": "modern analytics dashboard financial growth chart",
  "provider": "pexels",
  "rerender": true
}
```

### Download Outputs
- `GET /api/v1/jobs/{job_id}/result`
- `GET /api/v1/jobs/{job_id}/timeline`
- `GET /api/v1/jobs/{job_id}/manifest`
- `GET /api/v1/jobs/{job_id}/captions`
- `GET /api/v1/jobs/{job_id}/downloads/{filename}`

### Health & Readiness Probes
- `GET /health` (Liveness)
- `GET /ready` (Readiness: verifies Database, FFmpeg, and Provider status)

---

## 7. Ten Integration Standards Compliance

| # | Integration Requirement | Implementation File / Evidence | Status |
| :-: | :--- | :--- | :-: |
| **1** | Docker Compose with zero-paid test command | `docker-compose.yml`, `pytest tests/test_e2e.py` | Complete |
| **2** | `.env.example` with safe example values | `.env.example` | Complete |
| **3** | OpenAPI 3.1 YAML matching running API | `openapi.yaml` | Complete |
| **4** | Background jobs returning HTTP 202 | `backend/app/api/v1/jobs.py` & `worker.py` | Complete |
| **5** | Idempotency-Key support on POST endpoints | `backend/app/core/idempotency.py` & `test_api_jobs.py` | Complete |
| **6** | Structured JSON errors with uppercase snake-case | `backend/app/schemas/error.py` & `main.py` | Complete |
| **7** | Configuration isolated in environment variables | `backend/app/config.py` | Complete |
| **8** | File uploads, storage adapters, download links | `backend/app/core/storage.py` & `audio_transcription.py` | Complete |
| **9** | Structured JSON logs + correlation ID + `/health` & `/ready` | `backend/app/core/logging.py` & `health.py` | Complete |
| **10** | Detailed timeline & manifest audit tracking | `backend/app/services/manifest_builder.py` | Complete |

---

## 8. Troubleshooting

1. **FFmpeg not recognized in PowerShell:**
   The engine automatically detects FFmpeg from WinGet packages, standard program files, or `.env`. You can explicitly set `FFMPEG_PATH` in `.env` to the binary path.
2. **Missing audio in generated video:**
   Ensure speech synthesis completed or your uploaded audio has volume above -85 dB.
3. **Port conflicts (8000 or 5173):**
   Change `PORT` in `.env` or run vite with `--port 3000`.
