# IncuBrix AI Usage & Development Disclosure

In accordance with IncuBrix Engineering Assessment standards, this document discloses the AI assistants, generative models, and neural services used during development and integrated into the runtime application.

---

## 1. AI Coding Assistants & Models Used During Development

- **AI Pair Programming Assistant:** Google DeepMind Advanced Agentic Coding (Antigravity IDE / Agentic System).
- **Core LLM Reasoning Models:** Gemini 3.8 Flash (High reasoning capability).
- **Tasks Assisted by AI:**
  - Architecture and component planning for FastAPI backend and React frontend.
  - Implementation of sentence boundary segmentation and audio-video timing synchronization algorithms.
  - Creation of FFmpeg rendering filter graph commands (`scale`, `crop`, `zoompan`, `subtitles`).
  - Pytest automated test suite formulation and end-to-end integration tests.
  - UI/UX design system construction adhering to charcoal/lime/coral aesthetic guidelines.

---

## 2. AI Services Integrated into Runtime Application

- **Neural Text-to-Speech (TTS):** Microsoft EdgeTTS neural speech models:
  - `en-US-AriaNeural`
  - `en-US-GuyNeural`
  - `en-IN-NeerjaNeural`
  - `en-IN-PrabhatNeural`
  - `en-GB-SoniaNeural`
  - `hi-IN-SwaraNeural` (Hindi)
  - `ta-IN-PallaviNeural` (Tamil)
- **Local Fallback Visual Engine:** Procedural algorithmic graphics (non-generative deterministic synthetic visual cards) guaranteeing privacy, zero API costs, and deterministic reproducible test runs.
- **Footage Selection Intelligence:** Algorithmic semantic keyword and concept mapping (`ScenePlanner._extract_visual_hint`) with domain-specific keyword taxonomy (tech, finance, nature, lifestyle).
