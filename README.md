# TalentIQ — AI-Powered Interview Platform

> **Live Demo:** [https://talentiq-kappa.vercel.app](https://talentiq-kappa.vercel.app)  
> **GitHub:** [https://github.com/yasar2005/TalentIQ](https://github.com/yasar2005/TalentIQ)

---

## What is TalentIQ?

TalentIQ is a full-stack AI interview platform I built that lets hiring teams conduct structured **voice, chat, and video interviews** — powered by large language models. Candidates get a unique interview link, the AI conducts the interview autonomously, and recruiters receive auto-generated scores and insights.

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🎙 **AI Voice Interviews** | Real-time voice interviews via WebSocket relay with ASR + TTS |
| 🤖 **AI Question Generation** | Describe a role in plain English → AI generates a full interview |
| 📊 **Auto Scoring & Reports** | Per-question scores, sentiment analysis, and AI-written summaries |
| 💻 **Live Coding Round** | Monaco Editor + Excalidraw whiteboard for technical interviews |
| 🏢 **Company Management** | Organize interviews by client company with full CRUD |
| 👥 **Team & Org Management** | Multi-org, multi-project, role-based access control |
| 🛡 **Anti-Cheating** | Tab-switch detection, paste blocking, multi-screen monitoring |
| 🧠 **Practice Mode** | Candidates rehearse with AI feedback, hints, and sample answers |
| 📄 **Resume Parsing** | Upload PDF → AI extracts candidate info automatically |
| 🌐 **Multilingual** | English and Chinese with a pluggable locale system |

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
| **UI** | Tailwind CSS + shadcn/ui + Radix UI |
| **Code Editor** | Monaco Editor |
| **Whiteboard** | Excalidraw |
| **Deployment** | Vercel |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Dashboard   │  │  Interview   │  │  Practice │  │
│  │  (tRPC)      │  │  Session     │  │  Mode     │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                 │                │         │
│  ┌──────▼─────────────────▼────────────────▼──────┐  │
│  │              API Routes (Next.js)               │  │
│  │   /api/ai/*   /api/session/*   /api/prep/*      │  │
│  └──────────────────────┬──────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     Supabase          LLM APIs      Voice Relay
   (DB + Auth +     (OpenAI /       (WebSocket
    Storage)         Gemini /        Server)
                     Kimi)
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register pages
│   ├── (dashboard)/     # Dashboard, interviews, companies, practices
│   ├── api/             # AI, session, voice, prep API routes
│   └── i/               # Public candidate interview links
├── components/
│   ├── interview/       # Interview builder, resume import, AI generator
│   ├── prep/            # Practice mode UI
│   ├── session/         # Live interview session UI
│   └── ui/              # Reusable UI components (shadcn/ui based)
├── lib/
│   ├── ai/              # LLM providers (OpenAI, Gemini, Kimi, MiniMax)
│   ├── prep/            # Practice mode logic
│   └── supabase/        # DB client + type definitions
└── server/
    └── routers/         # tRPC routers (interview, candidate, session, etc.)
```

---

## What I Built / My Contributions

- Designed and implemented the **full-stack architecture** from scratch
- Built the **AI interview engine** — prompt engineering, streaming responses, multi-LLM support
- Implemented **real-time voice interviews** using WebSocket relay servers with ASR/TTS
- Created the **resume PDF parser** with server-side pdfjs-dist integration
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
