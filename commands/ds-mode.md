---
description: Switch DS Mode (lite | full | off | on), set theme (dark | light | auto), or answer a one-shot prompt with a forced visual HTML one-pager.
argument-hint: [lite | full | off | on | dark | light | auto | <your question>]
---

Interpret `$ARGUMENTS` as follows. Match exactly — do not be creative.

- If `$ARGUMENTS` is empty or `on`: DS Mode is active at the session's
  default mode. Reply with one short line: "DS Mode is active." Do not
  generate a TLDR or HTML for this confirmation.

- If `$ARGUMENTS` is `off`: DS Mode is disabled for this session. Reply
  with one short line: "DS Mode disabled for this session. Re-enable with
  /ds-mode on." Do not generate a TLDR or HTML.

- If `$ARGUMENTS` is `lite` or `full`: confirm the mode switch in one
  line. For lite: "DS Mode → lite (TLDR only; HTML one-pager only when
  /ds-mode is invoked with a question)." For full: "DS Mode → full (TLDR
  + auto HTML one-pager when triggers fire)." Do not generate a TLDR or
  HTML for this confirmation.

- If `$ARGUMENTS` is `dark`, `light`, or `auto`: confirm the theme switch
  in one line. For dark: "DS Mode theme → dark." For light: "DS Mode
  theme → light." For auto: "DS Mode theme → auto (follows your OS
  preference)." Do not generate a TLDR or HTML.

- Otherwise, treat `$ARGUMENTS` as the user's actual question. Answer it
  under the full DS Mode ruleset (substance body + plain-English TLDR
  block at the bottom). Because the user explicitly invoked `/ds-mode`,
  the **visual HTML one-pager is MANDATORY for this turn regardless of
  the active mode and regardless of reply length**. Use
  `templates/build.mjs` (stamper) to produce the HTML — pick the
  template kind that fits (`explainer`, `comparison`, `decision`, or
  `status`), fill the slots, then `open` the result via Bash. Mention
  "Opened a one-page visual summary in your browser." in one sentence
  above the TLDR.
