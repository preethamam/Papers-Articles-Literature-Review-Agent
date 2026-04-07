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
    // #region agent log
    fetch("http://127.0.0.1:7545/ingest/1a02892b-d039-4b48-a9ae-2d66a0b62737", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c1ca1d" },
      body: JSON.stringify({
        sessionId: "c1ca1d",
        runId: "grobid-docker",
        hypothesisId: "H1",
        location: "grobid.ts:POST /start:beforeExec",
        message: "Attempting to start GROBID Docker container",
        data: { command: "docker run -d --name grobid -p 8070:8070 lfoppiano/grobid:0.8.1" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const { stdout, stderr } = await execAsync("docker run -d --name grobid -p 8070:8070 lfoppiano/grobid:0.8.1");

    // #region agent log
    fetch("http://127.0.0.1:7545/ingest/1a02892b-d039-4b48-a9ae-2d66a0b62737", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c1ca1d" },
      body: JSON.stringify({
        sessionId: "c1ca1d",
        runId: "grobid-docker",
        hypothesisId: "H2",
        location: "grobid.ts:POST /start:afterExec",
        message: "Docker run completed",
        data: { stdout: stdout?.slice(0, 200), stderr: stderr?.slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    res.json({ ok: true, message: "GROBID container started", stdout, stderr });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to start GROBID";

    // #region agent log
    fetch("http://127.0.0.1:7545/ingest/1a02892b-d039-4b48-a9ae-2d66a0b62737", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c1ca1d" },
      body: JSON.stringify({
        sessionId: "c1ca1d",
        runId: "grobid-docker",
        hypothesisId: "H3",
        location: "grobid.ts:POST /start:catch",
        message: "Docker start failed",
        data: { error: msg },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    res.status(500).json({ error: msg });
  }
});

export default router;
