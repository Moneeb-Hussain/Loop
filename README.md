# Loop

Loop is a full-stack TypeScript app for capturing messy spoken thoughts, transcribing them live, extracting structured tasks, and managing the resulting list.

Current flow:

```text
browser mic -> backend WebSocket -> AssemblyAI Streaming -> live transcript -> POST /sessions -> LeMUR extraction -> tasks
```

## Tech Stack

- Frontend: React 18, Vite, TypeScript
- Backend: Express, TypeScript, `ws`
- AI/STT: AssemblyAI Streaming v3 and LeMUR
- Storage: in-memory arrays, no database yet
- Auth: none, single shared task list
- Future database: PostgreSQL schema is in `backend/future-postgres/schema.sql`

## Implemented

### Frontend

- React Query for server state (optimistic task updates, refetch on focus), React Router for tabs (`/capture`, `/tasks`, `/guide`, `/history`, `/progress`), Zustand for toasts
- Capture
  - Mic capture via AudioWorklet (ScriptProcessor fallback), averaged downsampling to PCM16 mono 16 kHz, ~100 ms chunks
  - Live transcript with partial vs final turns, keyed by AssemblyAI `turn_order` so formatted turns replace raw ones
  - Auto-reconnect (3 attempts with backoff) if the transcription socket drops; mic keeps running and audio is buffered
  - Unsent drafts survive a page reload (localStorage)
  - Sorting animation while LeMUR extracts, then a review screen
  - Merge confirmation: new items that look like existing tasks are flagged, and you choose Merge or Keep both (client-side word-overlap matching until backend duplicate detection exists)
- Tasks: quick add, filters with counts (Active, Tasks, Reminders, Open loops, Snoozed, Done), search, sort, inline text editing, urgency picker, done with undo, snooze dialog with presets and reasons, wake up / reopen, two-step delete
- Expired snoozes are treated as active again
- Guide Me: ranks active tasks by urgency, age, and fit for the chosen time and energy, then explains the pick and suggests a first step. Skip or snooze from the card.
- History: searchable capture sessions with their tasks
- Progress: 7-day completions chart, streak, open loops closed, completion by category
- Backend connection indicator, loading skeletons, retryable error states, toasts
- Light/dark theme, responsive down to phone width, reduced-motion support

### Backend

- `GET /health`
- `GET /tasks`
- `POST /tasks`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`
- `POST /sessions`
- `GET /sessions`
- `ws://localhost:4000/stream-transcript`
- AssemblyAI Streaming proxy keeps the API key server-side
- LeMUR extraction wrapper with fallback
- In-memory store matching the future Postgres schema shape

## Setup

Backend:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Environment

`backend/.env`:

```env
ASSEMBLYAI_API_KEY=your_key_here
PORT=4000
CLIENT_URL=http://localhost:5173
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
```

## Run URLs

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000
Health:   http://localhost:4000/health
```

## Verify

```powershell
curl http://localhost:4000/health
curl -X POST http://localhost:4000/tasks -H "Content-Type: application/json" -d "{\"text\":\"Test task\",\"category\":\"task\"}"
curl http://localhost:4000/tasks
```

Expected health response:

```json
{"ok":true}
```

## Audio Pipeline Details

The browser captures mic audio with `navigator.mediaDevices.getUserMedia`.

The frontend converts browser `Float32Array` audio samples into:

```text
PCM16 signed little-endian
mono
16 kHz
```

Those chunks are sent to:

```text
ws://localhost:4000/stream-transcript
```

The backend forwards binary audio chunks to AssemblyAI Streaming v3:

```text
wss://streaming.assemblyai.com/v3/ws
```

AssemblyAI `Turn` messages are sent back to the browser as transcript updates.

## Current Limitations

- Data resets when the backend restarts
- No auth or user accounts
- No automated tests yet
- Guide Me scoring and Progress stats are computed in the browser
- Duplicate detection is a client-side heuristic; there is no backend merge endpoint, so Merge deletes the new item and raises the existing item's urgency
- Task category can't be changed after creation (PATCH doesn't accept it)
- No task update/re-ramble endpoint yet

## Next Features

### Backend

- `GET /progress`
- `POST /guide-me`
- `POST /guide-me/:eventId/feedback`
- `POST /tasks/:id/updates`
- Duplicate detection for new extracted items
- Confirm-to-merge flow instead of silent auto-merge
- Persist data with Postgres using `backend/future-postgres/schema.sql`

### AI Pipeline

- Improve extraction schema with confidence, due hints, and AI reasoning
- Compare new extracted items against existing tasks
- Use LeMUR to suggest duplicate matches
- Let users confirm create vs merge
- Use time, energy, urgency, and task age for Guide Me scoring
- Log Guide Me accept/reject feedback for future personalization

### Frontend

- Switch Guide Me and Progress to the backend endpoints once they exist
- Replace client-side duplicate matching with backend/LeMUR suggestions
- Allow changing a task's category

## Database Plan

The app currently uses `backend/src/store/memoryStore.ts`.

Later, run:

```text
backend/future-postgres/schema.sql
```

Then replace the internals of the store functions with database queries while keeping the same exported function names. Routes and frontend code should not need a rewrite.
