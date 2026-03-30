import { Router, Request, Response } from "express";
import { createOpenRouter } from "../lib/openrouter.js";
import { getSetting } from "../db.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { message, model, files, system } = req.body;
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

  const messages: Array<{ role: string; content: string | typeof contentParts }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: contentParts });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const openrouter = createOpenRouter(apiKey);
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: selectedModel,
        messages,
        stream: true,
      },
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      if (chunk.usage) res.write(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`);
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
