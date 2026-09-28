# One-page assessment proposal

The PDF that outreach drafts promise with "The one-page proposal is attached".
Offer: half-day on-site Private Infrastructure Network Assessment, R3,500 ex VAT,
credited against the build. Use it where no terrain study exists (farms, quarries,
plants, forestry, O&M); reserves and wind farms with a study get the study instead.

```bash
pip install pymupdf   # optional: enables the overflow check
python3 sales-engine/assessment-proposal/build.py            # all prospects
python3 sales-engine/assessment-proposal/build.py ppc        # one prospect
```

- `prospects.json`: one entry per prospect. `situation` uses only what the covering email says.
- `segments.json`: wording per segment (farm, mine, reserve, wind, forestry), including the
  required "Cost of Disconnection vs Value of Connected Operations" table (four ROI lenses).
- `template.html`: page layout; colours and fonts from `terrain-study/brand.json`, fonts vendored in `fonts/`.
- Output: `sales-engine/customers/<slug>/<Short>_Assessment_Proposal_CTTX.pdf` and the rebuilt draft
  (original body, subject, To and Cc, PDF embedded) in `sales-engine/outreach/2026-09-28-assessment-proposals/`.
  Same subject and recipient, so Load CTTX Drafts replaces the old unattached draft instead of duplicating it.
- Guards: exactly one page, footer not clipped, no rand amount other than R3,500, PDF embedded in the .eml.
- Named references only from `terrain-study/evidence.json` (currently Sandymount Safaris). DRAFTS ONLY: nothing sends.
