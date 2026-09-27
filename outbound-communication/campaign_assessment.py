#!/usr/bin/env python3
"""
CTTX Assessment Outreach Campaign — Draft Creation
Generates personalized assessment emails and creates Outlook Drafts for review and approval.
Does NOT send directly — drafts await user review/approval in Outlook before sending.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from worker import OutboundWorker

# Load paths
REPO_ROOT = Path(__file__).parent.parent
PROSPECTS_FILE = REPO_ROOT / "sales-engine" / "prospects_batch1.json"
DECISION_MAKERS_FILE = REPO_ROOT / "sales-engine" / "CTTX_Decision_Makers_Contact_List.json"

def load_prospects():
    """Load prospects from JSON file"""
    with open(PROSPECTS_FILE) as f:
        return json.load(f)

def load_decision_makers():
    """Load decision maker contact information"""
    with open(DECISION_MAKERS_FILE) as f:
        data = json.load(f)

    # Create lookup by prospect name
    lookup = {}
    for prospect in data['prospects']:
        lookup[prospect['name']] = prospect

    return lookup

def get_recipient_email(prospect_name: str, decision_maker_info: dict) -> tuple:
    """
    Get best available email for prospect
    Returns: (email, decision_maker_name, email_type)
    """
    dm = decision_maker_info.get(prospect_name, {})

    # Prefer direct decision maker email
    if dm.get('email') and dm['email'] != 'not_found':
        return (dm['email'], dm.get('decision_maker', 'there'), 'direct')

    # Fall back to general contact email
    if dm.get('general_contact') and 'contact form' not in dm['general_contact'].lower():
        return (dm['general_contact'], dm.get('title', 'Manager'), 'general')

    # No email found
    return (None, dm.get('decision_maker', 'there'), 'not_found')

def generate_assessment_email(prospect, decision_maker_name):
    """Generate personalized assessment email for a prospect"""

    company = prospect['name']
    segment = prospect['segment']
    pain = prospect['pain']
    location = prospect['town']

    subject = f"CTTX Infrastructure Assessment — {company}"

    body = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6;">

<p>Hi {decision_maker_name},</p>

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
    """Generate assessment outreach campaign as Outlook Drafts"""

    print("=" * 70)
    print("CTTX ASSESSMENT OUTREACH CAMPAIGN — DRAFT GENERATION")
    print("=" * 70)
    print()

    # Load data
    prospects = load_prospects()
    decision_makers = load_decision_makers()

    print(f"📋 Loaded {len(prospects)} prospects from {PROSPECTS_FILE.name}")
    print(f"📇 Loaded decision maker data for {len(decision_makers)} records")
    print()

    # Initialize worker
    worker = OutboundWorker()
    print(f"✓ Worker initialized")
    print(f"  Status: {worker.status['status']}")
    print(f"  Transport: {worker.select_transport()}")
    print()

    # Campaign summary
    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'total': len(prospects),
        'drafts_created': 0,
        'failed': 0,
        'not_found_emails': 0,
        'drafts': []
    }

    print("GENERATING ASSESSMENT DRAFTS")
    print("-" * 70)

    for i, prospect in enumerate(prospects, 1):
        company = prospect['name']

        # Get recipient email
        recipient, dm_name, email_type = get_recipient_email(company, decision_makers)

        # Generate email
        subject, body = generate_assessment_email(prospect, dm_name)

        if not recipient:
            print(f"{i:2d}. ⚠ {company:40s} — NO EMAIL FOUND (phone: {prospect.get('phone', 'N/A')})")
            results['not_found_emails'] += 1
            results['drafts'].append({
                'prospect': company,
                'recipient': 'not_found',
                'subject': subject,
                'success': False,
                'error': 'No email address found for prospect',
                'phone': prospect.get('phone')
            })
            continue

        # Create draft
        draft_result = worker.create_draft_in_outlook(recipient, subject, body, 'html')

        if draft_result['success']:
            status = "✓"
            results['drafts_created'] += 1
        else:
            status = "✗"
            results['failed'] += 1

        email_source = f"({email_type})" if email_type != 'direct' else ""
        print(f"{i:2d}. {status} {company:40s} → {recipient} {email_source}")

        results['drafts'].append({
            'prospect': company,
            'recipient': recipient,
            'decision_maker': dm_name,
            'subject': subject,
            'email_type': email_type,
            'success': draft_result['success'],
            'error': draft_result.get('error'),
            'draft_info': draft_result.get('draft_info')
        })

    print("-" * 70)
    print()

    # Summary
    print("CAMPAIGN SUMMARY")
    print(f"Total prospects:       {results['total']}")
    print(f"Drafts created:        {results['drafts_created']}")
    print(f"Not found (no email):  {results['not_found_emails']}")
    print(f"Failed:                {results['failed']}")
    print()

    # Save results
    results_file = Path("/tmp/cttx-campaign-drafts.json")
    results_file.write_text(json.dumps(results, indent=2))
    print(f"📊 Results saved to: {results_file}")
    print()

    print("NEXT STEPS FOR GERHARD:")
    print("-" * 70)
    print()
    print("1. CHECK YOUR OUTLOOK DRAFTS FOLDER")
    print(f"   → You should see {results['drafts_created']} new draft emails")
    print()
    print("2. REVIEW EACH DRAFT")
    print("   → Read the personalized content for quality/accuracy")
    print("   → Edit if needed (e.g., correct company details, adjust messaging)")
    print()
    print("3. APPROVE AND SEND")
    print("   → For each draft you approve, simply click SEND in Outlook")
    print("   → Drafts for 'not found' contacts need manual email lookup")
    print()
    print("4. FOLLOW UP")
    print("   → Monitor responses over next 3 days")
    print("   → Schedule assessments for interested prospects")
    print()

    if results['not_found_emails'] > 0:
        print("CONTACTS NEEDING EMAIL LOOKUP:")
        print("-" * 70)
        for draft in results['drafts']:
            if draft['recipient'] == 'not_found':
                print(f"  • {draft['prospect']:40s} (Phone: {draft.get('phone', 'N/A')})")
        print()

    print("✓ DRAFT GENERATION COMPLETE")
    print()

if __name__ == '__main__':
    main()
