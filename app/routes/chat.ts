import { Router, Request, Response } from "express";
import { createOpenRouter } from "../lib/openrouter.js";
import { getSetting } from "../db.js";
import { buildArticleContextSystemBlock } from "../lib/chatArticleContext.js";
import {
  INTRO_ABSTRACT_CHAT_SYSTEM,
  LITERATURE_SYNTHESIS_SYSTEM,
  SUMMARIZE_SET_CHAT_SYSTEM,
} from "../lib/prompts.js";
import { validateCiteTargets } from "../lib/chatCiteGuard.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { message, model, files, system, mode } = req.body;
  const articleIdsRaw = req.body.articleIds;
  const articleIds = Array.isArray(articleIdsRaw)
    ? articleIdsRaw.map((id: unknown) => String(id).trim()).filter(Boolean)
    : typeof articleIdsRaw === "string"
      ? articleIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const apiKey = getSetting("openrouter_api_key") || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "OpenRouter API key not set. Configure in Settings." });
    return;
  }

  const selectedModel = model || getSetting("default_model") || "openrouter/free";

  const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  if (files && Array.isArray(files) && files.length > 0) {
    for (const file of files) {
      if (file.type?.startsWith("image/")) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${file.type};base64,${file.data}` },
        });
      } else {
        contentParts.push({
          type: "text",
          text: `[File: ${file.name}]\n${file.text}`,
        });
      }
    }
  }
  contentParts.push({ type: "text", text: message });

  const docBlock = buildArticleContextSystemBlock(articleIds);
  const systemParts: string[] = [];
  if (mode === "lit_review_synthesis") {
    systemParts.push(LITERATURE_SYNTHESIS_SYSTEM);
  } else if (mode === "summarize_set") {
    systemParts.push(SUMMARIZE_SET_CHAT_SYSTEM);
  } else if (mode === "intro_abstract") {
    systemParts.push(INTRO_ABSTRACT_CHAT_SYSTEM);
  }
  if (typeof system === "string" && system.trim()) systemParts.push(system.trim());
  if (docBlock) systemParts.push(docBlock);
  const combinedSystem = systemParts.length > 0 ? systemParts.join("\n\n---\n\n") : undefined;

  const messages: Array<{ role: string; content: string | typeof contentParts }> = [];
  if (combinedSystem) messages.push({ role: "system", content: combinedSystem });
  messages.push({ role: "user", content: contentParts });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const allowedCiteIds = new Set(articleIds);

  try {
    const openrouter = createOpenRouter(apiKey);
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: selectedModel,
        messages: messages as unknown as never[],
        stream: true,
      },
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (chunk.usage) res.write(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`);
    }

    if (articleIds.length > 0 && fullText) {
      const citeCheck = validateCiteTargets(fullText, allowedCiteIds);
      if (!citeCheck.ok) {
        const note = `\n\n[Citation check] Unknown cite target(s): ${citeCheck.invalid.join(", ")}. Use only Internal IDs from the context.`;
        res.write(`data: ${JSON.stringify({ content: note })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenRouter error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
