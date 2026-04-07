import { appendFileSync, mkdirSync } from "fs";
import path from "path";

const LOG_PATH = "/Users/daivikvennela/Desktop/USC Research/Lit Review Agent v2/.cursor/debug-c1ca1d.log";

export function debugLog(payload: Record<string, unknown>) {
  try {
    mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`, { encoding: "utf8" });
  } catch {
    // ignore
  }
}

