#!/usr/bin/env python3
r"""
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
    python load_drafts.py --reload amakhala-study  # load a specific repo draft again
    python load_drafts.py --status               # read-only: what is in Drafts, and in Trash
    python load_drafts.py --restore              # move prospect drafts back from Trash to Drafts

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

import datetime
from worker import OutboundWorker, find_cttx_account, is_prospect_subject, trash_folders

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


def reflow(text: str) -> str:
    """Join hard-wrapped lines back into paragraphs so Outlook shows clean text.
    Short lines (greeting, signature, URLs) are kept as they are."""
    out = []
    for para in text.replace("\r\n", "\n").split("\n\n"):
        lines = para.split("\n")
        merged = lines[0]
        for prev, line in zip(lines, lines[1:]):
            if len(prev.rstrip()) >= 55 and line.strip():
                merged = merged.rstrip() + " " + line.strip()
            else:
                merged += "\n" + line
        out.append(merged)
    return "\n\n".join(out)


def parse_eml(path: Path):
    msg = BytesParser(policy=policy.default).parse(path.open("rb"))
    to = [addr for _, addr in getaddresses(msg.get_all("To", [])) if addr]
    cc = [addr for _, addr in getaddresses(msg.get_all("Cc", [])) if addr]
    subject = str(msg.get("Subject", "")).strip()
    part = msg.get_body(preferencelist=("plain", "html"))
    body = part.get_content() if part else ""
    body_type = "html" if part is not None and part.get_content_subtype() == "html" else "text"
    if body_type == "text":
        body = reflow(body)
    attach = [a.strip() for a in str(msg.get("X-CTTX-Attach", "")).split(",") if a.strip()]
    files = [path.parent / a for a in attach]
    # Embedded MIME attachments (make_eml.py): extract next to the .eml under _attachments/<stem>/.
    # They take precedence over a same-named X-CTTX-Attach path, so the study inside the .eml is what loads.
    embedded = [(part.get_filename(), part.get_payload(decode=True)) for part in msg.iter_attachments()]
    if embedded:
        outdir = path.parent / "_attachments" / path.stem
        outdir.mkdir(parents=True, exist_ok=True)
        emb_paths = []
        for name, data in embedded:
            if not name or data is None:
                continue
            fp = outdir / Path(name).name
            fp.write_bytes(data)
            emb_paths.append(fp)
        names = {f.name for f in emb_paths}
        files = emb_paths + [f for f in files if f.name not in names]
    return to, cc, subject, body, body_type, files


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


def current_repo_keys():
    """(subject, {to addresses}) for every live draft under sales-engine/outreach/."""
    keys = set()
    for p in OUTREACH_DIR.rglob("*_Assessment_*.eml"):
        to, _cc, subject, _b, _t, _a = parse_eml(p)
        keys.add(((subject or "").strip().lower(), frozenset(a.lower() for a in to)))
    return keys


def prune_superseded(dry_run: bool = False):
    """Move to Deleted Items every prospect draft in gerhard@cttx.co.za Drafts whose
    (subject, recipients) no longer matches a live .eml under sales-engine/outreach/.
    Only prospect subjects are touched; other client mail is never read or moved.
    Restorable with --restore. Never sends."""
    import win32com.client
    outlook = win32com.client.Dispatch("Outlook.Application")
    account, drafts = find_cttx_account(outlook)
    live = current_repo_keys()
    print(f"Live drafts in repo: {len(live)}. Checking {account.SmtpAddress} \\ Drafts ...")
    moved = kept = 0
    for item in list(drafts.Items):
        try:
            subject = (item.Subject or "").strip()
            if not is_prospect_subject(subject):
                continue
            to = frozenset(r.Address.lower() for r in item.Recipients if r.Type == 1)
        except Exception:
            continue
        if (subject.lower(), to) in live:
            kept += 1
            continue
        print(f"  {'WOULD REMOVE' if dry_run else 'REMOVED'}  {item.LastModificationTime} | {item.To} | {subject}")
        if not dry_run:
            item.Delete()
        moved += 1
    print(f"\n{'Would move' if dry_run else 'Moved'} {moved} superseded draft(s) to Deleted Items, kept {kept}. Nothing was sent.")
    if moved and not dry_run:
        print("To bring one back: python outbound-communication\\load_drafts.py --restore")


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


def mailbox_status(restore=False):
    """Read-only by default: what is in gerhard@cttx.co.za Drafts and in Trash/Deleted Items.
    With restore=True, move prospect drafts back from Trash when no copy is in Drafts."""
    import win32com.client
    outlook = win32com.client.Dispatch("Outlook.Application")
    account, drafts = find_cttx_account(outlook)
    items = list(drafts.Items)
    in_drafts = {((i.Subject or "").strip().lower(), (i.To or "").lower()) for i in items}
    print(f"Drafts in {account.SmtpAddress} ({drafts.FolderPath}): {len(items)}")
    for i in items:
        print(f"  DRAFT  {i.LastModificationTime} | {i.To} | {i.Subject} | {i.Attachments.Count} attachment(s)")
    restored = in_trash = 0
    for trash in trash_folders(account.DeliveryStore):
        hits = [i for i in list(trash.Items) if is_prospect_subject(getattr(i, "Subject", ""))]
        print(f"Prospect drafts in {trash.FolderPath}: {len(hits)}")
        newest = {}
        for i in hits:
            key = ((i.Subject or "").strip().lower(), (i.To or "").lower())
            if key not in newest or i.LastModificationTime > newest[key].LastModificationTime:
                newest[key] = i
        in_trash += len(newest)
        for key, i in newest.items():
            print(f"  TRASH  {i.LastModificationTime} | {i.To} | {i.Subject} | {i.Attachments.Count} attachment(s)")
            if restore and key not in in_drafts:
                i.Move(drafts)
                in_drafts.add(key)
                restored += 1
    if restore:
        print(f"\nRestored {restored} draft(s) to Drafts. Nothing was sent.")
    elif in_trash:
        print("\nTo move these back into Drafts: python outbound-communication\\load_drafts.py --restore")


class Tee:
    def __init__(self, path):
        self.f = open(path, "a", encoding="utf-8")
        self.out = sys.stdout
        self.f.write(f"\n===== {datetime.datetime.now():%Y-%m-%d %H:%M:%S} {' '.join(sys.argv[1:])}\n")

    def write(self, s):
        self.out.write(s)
        self.f.write(s)
        self.f.flush()

    def flush(self):
        self.out.flush()


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
    parser.add_argument("--status", action="store_true", help="read-only: list Drafts and prospect drafts in Trash")
    parser.add_argument("--restore", action="store_true", help="move prospect drafts back from Trash to Drafts")
    parser.add_argument("--prune", action="store_true",
                        help="move to Deleted Items every prospect draft that no longer matches a live .eml under sales-engine/outreach/ (restorable)")
    parser.add_argument("--reload", metavar="TEXT",
                        help="load again the repo drafts whose path contains TEXT (delete the old copy in Outlook first)")
    args = parser.parse_args()

    args.folder.mkdir(parents=True, exist_ok=True)
    sys.stdout = Tee(args.folder / "_load_log.txt")
    if args.status or args.restore:
        mailbox_status(restore=args.restore)
        return
    if args.find:
        find_drafts(args.find)
        return
    if args.prune:
        prune_superseded(dry_run=args.dry_run)
        return
    if args.install_shortcut:
        install_shortcut()
        return

    folder = args.folder
    folder.mkdir(parents=True, exist_ok=True)

    loaded_dir = folder / "_loaded"
    rejected_dir = folder / "_rejected"
    # Only the routine's prospect drafts, never other client correspondence.
    if args.reload:
        args.from_repo = True
        files = [p for p in sorted(OUTREACH_DIR.rglob("*_Assessment_*.eml")) if args.reload.lower() in repo_key(p).lower()]
        print(f"Reloading {len(files)} draft(s) matching '{args.reload}':")
        for p in files:
            print("  " + repo_key(p))
    elif args.from_repo:
        ledger = read_ledger(folder)
        first_run = ledger is None
        if first_run:
            # Anything already loaded the old way (moved to _loaded) counts as done.
            # Only an identical file counts: a newer draft may reuse an old filename.
            done = {p.name: p.read_bytes() for p in loaded_dir.glob("*.eml")} if loaded_dir.is_dir() else {}
            ledger = set()
            for p in sorted(OUTREACH_DIR.rglob("*_Assessment_*.eml")):
                if "_rejected" in p.parts:
                    continue
                if done.get(p.name) == p.read_bytes():
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
            n_saved = result.get("attachments_saved")
            extra = (f" + {len(attachments)} attachment(s), Outlook confirms {n_saved}" if attachments and n_saved is not None
                     else f" + {len(attachments)} attachment(s)" if attachments else "")
            repl = f" (replaced {result['replaced']} older version)" if result.get("replaced") else ""
            print(f"DRAFT  {path.name} -> {', '.join(to)}{extra}  [{result.get('location', 'Drafts')}]{repl}")
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
