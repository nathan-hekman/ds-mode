---
description: "Switch DS Mode (lite/full/off/on), theme (dark/light/auto), mobile mode (setup/on/off/status), or answer a one-shot prompt with a forced visual HTML one-pager."
argument-hint: "lite | full | off | on | dark | light | auto | mobile setup|on|off|status | <your question>"
---

Interpret `$ARGUMENTS` as follows. Match exactly — do not be creative.

- If `$ARGUMENTS` is empty or `on`: DS Mode is active at the session's
  default mode. Reply with one short line: "DS Mode is active." Do not
  generate a TLDR or HTML.

- If `$ARGUMENTS` is `off`: DS Mode is disabled for this session. Reply
  with one short line: "DS Mode disabled for this session. Re-enable with
  /ds-mode on." Do not generate a TLDR or HTML.

- If `$ARGUMENTS` is `lite` or `full`: confirm the mode switch in one
  line. For lite: "DS Mode → lite (TLDR only; HTML one-pager only when
  /ds-mode is invoked with a question)." For full: "DS Mode → full (TLDR
  + auto HTML one-pager when triggers fire)." Do not generate a TLDR
  or HTML.

- If `$ARGUMENTS` is `dark`, `light`, or `auto`: confirm the theme
  switch in one line. For dark: "DS Mode theme → dark." For light: "DS
  Mode theme → light." For auto: "DS Mode theme → auto (follows your
  OS preference)." Do not generate a TLDR or HTML.

- If `$ARGUMENTS` starts with `mobile`: handled by the tracker hook,
  which leaves an instruction in the prompt context. Follow that
  instruction. The four sub-commands:
  - `/ds-mode mobile setup` — run the setup wizard (`bash
    "<install>/hooks/ds-mode-mobile-setup.sh"`) and surface its output
    verbatim. It creates a PRIVATE GitHub repo via the user's `gh`
    auth and writes the config.
  - `/ds-mode mobile on` — enable publishing (requires prior setup).
  - `/ds-mode mobile off` — pause publishing.
  - `/ds-mode mobile status` — print whether mobile mode is configured
    and active.

  Confirm the action in one line and do not generate a TLDR or HTML.

- Otherwise, treat `$ARGUMENTS` as the user's actual question. Answer it
  under the full DS Mode ruleset (substance body + plain-English TLDR
  block at the bottom). Because the user explicitly invoked `/ds-mode`,
  the **visual HTML one-pager is MANDATORY for this turn regardless of
  the active mode and regardless of reply length**. Use
  `templates/build.mjs` (stamper) to produce the HTML — pick the
  template kind that fits (`explainer`, `comparison`, `decision`, or
  `status`), fill the slots, then `open` the result via Bash. If
  mobile mode is on, the stamper also prints a second URL line — a
  private GitHub URL the user can tap from their phone. Include both
  the local `open` mention and the GitHub URL in the reply, one
  sentence above the TLDR.
