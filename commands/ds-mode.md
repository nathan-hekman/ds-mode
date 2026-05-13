---
description: Activate DS Mode — plain-English TLDR + conditional blockers at the bottom of every response, plus one-page HTML summary when answer runs long/dense, a decision is on the table, or blockers exist.
---

Activate **DS Mode** for the rest of this session.

Read and follow the full rules in `~/.claude/output-styles/ds-mode.md`. Apply on every response. The brand label is always **DS Mode** in user-facing output — no other expansion.

Quick recap of what to do (HTML is the headline feature — do not skip it):
1. **HTML one-pager is MANDATORY**, not optional, whenever the body is > 3 sentences AND any of: has a heading, has a code block, has an A/B option list, has a Blockers question, or is ≥ ~400 words. Save to `/tmp/dsmode-summary-YYYYMMDD-HHMMSS.html` and run `open <path>` via Bash *before* sending the reply. Mention it in one sentence above the TLDR. Default to YES — if you are weighing it, build it.
2. HTML uses `/impeccable` styling principles. Self-contained file, inline SVG, ≤ ~700px tall, classy. Blocker-flavor renders each question as A/B/C tiles (one-line label + one-line "why pick this").
3. Every non-trivial response ends with a TLDR block at the very bottom. Header line literal: `-----------TLDR [DS Mode]------------`. **Max 3 bullets, max 12 words each.** Plain English (a second-grader should get it). No equations, no proper nouns, no semicolons.
4. Add a `**Blockers / questions for you (must answer to move forward):**` section under the TLDR ONLY if real blockers exist — if none, omit the heading entirely (do NOT write "- none").
5. TLDR + blockers always written in full plain English even if caveman mode is active.
6. Pre-send gate: did I build the HTML? did I `open` it? did I mention it in the reply? If any "no" while triggers fire — stop and fix before sending.

After activating, immediately tell the user **how to make this permanent across all future sessions**:

> To set DS Mode permanently (every session, every restart), re-run the installer with the `--permanent` flag from the cloned repo:
> ```
> ./install.sh --permanent
> ```
> That adds `"outputStyle": "DS Mode"` to `~/.claude/settings.json` (with a backup). You can also add that line by hand. To turn it off later, remove the line.

Confirm activation in one short line + the permanence instructions above. Then proceed with whatever the user asks next.
