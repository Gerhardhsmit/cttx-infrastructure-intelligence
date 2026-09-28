#!/usr/bin/env python3
"""Append a prepared .eml into the gerhard@cttx.co.za IMAP Drafts folder.

Reads mailbox credentials from environment secrets only - never from the chat,
never from a file in the repo. Refuses to run if any of them is missing.

  CTTX_IMAP_HOST   e.g. mail.cttx.co.za
  CTTX_IMAP_USER   gerhard@cttx.co.za
  CTTX_IMAP_PASS   the mailbox password (environment secret)

Usage:  python3 scripts/outlook_draft_append.py proposals/<file>.eml
"""
import imaplib, os, re, sys, time

def main(path: str) -> int:
    missing = [v for v in ("CTTX_IMAP_HOST", "CTTX_IMAP_USER", "CTTX_IMAP_PASS") if not os.environ.get(v)]
    if missing:
        print("refusing to run - environment secret(s) not set:", ", ".join(missing))
        return 2
    raw = open(path, "rb").read()
    host, user, pw = os.environ["CTTX_IMAP_HOST"], os.environ["CTTX_IMAP_USER"], os.environ["CTTX_IMAP_PASS"]

    m = imaplib.IMAP4_SSL(host, 993)
    m.login(user, pw)
    # cPanel/host-h mailboxes expose the folder as "Drafts" or "INBOX.Drafts" - detect it.
    typ, boxes = m.list()
    names = [re.search(r'"?([^"]+)"?$', b.decode()).group(1) for b in boxes or []]
    drafts = next((n for n in names if n.split(".")[-1].lower() == "drafts"), None)
    if not drafts:
        print("no Drafts folder found; folders:", names)
        m.logout(); return 3
    typ, _ = m.append(f'"{drafts}"', r"(\Draft)", imaplib.Time2Internaldate(time.time()), raw)
    m.logout()
    print(f"{typ}: appended {os.path.basename(path)} to '{drafts}' as a draft")
    return 0 if typ == "OK" else 1

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__); sys.exit(1)
    sys.exit(main(sys.argv[1]))
