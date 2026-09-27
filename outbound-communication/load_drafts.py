#!/usr/bin/env python3
"""
Load the daily routine's .eml drafts into Outlook Drafts. DRAFTS ONLY.

The "CTTX daily prospect drafts" routine writes .eml files to
Desktop\\CTTX Prospect Drafts\\. This script picks them up,
saves each one into the Outlook Drafts folder, and moves the .eml into a
"_loaded" subfolder so it is never loaded twice.

It has no send capability. It also refuses generic or role addresses
(info@, reservations@ ...) — those go to "_rejected" with a reason, because
Gerhard's rule is: named decision maker or no draft.

Usage (Windows, from this folder):
    python load_drafts.py              # load new drafts into Outlook
    python load_drafts.py --dry-run    # show what would load, change nothing
"""

import argparse
import shutil
import sys
from email import policy
from email.parser import BytesParser
from email.utils import getaddresses
from pathlib import Path

from worker import OutboundWorker

# Dedicated folder: only prospect assessment drafts live here. Never point this
# at "Paratus\\! DRAFTS - For Your Attention", which holds client/creditor drafts.
DEFAULT_FOLDER = Path.home() / "Desktop" / "CTTX Prospect Drafts"

GENERIC_LOCAL_PARTS = {
    "info", "reservations", "reservation", "res", "bookings", "booking", "book",
    "admin", "enquiries", "enquiry", "inquiries", "inquiry", "sales", "contact",
    "hello", "office", "reception", "stay", "lodge", "mail", "general",
    "accounts", "marketing", "support", "help", "team", "welcome", "noreply",
    "no-reply", "events", "travel",
}


def is_generic(address: str) -> bool:
    local = address.split("@", 1)[0].lower()
    return local in GENERIC_LOCAL_PARTS


def parse_eml(path: Path):
    msg = BytesParser(policy=policy.default).parse(path.open("rb"))
    to = [addr for _, addr in getaddresses(msg.get_all("To", [])) if addr]
    cc = [addr for _, addr in getaddresses(msg.get_all("Cc", [])) if addr]
    subject = str(msg.get("Subject", "")).strip()
    part = msg.get_body(preferencelist=("plain", "html"))
    body = part.get_content() if part else ""
    body_type = "html" if part is not None and part.get_content_subtype() == "html" else "text"
    return to, cc, subject, body, body_type


def main():
    parser = argparse.ArgumentParser(description="Load routine .eml drafts into Outlook Drafts (never sends)")
    parser.add_argument("--folder", type=Path, default=DEFAULT_FOLDER)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    folder = args.folder
    if not folder.is_dir():
        print(f"Drafts folder not found: {folder}")
        sys.exit(1)

    loaded_dir = folder / "_loaded"
    rejected_dir = folder / "_rejected"
    # Only the routine's prospect drafts, never other client correspondence.
    files = sorted(folder.glob("*_Assessment_*.eml"))
    if not files:
        print(f"No new .eml drafts in {folder}")
        return

    worker = None if args.dry_run else OutboundWorker()
    loaded = rejected = failed = 0

    for path in files:
        try:
            to, cc, subject, body, body_type = parse_eml(path)
        except Exception as e:
            print(f"FAIL   {path.name}: could not read ({e})")
            failed += 1
            continue

        reason = None
        if not to:
            reason = "no recipient"
        elif any(is_generic(a) for a in to):
            reason = f"generic address {', '.join(a for a in to if is_generic(a))} — needs a named decision maker"

        if reason:
            print(f"REJECT {path.name}: {reason}")
            rejected += 1
            if not args.dry_run:
                rejected_dir.mkdir(exist_ok=True)
                shutil.move(str(path), rejected_dir / path.name)
                (rejected_dir / (path.stem + ".reason.txt")).write_text(reason, encoding="utf-8")
            continue

        if args.dry_run:
            print(f"WOULD LOAD {path.name} -> {', '.join(to)}")
            loaded += 1
            continue

        result = worker.create_draft_in_outlook("; ".join(to), subject, body, body_type, "; ".join(cc))
        if result["success"]:
            print(f"DRAFT  {path.name} -> {', '.join(to)}")
            loaded += 1
            loaded_dir.mkdir(exist_ok=True)
            shutil.move(str(path), loaded_dir / path.name)
        else:
            print(f"FAIL   {path.name}: {result['error']}")
            failed += 1

    verb = "would load" if args.dry_run else "loaded into Outlook Drafts"
    print(f"\n{loaded} {verb}, {rejected} rejected, {failed} failed. Nothing was sent.")


if __name__ == "__main__":
    main()
