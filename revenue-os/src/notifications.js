// Notification dispatcher - sends alerts to sales team
// Supports WhatsApp (via API), Email, and webhook

export async function notify({ type, lead, message, channel = 'email' }) {
  const notification = {
    type,
    leadId: lead.id,
    message,
    channel,
    timestamp: new Date().toISOString(),
    score: lead.score,
    tier: lead.tier
  };

  console.log(`[NOTIFY] ${channel.toUpperCase()} | ${type} | Score: ${lead.score} | ${message}`);

  // WhatsApp via webhook (configure with your WhatsApp Business API or Twilio)
  if (channel === 'whatsapp' && process.env.WHATSAPP_WEBHOOK_URL) {
    try {
      await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: process.env.SALES_WHATSAPP || '+27000000000',
          message: `🔥 ${message}`
        })
      });
    } catch (e) { console.error('WhatsApp notify failed:', e.message); }
  }

  // Email via webhook (Web3Forms, SendGrid, or similar)
  if (channel === 'email' && process.env.EMAIL_WEBHOOK_URL) {
    try {
      await fetch(process.env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: process.env.SALES_EMAIL || 'sales@cttx.co.za',
          subject: `[CTTX Lead] ${type} - Score ${lead.score}/100`,
          body: message
        })
      });
    } catch (e) { console.error('Email notify failed:', e.message); }
  }

  return notification;
}
