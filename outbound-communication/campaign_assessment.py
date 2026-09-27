#!/usr/bin/env python3
"""
CTTX Assessment Outreach Campaign
Sends personalized assessment emails to 25 prospects from prospects_batch1.json
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from worker import OutboundWorker

# Load prospects
REPO_ROOT = Path(__file__).parent.parent
PROSPECTS_FILE = REPO_ROOT / "sales-engine" / "prospects_batch1.json"

def load_prospects():
    """Load prospects from JSON file"""
    with open(PROSPECTS_FILE) as f:
        return json.load(f)

def generate_assessment_email(prospect):
    """Generate personalized assessment email for a prospect"""

    company = prospect['name']
    segment = prospect['segment']
    pain = prospect['pain']
    location = prospect['town']

    subject = f"CTTX Infrastructure Assessment — {company}"

    body = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6;">

<p>Hi {prospect.get('decision_maker', 'there')},</p>

<p>We work with {segment.lower()} operations in {location} that rely on connectivity to keep their business running.</p>

<p><strong>Your situation:</strong></p>
<p>{pain}</p>

<p>Many properties we work with face similar challenges — connectivity gaps that affect operations, guest experience, and security response.</p>

<p><strong>The CTTX difference:</strong></p>
<p>Instead of buying another internet package, we design and build a <strong>private infrastructure backbone</strong> that connects your property reliably, owned and controlled by you.</p>

<p>This means:</p>
<ul>
<li>Carrier connectivity enters at one point</li>
<li>CTTX builds the distribution network across your property</li>
<li>You own the infrastructure</li>
<li>Better uptime, better control, lower long-term cost</li>
</ul>

<p><strong>Next step:</strong></p>
<p>We'd like to schedule a brief <strong>15-minute feasibility assessment</strong> where we:</p>
<ul>
<li>Understand your current connectivity and pain points</li>
<li>Map what a CTTX infrastructure solution would look like</li>
<li>Discuss timeline and investment</li>
</ul>

<p>Are you available for a quick call this week?</p>

<p>Best regards,<br>
Gerhard Smit<br>
CTTX Services<br>
gerhard@cttx.co.za<br>
084 550 3281</p>

<p style="font-size: 12px; color: #666; margin-top: 20px;">
This is a professional outreach from CTTX Services. We respect your privacy and will not contact you further if you prefer not to engage.
</p>

</body></html>"""

    return subject, body

def main():
    """Run assessment outreach campaign"""

    print("=" * 70)
    print("CTTX ASSESSMENT OUTREACH CAMPAIGN")
    print("=" * 70)
    print()

    # Load prospects
    prospects = load_prospects()
    print(f"📋 Loaded {len(prospects)} prospects from {PROSPECTS_FILE.name}")
    print()

    # Initialize worker
    worker = OutboundWorker()
    print(f"✓ Worker initialized")
    print(f"  Status: {worker.status['status']}")
    print(f"  Transport: {worker.select_transport()}")
    print()

    # Campaign summary
    results = {
        'total': len(prospects),
        'sent': 0,
        'failed': 0,
        'emails': []
    }

    print("SENDING ASSESSMENT EMAILS")
    print("-" * 70)

    for i, prospect in enumerate(prospects, 1):
        company = prospect['name']
        recipient = prospect.get('email') or f"info@{company.lower().replace(' ', '')}.co.za"

        # Generate email
        subject, body = generate_assessment_email(prospect)

        # Create message
        message = {
            'recipient': recipient,
            'subject': subject,
            'body': body,
            'bodyType': 'html'
        }

        # Send
        receipt = worker.send_message(message)

        status = "✓" if receipt['success'] else "✗"
        print(f"{i:2d}. {status} {company:40s} → {recipient}")

        if receipt['success']:
            results['sent'] += 1
        else:
            results['failed'] += 1

        results['emails'].append({
            'prospect': company,
            'recipient': recipient,
            'subject': subject,
            'success': receipt['success'],
            'error': receipt.get('error')
        })

    print("-" * 70)
    print()

    # Summary
    print("CAMPAIGN SUMMARY")
    print(f"Total prospects:    {results['total']}")
    print(f"Successfully sent:  {results['sent']}")
    print(f"Failed:             {results['failed']}")
    print()

    # Save results
    results_file = Path("/tmp/cttx-campaign-results.json")
    results_file.write_text(json.dumps(results, indent=2))
    print(f"📊 Full results saved to: {results_file}")
    print()

    print("✓ CAMPAIGN COMPLETE")
    print()
    print("Next steps:")
    print("1. Check Outlook Sent Items to verify emails were delivered")
    print("2. Monitor responses over next 3 days")
    print("3. Follow up with prospects on day 3 who don't respond")
    print("4. Schedule assessments for interested prospects")
    print()

if __name__ == '__main__':
    main()
