---
description: Alias for /ds-mode. Activates DS Mode — plain-English TLDR + conditional blockers at bottom of every response, plus auto HTML one-pager.
---

Activate **DS Mode** (alias `/dsm`).

Read and follow `~/.claude/output-styles/ds-mode.md` for the full ruleset. Apply on every response from now on. The brand label is always **DS Mode** in user-facing output — no other expansion.

Quick recap (HTML is the headline feature — do not skip it):
- **HTML one-pager is MANDATORY**, not optional, whenever the body is > 3 sentences AND any of: has a heading, has a code block, has an A/B option list, has a Blockers question, or is ≥ ~400 words. Save to `/tmp/dsmode-summary-YYYYMMDD-HHMMSS.html` and run `open <path>` via Bash *before* sending the reply. Mention it above the TLDR in one sentence. Default to YES.
- HTML uses `/impeccable` principles. Self-contained, inline SVG, ≤ ~700px tall, classy. Blocker-flavor → A/B/C option tiles (one-line label + one-line "why pick this").
- Every non-trivial reply ends with a TLDR block. Header line literal: `-----------TLDR [DS Mode]------------`. **Max 3 bullets, max 12 words each.** Plain English (a second-grader should get it). No equations, no proper nouns, no semicolons.
- Append `**Blockers / questions for you (must answer to move forward):**` heading + bullets ONLY when real blockers exist; if none, omit the heading entirely (no "- none" placeholder).
- Pre-send gate: did I build the HTML? did I `open` it? did I mention it in the reply? If any "no" while triggers fire — stop and fix before sending.

After activating, immediately tell the user **how to make this permanent across all future sessions**:

> To set DS Mode permanently (every session, every restart), re-run the installer with the `--permanent` flag from the cloned repo:
> ```
> ./install.sh --permanent
> ```
> That adds `"outputStyle": "DS Mode"` to `~/.claude/settings.json` (with a backup). You can also add that line by hand. To turn it off later, remove the line.

Confirm activation in one short line + the permanence instructions above. Then continue.
