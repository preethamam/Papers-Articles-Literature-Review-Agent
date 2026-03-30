import { Router, Request, Response } from "express";
import { getArticle, getReview, getReviews, upsertReview } from "../db.js";
import { createOpenRouter } from "../lib/openrouter.js";
import { getSetting } from "../db.js";
import { PAPER_REVIEW_SYSTEM } from "../lib/prompts.js";

const TASK_LABELS: Record<number, string> = {
  1: "Extract metadata and links (Option 1)",
  2: "Section-by-section summary (Option 2)",
  3: "Related work synthesis (Option 3)",
};

const router = Router();

router.get("/:articleId", (req: Request, res: Response) => {
  const reviews = getReviews(req.params.articleId);
  res.json(reviews);
});

router.post("/:articleId", async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const { task, model: modelParam } = req.body;
  const taskNum = Number(task);
  if (![1, 2, 3].includes(taskNum)) {
    res.status(400).json({ error: "task must be 1, 2, or 3" });
    return;
  }

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

  const cached = getReview(articleId, taskNum, model);
  if (cached) {
    res.setHeader("Content-Type", "application/json");
    return res.json({ cached: true, result: cached.result, model });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const userMsg = `Task option: ${taskNum}\n\nPlease process the uploaded XML file using option ${taskNum}: ${TASK_LABELS[taskNum]}.\n\nXML content:\n${article.xml.slice(0, 200000)}`;

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
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (chunk.usage) res.write(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`);
    }

    upsertReview(articleId, taskNum, model, fullText);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenRouter error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
