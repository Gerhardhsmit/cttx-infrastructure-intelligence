# Outbound communication — DRAFTS ONLY

These scripts save emails into Outlook **Drafts**. They never send.
Gerhard reviews every draft in Outlook and sends it himself.

On 27 Sep 2026 an earlier version of `campaign_assessment.py` sent the
assessment campaign straight out of Outlook, including to guessed
addresses (e.g. `info@khayandlovumanorhouse.co.za`), which bounced.
All send paths (Outlook `.Send()`, Microsoft Graph `sendMail`, Resend API,
`--test-send`) have been removed. `test_no_send.py` fails if one comes back.

    python worker.py --health-check
    python worker.py --test-draft someone@example.com
    python campaign_assessment.py        # creates drafts for review
    python test_no_send.py               # guard check
