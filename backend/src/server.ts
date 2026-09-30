import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import taskRoutes from "./routes/tasks.js";
import sessionRoutes from "./routes/sessions.js";
import guideRoutes from "./routes/guide.js";
import { attachStreamingTranscription } from "./services/streamingTranscription.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

// Vercel serves this app at /api/*. Local Express still uses /tasks, /sessions, /guide-me.
app.use((req, _res, next) => {
  if (req.url === "/api" || req.url.startsWith("/api/") || req.url.startsWith("/api?")) {
    req.url = req.url.slice(4) || "/";
  }
  next();
});

app.use("/tasks", taskRoutes);
app.use("/sessions", sessionRoutes);
app.use("/guide-me", guideRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/transcribe/token", async (_req, res) => {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "ASSEMBLYAI_API_KEY is not configured." });
  }

  try {
    const tokenRes = await fetch("https://streaming.assemblyai.com/v3/token?expires_in_seconds=60", {
      headers: { Authorization: key },
    });
    if (!tokenRes.ok) {
      console.error("AssemblyAI token failed:", tokenRes.status, await tokenRes.text());
      return res.status(502).json({ error: "Could not start live transcription." });
    }
    const data = (await tokenRes.json()) as { token?: string };
    if (!data.token) return res.status(502).json({ error: "Could not start live transcription." });
    res.json({ token: data.token });
  } catch (error) {
    console.error("AssemblyAI token request failed:", error);
    res.status(502).json({ error: "Could not start live transcription." });
  }
});

// Centralized error handler — without this, an uncaught error in any
// route above would crash the process or leak a stack trace to the client.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;

if (!process.env.VERCEL) {
  const server = http.createServer(app);
  attachStreamingTranscription(server);

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`Loop backend listening on port ${PORT}`);
  });
}
