import dotenv from "dotenv";
import express from "express";
import { OpenRouter } from "@openrouter/sdk";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: "openrouter/free",
        messages: [{ role: "user", content: message }],
        stream: true,
      },
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (chunk.usage) {
        res.write(
          `data: ${JSON.stringify({ usage: chunk.usage })}\n\n`
        );
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("OpenRouter error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const PORT = 3456;
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
