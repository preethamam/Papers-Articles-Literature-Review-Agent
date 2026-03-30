import { Router, Request, Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import {
  getArticles,
  getArticle,
  getReviews,
  deleteArticle,
  upsertArticle,
  getSetting,
  type ArticleFilters,
} from "../db.js";
import { parsePdfToXml } from "../lib/grobid.js";

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

router.get("/", (req: Request, res: Response) => {
  const search = (req.query.search as string) || undefined;
  const sort = (req.query.sort as ArticleFilters["sort"]) || "parsed_at";
  const order = (req.query.order as ArticleFilters["order"]) || "desc";
  const list = getArticles({ search, sort, order });
  res.json(list);
});

router.get("/:id/xml", (req: Request, res: Response) => {
  const article = getArticle(req.params.id);
  if (!article || !article.xml) {
    res.status(404).json({ error: "Article or XML not found" });
    return;
  }
  res.type("application/xml").send(article.xml);
});

router.get("/:id", (req: Request, res: Response) => {
  const article = getArticle(req.params.id);
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  const reviews = getReviews(req.params.id);
  res.json({ ...article, reviews });
});

router.delete("/:id", (req: Request, res: Response) => {
  try {
    deleteArticle(req.params.id);
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Article not found" });
  }
});

router.post("/batch", upload.array("pdfs", 50), async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    res.status(400).json({ error: "No PDF files uploaded" });
    return;
  }

  const grobidUrl = getSetting("grobid_url");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  };

  send("start", { total: files.length });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    send("progress", { current: i + 1, total: files.length, filename: file.originalname, status: "parsing" });
    try {
      const xml = await parsePdfToXml(file.buffer, file.originalname, grobidUrl);
      const { title, authors, abstract } = extractMetadataFromXml(xml);
      const id = createHash("md5").update(file.buffer).digest("hex");
      const parsedAt = new Date().toISOString();
      upsertArticle({
        id,
        title: title || null,
        authors: authors !== "[]" ? authors : null,
        abstract: abstract || null,
        pdf_path: file.originalname,
        xml,
        parsed_at: parsedAt,
      });
      send("progress", { current: i + 1, total: files.length, filename: file.originalname, status: "done" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Parse failed";
      send("progress", { current: i + 1, total: files.length, filename: file.originalname, status: "error", error: message });
    }
  }

  send("done", {});
  res.end();
});

export default router;
