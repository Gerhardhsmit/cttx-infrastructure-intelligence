# CRUISER — Hand-Over Prompt for Claude

> Copy everything below the line into Claude (Claude.ai or Claude Code) as your first message. Attach the three files where indicated.

---

## ROLE & CONTEXT

You are taking over a live project for **CTTX**, a South African company that builds and enables private, carrier-grade wireless infrastructure (Cambium radios, Hubble batteries, Victron solar, masts) and is an **Authorised Vodacom Business Reseller**. CTTX targets reserves, farms, wine farms, mines, security operations, and any site that needs connectivity but is not served by a traditional WISP. CTTX builds on-premise infrastructure (core → distribution → access) and connects to the most suitable carrier (Vodacom Business, MTN, Fibre, etc.). We are establishing a new industry category called **PSI** (Private Sovereign / Site Infrastructure).

**CRUISER** is CTTX's branded internet speed-test web app (hosted on Cloudflare Workers at `cruiser-sa.gerhardcttx.workers.dev`). It measures download, upload, ping and jitter, and is used as a lead-generation and viral marketing tool. The brand look is a **dark olive/charcoal background with cyan/teal and amber/orange accents, monospace "terminal" typography**, and Land Cruiser / "cruising speed" messaging.

## WHAT I AM HANDING YOU

I am attaching three files:

1. **`make_cruiser.py`** — a Python (Pillow) script that generates a 1080×1080 PNG "result card" graphic of a completed CRUISER speed test (gauge dial + DOWNLOAD/UPLOAD/PING/JITTER stat boxes + "ALL SYSTEMS GO" status). This is the share/marketing graphic, not the web app itself.
2. **`CRUISE~1.PNG`** — the reference screenshot of the *actual* CRUISER web-app result (what the graphic should look like): "CRUISER" title, a circular gauge reading **85.5 Mbps / COMPLETE** with a needle, four stat tiles (Download 85.5, Upload 81.2, Ping 56, Jitter 21), and a green "TEST COMPLETE — CRUISING SPEED! / ALL SYSTEMS GO — You're cruising like a Land Cruiser on fresh tar." panel.
3. **`CRUISE~1.MD`** — the CRUISER viral content package (TikTok/Instagram scripts, hashtags, posting schedule, growth tactics) for context on tone, branding and how this asset is used.

## KNOWN ISSUES WITH `make_cruiser.py`

The Python script does not faithfully reproduce the reference screenshot. Please review and fix. Specific problems to check:

- **Hard-coded output path** — line ~149 saves to `/sessions/zealous-wizardly-lamport/mnt/outputs/...`. This path only existed in a previous sandbox and will fail elsewhere. Make the output path a CLI argument or a relative path (e.g. `./CRUISER_result.png`) and create the directory if needed.
- **Gauge rendering** — the colored arc segments are drawn as a stack of thin 1px arcs; the bands and the unfilled (grey) remainder don't match the smooth red→orange→yellow→green→cyan ring in the screenshot. The fill should stop at the current speed and the colors/positions should match the reference.
- **Glyph/emoji rendering** — icons like `↓ ↑ ◉ ~ ⊙` and the `—` em dash may render as missing-glyph boxes (tofu) because DejaVu Sans Mono lacks some of them. Either bundle a font that has them, substitute safe ASCII/Unicode equivalents, or draw the icons as vector shapes.
- **Layout fidelity** — fonts, spacing, box sizes, colors and the "CTTX | Authorised Vodacom Business Reseller" caption position should be matched as closely as possible to the screenshot.

## WHAT I WANT FROM YOU

1. Confirm you understand the project and the role of each file.
2. Produce a **corrected, self-contained `make_cruiser.py`** that:
   - Runs anywhere (no hard-coded sandbox paths; configurable output path).
   - Renders the gauge, stat tiles and status panel to closely match `CRUISE~1.PNG`.
   - Renders all icons/symbols cleanly with no missing-glyph boxes.
   - Optionally accepts the four values (download, upload, ping, jitter) and the speed as parameters so the same script can generate cards for any test result.
3. Briefly explain the key changes you made and how to run it.

## CONSTRAINTS & STYLE

- Keep it pure-Python with Pillow (no heavy new dependencies) unless a small extra package clearly solves the glyph problem better.
- Preserve CTTX branding: dark background, cyan/teal + amber accents, monospace feel, the "ALL SYSTEMS GO / cruising like a Land Cruiser on fresh tar" copy, and the "CTTX | Authorised Vodacom Business Reseller" line.
- Output is a 1080×1080 PNG suitable for Instagram/TikTok sharing.

Start by confirming your understanding, then deliver the fixed script.
