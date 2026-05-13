import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../client/src/styles/link-planner.css', import.meta.url);
let css = readFileSync(path, 'utf8');

css = css.replace(`.link-planner-page {
  position: fixed;
  inset: 0;
  min-width: 1180px;
  background: #0f172a;
  color: #e5edf7;
  overflow: hidden;
}`, `.link-planner-page {
  --planner-bg: var(--background);
  --planner-map-bg: #050507;
  --planner-surface: var(--card);
  --planner-surface-strong: color-mix(in oklch, var(--card) 88%, black 12%);
  --planner-text: var(--foreground);
  --planner-muted: var(--muted-foreground);
  --planner-primary: var(--primary);
  --planner-accent: var(--accent);
  --planner-border: color-mix(in oklch, var(--border) 72%, var(--primary) 28%);
  --planner-border-strong: color-mix(in oklch, var(--border) 46%, var(--primary) 54%);
  --planner-shadow: rgba(0, 0, 0, 0.42);
  position: relative;
  inset: auto;
  isolation: isolate;
  width: 100%;
  height: calc(100vh - 2rem);
  min-height: 720px;
  min-width: 0;
  background: var(--planner-bg);
  color: var(--planner-text);
  overflow: hidden;
  border: 1px solid var(--planner-border);
  border-radius: var(--radius-xl);
  box-shadow: 0 24px 80px var(--planner-shadow);
}`);

const replacements = new Map([
  ['#0f172a', 'var(--planner-surface)'],
  ['#020617', 'var(--planner-map-bg)'],
  ['#e5edf7', 'var(--planner-text)'],
  ['#f8fafc', 'var(--planner-text)'],
  ['#f1f5f9', 'var(--planner-text)'],
  ['#e2e8f0', 'var(--planner-text)'],
  ['#cbd5e1', 'var(--planner-muted)'],
  ['#a8b7c9', 'var(--planner-muted)'],
  ['#94a3b8', 'var(--planner-muted)'],
  ['#64748b', 'var(--planner-muted)'],
  ['#bfdbfe', 'var(--planner-primary)'],
  ['#e0f2fe', 'var(--planner-primary)'],
  ['#67e8f9', 'var(--planner-primary)'],
  ['rgba(15, 23, 42, 0.96)', 'color-mix(in oklch, var(--planner-surface) 94%, transparent)'],
  ['rgba(15, 23, 42, 0.8)', 'color-mix(in oklch, var(--planner-surface) 80%, transparent)'],
  ['rgba(15, 23, 42, 0.75)', 'color-mix(in oklch, var(--planner-surface) 75%, transparent)'],
  ['rgba(15, 23, 42, 0.72)', 'color-mix(in oklch, var(--planner-surface) 72%, transparent)'],
  ['rgba(15, 23, 42, 0.52)', 'color-mix(in oklch, var(--planner-surface) 52%, transparent)'],
  ['rgba(2, 6, 23, 0.92)', 'color-mix(in oklch, var(--planner-bg) 92%, transparent)'],
  ['rgba(2, 6, 23, 0.82)', 'color-mix(in oklch, var(--planner-bg) 82%, transparent)'],
  ['rgba(2, 6, 23, 0.8)', 'color-mix(in oklch, var(--planner-bg) 80%, transparent)'],
  ['rgba(2, 6, 23, 0.78)', 'color-mix(in oklch, var(--planner-bg) 78%, transparent)'],
  ['rgba(2, 6, 23, 0.74)', 'color-mix(in oklch, var(--planner-bg) 74%, transparent)'],
  ['rgba(2, 6, 23, 0.72)', 'color-mix(in oklch, var(--planner-bg) 72%, transparent)'],
  ['rgba(2, 6, 23, 0.52)', 'color-mix(in oklch, var(--planner-bg) 52%, transparent)'],
  ['rgba(2, 6, 23, 0.5)', 'color-mix(in oklch, var(--planner-bg) 50%, transparent)'],
  ['rgba(2, 6, 23, 0.44)', 'color-mix(in oklch, var(--planner-bg) 44%, transparent)'],
  ['rgba(2, 6, 23, 0.42)', 'rgba(0, 0, 0, 0.42)'],
  ['rgba(2, 6, 23, 0.38)', 'color-mix(in oklch, var(--planner-bg) 38%, transparent)'],
  ['rgba(103, 232, 249, 0.8)', 'color-mix(in oklch, var(--planner-primary) 80%, transparent)'],
  ['rgba(103, 232, 249, 0.72)', 'color-mix(in oklch, var(--planner-primary) 72%, transparent)'],
  ['rgba(103, 232, 249, 0.5)', 'color-mix(in oklch, var(--planner-primary) 50%, transparent)'],
  ['rgba(103, 232, 249, 0.4)', 'color-mix(in oklch, var(--planner-primary) 40%, transparent)'],
  ['rgba(103, 232, 249, 0.38)', 'color-mix(in oklch, var(--planner-primary) 38%, transparent)'],
  ['rgba(103, 232, 249, 0.28)', 'color-mix(in oklch, var(--planner-primary) 28%, transparent)'],
  ['rgba(103, 232, 249, 0.24)', 'color-mix(in oklch, var(--planner-primary) 24%, transparent)'],
  ['rgba(103, 232, 249, 0.22)', 'color-mix(in oklch, var(--planner-primary) 22%, transparent)'],
  ['rgba(103, 232, 249, 0.2)', 'color-mix(in oklch, var(--planner-primary) 20%, transparent)'],
  ['rgba(148, 163, 184, 0.3)', 'color-mix(in oklch, var(--planner-muted) 30%, transparent)'],
  ['rgba(148, 163, 184, 0.28)', 'color-mix(in oklch, var(--planner-muted) 28%, transparent)'],
  ['rgba(148, 163, 184, 0.2)', 'color-mix(in oklch, var(--planner-muted) 20%, transparent)'],
  ['rgba(148, 163, 184, 0.18)', 'color-mix(in oklch, var(--planner-muted) 18%, transparent)'],
  ['rgba(148, 163, 184, 0.14)', 'color-mix(in oklch, var(--planner-muted) 14%, transparent)'],
]);

for (const [from, to] of replacements) {
  css = css.split(from).join(to);
}

css = css.replace('  height: 100vh;\n  filter:', '  height: 100%;\n  filter:');
css = css.replace('    url("https://d2xsxph8kpxj0f.cloudfront.net/310519663626068735/GzdZcQct3t3LDCv9qe4RMK/cttx-command-terrain-hero-dGCiL3bZuAm8ZYyjmvxzqj.webp") center / cover;\n', '');
css = css.replace('  box-shadow: 28px 0 60px rgba(0, 0, 0, 0.42);', '  box-shadow: 24px 0 56px var(--planner-shadow);');
css = css.replace(/font-family: "IBM Plex Sans Condensed", "IBM Plex Sans", sans-serif;/g, 'font-family: var(--font-heading);');

writeFileSync(path, css);
