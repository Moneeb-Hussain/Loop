# Loop

Say the mess in your head. Loop writes it down, splits it into tasks, and tells you the one thing to do next.

Built for the moment when everything feels urgent and nothing has a first step. Talk, get a live transcript, then a short list of tasks, reminders, and open loops. Guide Me picks one item that fits the time and energy you actually have.

## Demo

| Step | What you do |
|---|---|
| 1 | Open the app and allow the microphone |
| 2 | Talk through whatever is on your mind. Words appear while you speak |
| 3 | **Stop and sort.** The ramble becomes tasks, reminders, and open loops |
| 4 | Open **Guide Me**, set your time and energy, and do the one thing it names |
| 5 | **Did it** or **Not this one** to move on |

No mic handy? On Capture, choose **Use sample** and sort that paragraph instead.

## How it works

```text
mic
  → GET /api/transcribe/token
  → browser opens AssemblyAI Streaming
  → live transcript
  → POST /api/sessions
  → LeMUR extracts tasks
  → POST /api/guide-me
  → one next action, a reason, and a first step
```

The AssemblyAI API key stays on the server. The browser only receives a token that lasts long enough to open the streaming socket.

If LeMUR fails, the transcript is still saved as one open loop, and Guide Me still picks a task with a local reason. The demo does not stop on an AI error.

## Product

| Screen | What it does |
|---|---|
| Capture | Live mic, editable transcript, sample ramble, sort |
| Tasks | Add, search, filter, edit, snooze, complete, delete |
| Guide Me | Time + energy in, one next action out. Accept or skip is saved |
| History | Each capture, from raw words to the items that came out of it |
| Progress | Last 7 days, streak, and closed loops |

After a sort, items that look like something already on the list are shown side by side. You choose merge or keep both. Nothing is merged silently.

## Stack

| Layer | Choice |
|---|---|
| App | React 18, Vite, TypeScript, React Query |
| API | Express on Vercel, same repo |
| Speech | AssemblyAI Streaming v3, from the browser with a temporary token |
| Reasoning | AssemblyAI LeMUR for extraction and Guide Me |
| Data | JSON file for local runs. On Vercel, sample data reloads when the function cold-starts |
| Later | Postgres schema in `backend/future-postgres/schema.sql`. Routes stay the same |

## Deploy

Root directory on Vercel is the repo root, not `frontend`.

| Setting | Value |
|---|---|
| Env var | `ASSEMBLYAI_API_KEY` = your AssemblyAI key |
| Build | taken from `vercel.json` |
| API | same domain, under `/api`. Do not set `VITE_API_URL` |

## Run locally

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

`backend/.env`:

```env
ASSEMBLYAI_API_KEY=your_key_here
PORT=4000
CLIENT_URL=http://localhost:5173
```

Frontend dev calls `http://localhost:4000` on its own. A `frontend/.env` is optional.

| URL | |
|---|---|
| App | http://localhost:5173 |
| Health | http://localhost:4000/health |

Local data is stored in `backend/data/store.json` and survives a restart. Delete that file to load the sample list again.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/transcribe/token` | Short-lived AssemblyAI streaming token |
| `POST` | `/sessions` | Save a transcript and extract tasks |
| `GET` | `/sessions` | Past captures and their tasks |
| `GET` | `/tasks` | List tasks. Optional `status` and `category` |
| `POST` | `/tasks` | Add a task by hand |
| `PATCH` | `/tasks/:id` | Done, snooze, text, or urgency |
| `DELETE` | `/tasks/:id` | Delete a task |
| `POST` | `/guide-me` | Pick one task for a time and energy |
| `POST` | `/guide-me/:eventId/feedback` | Record accept or skip |
| `GET` | `/health` | `{ "ok": true }` |

On Vercel every path is under `/api`, for example `/api/health`.

## Not in this version

- Accounts and login
- A hosted database. Vercel keeps the list only until the next cold start
- Speaking a change onto a task that already exists
