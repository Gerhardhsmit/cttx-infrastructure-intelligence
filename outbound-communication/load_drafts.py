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

Usage (Windows). Easiest: double-click "Load CTTX Drafts.bat" in the repo root.
    python load_drafts.py --from-repo            # load every new draft committed under sales-engine/outreach/
    python load_drafts.py --from-repo --dry-run  # show what would load, change nothing
    python load_drafts.py                        # load .eml files from Desktop\CTTX Prospect Drafts
    python load_drafts.py --find Amakhala        # read-only: where are drafts with this subject?
    python load_drafts.py --install-shortcut     # put a "Load CTTX Drafts" shortcut on the Desktop

Attachments: an .eml may carry "X-CTTX-Attach: file1.pdf, file2.pdf". Paths are
relative to the .eml's folder. A missing attachment fails that draft loudly.
Drafts always go into the gerhard@cttx.co.za mailbox's Drafts folder.
"""

import argparse
import shutil
import sys
from email import policy
from email.parser import BytesParser
from email.utils import getaddresses
from pathlib import Path

from worker import OutboundWorker, find_cttx_account

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTREACH_DIR = REPO_ROOT / "sales-engine" / "outreach"

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
    attach = [a.strip() for a in str(msg.get("X-CTTX-Attach", "")).split(",") if a.strip()]
    return to, cc, subject, body, body_type, [path.parent / a for a in attach]


def ledger_path(folder: Path) -> Path:
    return folder / "_ledger.txt"


def read_ledger(folder: Path):
    p = ledger_path(folder)
    return set(p.read_text(encoding="utf-8").splitlines()) if p.exists() else None


def add_to_ledger(folder: Path, key: str):
    with ledger_path(folder).open("a", encoding="utf-8") as f:
        f.write(key + "\n")


def repo_key(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def find_drafts(text: str):
    """Read-only: list drafts in every mailbox whose subject contains text."""
    import win32com.client
    ns = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
    hits = 0
    for i in range(1, ns.Stores.Count + 1):
        store = ns.Stores.Item(i)
        try:
            drafts = store.GetDefaultFolder(16)
        except Exception:
            continue
        for item in drafts.Items:
            subj = getattr(item, "Subject", "") or ""
            if text.lower() in subj.lower():
                first = (getattr(item, "Body", "") or "").strip().splitlines()
                para = next((l for l in first[1:] if l.strip()), "")
                n_att = item.Attachments.Count
                print(f"{store.DisplayName} \\ Drafts | {item.LastModificationTime} | {subj} | "
                      f"{n_att} attachment(s) | starts: {para[:70]}")
                hits += 1
    if not hits:
        print(f"No drafts with '{text}' in the subject in any mailbox.")


def install_shortcut():
    import win32com.client
    target = REPO_ROOT / "Load CTTX Drafts.bat"
    desktop = Path.home() / "Desktop"
    lnk = desktop / "Load CTTX Drafts.lnk"
    shell = win32com.client.Dispatch("WScript.Shell")
    sc = shell.CreateShortCut(str(lnk))
    sc.Targetpath = str(target)
    sc.WorkingDirectory = str(REPO_ROOT)
    sc.save()
    print(f"Shortcut created: {lnk}")


def main():
    parser = argparse.ArgumentParser(description="Load routine .eml drafts into Outlook Drafts (never sends)")
    parser.add_argument("--folder", type=Path, default=DEFAULT_FOLDER)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--from-repo", action="store_true",
                        help="load new .eml drafts committed under sales-engine/outreach/ (tracked in _ledger.txt)")
    parser.add_argument("--yes", action="store_true", help="skip the first-run confirmation")
    parser.add_argument("--find", metavar="TEXT", help="read-only: show drafts whose subject contains TEXT")
    parser.add_argument("--install-shortcut", action="store_true")
    args = parser.parse_args()

    if args.find:
        find_drafts(args.find)
        return
    if args.install_shortcut:
        install_shortcut()
        return

    folder = args.folder
    folder.mkdir(parents=True, exist_ok=True)

    loaded_dir = folder / "_loaded"
    rejected_dir = folder / "_rejected"
    # Only the routine's prospect drafts, never other client correspondence.
    if args.from_repo:
        ledger = read_ledger(folder)
        first_run = ledger is None
        if first_run:
            # Anything already loaded the old way (moved to _loaded) counts as done.
            done_names = {p.name for p in loaded_dir.glob("*.eml")} if loaded_dir.is_dir() else set()
            ledger = set()
            for p in sorted(OUTREACH_DIR.rglob("*_Assessment_*.eml")):
                if "_rejected" in p.parts:
                    continue
                if p.name in done_names:
                    ledger.add(repo_key(p))
            if not args.dry_run:
                ledger_path(folder).write_text("".join(k + "\n" for k in sorted(ledger)), encoding="utf-8")
        files = [p for p in sorted(OUTREACH_DIR.rglob("*_Assessment_*.eml")) if repo_key(p) not in ledger]
        if files and first_run and not args.dry_run and not args.yes:
            print("First run: these drafts have not been loaded before:")
            for p in files:
                print("  " + repo_key(p))
            if input("Load them into Outlook Drafts? [y/N] ").strip().lower() != "y":
                for p in files:
                    add_to_ledger(folder, repo_key(p))
                print("Skipped. They are marked as handled and won't be offered again.")
                return
    else:
        files = sorted(folder.glob("*_Assessment_*.eml"))
    if not files:
        print("No new drafts to load." if args.from_repo else f"No new .eml drafts in {folder}")
        return

    worker = None if args.dry_run else OutboundWorker()
    loaded = rejected = failed = 0

    for path in files:
        try:
            to, cc, subject, body, body_type, attachments = parse_eml(path)
        except Exception as e:
            print(f"FAIL   {path.name}: could not read ({e})")
            failed += 1
            continue

        reason = None
        if not to:
            reason = "no recipient"
        elif any(is_generic(a) for a in to):
            reason = f"generic address {', '.join(a for a in to if is_generic(a))} — needs a named decision maker"
        missing = [a.name for a in attachments if not a.is_file()]
        if not reason and missing:
            print(f"FAIL   {path.name}: attachment not found next to the .eml: {', '.join(missing)}")
            failed += 1
            continue

        if reason:
            print(f"REJECT {path.name}: {reason}")
            rejected += 1
            if not args.dry_run:
                rejected_dir.mkdir(exist_ok=True)
                if args.from_repo:
                    add_to_ledger(folder, repo_key(path))
                    (rejected_dir / (path.stem + ".reason.txt")).write_text(reason, encoding="utf-8")
                else:
                    shutil.move(str(path), rejected_dir / path.name)
                    (rejected_dir / (path.stem + ".reason.txt")).write_text(reason, encoding="utf-8")
            continue

        if args.dry_run:
            extra = f" + {', '.join(a.name for a in attachments)}" if attachments else ""
            print(f"WOULD LOAD {path.name} -> {', '.join(to)}{extra}")
            loaded += 1
            continue

        result = worker.create_draft_in_outlook("; ".join(to), subject, body, body_type, "; ".join(cc),
                                                attachments=attachments)
        if result["success"]:
            extra = f" + {len(attachments)} attachment(s)" if attachments else ""
            print(f"DRAFT  {path.name} -> {', '.join(to)}{extra}  [{result.get('location', 'Drafts')}]")
            loaded += 1
            if args.from_repo:
                add_to_ledger(folder, repo_key(path))
            else:
                loaded_dir.mkdir(exist_ok=True)
                shutil.move(str(path), loaded_dir / path.name)
        else:
            print(f"FAIL   {path.name}: {result['error']}")
            failed += 1

    verb = "would load" if args.dry_run else "loaded into Outlook Drafts"
    print(f"\n{loaded} {verb}, {rejected} rejected, {failed} failed. Nothing was sent.")


if __name__ == "__main__":
    main()
