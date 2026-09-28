#!/usr/bin/env python3
"""Build a CTTX prospect draft as a proper MIME .eml with the study PDF EMBEDDED.

DRAFTS ONLY. This file has no send capability.

Why: a draft that promises "the study is attached" must carry the study itself.
Embedding the PDF as a MIME part means the attachment travels with the .eml
(double-clicking the .eml in Outlook shows it), and load_drafts.py attaches it
to the gerhard@cttx.co.za draft from the MIME part. X-CTTX-Attach is still
written for the older path-based route, so both mechanisms agree.

Usage:
  python make_eml.py --to "Name <a@b.co.za>" --subject "..." --body body.txt \
      --attach path/to/Study.pdf --note "source of name/address" --out "Company - DRAFT_First_Last_Assessment_YYYYMMDD.eml"
  python make_eml.py --verify file.eml      # prints recipients and embedded attachments; exit 1 if none
"""
import argparse
import mimetypes
import sys
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from email.utils import formatdate
from pathlib import Path

FROM = "Gerhard Smit <gerhard@cttx.co.za>"
CC_SELF = "gerhard@cttx.co.za"


def build(to: str, subject: str, body: str, attachments, note: str = "", cc: str = "", date=None) -> EmailMessage:
    msg = EmailMessage(policy=policy.SMTP)
    msg["From"] = FROM
    msg["To"] = to
    msg["Cc"] = ", ".join(x for x in [CC_SELF, cc] if x)
    msg["Subject"] = subject
    msg["Date"] = date or formatdate(localtime=True)
    msg["X-Unsent"] = "1"
    if note:
        msg["X-CTTX-Note"] = note
    if attachments:
        msg["X-CTTX-Attach"] = ", ".join(Path(a).name for a in attachments)
    msg.set_content(body.rstrip() + "\n", subtype="plain", charset="utf-8")
    for a in attachments or []:
        p = Path(a)
        if not p.is_file():
            raise FileNotFoundError(f"attachment not found: {p}")
        ctype, _ = mimetypes.guess_type(p.name)
        maintype, subtype = (ctype or "application/octet-stream").split("/", 1)
        msg.add_attachment(p.read_bytes(), maintype=maintype, subtype=subtype, filename=p.name)
    return msg


def embedded_attachments(path: Path):
    """[(filename, bytes)] for every MIME attachment part in an .eml."""
    msg = BytesParser(policy=policy.default).parsebytes(path.read_bytes())
    return [(part.get_filename(), part.get_payload(decode=True)) for part in msg.iter_attachments()]


def verify(path: Path) -> int:
    msg = BytesParser(policy=policy.default).parsebytes(path.read_bytes())
    atts = embedded_attachments(path)
    print(f"{path.name}\n  To: {msg['To']}\n  Cc: {msg['Cc']}\n  Subject: {msg['Subject']}")
    for name, data in atts:
        kind = "PDF" if data[:5] == b"%PDF-" else "other"
        print(f"  ATTACHED (MIME): {name} | {len(data):,} bytes | {kind}")
    if not atts:
        print("  NO MIME ATTACHMENT")
        return 1
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--verify", metavar="EML")
    ap.add_argument("--to")
    ap.add_argument("--cc", default="")
    ap.add_argument("--subject")
    ap.add_argument("--body", help="path to a UTF-8 text file with the body")
    ap.add_argument("--attach", action="append", default=[], help="file to embed (repeatable)")
    ap.add_argument("--note", default="")
    ap.add_argument("--out")
    args = ap.parse_args()
    if args.verify:
        sys.exit(verify(Path(args.verify)))
    if not (args.to and args.subject and args.body and args.out):
        ap.error("--to, --subject, --body and --out are required (or --verify)")
    if "_Assessment_" not in Path(args.out).name:
        ap.error("output filename must contain _Assessment_ so the loader picks it up")
    msg = build(args.to, args.subject, Path(args.body).read_text(encoding="utf-8"), args.attach, args.note, args.cc)
    Path(args.out).write_bytes(msg.as_bytes())
    print(f"wrote {args.out}")
    sys.exit(verify(Path(args.out)))


if __name__ == "__main__":
    main()
