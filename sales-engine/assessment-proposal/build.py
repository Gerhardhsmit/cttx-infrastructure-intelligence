#!/usr/bin/env python3
"""One-page Private Infrastructure Network Assessment proposal, per prospect.

For every prospect in prospects.json (or the slugs given on the command line):
  1. renders sales-engine/customers/<slug>/<Short>_Assessment_Proposal_CTTX.pdf (+ .html)
  2. rebuilds the prospect's Outlook draft with that PDF EMBEDDED, keeping the
     original body, subject, recipients and Cc unchanged, into
     sales-engine/outreach/<outdir>/ (default 2026-09-28-assessment-proposals)
  3. verifies the .eml carries exactly that PDF.

DRAFTS ONLY: nothing here sends mail. Load into Outlook with "Load CTTX Drafts".
The only rand amount allowed on the page is the R3,500 assessment fee.

Usage:
  python3 sales-engine/assessment-proposal/build.py              # all prospects
  python3 sales-engine/assessment-proposal/build.py ppc supacrush
"""
import html
import json
import os
import re
import subprocess
import sys
from email import policy
from email.parser import BytesParser
from email.utils import getaddresses
from pathlib import Path
from string import Template

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(REPO / "outbound-communication"))
from make_eml import build as build_eml, embedded_attachments  # noqa: E402

CHROME = os.environ.get("CHROME", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
SRC_DIR = REPO / "sales-engine" / "outreach-archive" / "2026-09-28-batch2"
OUT_DIR = REPO / "sales-engine" / "outreach" / os.environ.get("OUTDIR", "2026-09-28-assessment-proposals")
ALLOWED_RAND = {"R3,500"}


def safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_")


FONTS = [("Inter", "Inter.woff2", "400 700"), ("Inter Tight", "InterTight.woff2", "600 800"),
         ("Roboto Mono", "RobotoMono.woff2", "400 700")]


def font_css():
    """Brand fonts inlined as data URIs so headless Chrome embeds them (no network at print time)."""
    import base64
    return "\n".join(
        f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;"
        f"src:url(data:font/woff2;base64,{base64.b64encode((HERE / 'fonts' / fn).read_bytes()).decode()}) format('woff2');}}"
        for fam, fn, w in FONTS)


def lens_rows(lenses, overrides):
    rows = []
    for l in lenses:
        o = {**l, **overrides.get(l["lens"], {})}
        rows.append(f'<tr><td class="l">{html.escape(o["lens"])}</td><td class="c">{html.escape(o["cost"])}</td>'
                    f'<td>{html.escape(o["value"])}</td></tr>')
    return "\n    ".join(rows)


def render(p, seg, brand, date):
    t = brand["tokens"]
    f = brand["fonts"]
    extra = p.get("deliver_extra") or seg.get("deliver_extra")
    proof = p.get("proof", seg.get("proof"))
    fields = {
        "title": f'{p["short"]} Assessment Proposal',
        "font_css": font_css(), "font_body": f["body"], "font_display": f["display"], "font_mono": f["mono"],
        "bg": t["bg"], "surface": t["surface"], "text": t["text"], "muted": t["muted"], "accent": t["accent"],
        "alert": t["alert"], "border": t["border"],
        "contact": html.escape(p["contact"]), "title_role": html.escape(p["title"]), "company": html.escape(p["company"]),
        "date": date, "short": html.escape(p["short"]), "headline": html.escape(p["headline"]),
        "situation": html.escape(p["situation"]),
        "walk": html.escape(p.get("walk") or seg["walk"]),
        "site_word": html.escape(p.get("site_word") or seg["site_word"]),
        "deliver_extra": f"\n      <li>{html.escape(extra)}</li>" if extra else "",
        "lens_rows": lens_rows(seg["lenses"], p.get("lens_overrides", {})),
        "proof": f'<p class="proof"><b>Reference.</b> {html.escape(proof)}</p>' if proof else "",
    }
    page = Template((HERE / "template.html").read_text(encoding="utf-8")).substitute(fields)
    text = re.sub(r"<[^>]+>", " ", page.split("<body>", 1)[1])
    bad = set(re.findall(r"R\s?\d[\d,\s]*", text)) - ALLOWED_RAND
    if {b.strip() for b in bad} - ALLOWED_RAND:
        raise SystemExit(f'{p["slug"]}: refusing to build, rand amount other than the assessment fee: {bad}')
    return page


def pdf_pages(path: Path) -> int:
    return len(re.findall(rb"/Type\s*/Page(?!s)", path.read_bytes()))


def build_one(p, segments, brand, date):
    seg = segments[p["segment"]]
    cust = REPO / "sales-engine" / "customers" / p["slug"]
    cust.mkdir(parents=True, exist_ok=True)
    stem = f'{safe(p["short"])}_Assessment_Proposal_CTTX'
    html_path, pdf_path = cust / f"{stem}.html", cust / f"{stem}.pdf"
    html_path.write_text(render(p, seg, brand, date), encoding="utf-8")
    subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    "--virtual-time-budget=8000", f"--print-to-pdf={pdf_path}", html_path.as_uri()],
                   check=True, capture_output=True)
    pages = pdf_pages(pdf_path)
    if pages != 1:
        raise SystemExit(f"{pdf_path.name}: {pages} pages, must be exactly one")
    try:  # the page clips overflow, so confirm the footer (last element) made it onto the page
        import pymupdf
        if "041 371 1089" not in pymupdf.open(pdf_path)[0].get_text():
            raise SystemExit(f"{pdf_path.name}: content overflows the page (footer clipped); shorten the text")
    except ImportError:
        print("  (pymupdf not installed: overflow check skipped; look at the PDF)")

    # Rebuild the draft: same body, subject, To, Cc and Date; PDF embedded.
    src = SRC_DIR / p["source_eml"]
    msg = BytesParser(policy=policy.default).parsebytes(src.read_bytes())
    body = msg.get_body(preferencelist=("plain",)).get_content()
    cc = ", ".join(f"{n} <{a}>" if n else a for n, a in getaddresses([msg["Cc"] or ""]) if a.lower() != "gerhard@cttx.co.za")
    old_note = (msg["X-CTTX-Note"] or "").replace("Attach the one-page assessment proposal PDF before sending. ", "")
    note = f"One-page assessment proposal {pdf_path.name} embedded (built {date}). {old_note}".strip()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_pdf = OUT_DIR / pdf_path.name
    out_pdf.write_bytes(pdf_path.read_bytes())
    eml = build_eml(str(msg["To"]), str(msg["Subject"]), body, [out_pdf], note, cc, date=str(msg["Date"]))
    name = re.sub(r"^D\d+ ", "", src.name)
    out_eml = OUT_DIR / name
    out_eml.write_bytes(eml.as_bytes())

    atts = embedded_attachments(out_eml)
    assert len(atts) == 1 and atts[0][0] == pdf_path.name and atts[0][1] == pdf_path.read_bytes(), out_eml
    print(f"OK  {p['short']:<24} {pdf_path.relative_to(REPO)}  ->  {out_eml.relative_to(REPO)}")


def main():
    data = json.loads((HERE / "prospects.json").read_text(encoding="utf-8"))
    segments = json.loads((HERE / "segments.json").read_text(encoding="utf-8"))
    brand = json.loads((REPO / "sales-engine" / "terrain-study" / "brand.json").read_text(encoding="utf-8"))
    want = set(sys.argv[1:])
    for p in data["prospects"]:
        if not want or p["slug"] in want:
            build_one(p, segments, brand, data["date"])


if __name__ == "__main__":
    main()
