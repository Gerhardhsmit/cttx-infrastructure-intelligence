/**
 * cttx-capture.js  —  CTTX CRUISER Lead Capture
 * =================================================
 * Deployed: 2026-06-29
 * Worker:   https://cruiser-notion-sync.gerhardcttx.workers.dev
 *
 * After speed test completes and contact form is submitted:
 *   1. POSTs to Cloudflare Worker → creates scored Notion "Vodacom Lead Pipeline" card
 *   2. POSTs to Manus funnel      → triggers owner email notification
 */

(function () {
  'use strict';

  // ── Endpoints ──────────────────────────────────────────────────────────────

  // Live lead engine — Railway backend /api/webhook/cruiser: scores the lead (MEDDICC),
  // writes it to the Notion CRM, and notifies the owner. (Replaced dead cruiser-notion-sync worker 2026-07-04.)
  const WORKER_URL = 'https://cttx-vodacom-sales-production.up.railway.app/api/webhook/cruiser';

  // Manus funnel — secondary owner notification (best-effort)
  const MANUS_URL  = 'https://cruiserfunnel-35nadese.manus.space/api/cruiser/lead';

  // ── Speed test result store ─────────────────────────────────────────────────
  // CRUISER sets these globals after the test completes.
  // Adjust property names if your version uses different keys.

  function getSpeedResults() {
    return {
      download:   window.cruiserResults?.download  || window.speedResults?.download  || 0,
      upload:     window.cruiserResults?.upload    || window.speedResults?.upload    || 0,
      ping:       window.cruiserResults?.ping      || window.speedResults?.ping      || 0,
      jitter:     window.cruiserResults?.jitter    || window.speedResults?.jitter    || 0,
      connType:   window.cruiserResults?.connType  || window.speedResults?.connType  || '',
    };
  }

  // ── Submit handler ──────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();

    const form     = e.target;
    const speed    = getSpeedResults();
    const submitBtn = form.querySelector('[type="submit"]');

    const nameVal    = (form.querySelector('[name="name"]')     || {}).value?.trim() || '';
    const phoneVal   = (form.querySelector('[name="phone"]')    || {}).value?.trim() || '';
    const emailVal   = (form.querySelector('[name="email"]')    || {}).value?.trim() || '';
    const locVal     = (form.querySelector('[name="location"]') || {}).value?.trim() || '';
    const companyVal = (form.querySelector('[name="company"]')  || {}).value?.trim() || '';

    // Payload keyed for the Railway webhook (contactName/latency/isp) AND kept
    // human-readable. The webhook reads contactName, phone, email, companyName,
    // location, download, upload, latency, jitter, isp, customerType.
    const payload = {
      contactName: nameVal,
      name:        nameVal,
      email:       emailVal,
      phone:       phoneVal,
      location:    locVal,
      companyName: companyVal || locVal,
      isp:         speed.connType,
      connType:    speed.connType,
      customerType:'',
      download:    speed.download,
      upload:      speed.upload,
      latency:     speed.ping,
      ping:        speed.ping,
      jitter:      speed.jitter,
      source:      'CRUISER speed test',
      timestamp:   new Date().toISOString(),
    };

    // Basic validation
    if (!payload.name || !payload.phone) {
      showMessage(form, '⚠️ Please fill in your name and phone number.', 'warn');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Sending…';
    }

    // ── Fire both endpoints in parallel ────────────────────────────────────

    const postJSON = (url, data) =>
      fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      }).then(r => ({ ok: r.ok, status: r.status, url }))
        .catch(err => ({ ok: false, error: err.message, url }));

    const [workerResult, manusResult] = await Promise.allSettled([
      postJSON(WORKER_URL, payload),
      postJSON(MANUS_URL,  payload),
    ]);

    const workerOk = workerResult.status === 'fulfilled' && workerResult.value?.ok;
    const manusOk  = manusResult.status  === 'fulfilled' && manusResult.value?.ok;

    // Log for diagnostics (visible in browser console)
    console.log('[CRUISER Capture] Worker →', workerResult);
    console.log('[CRUISER Capture] Manus  →', manusResult);

    if (workerOk || manusOk) {
      showMessage(
        form,
        '✅ Thank you! We\'ve received your details and will be in touch shortly.',
        'success'
      );
      form.reset();
    } else {
      showMessage(
        form,
        '⚠️ There was a problem submitting your details. Please try WhatsApp or email us directly.',
        'error'
      );
    }

    if (submitBtn) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit';
    }
  }

  // ── UI helper ──────────────────────────────────────────────────────────────

  function showMessage(form, text, type) {
    let el = form.querySelector('.cttx-capture-msg');
    if (!el) {
      el = document.createElement('p');
      el.className = 'cttx-capture-msg';
      el.style.cssText = 'margin-top:12px;font-weight:600;';
      form.appendChild(el);
    }
    el.textContent = text;
    el.style.color = type === 'success' ? '#16a34a'
                   : type === 'warn'    ? '#d97706'
                   :                      '#dc2626';
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    // Attach to the CRUISER contact form.
    // Adjust the selector if your form has a different id/class.
    const selectors = [
      '#cruiser-lead-form',
      '#contact-form',
      '.cruiser-form',
      'form[data-cruiser]',
      'form',   // fallback — first form on page
    ];

    let form = null;
    for (const sel of selectors) {
      form = document.querySelector(sel);
      if (form) break;
    }

    if (!form) {
      console.warn('[CRUISER Capture] No form found. Add id="cruiser-lead-form" to your form.');
      return;
    }

    form.addEventListener('submit', handleSubmit);
    console.log('[CRUISER Capture] Loaded. Form:', form.id || form.className || 'unnamed');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
