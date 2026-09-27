#!/usr/bin/env python3
"""
CTTX Outbound Communication Worker — DRAFTS ONLY

This worker can ONLY save emails into Outlook Drafts. It has no send
capability of any kind: no Outlook send, no Microsoft Graph send,
no Resend API. Gerhard reviews every draft in Outlook and sends it himself.

Do not add a send path to this file. See outbound-communication/README.md.

Usage:
    python worker.py --health-check
    python worker.py --test-draft someone@example.com
"""

import json
import os
import sys
import argparse
import logging
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import uuid

TMP_DIR = Path(tempfile.gettempdir())

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(TMP_DIR / 'cttx-outbound-worker.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

HEALTH_STATUS_FILE = TMP_DIR / 'cttx-outbound-worker-status.json'
RECEIPTS_DIR = TMP_DIR / 'cttx-outbound-receipts'
RECEIPTS_DIR.mkdir(exist_ok=True)

# Outlook OlDefaultFolders.olFolderDrafts
OL_FOLDER_DRAFTS = 16

# The only mailbox prospect drafts may go into. Outlook's default store can be
# a different account or data file, so drafts are placed here explicitly.
CTTX_ACCOUNT = os.environ.get("CTTX_OUTLOOK_ACCOUNT", "gerhard@cttx.co.za").lower()


def find_cttx_account(outlook):
    """Return (account, drafts_folder) for gerhard@cttx.co.za, or raise with the accounts found."""
    ns = outlook.GetNamespace("MAPI")
    seen = []
    for i in range(1, ns.Accounts.Count + 1):
        acc = ns.Accounts.Item(i)
        addr = (getattr(acc, "SmtpAddress", "") or "").lower()
        seen.append(addr or acc.DisplayName)
        if addr == CTTX_ACCOUNT:
            return acc, acc.DeliveryStore.GetDefaultFolder(OL_FOLDER_DRAFTS)
    raise RuntimeError(f"Outlook account {CTTX_ACCOUNT} not found. Accounts in this Outlook profile: {', '.join(seen) or 'none'}")


class OutboundWorker:
    """Creates Outlook drafts. Never sends."""

    def __init__(self):
        self.status = {
            'status': 'INITIALIZING',
            'mode': 'DRAFTS_ONLY',
            'timestamp': datetime.utcnow().isoformat(),
            'drafts_created': 0,
            'failed': 0,
            'last_run': None,
            'adapters_available': [],
            'adapters_healthy': [],
            'error': None
        }
        self.detect_adapters()

    def detect_adapters(self):
        """Detect local Outlook (the only draft target)"""
        try:
            import win32com.client
            self.status['adapters_available'].append('OUTLOOK_COM_DRAFTS')
            try:
                win32com.client.Dispatch("Outlook.Application")
                self.status['adapters_healthy'].append('OUTLOOK_COM_DRAFTS')
            except Exception as e:
                logger.warning(f"Outlook COM detected but not healthy: {e}")
        except ImportError:
            logger.debug("Windows COM not available (expected on Linux/Mac)")

        if self.status['adapters_healthy']:
            self.status['status'] = 'READY'
        else:
            self.status['status'] = 'DEGRADED'
            self.status['error'] = 'Local Outlook not available for draft creation'

    def select_transport(self) -> str:
        """Kept for campaign_assessment.py; there is only one mode."""
        return 'OUTLOOK_DRAFTS_ONLY'

    def create_draft_in_outlook(self, recipient: str, subject: str, body: str, body_type: str = 'html', cc: str = '', attachments=None) -> Dict[str, Any]:
        """
        Save an email into Outlook Drafts. Never sends.

        Returns:
            {'success': bool, 'message_id': str, 'error': str, 'draft_info': str}
        """
        try:
            import win32com.client
            outlook = win32com.client.Dispatch("Outlook.Application")
            account, drafts = find_cttx_account(outlook)

            # Create the item directly inside gerhard@cttx.co.za's Drafts folder.
            mail = drafts.Items.Add(0)  # 0 = mailItem
            mail.SendUsingAccount = account  # sets the From account only; nothing is sent
            mail.To = recipient
            if cc:
                mail.CC = cc
            mail.Subject = subject

            if body_type == 'html':
                mail.HTMLBody = body
            else:
                mail.Body = body

            # Attach files (e.g. the reserve study PDF) so Gerhard doesn't have to.
            for path in attachments or []:
                mail.Attachments.Add(str(path))

            # Save as draft. There is deliberately no send call anywhere in this file.
            mail.Save()
            location = f"{drafts.Parent.Name} \\ {drafts.Name}"

            self.status['drafts_created'] += 1
            logger.info(f"Draft saved (NOT sent) in {location}: {subject} -> {recipient}")

            return {
                'success': True,
                'message_id': str(uuid.uuid4()),
                'error': None,
                'draft_info': f"Draft saved: {subject} to {recipient}",
                'location': location,
            }
        except Exception as e:
            self.status['failed'] += 1
            logger.error(f"Outlook draft creation failed: {e}")
            return {
                'success': False,
                'message_id': None,
                'error': str(e),
                'draft_info': None
            }

    def save_status(self):
        self.status['timestamp'] = datetime.utcnow().isoformat()
        self.status['last_run'] = datetime.utcnow().isoformat()
        HEALTH_STATUS_FILE.write_text(json.dumps(self.status, indent=2))

    def get_health_status(self) -> str:
        return "\n".join([
            "CTTX OUTBOUND COMMUNICATION WORKER — DRAFTS ONLY",
            f"STATUS: {self.status['status']}",
            f"Adapters healthy: {', '.join(self.status['adapters_healthy']) or 'none'}",
            "Sending: DISABLED (drafts are reviewed and sent manually in Outlook)",
        ])


def main():
    parser = argparse.ArgumentParser(description='CTTX Outbound Worker (drafts only)')
    parser.add_argument('--health-check', action='store_true', help='Print health status')
    parser.add_argument('--test-draft', type=str, help='Save a test DRAFT addressed to this address')

    args = parser.parse_args()
    worker = OutboundWorker()

    if args.health_check:
        print(worker.get_health_status())
    elif args.test_draft:
        result = worker.create_draft_in_outlook(
            args.test_draft,
            'CTTX Outbound Worker Test (draft)',
            '<p>Test draft from the CTTX outbound worker. Not sent.</p>',
        )
        print(json.dumps(result, indent=2))
        worker.save_status()
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
