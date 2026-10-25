# IncuBrix Engineering Assessment 3: Requirements Checklist

This checklist tracks every core requirement, integration standard, and deliverable specified in the assessment brief against the actual implementation.

---

## 1. Core Workflow Requirements

- [x] **Script Input Workflow:** Accept written script, synthesize speech, divide into scenes, source footage, render video, produce deliverables.
- [x] **Voiceover Audio Upload Workflow:** Accept MP3, WAV, M4A up to 10 minutes, validate duration, silence, and streams via FFprobe.
- [x] **Scene Segmentation & Coverage:** Split at sentence/phrase boundaries, preserve complete original text, calculate non-overlapping durations, cover 100% of audio without gaps.
- [x] **Footage Sourcing & Fallback:** Modular provider interface (`BaseFootageProvider`), Pexels and Pixabay adapters, deterministic local fallback engine with clear licensing.
- [x] **Footage Deduplication:** Prevent duplicate clips within the same video.
- [x] **Metadata & Rights Tracking:** Record provider, source URL, license name, license URL, attribution, commercial use status, rights verification, relevance score, selection reason.
- [x] **Video Rendering:** Produce 30fps H.264 video with AAC 192k audio in 16:9, 9:16, and 1:1 aspect ratios using FFmpeg.
- [x] **Captions & Subtitles:** Generate valid SubRip (`.srt`) file and optionally burn subtitles into video frames.
- [x] **Output Verification:** Probe completed video files with FFprobe before reporting success.
- [x] **Scene Replacement:** Replace unsuitable scene footage via `POST /api/v1/jobs/{job_id}/scenes/{scene_id}/replace` and rerender with partial pipeline.

---

## 2. Technical Stack & Architecture

- [x] **Backend:** Python 3.11+ (Python 3.14 compatible) with FastAPI.
- [x] **Validation:** Pydantic v2 schemas for all inputs, outputs, and errors.
- [x] **Video Processing:** Native FFmpeg and FFprobe auto-discovered and executed.
- [x] **Background Processing:** Persistent job queue with async background worker loop.
- [x] **Database:** Async SQLite database with SQLAlchemy 2.0 repository layer.
- [x] **Storage:** Local storage adapter with S3 / MinIO compatibility.
- [x] **Frontend:** React 18, TypeScript, and Vite with Tailwind CSS.
- [x] **Icons:** Lucide-React.
- [x] **Testing:** Pytest async suite (15 automated tests passing 100%).
- [x] **API Specification:** OpenAPI 3.1 (`openapi.yaml`).
- [x] **Deployment:** Dockerfile (backend & frontend) and `docker-compose.yml` with MinIO.

---

## 3. UI/UX Design System & Screens

- [x] **Visual Design:** Charcoal and near-black surfaces (`#090b0e`), warm white text, restrained lime (`#84cc16`) and coral (`#f43f5e`) accents.
- [x] **Screen A (Studio Dashboard):** Recent projects, status badges, durations, aspect ratios, search, filtering, sorting, empty state.
- [x] **Screen B (New Video Project):** Script vs Audio upload tabs, script editor with word count, drag-and-drop audio, voice selector, aspect ratio cards (16:9, 9:16, 1:1), style guideline, avoid tags, caption toggles.
- [x] **Screen C (Scene Editor):** Central playable video preview, scene list with thumbnails, narration text, licensing inspector, relevance score, replacement modal.
- [x] **Screen D (Processing Screen):** Real job states, live progress 0-100, elapsed timer, pipeline stage indicators.
- [x] **Screen E (Results & Exports):** Playable video, aspect ratio switcher, download links for MP4s, captions.srt, timeline.json, manifest.json, scene & licensing breakdown table.
- [x] **Screen F (Settings & Health):** Provider configuration status, environment guidance, readiness check.

---

## 4. Ten Integration Standards

- [x] **Integration 1:** Docker Compose launches app and dependencies; test command runs without paid API keys.
- [x] **Integration 2:** `.env.example` provided with safe default values and no secrets.
- [x] **Integration 3:** `openapi.yaml` uses OpenAPI 3.1 matching actual running API.
- [x] **Integration 4:** Background jobs returning HTTP 202 Accepted.
- [x] **Integration 5:** `Idempotency-Key` header support preventing duplicate processing.
- [x] **Integration 6:** Structured JSON error format `{ "error": { "code", "message", "retryable", "details" } }`.
- [x] **Integration 7:** Secrets, paths, and provider keys isolated in environment variables.
- [x] **Integration 8:** File uploads, storage adapters, downloadable result links.
- [x] **Integration 9:** Structured JSON logs + `X-Correlation-Id` + `/health` and `/ready` probes.
- [x] **Integration 10:** Complete `timeline.json` and `manifest.json` schemas.
- [x] **Integration 11:** CLI batch runner accepting file/folder inputs (`backend/cli.py`).

---

## 5. Submission Deliverables

- [x] `README.md` (Setup, architecture, API, Windows commands, troubleshooting)
- [x] `openapi.yaml` (OpenAPI 3.1)
- [x] `.env.example` (All environment variables documented)
- [x] `REPORT.md` (Implementation matrix, measured timings, costs, limitations)
- [x] `SOURCES.md` (Real providers, licenses, attributions, rights verification)
- [x] `AI_USE.md` (AI coding assistants, models, and runtime neural services)
- [x] `test_pack/` (Varied sample scripts, CLI batch outputs, and test assets)
- [x] `CHECKLIST.md` (Assessment requirements checklist)
