const DEFAULT_GROBID_URL = "http://localhost:8070";
import { debugLog } from "./debugLog.js";

export function getGrobidUrl(override?: string | null): string {
  return override || process.env.GROBID_URL || DEFAULT_GROBID_URL;
}

export async function parsePdfToXml(
  pdfBuffer: Buffer,
  filename: string,
  baseUrl?: string | null
): Promise<string> {
  const url = getGrobidUrl(baseUrl);
  // #region agent log
  debugLog({
    sessionId: "c1ca1d",
    runId: "grobid-parse-v2",
    hypothesisId: "N1",
    location: "grobid.ts:parsePdfToXml:beforeFetch",
    message: "Calling GROBID parse endpoint",
    data: { url, filename, bytes: pdfBuffer.byteLength },
    timestamp: Date.now(),
  });
  // #endregion
  const form = new FormData();
  form.append("input", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), filename);
  form.append("consolidateHeader", "1");
  form.append("consolidateCitations", "0");
  try {
    const res = await fetch(`${url}/api/processFulltextDocument`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text();
      // #region agent log
      debugLog({
        sessionId: "c1ca1d",
        runId: "grobid-parse-v2",
        hypothesisId: "N2",
        location: "grobid.ts:parsePdfToXml:nonOk",
        message: "GROBID returned non-OK",
        data: { url, status: res.status, statusText: res.statusText, body: errText.slice(0, 200) },
        timestamp: Date.now(),
      });
      // #endregion
      throw new Error(`GROBID error (${res.status}): ${errText}`);
    }

    return res.text();
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
    // #region agent log
    debugLog({
      sessionId: "c1ca1d",
      runId: "grobid-parse-v2",
      hypothesisId: "N3",
      location: "grobid.ts:parsePdfToXml:catch",
      message: "Fetch threw before successful response",
      data: {
        url,
        name: e?.name,
        message: e?.message ?? String(err),
        causeCode: e?.cause?.code,
        causeMessage: e?.cause?.message,
      },
      timestamp: Date.now(),
    });
    // #endregion
    throw err;
  }
}

export async function checkGrobidAlive(baseUrl?: string | null): Promise<boolean> {
  try {
    const url = getGrobidUrl(baseUrl);
    const res = await fetch(`${url}/api/isalive`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
