# Cloud Workflow — Website Transition: Manners → Replace CTTX

**Purpose:** Monday morning action plan to engage web partners and gather the information needed to migrate from the old CTTX website to the new Manners website.

**Status:** Pending — execute Monday morning.

---

## Monday Morning Checklist

### 1. Contact Web Partners

Reach out to each web partner first thing Monday to open the transition conversation. For each partner, confirm:

- [ ] Current hosting provider and control panel access (cPanel, Plesk, etc.)
- [ ] Domain registrar and who holds the DNS records for the old CTTX domain
- [ ] Whether the old CTTX site has active redirects, subdomains, or API integrations that must be preserved or retired
- [ ] Their preferred handover process (ZIP export, live migration, staging environment)

### 2. Information to Collect Before Loading the New Site

Before the new Manners website can go live, gather the following from your web partners:

| Item | Details needed | Who to ask |
|---|---|---|
| Domain / DNS | Nameserver records, A records, CNAME entries | Domain registrar / hosting partner |
| SSL certificate | Current cert provider, expiry date, renewal process | Hosting partner |
| Hosting credentials | FTP/SFTP access, server IP, file path | Hosting partner |
| CMS / database | Platform (WordPress, custom, etc.), database export if needed | Web developer |
| Email accounts | Mailboxes tied to the old domain that must be carried over | Hosting partner |
| Analytics / tracking | GA4 property ID or other tracking codes to transfer | Marketing partner |
| Third-party integrations | Payment gateways, booking systems, forms, maps | Web developer |

### 3. New Manners Website Requirements to Confirm

Before instructing partners to deploy, verify:

- [ ] New domain name or subdomain is registered and pointed correctly
- [ ] All content (copy, images, documents) is approved and final
- [ ] Contact forms and enquiry flows are tested and routing to the right inbox
- [ ] Mobile responsiveness and page speed have been signed off
- [ ] Legal pages (Privacy Policy, Terms) are in place

### 4. Cutover Plan

Once all information is collected:

1. Set DNS TTL to 300 seconds (5 min) at least 24 hours before cutover to speed up propagation.
2. Deploy the Manners website to the hosting environment in staging mode.
3. Run a full QA pass against the staging URL.
4. Flip DNS A records from the old CTTX IP to the new Manners server IP.
5. Monitor propagation (use a DNS checker tool) and confirm the new site is live globally.
6. Set up 301 redirects from old CTTX URLs to corresponding Manners pages.
7. Notify stakeholders that the transition is complete.

---

## Key Contacts to Reach Monday

| Role | Contact | Channel | Priority |
|---|---|---|---|
| Web developer | TBC | Email / call | High |
| Hosting partner | TBC | Email / support ticket | High |
| Domain registrar | TBC | Email / portal | High |
| Marketing / content | TBC | Email | Medium |

> Fill in the contact details for each partner before Monday so outreach can happen first thing.

---

## Notes

- The old CTTX domain should remain live (with a redirect) for a minimum of 90 days post-cutover to avoid broken links.
- Keep a record of all credentials received from partners in a secure password manager — do not store them in this file.
- If any partner is unavailable Monday, escalate via a secondary contact or their support portal immediately to avoid delays.
