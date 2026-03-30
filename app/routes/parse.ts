import { Router, Request, Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import { parsePdfToXml } from "../lib/grobid.js";
import { getSetting } from "../db.js";
import { upsertArticle } from "../db.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const router = Router();

function extractMetadataFromXml(xml: string): { title: string; authors: string; abstract: string } {
  const titleMatch = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
  const authorMatches = xml.match(/<author[\s\S]*?<persName[^>]*>([\s\S]*?)<\/persName>/gi) || [];
  const authors = JSON.stringify(
    authorMatches.map((a) => {
      const m = a.match(/<persName[^>]*>([\s\S]*?)<\/persName>/i);
      return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
    }).filter(Boolean)
  );
  const abstractMatch = xml.match(/<abstract[\s\S]*?>([\s\S]*?)<\/abstract>/i);
  const abstract = abstractMatch
    ? abstractMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : "";
  return { title, authors, abstract };
}

router.post("/", upload.single("pdf"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No PDF file uploaded" });
    return;
  }

  const grobidUrl = getSetting("grobid_url");
  try {
    const xml = await parsePdfToXml(req.file.buffer, req.file.originalname, grobidUrl);
    const { title, authors, abstract } = extractMetadataFromXml(xml);
    const id = createHash("md5").update(req.file.buffer).digest("hex");
    const parsedAt = new Date().toISOString();

    upsertArticle({
      id,
      title: title || null,
      authors: authors !== "[]" ? authors : null,
      abstract: abstract || null,
      pdf_path: req.file.originalname,
      xml,
      parsed_at: parsedAt,
    });

    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Parse failed";
    res.status(502).json({ error: message });
  }
});

export default router;
