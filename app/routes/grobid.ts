import { Router, Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { checkGrobidAlive, getGrobidUrl } from "../lib/grobid.js";
import { getSetting } from "../db.js";

const execAsync = promisify(exec);
const router = Router();

router.get("/status", async (req: Request, res: Response) => {
  const grobidUrl = getSetting("grobid_url");
  const alive = await checkGrobidAlive(grobidUrl);
  res.json({ alive });
});

router.post("/start", async (req: Request, res: Response) => {
  try {
    await execAsync("docker run -d --name grobid -p 8070:8070 lfoppiano/grobid:0.8.1");
    res.json({ ok: true, message: "GROBID container started" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to start GROBID";
    res.status(500).json({ error: msg });
  }
});

export default router;
