import "dotenv/config";
import express from "express";
import cors from "cors";
import taskRoutes from "./routes/tasks.js";
import sessionRoutes from "./routes/sessions.js";
import guideRoutes from "./routes/guide.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

// Vercel forwards the original path, so /api/tasks arrives as /api/tasks.
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

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
