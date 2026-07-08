// CRUISER v3.0 - Speed Test Engine (Cloudflare endpoints)

async function measurePing() {
  const samples = [];
  // Warmup (discard)
  try { await fetch('https://speed.cloudflare.com/__down?bytes=1&r=' + Math.random(), { cache: 'no-store', mode: 'cors' }); } catch (_) {}
  // 12 samples
  for (let i = 0; i < 12; i++) {
    const t0 = performance.now();
    try {
      await fetch('https://speed.cloudflare.com/__down?bytes=1&r=' + Math.random(), { cache: 'no-store', mode: 'cors' });
      samples.push(performance.now() - t0);
    } catch (_) { samples.push(999); }
  }
  samples.sort((a, b) => a - b);
  const trimmed = samples.slice(2, -3);
  const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
  const jitter = Math.max(...trimmed) - Math.min(...trimmed);
  return { ping: Math.round(avg), jitter: Math.round(jitter) };
}

async function measureDownload(onProgress) {
  const passes = [1e6, 2e6, 5e6, 10e6, 10e6];
  let totalBits = 0, totalSec = 0;
  for (let i = 0; i < passes.length; i++) {
    const bytes = passes[i];
    const t0 = performance.now();
    try {
      const res = await fetch('https://speed.cloudflare.com/__down?bytes=' + bytes + '&r=' + Math.random(), { cache: 'no-store', mode: 'cors' });
      await res.arrayBuffer();
      const sec = (performance.now() - t0) / 1000;
      if (i > 0) { totalBits += bytes * 8; totalSec += sec; }
      const liveBits = (i === 0) ? (bytes * 8 / sec) : (totalBits / totalSec);
      onProgress && onProgress(liveBits / 1e6, (i + 1) / passes.length);
    } catch (_) {}
  }
  if (totalSec === 0) return 0;
  return Math.round((totalBits / totalSec / 1e6) * 10) / 10;
}

async function measureUpload(onProgress) {
  const passes = [512e3, 1e6, 2e6, 4e6, 4e6];
  let totalBits = 0, totalSec = 0;
  for (let i = 0; i < passes.length; i++) {
    const bytes = passes[i];
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf.slice(0, Math.min(bytes, 65536)));
    const blob = new Blob([buf]);
    const t0 = performance.now();
    try {
      await fetch('https://speed.cloudflare.com/__up', { method: 'POST', body: blob, cache: 'no-store', mode: 'cors' });
      const sec = (performance.now() - t0) / 1000;
      if (i > 0) { totalBits += bytes * 8; totalSec += sec; }
      const liveBits = (i === 0) ? (bytes * 8 / sec) : (totalBits / totalSec);
      onProgress && onProgress(liveBits / 1e6, (i + 1) / passes.length);
    } catch (_) {}
  }
  if (totalSec === 0) return 0;
  return Math.round((totalBits / totalSec / 1e6) * 10) / 10;
}
