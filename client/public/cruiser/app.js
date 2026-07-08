// ================================================================
// CRUISER v3.0 — App Controller
// Calibrated for RURAL South Africa (farms, game reserves, wine estates)
// Smart coaching, SA personality, viral sharing, fixed network detection
// ================================================================

let testRunning = false;
let lastResults = { down: 0, up: 0, ping: 0, jitter: 0, connType: '' };

// ── Rural SA Speed Thresholds ──────────────────────────────────
const THRESHOLDS = {
  download: { exceptional: 50, good: 30, acceptable: 20, poor: 10, critical: 5 },
  upload:   { exceptional: 20, good: 10, acceptable: 5,  poor: 2,  critical: 2 },
  ping:     { excellent: 30, good: 60, acceptable: 100, poor: 150, critical: 200 },
  jitter:   { good: 15, acceptable: 30, poor: 50 }
};

// ── Helpers ─────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function setStatus(msg, mode = '') {
  const el = document.getElementById('statusText');
  el.textContent = msg;
  el.className = 'status-text' + (mode ? ' ' + mode : '');
}

function setProgress(pct) {
  document.getElementById('progressFill').style.width = pct + '%';
}

// ── Connection Type Detection ──────────────────────────────────
function detectConnection() {
  const badge = document.getElementById('connBadge');
  const label = document.getElementById('connLabel');
  if (!badge || !label) return;

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!conn) {
    label.textContent = 'ONLINE';
    badge.className = 'conn-badge';
    window._connType = 'unknown';
    return;
  }

  const type = conn.type;
  const eff  = conn.effectiveType;
  const dl   = conn.downlink || 0;

  let text, cls, connType;

  if (type === 'wifi' || type === 'ethernet') {
    text = 'WiFi'; cls = 'wifi'; connType = 'wifi';
  } else if (type === 'cellular' || type === 'wimax' || (!type && eff)) {
    if (eff === '4g') {
      if (dl >= 30)      { text = '5G';   cls = 'g5';  connType = '5g'; }
      else if (dl >= 10) { text = 'LTE+'; cls = 'g5';  connType = 'lte'; }
      else               { text = 'LTE';  cls = 'lte'; connType = 'lte'; }
    } else if (eff === '3g')  { text = '3G';   cls = 'slow'; connType = '3g'; }
    else if (eff === '2g' || eff === 'slow-2g') { text = '2G'; cls = 'slow'; connType = '2g'; }
    else { text = 'MOBILE'; cls = 'lte'; connType = 'mobile'; }
  } else {
    if (eff === '4g') {
      text = dl >= 30 ? '5G' : 'LTE'; cls = dl >= 30 ? 'g5' : 'lte'; connType = dl >= 30 ? '5g' : 'lte';
    } else if (eff === '3g') { text = '3G';     cls = 'slow'; connType = '3g'; }
    else                     { text = 'ONLINE'; cls = '';     connType = 'unknown'; }
  }

  label.textContent = text;
  badge.className   = 'conn-badge ' + cls;
  window._connType  = connType;
}

function setupConnectionListener() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) conn.addEventListener('change', detectConnection);
}

