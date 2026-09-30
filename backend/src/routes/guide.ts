import { Router } from "express";
import { z } from "zod";
import { pickGuideTask } from "../services/guide.js";
import * as store from "../store/memoryStore.js";

const router = Router();

const pickSchema = z.object({
  timeAvailable: z.union([z.literal(5), z.literal(15), z.literal(30)]),
  energyLevel: z.enum(["low", "medium", "high"]),
  skipIds: z.array(z.string()).optional(),
});

router.post("/", async (req, res) => {
  const parsed = pickSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const pick = await pickGuideTask(parsed.data.timeAvailable, parsed.data.energyLevel, parsed.data.skipIds ?? []);
  res.json(pick);
});

const feedbackSchema = z.object({
  accepted: z.boolean(),
});

router.post("/:eventId/feedback", (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const event = store.setGuideFeedback(req.params.eventId, parsed.data.accepted);
  if (!event) return res.status(404).json({ error: "Guide Me event not found" });
  res.json(event);
});

export default router;
