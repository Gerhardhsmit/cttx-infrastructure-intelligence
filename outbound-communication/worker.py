#!/usr/bin/env python3
"""
CTTX Persistent Outbound Communication Worker

Executable independently of Claude.
Processes the persistent outbound queue and sends messages via available adapters.

Usage:
    python worker.py --run-once
    python worker.py --continuous
    python worker.py --health-check
"""

import json
import sys
import os
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('/tmp/cttx-outbound-worker.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Status file for health monitoring
HEALTH_STATUS_FILE = Path('/tmp/cttx-outbound-worker-status.json')
RECEIPTS_DIR = Path('/tmp/cttx-outbound-receipts')
RECEIPTS_DIR.mkdir(exist_ok=True)


class OutboundWorker:
    """CTTX Outbound Communication Worker"""

    def __init__(self):
        self.status = {
            'status': 'INITIALIZING',
            'timestamp': datetime.utcnow().isoformat(),
            'queue_ready': 0,
            'sent_today': 0,
            'failed': 0,
            'last_successful_send': None,
            'last_run': None,
            'adapters_available': [],
            'adapters_healthy': [],
            'error': None
        }
        self.detect_adapters()

    def detect_adapters(self):
        """Detect available email adapters"""
        adapters = []
        healthy = []

        # Check for local Outlook COM (Windows only)
        try:
            import win32com.client
            adapters.append('OUTLOOK_COM')
            try:
                outlook = win32com.client.Dispatch("Outlook.Application")
                healthy.append('OUTLOOK_COM')
                logger.info("Local Outlook COM available and healthy")
            except Exception as e:
                logger.warning(f"Outlook COM detected but not healthy: {e}")
        except ImportError:
            logger.debug("Windows COM not available (expected on Linux/Mac)")

        # Check for Microsoft Graph API
        if os.environ.get('AZURE_CLIENT_ID'):
            adapters.append('MICROSOFT_GRAPH')
            # Will test connectivity when needed
            logger.debug("Microsoft Graph OAuth credentials detected")

        # Check for Resend API
        if os.environ.get('RESEND_API_KEY'):
            adapters.append('RESEND')
            healthy.append('RESEND')
            logger.info("Resend API key available")

        self.status['adapters_available'] = adapters
        self.status['adapters_healthy'] = healthy

        if not healthy:
            logger.warning("No healthy adapters detected!")
            self.status['status'] = 'DEGRADED'
            self.status['error'] = 'No healthy email adapters available'
        else:
            self.status['status'] = 'READY'

    def send_via_outlook_com(self, recipient: str, subject: str, body: str, body_type: str = 'html') -> Dict[str, Any]:
        """
        Send via local Outlook COM (Windows only)

        Returns:
            {'success': bool, 'message_id': str, 'error': str}
        """
        try:
            import win32com.client
            outlook = win32com.client.Dispatch("Outlook.Application")
            ns = outlook.GetNamespace("MAPI")

            # Create mail item
            mail = outlook.CreateItem(0)  # 0 = mailItem
            mail.To = recipient
            mail.Subject = subject

            if body_type == 'html':
                mail.HTMLBody = body
            else:
                mail.Body = body

            # Set the account to ensure it sends (required for Outlook to actually dispatch)
            accounts = outlook.Session.Accounts
            if accounts.Count > 0:
                mail.SendUsingAccount = accounts.Item(1)

            # Send the email
            mail.Send()

            logger.info(f"Successfully sent email to {recipient}")

            return {
                'success': True,
                'message_id': str(uuid.uuid4()),
                'error': None
            }
        except Exception as e:
            logger.error(f"Outlook COM send failed: {e}")
            return {
                'success': False,
                'message_id': None,
                'error': str(e)
            }

    def send_via_microsoft_graph(self, recipient: str, subject: str, body: str, body_type: str = 'html') -> Dict[str, Any]:
        """
        Send via Microsoft Graph API

        Returns:
            {'success': bool, 'message_id': str, 'error': str}
        """
        # This would require:
        # 1. Azure auth token retrieval
        # 2. Graph API call to /me/sendMail
        # Currently blocked due to service principal being disabled

        logger.warning("Microsoft Graph adapter: Service principal disabled, skipping")
        return {
            'success': False,
            'message_id': None,
            'error': 'Microsoft Graph: Service principal disabled in Azure tenant'
        }

    def send_via_resend(self, recipient: str, subject: str, body: str, body_type: str = 'html') -> Dict[str, Any]:
        """
        Send via Resend API

        Returns:
            {'success': bool, 'message_id': str, 'error': str}
        """
        try:
            import requests

            api_key = os.environ.get('RESEND_API_KEY')
            if not api_key:
                raise ValueError("RESEND_API_KEY not configured")

            url = "https://api.resend.com/emails"
            headers = {"Authorization": f"Bearer {api_key}"}
            data = {
                "from": "assessment@cttx.co.za",
                "to": recipient,
                "subject": subject,
                "html": body if body_type == 'html' else None,
                "text": body if body_type == 'text' else None,
            }

            response = requests.post(url, json=data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'message_id': result.get('id'),
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'message_id': None,
                    'error': f"Resend API returned {response.status_code}: {response.text}"
                }
        except Exception as e:
            logger.error(f"Resend send failed: {e}")
            return {
                'success': False,
                'message_id': None,
                'error': str(e)
            }

    def select_transport(self) -> Optional[str]:
        """Select the best available transport"""
        if not self.status['adapters_healthy']:
            return None
        # Prefer Outlook COM (local), fall back to Resend
        if 'OUTLOOK_COM' in self.status['adapters_healthy']:
            return 'OUTLOOK_COM'
        if 'RESEND' in self.status['adapters_healthy']:
            return 'RESEND'
        if 'MICROSOFT_GRAPH' in self.status['adapters_healthy']:
            return 'MICROSOFT_GRAPH'
        return None

    def send_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a single message

        Args:
            message: Message dict with recipient, subject, body

        Returns:
            Receipt dict with send result and metadata
        """
        transport = self.select_transport()
        if not transport:
            logger.error("No available transport to send message")
            return {'success': False, 'error': 'No available transport'}

        logger.info(f"Sending to {message['recipient']} via {transport}")

        # Send based on transport
        if transport == 'OUTLOOK_COM':
            result = self.send_via_outlook_com(
                message['recipient'],
                message['subject'],
                message['body'],
                message.get('bodyType', 'html')
            )
        elif transport == 'RESEND':
            result = self.send_via_resend(
                message['recipient'],
                message['subject'],
                message['body'],
                message.get('bodyType', 'html')
            )
        elif transport == 'MICROSOFT_GRAPH':
            result = self.send_via_microsoft_graph(
                message['recipient'],
                message['subject'],
                message['body'],
                message.get('bodyType', 'html')
            )
        else:
            result = {'success': False, 'error': 'Unknown transport'}

        # Create receipt
        if result['success']:
            self.status['sent_today'] += 1
            self.status['last_successful_send'] = datetime.utcnow().isoformat()
            logger.info(f"✓ Sent to {message['recipient']}")
        else:
            self.status['failed'] += 1
            logger.error(f"✗ Failed to send to {message['recipient']}: {result['error']}")

        receipt = {
            'timestamp': datetime.utcnow().isoformat(),
            'message_id': result.get('message_id'),
            'recipient': message['recipient'],
            'subject': message['subject'],
            'transport': transport,
            'success': result['success'],
            'error': result.get('error'),
            'verification': {
                'method': 'transport_confirmation',
                'timestamp': datetime.utcnow().isoformat() if result['success'] else None
            }
        }

        # Write receipt to file
        receipt_file = RECEIPTS_DIR / f"{result.get('message_id', 'failed')}-{datetime.utcnow().isoformat()}.json"
        receipt_file.write_text(json.dumps(receipt, indent=2))

        return receipt

    def save_status(self):
        """Save current status to file"""
        self.status['timestamp'] = datetime.utcnow().isoformat()
        self.status['last_run'] = datetime.utcnow().isoformat()
        HEALTH_STATUS_FILE.write_text(json.dumps(self.status, indent=2))
        logger.info(f"Status saved: {self.status['status']}")

    def get_health_status(self) -> str:
        """Get human-readable health status"""
        status_lines = [
            "CTTX OUTBOUND COMMUNICATION WORKER",
            f"STATUS: {self.status['status']}",
            "",
            "ADAPTERS:",
            f"  Available: {', '.join(self.status['adapters_available']) or 'None'}",
            f"  Healthy: {', '.join(self.status['adapters_healthy']) or 'None'}",
            "",
            "METRICS:",
            f"  Queue Ready: {self.status['queue_ready']}",
            f"  Sent Today: {self.status['sent_today']}",
            f"  Failed: {self.status['failed']}",
            f"  Last Successful Send: {self.status['last_successful_send'] or 'Never'}",
            f"  Last Run: {self.status['last_run'] or 'Never'}",
        ]
        if self.status['error']:
            status_lines.extend(["", f"ERROR: {self.status['error']}"])

        return "\n".join(status_lines)

    def run_once(self):
        """Run a single queue processing cycle"""
        logger.info("=" * 60)
        logger.info("CTTX Outbound Communication Worker — Starting")
        logger.info("=" * 60)

        try:
            logger.info(f"Adapters available: {self.status['adapters_available']}")
            logger.info(f"Adapters healthy: {self.status['adapters_healthy']}")

            # In a real implementation, this would:
            # 1. Connect to the database
            # 2. Query for messages with status = QUEUED or READY
            # 3. Check approval status
            # 4. Send each message
            # 5. Update status and create receipt
            # 6. Schedule follow-ups

            # For now, just demonstrate the capability
            logger.info("Queue processing would happen here (DB integration pending)")

        except Exception as e:
            logger.error(f"Worker cycle failed: {e}")
            self.status['error'] = str(e)
            self.status['status'] = 'ERROR'
        finally:
            self.save_status()
            logger.info("=" * 60)
            logger.info(f"Worker status: {self.status['status']}")
            logger.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='CTTX Outbound Communication Worker')
    parser.add_argument('--run-once', action='store_true', help='Run one cycle and exit')
    parser.add_argument('--continuous', action='store_true', help='Run continuously')
    parser.add_argument('--health-check', action='store_true', help='Print health status')
    parser.add_argument('--test-send', type=str, help='Send a test email to address')

    args = parser.parse_args()

    worker = OutboundWorker()

    if args.health_check:
        print(worker.get_health_status())
        sys.exit(0)

    if args.test_send:
        logger.info(f"Test send to: {args.test_send}")
        test_message = {
            'recipient': args.test_send,
            'subject': 'CTTX Outbound Worker Test',
            'body': '<p>This is a test email from the CTTX Outbound Communication Worker.</p>',
            'bodyType': 'html'
        }
        receipt = worker.send_message(test_message)
        print(json.dumps(receipt, indent=2))
        sys.exit(0)

    if args.run_once:
        worker.run_once()
    elif args.continuous:
        logger.info("Continuous mode not yet implemented")
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