// ── Smart Coaching System ─────────────────────────────────────
function generateCoaching(down, up, ping, jitter) {
  const verdict = document.getElementById('coachingVerdict');
  const grid    = document.getElementById('coachingGrid');
  const tip     = document.getElementById('coachingTip');
  const title   = document.getElementById('coachingTitle');

  const activities = [
    { name: 'Web & Email',            icon: '🌐', check: () => (down>=5&&up>=1&&ping<150)?'good':(down>=3&&up>=0.5&&ping<300)?'ok':'poor' },
    { name: 'Streaming (Netflix)',     icon: '📺', check: () => (down>=25&&up>=5)?'good':(down>=10&&up>=2)?'ok':'poor' },
    { name: 'Gaming',                  icon: '🎮', check: () => (ping<=50&&jitter<=20&&down>=50&&up>=10)?'good':(ping<=100&&jitter<=40&&down>=20&&up>=5)?'ok':'poor' },
    { name: 'CCTV & Security',         icon: '📹', check: () => (up>=20&&down>=10)?'good':(up>=5&&down>=5)?'ok':'poor' },
    { name: 'Video Calls (Zoom)',       icon: '📞', check: () => (up>=10&&down>=10&&ping<80)?'good':(up>=3&&down>=5&&ping<150)?'ok':'poor' },
    { name: 'AI & Cloud Backup',        icon: '☁️', check: () => (up>=20&&down>=20)?'good':(up>=5&&down>=10)?'ok':'poor' }
  ];

  grid.innerHTML = activities.map(a => {
    const status = a.check();
    return `<div class="coach-item"><span class="coach-status ${status}"></span><span class="coach-label">${a.icon} ${a.name}</span></div>`;
  }).join('');

  const downGood = down >= THRESHOLDS.download.good;
  const downOk   = down >= THRESHOLDS.download.acceptable;
  const upGood   = up   >= THRESHOLDS.upload.good;
  const upOk     = up   >= THRESHOLDS.upload.acceptable;
  const downCrit = down < THRESHOLDS.download.critical;
  const upCrit   = up   < 2;

  let situation;
  if (downGood && upGood)         situation = 'exceptional';
  else if (downOk && upOk)        situation = 'good';
  else if (downOk && !upOk)       situation = 'download_ok_upload_weak';
  else if (!downOk && upOk)       situation = 'download_weak_upload_ok';
  else if (down < THRESHOLDS.download.poor || up < THRESHOLDS.upload.poor) situation = 'poor';
  else situation = 'marginal';
  if (downCrit || upCrit) situation = 'critical';

  let verdictText, verdictClass, titleText;

  const VERDICTS = {
    exceptional:            { cls: 'good',    t: 'ALL SYSTEMS GO',                       msgs: ["Volle druk! Cameras, cloud, gaming, video calls — this connection handles the whole plaas without breaking a sweat. This is what proper infrastructure looks like."] },
    good:                   { cls: 'good',    t: 'SOLID CONNECTION',                     msgs: ["Goeie lyn vir die platteland! Enough grunt for most things. Cameras work, video calls are stable, streaming is smooth. Want guaranteed speed no matter what? CTTX dedicated lines from R1,600/mo."] },
    download_ok_upload_weak:{ cls: 'warning', t: 'ENGINE WARNING — UPLOAD IS WEAK LINK', msgs: ["Your download is solid, but your upload is holding you back. This is the classic WISP trap — fast enough to stream Netflix, but your security cameras can't send footage to the cloud. Upload is what keeps your farm secure.", "Download looks decent, but upload is the bottleneck. At " + up.toFixed(1) + " Mbps up, your CCTV cameras are running blind. Most old wireless providers do this — CTTX dedicated lines give you both."] },
    download_weak_upload_ok:{ cls: 'warning', t: 'ENGINE WARNING — DOWNLOAD IS WEAK',   msgs: ["Your upload is decent, but download is dragging you back. Streaming will buffer, large file downloads take forever. Consider a CTTX dedicated line."] },
    marginal:               { cls: 'warning', t: 'ENGINE WARNING',                       msgs: ["Jy kom reg, maar net-net. Add a camera, a Zoom call, or kids streaming and you'll feel it immediately. CTTX business lines from R1,600/mo.", "It works for basics, but barely. Cameras, video calls, cloud backups — pick one at a time."] },
    poor:                   { cls: 'poor',    t: 'CHECK ENGINE — ISSUES DETECTED',       msgs: ["Hierdie lyn gaan nie die plaas aan die gang hou nie. Cameras drop, video calls freeze, cloud backups never complete. Your operation is running blind.", "Jou lyn sukkel meer as 'n bakkie in die sand. Time to upgrade — CTTX dedicated lines from R1,600/mo."] },
    critical:               { cls: 'poor',    t: 'CRITICAL — IMMEDIATE ATTENTION',       msgs: ["Eina. This is not a connection — it's a suggestion. Cameras aren't recording, emails are timing out. Hierdie lyn moet dringend opgegradeer word.", "So kan ons nie boer nie. Your farm is running blind — cameras offline, cloud backups failing, video calls impossible."] }
  };

  const v = VERDICTS[situation] || VERDICTS.critical;
  verdictClass = v.cls;
  titleText    = v.t;
  verdictText  = v.msgs[Math.floor(Math.random() * v.msgs.length)];

  verdict.textContent  = verdictText;
  verdict.className    = 'coaching-verdict ' + verdictClass;
  title.textContent    = titleText;

  // Coaching tip
  if (situation === 'exceptional' || situation === 'good') {
    tip.innerHTML = ''; tip.style.display = 'none';
  } else if (situation === 'download_ok_upload_weak') {
    tip.style.display = '';
    tip.innerHTML = '<strong>📹 Upload reality check:</strong> At ' + up.toFixed(1) + ' Mbps upload, you can run approximately ' +
      (up < 2 ? '0 cameras to the cloud (below minimum)' : up < 5 ? '1 camera at reduced quality' : up < 10 ? '1–2 cameras reliably' : '3+ cameras') +
      '. For a modern farm security setup you need 20+ Mbps upload.';
  } else if (upCrit) {
    tip.style.display = '';
    tip.innerHTML = '<strong>⚠️ Upload is critically low (' + up.toFixed(1) + ' Mbps):</strong> Your CCTV cameras cannot stream to the cloud, video calls will fail.';
  } else if (situation === 'poor' || situation === 'critical') {
    tip.style.display = '';
    if (down < 10) {
      tip.innerHTML = '<strong>⚠️ Download (' + down.toFixed(1) + ' Mbps) is critically low:</strong> Basic streaming, remote desktop, and multi-device use all fail at this speed.';
    } else {
      tip.innerHTML = '<strong>⚠️ Upload (' + up.toFixed(1) + ' Mbps) is critically low:</strong> Your cameras are running blind and cloud backups are silently failing.';
    }
  } else {
    tip.style.display = '';
    tip.innerHTML = '<strong>💡 Tip:</strong> Download ' + down.toFixed(1) + ' Mbps ↓ · Upload ' + up.toFixed(1) + ' Mbps ↑ · Ping ' + ping + ' ms. For a modern farming operation, aim for 30+ Mbps down and 10+ Mbps up.';
  }
}

