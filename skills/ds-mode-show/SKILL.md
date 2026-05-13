---
name: ds-mode-show
description: Generate a single-page HTML recap of the current Claude Code session's conversation in plain English. Opens it in the browser. Use when the user asks for "a recap", "summary of what we talked about", "/ds-mode-show", or "show me what we did".
---

# /ds-mode-show

Generate a one-page HTML summary of the **current Claude Code session's conversation** in plain English. Save to `$TMPDIR` and `open` it.

## What to produce

A single self-contained HTML file with:

- **Title bar** — "Session Recap · DS Mode"
- **3-6 bullets** distilling what was discussed (plain English; a second-grader should get it)
- **One inline-SVG flow diagram** showing the arc of the conversation (start → key turns → outcome). Hand-drawn feel, muted palette, ≤200px tall.
- **Optional "Next steps" section** with 2-3 bullets if the conversation ended on a decision or pending question.

Apply `/impeccable` styling principles: no AI-slop gradients, no emoji walls, system font stack, ≤700px tall at 1024px wide, classy.

## How to find the transcript

Claude Code stores session transcripts at:
`~/.claude/projects/<cwd-slug>/<session-id>.jsonl`

Use `$CLAUDE_TRANSCRIPT_PATH` if the harness has populated it; otherwise glob the most recently modified `.jsonl` under the current project's slug directory. The cwd slug is the user's cwd with `/` → `-`.

## Steps

1. Resolve transcript path (env var preferred, glob fallback).
2. Read the JSONL. Each line is a message event. Extract:
   - User prompts (role=user, ignore system reminders)
   - Final assistant text per turn (last `text` block; ignore tool calls)
3. Distill into bullets. Translate jargon as you go ("endpoint" → "the part of the server that answers requests", "refactor" → "rewrite without changing what it does").
4. Generate the HTML inline.
5. Save to `${TMPDIR:-/tmp}/dsmode-recap-$(date +%Y%m%d-%H%M%S).html`.
6. `open` the file via Bash.
7. Reply with one line: **"Opened session recap in your browser."** No additional narrative.

## Stay in main thread

Do **not** spawn a subagent for this skill. The source data is one transcript file — Read it directly. The distillation benefits from full conversation context.

## TLDR block

Skip the TLDR block on this skill's reply — the HTML page IS the deliverable. One-line confirmation is enough.
