# TalentIQ — AI-Powered Interview Platform

> **Live Demo:** [https://talentiq-kappa.vercel.app](https://talentiq-kappa.vercel.app)  
> **GitHub:** [https://github.com/yasar2005/TalentIQ](https://github.com/yasar2005/TalentIQ)

---

## What is TalentIQ?

TalentIQ is a full-stack AI interview platform that lets hiring teams conduct structured **voice, chat, and live audio interviews** — powered by large language models. Candidates get a unique interview link, the AI conducts the interview autonomously, and recruiters receive auto-generated scores and insights.

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🎙 **AI Voice Interviews** | Real-time voice interviews via WebSocket relay with ASR + TTS |
| 🎤 **Live Audio Interview** | Candidate speaks answers live — AI reads questions aloud, transcribes responses, and scores each answer in real time |
| 🤖 **AI Question Generation** | Describe a role in plain English → AI generates a full interview |
| 📊 **Auto Scoring & Reports** | Per-question scores, verdict, strengths, improvements, and AI-written summaries |
| 💻 **Live Coding Round** | Monaco Editor + Excalidraw whiteboard for technical interviews |
| 🏢 **Company Management** | Organize interviews by client company with full CRUD |
| 👥 **Team & Org Management** | Multi-org, multi-project, role-based access control |
| 🛡 **Anti-Cheating** | Tab-switch detection, paste blocking, multi-screen monitoring |
| 🧠 **Practice Mode** | Candidates rehearse with AI feedback, hints, and sample answers |
| 📄 **Resume Parsing** | Upload PDF → AI extracts candidate info automatically |
| 🌐 **Multilingual** | English and Chinese with a pluggable locale system |

---

## Live Audio Interview

The Live Audio Interview feature is a fully autonomous interview experience:

1. **Select** any interview from your dashboard
2. **AI reads** each question aloud using browser Text-to-Speech
3. **You speak** your answer — your words appear on screen in real time as you talk
4. Click **Done** when finished (or let the timer run out)
5. **AI transcribes** your audio and evaluates your answer
6. See your **score (1–10)**, verdict, strengths, improvements, and delivery notes
7. Move to the next question or retry
8. Get a **final report** with average score across all questions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL + Auth + Storage + Row-Level Security) |
| **API Layer** | tRPC v10 |
| **AI / LLM** | OpenAI, Google Gemini, Moonshot Kimi, MiniMax |
| **Voice** | WebSocket relay servers (Volcengine Doubao + Azure OpenAI Realtime) |
| **Live Transcription** | Browser SpeechRecognition API (real-time) + Gemini (final accurate transcript) |
| **UI** | Tailwind CSS + shadcn/ui + Radix UI |
| **Code Editor** | Monaco Editor |
| **Whiteboard** | Excalidraw |
| **Deployment** | Vercel |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js App                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Dashboard   │  │  Interview   │  │  Live Audio   │  │
│  │  (tRPC)      │  │  Session     │  │  Interview    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│  ┌──────▼─────────────────▼──────────────────▼────────┐  │
│  │               API Routes (Next.js)                  │  │
│  │  /api/ai/*   /api/session/*   /api/audio-interview  │  │
│  └──────────────────────┬──────────────────────────────┘  │
└─────────────────────────┼─────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     Supabase          LLM APIs      Voice Relay
   (DB + Auth +     (Gemini /        (WebSocket
    Storage)         OpenAI /         Server)
                     Kimi)
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register pages
│   ├── (dashboard)/
│   │   ├── audio-interview/ # Live Audio Interview page
│   │   ├── interviews/      # Interview builder
│   │   ├── practices/       # Practice mode
│   │   └── candidates/      # Session management
│   ├── api/
│   │   ├── ai/              # extract-text, parse-resume, generate
│   │   ├── audio-interview/ # evaluate endpoint (transcribe + score)
│   │   └── session/         # upload, voice, save
│   └── i/                   # Public candidate interview links
├── components/
│   ├── interview/           # Interview builder, resume import, AI generator
│   ├── session/             # Live interview session UI
│   └── ui/                  # Reusable UI components (shadcn/ui based)
├── lib/
│   ├── ai/                  # LLM providers (OpenAI, Gemini, Kimi, MiniMax)
│   ├── pdf-extract.ts       # Server-side PDF text extraction (pdf-parse)
│   └── supabase/            # DB client + type definitions
└── server/
    └── routers/             # tRPC routers (interview, candidate, session, etc.)
```

---

## What I Built / My Contributions

- Designed and implemented the **full-stack architecture** from scratch
- Built the **AI interview engine** — prompt engineering, streaming responses, multi-LLM support
- Implemented **real-time voice interviews** using WebSocket relay servers with ASR/TTS
- Built the **Live Audio Interview** feature — browser TTS reads questions, `MediaRecorder` captures answers, `SpeechRecognition` shows live transcript, Gemini evaluates each answer with score + feedback
- Created the **resume PDF parser** with server-side `pdf-parse` integration (handles corrupt/bad xref PDFs)
- Built **practice mode** with streaming AI feedback, hints, and voice delivery scoring
- Implemented **anti-cheating system** (tab monitoring, paste detection, screen tracking)
- Set up **Supabase** with Row-Level Security policies, migrations, and storage
- Deployed to **Vercel** with CI/CD via GitHub

---

## Running Locally

### Prerequisites
- Node.js 20.9+
- Docker Desktop (for local Supabase)
- At least one LLM API key (Gemini is free to start)

### Setup

```bash
# 1. Clone
git clone https://github.com/yasar2005/TalentIQ.git
cd TalentIQ

# 2. Install dependencies
npm install

# 3. Start local Supabase
npx supabase start

# 4. Configure environment
cp .env.example .env.local
# Fill in your Supabase keys and at least one LLM key

# 5. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Minimum Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key   # or OPENAI_API_KEY
```

---

## Screenshots

> Visit the live demo at [https://talentiq-kappa.vercel.app](https://talentiq-kappa.vercel.app)

---

## License

MIT — free to use, modify, and deploy.