// ── Upload Warning Popup ─────────────────────────────────────
function checkUploadWarning(up) {
  if (up < 2) {
    setTimeout(() => { document.getElementById('uploadPopup').style.display = 'flex'; }, 800);
  }
}

function closeUploadPopup() {
  document.getElementById('uploadPopup').style.display = 'none';
}

// ── CTTX Upgrade Nudge ──────────────────────────────────────
function showUpgradeNudge(down, up, ping) {
  const nudge = document.getElementById('upgradeNudge');
  const text  = document.getElementById('nudgeText');
  const cta   = nudge.querySelector('.nudge-cta');

  if (down < THRESHOLDS.download.poor || up < THRESHOLDS.upload.poor) {
    nudge.style.display = 'block';
    nudge.classList.add('nudge-urgent');
    if (up < 2) {
      text.innerHTML = '<strong>Jou kameras loop blind.</strong> Upload onder 2 Mbps beteken jou sekuriteitskameras kan nie na die cloud stroom nie. CTTX bring Vodacom-infrastruktuur na die platteland. Besigheidslyne van <strong>R1,600/mo</strong>.';
    } else if (down < 10) {
      text.innerHTML = '<strong>Hierdie lyn gaan nie die plaas aan die gang hou nie.</strong> Under 10 Mbps means CCTV drops, video calls freeze, cloud backups fail silently. From <strong>R1,600/mo</strong>.';
    } else {
      text.innerHTML = '<strong>Jou lyn sukkel meer as \'n bakkie in die sand.</strong> Under 20 Mbps is below the modern minimum. Your neighbours on CTTX are running cameras, cloud, and video calls simultaneously. From <strong>R1,600/mo</strong>.';
    }
    if (cta) { cta.textContent = 'Opgradeer na CTTX →'; cta.classList.add('cta-urgent'); }
  } else if (down < THRESHOLDS.download.acceptable || up < THRESHOLDS.upload.acceptable) {
    nudge.style.display = 'block'; nudge.classList.remove('nudge-urgent');
    text.innerHTML = 'Your connection works for now, but it won\'t scale. Add cameras, more staff on video calls, or cloud services and you\'ll hit the wall fast. CTTX dedicated lines from <strong>R1,600/mo</strong>.';
    if (cta) { cta.textContent = 'Explore CTTX Business Lines →'; cta.classList.remove('cta-urgent'); }
  } else if (down < THRESHOLDS.download.good) {
    nudge.style.display = 'block'; nudge.classList.remove('nudge-urgent');
    text.innerHTML = 'Good enough for today. But if you\'re planning to expand — more cameras, cloud AI, or remote staff — a dedicated CTTX business line gives you the headroom.';
    if (cta) { cta.textContent = 'See CTTX Business Lines →'; cta.classList.remove('cta-urgent'); }
  } else {
    nudge.style.display = 'none'; nudge.classList.remove('nudge-urgent');
  }
}

