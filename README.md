# The Honest Decision Challenge

An interactive, multi-step funnel experience built with Next.js. Users sign up, answer five introspective questions, receive personalized "beat" reveals, and land on a final offer page — all while their progress is captured to a Google Sheet in real time. 

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS 4, custom fonts (DM Serif Display, DM Sans, Playfair Display, Inter)
- **UI Components:** Radix UI primitives + shadcn/ui
- **Forms:** React Hook Form + Zod validation
- **Analytics:** Vercel Analytics
- **Backend Integration:** Google Sheets API via service account (googleapis)
- **AI:** OpenRouter (streaming chat completions) for personalised beat copy from the user’s answers
- **Persistence:** Challenge state (answers, generated beats, name/email) saved in `localStorage` and sent to the API for generation
- **Deployment:** Vercel-ready

## Funnel Flow

1. **Landing Page** — Name & email signup
2. **Questions 1–5** — Guided introspective prompts
3. **Beats 1–5** — Personalized insight reveals after each question
4. **Processing** — Transition / loading screen
5. **Offer** — Final call-to-action

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installations

```bash
git clone https://github.com/Tanmaya4/aimerge_funnel.git
cd aimerge_funnel
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `GOOGLE_SHEET_ID` | Spreadsheet ID (or full URL) |
| `GOOGLE_SHEET_TAB_NAME` | Tab name (default: `Sheet1`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON (one line) |
| `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` | Or base64-encoded key file (recommended for Vercel) |
| `OPENROUTER_API_KEY` | From [openrouter.ai/keys](https://openrouter.ai/keys) — powers streaming beat generation |
| `OPENROUTER_MODEL` | Optional (default `openai/gpt-4o-mini`). Any OpenRouter model id |
| `NEXT_PUBLIC_APP_URL` | Optional site URL (OpenRouter `HTTP-Referer`); use your production URL when deployed |

> Share the Google Sheet with the service account `client_email` as **Editor**.

Without `OPENROUTER_API_KEY`, the app uses built-in mirror copy on the processing screen (same flow, no API spend).

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout & fonts
├── api/sheets/append/route.ts  # Google Sheets API route
├── api/challenge/stream-beat/route.ts  # OpenRouter streaming beats
├── api/challenge/ai-ready/route.ts     # Whether OpenRouter is configured
├── challenge/
│   ├── question-1 … question-5/  # Question steps
│   ├── beat-1 … beat-5/          # Beat reveal steps
│   ├── processing/                # Processing screen
│   └── offer/                     # Final offer page
components/
├── challenge/                  # Funnel-specific components
└── ui/                         # shadcn/ui primitives
context/
└── challenge-context.tsx       # Global funnel state
lib/
├── submit-to-google-sheet.ts   # Client-side sheet helper
└── server/google-sheets.ts     # Server-side Sheets SDK
```

## License

Private — all rights reserved.
