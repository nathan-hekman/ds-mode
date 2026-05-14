---
description: Switch DS Mode (lite | full | off | on), or answer a one-shot prompt with a forced visual HTML one-pager.
argument-hint: [lite | full | off | on | <your question>]
---

Interpret `$ARGUMENTS` as follows. Match exactly — do not be creative.

- If `$ARGUMENTS` is empty: DS Mode is now active at the session's default mode. Reply with one short line: "DS Mode is active." Then wait for the user's next request. Do not generate a TLDR or HTML for this confirmation.

- If `$ARGUMENTS` is exactly `on`: DS Mode is now active at the session's default mode. Reply with one short line: "DS Mode is active." Do not generate a TLDR or HTML for this confirmation.

- If `$ARGUMENTS` is exactly `off`: DS Mode is disabled for this session. Reply with one short line: "DS Mode disabled for this session. Re-enable with /ds-mode on." Do not generate a TLDR or HTML for this confirmation.

- If `$ARGUMENTS` is exactly `lite`: DS Mode is now in **lite mode** for this session. Reply with one short line: "DS Mode → lite (TLDR only; HTML one-pager only when /ds-mode is invoked with a question)." Do not generate a TLDR or HTML for this confirmation.

- If `$ARGUMENTS` is exactly `full`: DS Mode is now in **full mode** for this session. Reply with one short line: "DS Mode → full (TLDR + auto HTML one-pager when triggers fire)." Do not generate a TLDR or HTML for this confirmation.

- Otherwise, treat `$ARGUMENTS` as the user's actual question. Answer it under the full DS Mode ruleset (substance body + plain-English TLDR block at the bottom). Because the user explicitly invoked `/ds-mode`, the **visual HTML one-pager is MANDATORY for this turn regardless of the active mode and regardless of reply length**. Build a self-contained HTML file with an illustration-first layout (hero SVG + captioned tiles, NOT bullet lists or paragraph blocks), save it to `${TMPDIR:-/tmp}/dsmode-summary-<timestamp>.html`, and `open` it via the Bash tool before sending the reply. Mention "Opened a one-page visual summary in your browser." in one sentence above the TLDR.
