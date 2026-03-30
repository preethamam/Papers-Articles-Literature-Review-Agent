import { Router, Request, Response } from "express";
import { getSetting } from "../db.js";

const router = Router();
let modelsCache: { data: unknown; at: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

router.get("/", async (req: Request, res: Response) => {
  const apiKey = getSetting("openrouter_api_key") || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "OpenRouter API key not set" });
    return;
  }
  if (modelsCache && Date.now() - modelsCache.at < CACHE_MS) {
    return res.json(modelsCache.data);
  }
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || r.statusText);
    modelsCache = { data, at: Date.now() };
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch models";
    res.status(502).json({ error: msg });
  }
});

export default router;
