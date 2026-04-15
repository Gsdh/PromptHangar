# Changelog

All notable changes to PromptHangar.

## v0.3.0 — 2026-04-15

### Compare mode (Epic 7)

- Pick any revision as a **baseline** and run a draft against it across one
  or many models in one click ("bake-off").
- Per-model delta cards for cost, latency, input/output tokens, and output
  length — green when the new version wins, red when it regresses.
- **Champion revision** pointer, shown as a trophy badge in the prompt
  list. Baseline/champion travel with the prompt through export/import.

### Analytics (Epic 8)

- Spend-over-time line chart with 7 / 30 / 90 day ranges. Zero-fills missing
  days so the x-axis is continuous.
- Per-model breakdowns: cost bar chart, runs-vs-errors grouped bars, and a
  detail table.
- **Export traces to CSV** straight from the Analytics modal, for use in
  Excel, Sheets, or your own notebooks.

### Shareable bundles (Epic 9)

- New `.phpkg` bundle format — JSON with a stable schema — round-trips a
  prompt's revisions, outputs, tags, and trace metadata.
- One-click export from the prompt menu, one-click import from the top bar.
- **Optional "include trace bodies"** checkbox when exporting, to ship raw
  inputs + outputs alongside the metadata for full reproducibility. Off by
  default so casual shares don't accidentally leak conversational content.
- Baseline / champion pointers survive the round-trip via revision numbers.

### Master password & idle lock (Epic 10)

- Optional **master password** protects the UI behind a lock screen.
  Stored locally as an Argon2id PHC string (m=19 MiB, t=2, p=1) — the hash
  never leaves this machine.
- Configurable **idle auto-lock** (off / 5m / 15m / 30m / 1h / 4h). Resets
  on any mouse, keyboard, or scroll activity.
- **Lock now** button for on-demand locking.
- App always starts locked when a password is set — restarting doesn't
  bypass the lock.

### Notes

- Setting a master password does **not** encrypt the underlying SQLite
  database. For full-disk encryption, use your OS: FileVault, BitLocker,
  or LUKS.
- Data migrations 010–011 are additive; existing databases upgrade in
  place.

---

## v0.2.0 — earlier

- Git sync (Epic 2) — mirror selected prompts to a local Git repo with
  one commit per save.
- Coloured revisions (Epic 3) — visual revision timeline.
- Manual paste-in runs (Epic 4) — paste runs from ChatGPT/Claude/etc. to
  compare outputs side-by-side.
- Multi-run samples ×N (Epic 5) — run the same prompt many times to see
  variance.
- Multi-provider fan-out (Epic 6) — run one prompt against many models in
  parallel.
