# Security policy

## Reporting a vulnerability

If you find a security issue in DS Mode — anything from a bug in the install
scripts that could harm a user, to a way to abuse the rules to extract data,
to a problem with the GitHub Pages deploy — please email the maintainer
directly rather than opening a public issue.

Open an issue on the repo with the subject line "security contact" and I'll
follow up by email. Or @ me on the launch posts and I'll reach out.

## Threat model (what this project does and doesn't protect against)

**What DS Mode is:** a system-prompt overlay for AI coding agents. It ships
plain-text Markdown rules files and small shell installers. No daemons, no
network listeners, no background processes.

**Install one-liners pull from `main`.** The four `bash <(curl …)` and `curl
-o …` commands in the README and on the landing page fetch from
`raw.githubusercontent.com/nathan-hekman/ds-mode/main/...`. If the maintainer's
GitHub account is compromised, an attacker with push access to `main` can
swap script content; anyone who runs the one-liner after that point gets the
new code.

If you want a frozen install surface, replace `main` in any one-liner with a
specific git tag (e.g. `v1.0.0`). Pinning to a tag means the maintainer can
publish new versions without changing what your existing install command
fetches.

**The installers will modify these locations:**
- `~/.claude/output-styles/ds-mode.md` (overwritten)
- `~/.claude/commands/ds-mode.md` (overwritten)
- `~/.claude/commands/dsm.md` (overwritten)
- `~/.claude/settings.json` (only if `--permanent`; backed up to
  `settings.json.bak.preDSmode` first)
- `~/.codex/AGENTS.md` (created or appended; backed up if it existed)

The installers do not use `sudo`, do not delete anything, and do not write
outside the user's home directory. Verify before running by reading the
script: `curl -fsSL <url>` (without piping to bash).

## Supported versions

The latest commit on `main` is supported. Older tags receive no patches.
