# TalentIQ

**Smart AI Interview Platform for Modern Hiring Teams**

TalentIQ is a full-stack AI interview platform that conducts structured voice, chat, and video interviews — organized by company, scored automatically, and built for scale.

---

## Features

- 🎙 **Voice, Chat & Video** — AI-driven interviews across all channels
- 🏢 **Company Management** — Organize interviews by client company with industry, size, and notes
- 🧠 **AI Generation** — Describe a role in plain language, get a complete interview
- 💻 **Live Coding** — Monaco editor + Excalidraw whiteboard for technical rounds
- 📊 **Auto Reports** — Per-question scores and AI-generated insights
- 🛡 **Anti-Cheating** — Tab monitoring, paste blocking, multi-screen detection
- 👥 **Team Management** — Organizations, projects, and role-based access
- 🌐 **Multilingual** — English and Chinese with pluggable locale system
- 🔌 **Pluggable LLMs** — OpenAI, Gemini, Kimi, MiniMax or any OpenAI-compatible API
- 🗣 **Practice Mode** — Voice rehearsal with AI feedback and suggested answers

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL + Auth + Storage + RLS) |
| API | tRPC |
| AI / LLM | OpenAI, Google Gemini, Moonshot Kimi, MiniMax |
| Voice | WebSocket relay servers |
| UI | Tailwind CSS + shadcn/ui + Radix |
| Code Editor | Monaco Editor |
| Whiteboard | Excalidraw |

---

## Getting Started

### Prerequisites

- Node.js 20.9+
- Docker Desktop (for local Supabase)
- At least one LLM API key (OpenAI recommended)

### 1. Install

```bash
npm install
```

### 2. Start Supabase locally

```bash
npx supabase start
```

Copy the printed keys (Publishable key, Secret key, DB URL).

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase keys and at least one LLM key.

### 4. Run

```bash
npm run dev           # Next.js on http://localhost:3000
npm run dev:voice     # Voice relay on port 8766 (optional)
```

Open [http://localhost:3000](http://localhost:3000) to get started.

---

## Environment Variables

See `.env.example` for the full list. Minimum required:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API key (recommended) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run dev:voice` | Start Volcengine voice relay |
| `npm run dev:openai-voice` | Start Azure OpenAI voice relay |
| `npm run db:types` | Regenerate Supabase TypeScript types |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, password reset
│   ├── (dashboard)/     # Dashboard, interviews, companies, practices
│   │   └── companies/   # Company management pages
│   ├── api/             # API routes (AI, auth, voice, session)
│   └── i/               # Public interview links
├── components/
│   ├── interview/       # Interview builder + company selector
│   ├── layout/          # Sidebar, header
│   └── ui/              # shadcn/ui primitives + TalentIQ logo
├── lib/                 # Utilities, AI providers, Supabase helpers
└── server/
    └── routers/         # tRPC routers including company router
supabase/
└── migrations/          # DB migrations (006_companies.sql adds company support)
```

---

## License

MIT
