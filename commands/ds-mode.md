---
description: Disable or re-enable DS Mode, or answer a one-shot prompt with a forced visual HTML one-pager.
argument-hint: [off | on | <your question>]
---

Interpret `$ARGUMENTS` as follows. Match exactly — do not be creative.

- If `$ARGUMENTS` is empty or exactly `on`: DS Mode is now active for this session. Reply with one short line: "DS Mode is active." Then wait for the user's next request. Do not generate a TLDR or HTML for this confirmation.

- If `$ARGUMENTS` is exactly `off`: DS Mode is disabled for this session. Reply with one short line: "DS Mode disabled for this session. Re-enable with /ds-mode on." Do not generate a TLDR or HTML for this confirmation.

- Otherwise, treat `$ARGUMENTS` as the user's actual question. Answer it under the full DS Mode ruleset (substance body + plain-English TLDR block at the bottom). Because the user explicitly invoked `/ds-mode`, the **visual HTML one-pager is MANDATORY for this turn regardless of reply length**. Build a self-contained HTML file with an illustration-first layout (hero SVG + captioned tiles, NOT bullet lists or paragraph blocks), save it to `${TMPDIR:-/tmp}/dsmode-summary-<timestamp>.html`, and `open` it via the Bash tool before sending the reply. Mention "Opened a one-page visual summary in your browser." in one sentence above the TLDR.
