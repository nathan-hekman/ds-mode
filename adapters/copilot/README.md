# DS Mode for GitHub Copilot Chat

Adds a plain-English TL;DR to the bottom of every Copilot Chat reply.

## Install

### Per-repo (custom instructions)

GitHub Copilot Chat reads `.github/copilot-instructions.md` from your repo
and appends it to its system prompt for every chat in that repo.

```sh
mkdir -p .github
curl -o .github/copilot-instructions.md \
  https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/adapters/copilot/copilot-instructions.md
```

Commit and push. Copilot picks it up on the next chat.

### Per-user (VS Code)

To make DS Mode the default across all your VS Code projects:

1. Open VS Code → Settings → search for `github.copilot.chat.codeGeneration.instructions`.
2. Add an entry pointing at the file:
   ```json
   "github.copilot.chat.codeGeneration.instructions": [
     { "file": "~/path/to/ds-mode/adapters/copilot/copilot-instructions.md" }
   ]
   ```
3. Reload VS Code.

The exact setting key may differ between Copilot versions; search for
"copilot instructions" in the VS Code settings UI.

## Use

Just chat in Copilot. Every non-trivial reply gets the TL;DR.

## Compatibility caveats

- **No auto-HTML.** Standard Copilot Chat can't run shell commands, so the
  one-page HTML pop-up doesn't fire. Instead, when content is long or has
  many parts, the rules tell Copilot to render a **markdown summary block**
  in the chat above the TL;DR.
- **Blocker quizzes** render as nested markdown lists (A/B/C) instead of
  styled cards.
- **Copilot Workspace** (the agent flavor with shell access) **does**
  support the full HTML feature — the rules detect that mode and switch
  behavior automatically.

## Uninstall

```sh
rm .github/copilot-instructions.md
```

Or remove the VS Code settings entry if you set it per-user.
