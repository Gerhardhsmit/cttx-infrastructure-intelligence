// CRUISER v3.0 — Premium HiDPI Gauge Renderer

const GAUGE_START = Math.PI * 0.75;
const GAUGE_END   = Math.PI * 2.25;
const GAUGE_RANGE = GAUGE_END - GAUGE_START;

function drawMainGauge(value, max, opts = {}) {
  const canvas = document.getElementById('mainGauge');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const size = canvas.parentElement.clientWidth;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = size, H = size;
  const cx = W / 2, cy = H / 2;
  const r  = cx - 30;
  ctx.clearRect(0, 0, W, H);
  const phase   = opts.phase   || 'download';
  const reverse = opts.reverse || false;
  // Outer bezel ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 24, 0, Math.PI * 2);
  const bezelGrad = ctx.createLinearGradient(0, 0, W, H);
  bezelGrad.addColorStop(0,   '#1a2a4a');
  bezelGrad.addColorStop(0.3, '#0a1428');
  bezelGrad.addColorStop(0.7, '#1a2a4a');
  bezelGrad.addColorStop(1,   '#050a14');
  ctx.strokeStyle = bezelGrad;
  ctx.lineWidth   = 3;
  ctx.stroke();
  // Inner bezel
  ctx.beginPath();
  ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
  ctx.lineWidth   = 1;
  ctx.stroke();
  // Gauge face
  const faceGrad = ctx.createRadialGradient(cx, cy - 20, 0, cx, cy, r + 18);
  faceGrad.addColorStop(0,   '#0f1a2e');
  faceGrad.addColorStop(0.6, '#080e1c');
  faceGrad.addColorStop(1,   '#040810');
  ctx.beginPath();
  ctx.arc(cx, cy, r + 18, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();
  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, r, GAUGE_START, GAUGE_END);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 16;
  ctx.lineCap     = 'round';
  ctx.stroke();
  // Tick marks
  const TICKS = 40;
  for (let i = 0; i <= TICKS; i++) {
    const angle = GAUGE_START + (GAUGE_RANGE * i / TICKS);
    const major = i % 10 === 0;
    const mid   = i % 5  === 0;
    const inner = major ? r - 20 : mid ? r - 12 : r - 6;
    const outer = r + 2;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx + cos * outer, cy + sin * outer);
    ctx.lineTo(cx + cos * inner, cy + sin * inner);
    ctx.strokeStyle = major ? 'rgba(0,229,255,0.4)' : mid ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = major ? 2 : mid ? 1.5 : 0.5;
    ctx.lineCap     = 'butt';
    ctx.stroke();
  }
  // Numeric labels
  const LABELS   = 5;
  const fontSize = Math.round(W * 0.04);
  ctx.font          = fontSize + "px 'Share Tech Mono', monospace";
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  for (let i = 0; i <= LABELS; i++) {
    const angle = GAUGE_START + (GAUGE_RANGE * i / LABELS);
    const lx = cx + Math.cos(angle) * (r - 32);
    const ly = cy + Math.sin(angle) * (r - 32);
    ctx.fillStyle = 'rgba(0,229,255,0.35)';
    ctx.fillText(Math.round(max * i / LABELS), lx, ly);
  }
  // Active arc
  const pct     = Math.min(Math.max(value / max, 0), 1);
  const fillEnd = GAUGE_START + GAUGE_RANGE * pct;
  if (pct > 0.003) {
    let arcGrad;
    if (reverse) {
      arcGrad = ctx.createConicGradient(GAUGE_START, cx, cy);
      [ [0, '#00e676'], [0.35, '#00e676'], [0.55, '#ffea00'], [0.75, '#ff9100'], [1, '#ff1744'] ]
        .forEach(([s, c]) => arcGrad.addColorStop(s, c));
    } else {
      arcGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      arcGrad.addColorStop(0.0,  '#ff1744');
      arcGrad.addColorStop(0.25, '#ff9100');
      arcGrad.addColorStop(0.45, '#ffea00');
      arcGrad.addColorStop(0.65, '#00e676');
      arcGrad.addColorStop(0.85, '#00e5ff');
      arcGrad.addColorStop(1.0,  '#7c4dff');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, GAUGE_START, fillEnd);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth   = 16;
    ctx.lineCap     = 'round';
    const glowColor = reverse
      ? (pct > 0.6 ? '#ff1744' : pct > 0.35 ? '#ffea00' : '#00e676')
      : (pct > 0.7 ? '#00e5ff' : pct > 0.4  ? '#00e676' : '#ff9100');
    ctx.shadowBlur  = 25;
    ctx.shadowColor = glowColor;
    ctx.stroke();
    ctx.shadowBlur  = 0;
    // Inner glow line
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, GAUGE_START, fillEnd);
    ctx.strokeStyle  = glowColor;
    ctx.lineWidth    = 1;
    ctx.globalAlpha  = 0.2;
    ctx.shadowBlur   = 10;
    ctx.shadowColor  = glowColor;
    ctx.stroke();
    ctx.globalAlpha  = 1;
    ctx.shadowBlur   = 0;
  }
  // Needle
  const needleAngle = GAUGE_START + GAUGE_RANGE * pct;
  const nLen  = r - 8;
  const nTail = 15;
  // Glow pass
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(needleAngle) * nTail, cy - Math.sin(needleAngle) * nTail);
  ctx.lineTo(cx + Math.cos(needleAngle) * nLen,  cy + Math.sin(needleAngle) * nLen);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth   = 4;
  ctx.lineCap     = 'round';
  ctx.shadowBlur  = 20;
  ctx.shadowColor = '#00e5ff';
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  // Core needle
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(needleAngle) * nTail, cy - Math.sin(needleAngle) * nTail);
  ctx.lineTo(cx + Math.cos(needleAngle) * nLen,  cy + Math.sin(needleAngle) * nLen);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 8;
  ctx.shadowColor = '#00e5ff';
  ctx.stroke();
  ctx.shadowBlur  = 0;
  // Center hub
  const hubGrad = ctx.createRadialGradient(cx, cy - 2, 0, cx, cy, 12);
  hubGrad.addColorStop(0,   '#ffffff');
  hubGrad.addColorStop(0.3, '#00e5ff');
  hubGrad.addColorStop(0.7, '#0a1428');
  hubGrad.addColorStop(1,   '#040810');
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth   = 1.5;
  ctx.shadowBlur  = 10;
  ctx.shadowColor = '#00e5ff';
  ctx.stroke();
  ctx.shadowBlur  = 0;
  // Phase indicator dots
  const phases   = ['ping', 'download', 'upload'];
  const phaseIdx = phases.indexOf(phase);
  const dotY     = cy + r + 40;
  phases.forEach((p, i) => {
    const dotX = cx + (i - 1) * 16;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
    if (i <= phaseIdx) {
      ctx.fillStyle  = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00e5ff';
    } else {
      ctx.fillStyle  = 'rgba(255,255,255,0.15)';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function animateMainGauge(from, to, max, opts = {}, duration = 900) {
  const start = performance.now();
  function frame(now) {
    const t    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val  = from + (to - from) * ease;
    drawMainGauge(val, max, opts);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function initGauges() {
  drawMainGauge(0, 100, { phase: 'download' });
}
