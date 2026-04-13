import { Router, Request, Response } from "express";
import { getArticle, getReview, getReviews, upsertReview } from "../db.js";
import { createOpenRouter } from "../lib/openrouter.js";
import { getSetting } from "../db.js";
import { PAPER_REVIEW_SYSTEM, TASK2_DEPTH_INSTRUCTIONS } from "../lib/prompts.js";

const TASK_LABELS: Record<number, string> = {
  1: "Extract metadata and links (Option 1)",
  2: "Section-by-section summary (Option 2)",
  3: "Related work synthesis (Option 3)",
};

const TASK2_DEPTHS = new Set(["one_line", "five_line", "detailed"]);

const router = Router();

router.get("/:articleId", (req: Request, res: Response) => {
  const reviews = getReviews(String(req.params.articleId));
  res.json(reviews);
});

router.post("/:articleId", async (req: Request, res: Response) => {
  const articleId = String(req.params.articleId);
  const { task, model: modelParam, depth: depthRaw } = req.body;
  const taskNum = Number(task);
  if (![1, 2, 3].includes(taskNum)) {
    res.status(400).json({ error: "task must be 1, 2, or 3" });
    return;
  }

  const reviewDepth =
    taskNum === 2 && typeof depthRaw === "string" && TASK2_DEPTHS.has(depthRaw) ? depthRaw : "";

  const article = getArticle(articleId);
  if (!article || !article.xml) {
    res.status(404).json({ error: "Article not found or not parsed" });
    return;
  }

  const apiKey = getSetting("openrouter_api_key") || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "OpenRouter API key not set" });
    return;
  }

  const modelKey = `default_model_task${taskNum}` as const;
  const model = modelParam || getSetting(modelKey) || getSetting("default_model") || "openrouter/free";

  const depthKey = taskNum === 2 ? reviewDepth || "detailed" : "";
  const effectiveDepth = taskNum === 2 ? depthKey : "";

  const cached = getReview(articleId, taskNum, model, effectiveDepth);
  if (cached) {
    res.setHeader("Content-Type", "application/json");
    return res.json({ cached: true, result: cached.result, model, review_depth: effectiveDepth });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let userMsg = `Task option: ${taskNum}\n\nPlease process the uploaded XML file using option ${taskNum}: ${TASK_LABELS[taskNum]}.\n\nXML content:\n${article.xml.slice(0, 200000)}`;
  if (taskNum === 2) {
    const instr = TASK2_DEPTH_INSTRUCTIONS[effectiveDepth] || TASK2_DEPTH_INSTRUCTIONS.detailed;
    userMsg += `\n\n---\n\n${instr}`;
  }

  let fullText = "";

  try {
    const openrouter = createOpenRouter(apiKey);
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model,
        messages: [
          { role: "system", content: PAPER_REVIEW_SYSTEM },
          { role: "user", content: userMsg },
        ],
        stream: true,
      },
    });

    for await (const chunk of stream) {
      if (chunk.error) {
        const msg = chunk.error.message || "OpenRouter stream error";
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      const delta = chunk.choices?.[0]?.delta;
      const refusal =
        typeof delta?.refusal === "string" && delta.refusal.trim() ? delta.refusal.trim() : "";
      if (refusal) {
        const bit = `\n[Refusal: ${refusal}]`;
        fullText += bit;
        res.write(`data: ${JSON.stringify({ content: bit })}\n\n`);
      }
      const content = typeof delta?.content === "string" ? delta.content : "";
      const reasoning = typeof delta?.reasoning === "string" ? delta.reasoning : "";
      const piece = content + reasoning;
      if (piece) {
        fullText += piece;
        res.write(`data: ${JSON.stringify({ content: piece })}\n\n`);
      }
      if (chunk.usage) res.write(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`);
    }

    if (!fullText.trim()) {
      res.write(
        `data: ${JSON.stringify({
          error:
            "Model returned no text (empty stream). Try another model, check OpenRouter status, or confirm your API key and rate limits.",
        })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    upsertReview(articleId, taskNum, model, fullText, effectiveDepth);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenRouter error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
