# CRUISER — Result Card Generator (Hand-Over)

This folder backs up the **CRUISER** speed-test result-card assets so they can be referenced directly from GitHub (no re-uploading needed).

## Files

| File | Purpose |
|------|---------|
| `make_cruiser.py` | Python (Pillow) script that renders a 1080×1080 PNG result card. **Has known issues — see below.** |
| `CRUISER_reference.png` | Screenshot of the real CRUISER web-app result. The script output should match this. |
| `CRUISER_viral_content.md` | CRUISER viral content package (TikTok/IG scripts, hashtags, schedule) — brand/tone context. |
| `CRUISER_handover_prompt.md` | Ready-to-paste prompt to hand this work over to Claude. |

## Known issues in `make_cruiser.py`

1. **Hard-coded output path** (`/sessions/zealous-wizardly-lamport/mnt/outputs/...`) — only valid in an old sandbox; will fail elsewhere. Make it a CLI arg / relative path.
2. **Gauge rendering** — colored ring drawn as stacked 1px arcs; bands and unfilled remainder don't match the reference.
3. **Missing-glyph "tofu" boxes** — icons `↓ ↑ ◉ ~ ⊙` and the `—` em dash aren't in DejaVu Sans Mono. Bundle a suitable font, substitute, or draw as shapes.
4. **Layout fidelity** — fonts, spacing, colors, and the "CTTX | Authorised Vodacom Business Reseller" caption should match the screenshot.

## How to hand over to Claude

Open `CRUISER_handover_prompt.md`, copy the section below the divider, and paste it into Claude. Point Claude at this folder (or the raw GitHub URLs) for the three reference files.

---

*CTTX — Authorised Vodacom Business Reseller*