// ── Main Test ─────────────────────────────────────────────────
async function startTest() {
  if (testRunning) return;
  testRunning = true;

  const btn      = document.getElementById('startBtn');
  const btnLabel = document.getElementById('btnLabel');
  btn.disabled   = true;
  btn.className  = 'start-btn running';
  btnLabel.textContent = 'TESTING...';

  document.getElementById('resultsPanel').classList.remove('show');
  document.getElementById('uploadPopup').style.display = 'none';
  setProgress(0);
  detectConnection();
  await delay(300);

  // Phase 1: Ping
  setStatus('MEASURING PING & JITTER...', 'active');
  document.getElementById('gaugePhase').textContent = 'PING';
  setProgress(5);

  const { ping, jitter } = await measurePing();
  lastResults.ping   = ping;
  lastResults.jitter = jitter;
  document.getElementById('metricPing').textContent   = ping;
  document.getElementById('metricJitter').textContent = jitter;
  highlightMetric('metricPing');
  animateMainGauge(0, ping, 200, { phase: 'ping', reverse: true }, 600);
  document.getElementById('gaugeBigValue').textContent = ping;
  document.getElementById('gaugeBigUnit').textContent  = 'ms';
  setProgress(20);
  await delay(400);

  // Phase 2: Download
  setStatus('TESTING DOWNLOAD SPEED...', 'active');
  document.getElementById('gaugePhase').textContent   = 'DOWNLOAD';
  document.getElementById('gaugeBigUnit').textContent = 'Mbps';
  highlightMetric('metricDown');

  const downSpeed = await measureDownload((live, progress) => {
    const display = Math.min(live, 999).toFixed(1);
    document.getElementById('gaugeBigValue').textContent = display;
    document.getElementById('metricDown').textContent    = display;
    drawMainGauge(Math.min(live, 100), 100, { phase: 'download' });
    setProgress(20 + progress * 40);
  });

  lastResults.down = downSpeed;
  document.getElementById('metricDown').textContent    = downSpeed.toFixed(1);
  document.getElementById('gaugeBigValue').textContent = downSpeed.toFixed(1);
  animateMainGauge(downSpeed, downSpeed, 100, { phase: 'download' }, 300);
  setProgress(60);
  await delay(400);

  // Phase 3: Upload
  setStatus('TESTING UPLOAD SPEED...', 'active');
  document.getElementById('gaugePhase').textContent = 'UPLOAD';
  highlightMetric('metricUp');

  const upSpeed = await measureUpload((live, progress) => {
    const display = Math.min(live, 999).toFixed(1);
    document.getElementById('gaugeBigValue').textContent = display;
    document.getElementById('metricUp').textContent      = display;
    drawMainGauge(Math.min(live, 100), 100, { phase: 'upload' });
    setProgress(60 + progress * 38);
  });

  lastResults.up = upSpeed;
  document.getElementById('metricUp').textContent = upSpeed.toFixed(1);
  setProgress(100);

  // Done
  detectConnection();
  lastResults.connType = window._connType || 'unknown';
  document.getElementById('gaugePhase').textContent   = 'COMPLETE';
  document.getElementById('gaugeBigValue').textContent = downSpeed.toFixed(1);
  document.getElementById('gaugeBigUnit').textContent  = 'Mbps';
  animateMainGauge(upSpeed, downSpeed, 100, { phase: 'download' }, 800);

  if      (downSpeed >= THRESHOLDS.download.good)       setStatus('TEST COMPLETE — CRUISING SPEED!', 'done');
  else if (downSpeed >= THRESHOLDS.download.acceptable) setStatus('TEST COMPLETE — ROOM FOR IMPROVEMENT', 'done');
  else                                                  setStatus('TEST COMPLETE — YOUR LINE NEEDS HELP', 'done');

  btn.className        = 'start-btn done';
  btn.disabled         = false;
  btnLabel.textContent = 'TEST AGAIN';

  generateCoaching(downSpeed, upSpeed, ping, jitter);
  showUpgradeNudge(downSpeed, upSpeed, ping);
  checkUploadWarning(upSpeed);
  document.getElementById('resultsPanel').classList.add('show');
  setTimeout(() => {
    document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);

  testRunning = false;

  // CTTX lead capture — show assessment form after a completed test.
  if (window.CTTX_onTestComplete) window.CTTX_onTestComplete(lastResults);
}

function highlightMetric(id) {
  document.querySelectorAll('.metric-card').forEach(c => c.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.closest('.metric-card').classList.add('active');
}

// ── Share & Viral ────────────────────────────────────────────
function getShareText(mode) {
  const r = lastResults;
  const connLabel = r.connType === '5g' ? ' on 5G' : r.connType === 'lte' ? ' on LTE' : r.connType === 'wifi' ? ' on WiFi' : '';
  const rating    = (r.down >= THRESHOLDS.download.good && r.up >= THRESHOLDS.upload.acceptable) ? 'fast'
                  : r.down >= THRESHOLDS.download.acceptable ? 'mid' : 'slow';

  if (mode === 'whatsapp') {
    if (rating === 'fast') return `🏎️ *CRUISER Speed Test — FULL THROTTLE${connLabel}*\n\n⬇ Download: *${r.down.toFixed(1)} Mbps*\n⬆ Upload: *${r.up.toFixed(1)} Mbps*\n📡 Ping: ${r.ping}ms | Jitter: ${r.jitter}ms\n\nLekker hey! My lyn cruise. Kan joune dit klop? 😎\nTest gratis 👇 https://cruiser-sa.gerhardcttx.workers.dev\n\n#CruiserSpeed #FullThrottle`;
    if (rating === 'slow') return `🏎️ *CRUISER Speed Test — ROUGH TERRAIN* 😬\n\n⬇ Download: *${r.down.toFixed(1)} Mbps*\n⬆ Upload: *${r.up.toFixed(1)} Mbps*\n📡 Ping: ${r.ping}ms\n\nMy lyn sukkel... is joune ook so stadig? 😅\nTest jou eie → https://cruiser-sa.gerhardcttx.workers.dev\n\n#CruiserSpeed #UpgradeTime`;
    return `🏎️ *CRUISER Speed Test${connLabel}*\n\n⬇ Download: *${r.down.toFixed(1)} Mbps*\n⬆ Upload: *${r.up.toFixed(1)} Mbps*\n📡 Ping: ${r.ping}ms | Jitter: ${r.jitter}ms\n\nKan joune klop? Challenge accepted? 🤔\nTest gratis 👇 https://cruiser-sa.gerhardcttx.workers.dev\n\n#CruiserSpeed`;
  }
  return `🏎️ CRUISER Speed Test${connLabel}\n────────────────────\n⬇ ${r.down.toFixed(1)} Mbps DOWN\n⬆ ${r.up.toFixed(1)} Mbps UP\n📡 ${r.ping}ms ping · ${r.jitter}ms jitter\n────────────────────\nCan YOUR line beat this?\nTest FREE 👇 https://cruiser-sa.gerhardcttx.workers.dev\n#CruiserSpeed #SpeedChallenge`;
}

function shareWhatsApp() {
  window.open('https://wa.me/?text=' + encodeURIComponent(getShareText('whatsapp')), '_blank', 'noopener');
}

function shareNative() {
  const text = getShareText('generic');
  if (navigator.share) {
    navigator.share({ title: 'CRUISER Speed Test', text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopyFeedback).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
  showCopyFeedback();
}

function showCopyFeedback() {
  const btn  = document.getElementById('shareNative');
  const orig = btn.innerHTML;
  btn.innerHTML = '<svg viewBox="0 0 24 24" class="share-icon"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span>Copied!</span>';
  btn.style.borderColor = '#00e676';
  btn.style.color       = '#00e676';
  setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = ''; btn.style.color = ''; }, 2500);
}

// ── Data Lines Canvas (ambient bushveld animation) ───────────
function initDataLines() {
  const canvas = document.getElementById('dataLines');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const lines = Array.from({ length: 6 }, () => ({
    startX: Math.random() < 0.5 ? 0 : W,
    startY: H * 0.2 + Math.random() * H * 0.5,
    cp1x: W * 0.25 + Math.random() * W * 0.2,
    cp1y: H * 0.1  + Math.random() * H * 0.6,
    cp2x: W * 0.55 + Math.random() * W * 0.2,
    cp2y: H * 0.2  + Math.random() * H * 0.5,
    endX: Math.random() < 0.5 ? W : 0,
    endY: H * 0.3  + Math.random() * H * 0.4,
    offset: Math.random() * 100,
    speed:  0.2 + Math.random() * 0.3,
    alpha:  0.08 + Math.random() * 0.12,
    width:  0.5 + Math.random(),
    hue:    Math.random() < 0.6 ? 160 : 185
  }));

  const pulses = Array.from({ length: 12 }, () => ({
    lineIdx: Math.floor(Math.random() * 6),
    t:     Math.random(),
    speed: 0.001 + Math.random() * 0.003,
    size:  1 + Math.random() * 2,
    alpha: 0.3 + Math.random() * 0.4
  }));

  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    time += 0.5;

    lines.forEach((line) => {
      const wave  = Math.sin((time + line.offset) * 0.01 * line.speed) * 20;
      const wave2 = Math.cos((time + line.offset) * 0.008 * line.speed) * 15;
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY + wave);
      ctx.bezierCurveTo(line.cp1x, line.cp1y + wave, line.cp2x, line.cp2y + wave2, line.endX, line.endY + wave2);
      ctx.strokeStyle = `hsla(${line.hue}, 100%, 60%, ${line.alpha})`;
      ctx.lineWidth   = line.width;
      ctx.stroke();
      ctx.strokeStyle = `hsla(${line.hue}, 100%, 60%, ${line.alpha * 0.3})`;
      ctx.lineWidth   = line.width * 3;
      ctx.stroke();
    });

    pulses.forEach(pulse => {
      pulse.t += pulse.speed;
      if (pulse.t > 1) { pulse.t = 0; pulse.lineIdx = Math.floor(Math.random() * lines.length); }
      const line  = lines[pulse.lineIdx];
      const wave  = Math.sin((time + line.offset) * 0.01 * line.speed) * 20;
      const wave2 = Math.cos((time + line.offset) * 0.008 * line.speed) * 15;
      const t = pulse.t, mt = 1 - t;
      const x = mt*mt*mt*line.startX + 3*mt*mt*t*line.cp1x + 3*mt*t*t*line.cp2x + t*t*t*line.endX;
      const y = mt*mt*mt*(line.startY+wave) + 3*mt*mt*t*(line.cp1y+wave) + 3*mt*t*t*(line.cp2y+wave2) + t*t*t*(line.endY+wave2);
      ctx.beginPath(); ctx.arc(x, y, pulse.size, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${line.hue}, 100%, 70%, ${pulse.alpha})`; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, pulse.size*3, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${line.hue}, 100%, 60%, ${pulse.alpha*0.15})`; ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();
}

// ── PWA Install Prompt ────────────────────────────────────────
let deferredInstallPrompt = null;

function initInstallPrompt() {
  const banner     = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const dismissBtn = document.getElementById('installDismiss');

  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;
  if (sessionStorage.getItem('installDismissed')) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    setTimeout(() => { banner.style.display = 'block'; document.body.classList.add('install-banner-visible'); }, 2500);
  });

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !window.navigator.standalone && !sessionStorage.getItem('installDismissed')) {
    setTimeout(() => {
      const strong = banner.querySelector('.install-text strong');
      const span   = banner.querySelector('.install-text span');
      if (strong) strong.textContent = 'Voeg CRUISER by jou tuisskerm';
      if (span)   span.textContent   = 'Tik Deel → dan "Voeg by tuisskerm"';
      const btn = document.getElementById('installBtn');
      if (btn) btn.textContent = 'Hoe?';
      banner.style.display = 'block';
      document.body.classList.add('install-banner-visible');
    }, 2500);
  }

  installBtn.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      banner.style.display = 'none';
      document.body.classList.remove('install-banner-visible');
    } else {
      alert('Om CRUISER te installeer:\n1. Tik die Deel-knoppie (↑) onderaan Safari\n2. Kies "Voeg by tuisskerm"\n3. Tik "Voeg by"\n\nDie app werk dan sonder data na eerste laai!');
    }
  });

  dismissBtn.addEventListener('click', () => {
    banner.style.display = 'none';
    document.body.classList.remove('install-banner-visible');
    sessionStorage.setItem('installDismissed', '1');
  });

  window.addEventListener('appinstalled', () => {
    banner.style.display = 'none';
    document.body.classList.remove('install-banner-visible');
    deferredInstallPrompt = null;
  });
}

// ── Boot ──────────────────────────────────────────────────────
(function init() {
  initGauges();
  detectConnection();
  setupConnectionListener();
  initDataLines();
  initInstallPrompt();

  document.getElementById('dateStamp').textContent = new Date().toLocaleDateString('en-ZA');

  // IP detection via Cloudflare
  fetch('https://cloudflare.com/cdn-cgi/trace')
    .then(r => r.text())
    .then(text => {
      const ip = (text.match(/ip=(.+)/) || [])[1] || '—';
      document.getElementById('ipInfo').textContent = 'IP: ' + ip;
    })
    .catch(() => {});

  document.getElementById('startBtn').addEventListener('click', startTest);
  document.getElementById('shareWA').addEventListener('click', shareWhatsApp);
  document.getElementById('shareNative').addEventListener('click', shareNative);
})();
