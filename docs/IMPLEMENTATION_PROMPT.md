# Implementation prompt (optimized)

Paste into Cursor, tickets, or agent sessions. Work in this order unless blocked.

```
Build improvements for a literature-review app. Work in this order unless blocked.

1) Metadata + export
- After upload/parse, extract and store: title, authors, year, datasets (name + URL when known), web/related links, and venue fields (journal/book/conference/report as applicable).
- Persist in the existing SQL DB with stable article IDs; support browse/filter in UI.
- Add "Export to Excel" for non-technical users (no raw SQL required).

2) Summaries with depth
- One flow that accepts depth: 1-line | 5-line | detailed (section-by-section or by logical blocks). Same retrieval/context; only instructions/length change.

3) Literature review from a set
- From user-selected papers, generate a longer synthesis. Include a visible "Copy to clipboard" on the output.

4) Clickable citations
- In rendered HTML for generated text, each citation must link/navigate to the corresponding source article in-app.

5) Tone and style (system prompts)
- Academic, discipline-appropriate wording. Reduce bot-like patterns: em-dash stuffing, hype, vague transitions. Apply to summaries, synthesized abstract/intro, and lit-review outputs.

6) Packaging plan (document only unless timeboxed)
- Outline a one-click installer path for non-technical users (e.g. PyInstaller + Inno Setup on Windows); note macOS if needed.

Constraints: minimal scope creep; reuse existing auth, article storage, and chat/query patterns where possible.
```
