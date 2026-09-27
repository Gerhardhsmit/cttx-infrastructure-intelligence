#!/usr/bin/env python3
"""CTTX reserve terrain study engine.

Turns a reserve config (reserves/<name>.json) into the standard first-contact
study: Sentinel-2 aerial map, candidate carrier uplink, high sites and relays
chosen from Copernicus 30 m terrain, Fresnel-checked path profiles, and a
branded HTML + PDF with no pricing.

    python3 engine.py reserves/amakhala.json

Output goes to sales-engine/customers/<slug>/ (PDF + HTML) and
sales-engine/customers/<slug>/terrain-study/ (images, metrics, config copy).
Colours and fonts come from brand.json; customer proof points from evidence.json.
"""
import base64, datetime as dt, html, json, math, os, re, subprocess, sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_origin
from pyproj import Transformer
from scipy.ndimage import maximum_filter
from shapely.geometry import MultiPoint
import mgrs
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.path import Path as MPath
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
CACHE = Path(os.environ.get("TERRAIN_CACHE", "/tmp/cttx-terrain-cache"))
os.environ.setdefault("CURL_CA_BUNDLE", "/root/.ccr/ca-bundle.crt")
S2 = "https://sentinel-cogs.s3.us-west-2.amazonaws.com"
DEM = "https://copernicus-dem-30m.s3.amazonaws.com"
CHROME = os.environ.get("CHROME", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")

# Radio planning standard (CTTX_CRITICAL_DECISIONS.md: LOS-clear only, fewest sites/hops)
F_GHZ, K = 5.8, 4 / 3
MAST, CPE, UPLINK_H, FIELD_H = 18, 8, 30, 3
FRESNEL_CLEAR = 0.6
MAX_LODGE_KM, RES = 12, 30


def sh(*a, **k):
    return subprocess.run(a, capture_output=True, **k)


def curl(url, out=None):
    args = ["curl", "-s", "-m", "300", url] + (["-o", str(out)] if out else [])
    r = sh(*args)
    return r.stdout if out is None else None


# ---------------------------------------------------------------- data
def dem_tiles(W, S, E, N):
    names = set()
    for la in range(math.floor(S), math.floor(N) + 1):
        for lo in range(math.floor(W), math.floor(E) + 1):
            ns = f"S{abs(la):02d}" if la < 0 else f"N{la:02d}"
            ew = f"E{lo:03d}" if lo >= 0 else f"W{abs(lo):03d}"
            names.add(f"Copernicus_DSM_COG_10_{ns}_00_{ew}_00_DEM")
    CACHE.mkdir(parents=True, exist_ok=True)
    paths = []
    for n in sorted(names):
        p = CACHE / f"{n}.tif"
        if not p.exists():
            curl(f"{DEM}/{n}/{n}.tif", p)
        paths.append(p)
    return paths


def s2_tiles(W, S, E, N):
    m = mgrs.MGRS()
    tiles = set()
    for la in np.linspace(S, N, 5):
        for lo in np.linspace(W, E, 5):
            tiles.add(m.toMGRS(la, lo, MGRSPrecision=0))
    return sorted(tiles)


def best_scene(tile, months=10):
    zone, band, sq = tile[:2], tile[2], tile[3:]
    today = dt.date.today()
    best = None
    for i in range(months):
        y, mo = today.year, today.month - i
        while mo <= 0:
            y, mo = y - 1, mo + 12
        prefix = f"sentinel-s2-l2a-cogs/{int(zone)}/{band}/{sq}/{y}/{mo}/"
        xml = curl(f"{S2}/?list-type=2&prefix={prefix}&delimiter=/").decode()
        for p in re.findall(r"<Prefix>([^<]+)</Prefix>", xml)[1:]:
            name = p.rstrip("/").split("/")[-1]
            try:
                props = json.loads(curl(f"{S2}/{p}{name}.json"))["properties"]
            except Exception:
                continue
            cc, nd = props.get("eo:cloud_cover", 100), props.get("s2:nodata_pixel_percentage", 100)
            score = cc + nd * 0.5
            if best is None or score < best[0]:
                best = (score, f"{S2}/{p}TCI.tif", name[10:18], cc, nd)
        if best and best[3] < 1 and best[4] < 1:
            break
    return best


# ---------------------------------------------------------------- geometry
class Terrain:
    def __init__(self, dem, b):
        self.dem, self.b = dem, b
        self.H, self.W = dem.shape

    def z(self, x, y):
        b, H, W = self.b, self.H, self.W
        r = np.clip((b[3] - y) / RES, 0, H - 1.001)
        c = np.clip((x - b[0]) / RES, 0, W - 1.001)
        r0, c0 = np.floor(r).astype(int), np.floor(c).astype(int)
        fr, fc = r - r0, c - c0
        d = self.dem
        return (d[r0, c0] * (1 - fr) * (1 - fc) + d[r0 + 1, c0] * fr * (1 - fc)
                + d[r0, c0 + 1] * (1 - fr) * fc + d[r0 + 1, c0 + 1] * fr * fc)

    def profile(self, a, bb, ha, hb):
        (x1, y1), (x2, y2) = a, bb
        D = max(float(np.hypot(x2 - x1, y2 - y1)), 1.0)
        n = max(60, int(D / 15))
        t = np.linspace(0, 1, n)
        g = self.z(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
        d1, d2 = t * D / 1000, (1 - t) * D / 1000
        bulge = d1 * d2 / (12.742 * K)
        los = (g[0] + ha) + ((g[-1] + hb) - (g[0] + ha)) * t
        f1 = 17.32 * np.sqrt(np.maximum(d1 * d2, 1e-9) / (F_GHZ * D / 1000))
        ratio = float(np.min(((los - (g + bulge)) / np.maximum(f1, 1e-6))[2:-2]))
        return dict(D=D, d=t * D, g=g, bulge=bulge, los=los, f1=f1, ratio=ratio, clear=ratio >= FRESNEL_CLEAR)


# ---------------------------------------------------------------- study
def run(cfg_path):
    cfg = json.loads(Path(cfg_path).read_text())
    brand = json.loads((HERE / "brand.json").read_text())
    evidence = json.loads((HERE / "evidence.json").read_text())
    out = REPO / "sales-engine" / "customers" / cfg["slug"]
    work = out / "terrain-study"
    work.mkdir(parents=True, exist_ok=True)

    lodges = cfg["lodges"]
    up = cfg["uplink"]
    lats = [l["lat"] for l in lodges] + [up["lat"]]
    lons = [l["lon"] for l in lodges] + [up["lon"]]
    pad = 0.04
    W, S, E, N = min(lons) - pad, min(lats) - pad, max(lons) + pad, max(lats) + pad
    zone = int((np.mean(lons) + 180) // 6) + 1
    epsg = (32700 if np.mean(lats) < 0 else 32600) + zone
    T = Transformer.from_crs(4326, epsg, always_xy=True)
    Ti = Transformer.from_crs(epsg, 4326, always_xy=True)
    xy = lambda la, lo: T.transform(lo, la)
    b = transform_bounds("EPSG:4326", f"EPSG:{epsg}", W, S, E, N)

    # terrain
    print("· terrain")
    srcs = [rasterio.open(p) for p in dem_tiles(W, S, E, N)]
    mos, mtr = merge(srcs, bounds=(W - .02, S - .02, E + .02, N + .02))
    w, h = int((b[2] - b[0]) / RES), int((b[3] - b[1]) / RES)
    dem = np.zeros((h, w), np.float32)
    reproject(mos[0], dem, src_transform=mtr, src_crs="EPSG:4326",
              dst_transform=from_origin(b[0], b[3], RES, RES), dst_crs=f"EPSG:{epsg}",
              resampling=Resampling.bilinear)
    tr = Terrain(dem, b)

    # imagery
    print("· imagery")
    img, dates = None, set()
    for tile in s2_tiles(W, S, E, N):
        sc = best_scene(tile)
        if not sc:
            continue
        m_, _ = merge([rasterio.open("/vsicurl/" + sc[1])], bounds=tuple(b), res=10, nodata=0,
                      dst_crs=f"EPSG:{epsg}") if False else merge([rasterio.open("/vsicurl/" + sc[1])], bounds=tuple(b), res=10, nodata=0)
        img = m_ if img is None else np.where((img.sum(0) == 0)[None], m_, img)
        dates.add(sc[2])
    img_date = dt.datetime.strptime(max(dates), "%Y%m%d").strftime("%-d %B %Y")

    # points
    LX = {l["name"]: xy(l["lat"], l["lon"]) for l in lodges}
    if up.get("mode") == "known_site":
        U = xy(up["lat"], up["lon"])
        up_label = up.get("label", "Carrier site")
    else:
        px, py = xy(up["lat"], up["lon"])
        rr, cc = np.mgrid[0:tr.H, 0:tr.W]
        X, Y = b[0] + (cc + .5) * RES, b[3] - (rr + .5) * RES
        k = np.argmax(np.where(np.hypot(X - px, Y - py) < up.get("radius_m", 2500), dem, -1))
        U = (float(X.flat[k]), float(Y.flat[k]))
        up_label = f"{up['town']} high ground"

    # high-site candidates: local maxima inside the lodge footprint
    print("· link planning")
    foot = MultiPoint(list(LX.values())).convex_hull.buffer(3500)
    fp = MPath(np.array(foot.exterior.coords))
    mx = maximum_filter(dem, size=21)
    cands = []
    for r, c in zip(*np.where(dem == mx)):
        x, y = b[0] + (c + .5) * RES, b[3] - (r + .5) * RES
        if fp.contains_point((x, y)):
            cands.append((float(dem[r, c]), x, y))
    cands = sorted(cands, reverse=True)[:70]
    served = {i: {k for k, p in LX.items()
                  if np.hypot(p[0] - c[1], p[1] - c[2]) < MAX_LODGE_KM * 1000
                  and tr.profile((c[1], c[2]), p, MAST, CPE)["clear"]} for i, c in enumerate(cands)}
    upclear = {i: tr.profile(U, (c[1], c[2]), UPLINK_H, MAST)["clear"] for i, c in enumerate(cands)}

    best = None
    for i in served:
        if upclear[i] and (best is None or (len(served[i]), cands[i][0]) > best[0]):
            best = ((len(served[i]), cands[i][0]), [i])
        for j in served:
            if j <= i or np.hypot(cands[i][1] - cands[j][1], cands[i][2] - cands[j][2]) < 2500:
                continue
            if not (upclear[i] or upclear[j]):
                continue
            if not tr.profile((cands[i][1], cands[i][2]), (cands[j][1], cands[j][2]), MAST, MAST)["clear"]:
                continue
            sc = (len(served[i] | served[j]), cands[i][0] + cands[j][0] - 50)
            if best is None or sc > best[0]:
                best = (sc, [i, j])
    if best is None:
        sys.exit("No high site has a clear path to the uplink. Choose a different uplink in the config.")
    hs = [cands[i] for i in best[1]]
    names = ["High Site"] if len(hs) == 1 else (
        ["High Site South", "High Site North"] if hs[0][2] < hs[1][2] else ["High Site North", "High Site South"])
    sites = [dict(name=n, elev=s[0], p=(s[1], s[2]), kind="high") for n, s in zip(names, hs)]
    up_to = min([s for s, i in zip(sites, best[1]) if upclear[i]], key=lambda s: np.hypot(s["p"][0] - U[0], s["p"][1] - U[1]))

    # relays for lodges no high site can see
    covered = set().union(*[served[i] for i in best[1]])
    for lodge in [k for k in LX if k not in covered]:
        opts = []
        for c in cands:
            pr = tr.profile((c[1], c[2]), LX[lodge], MAST, CPE)
            if not pr["clear"]:
                continue
            feeds = [s for s in sites if s["kind"] == "high" and tr.profile((c[1], c[2]), s["p"], MAST, MAST)["clear"]]
            if feeds:
                opts.append((pr["D"], c, feeds[0]))
        if opts:
            _, c, feed = min(opts, key=lambda o: o[0])
            sites.append(dict(name=f"{lodge.split()[0]} relay", elev=c[0], p=(c[1], c[2]), kind="relay", feed=feed["name"]))

    def site(n):
        return next(s for s in sites if s["name"] == n)

    # links
    links = [dict(a="Carrier uplink", b=up_to["name"], pa=U, pb=up_to["p"], kind="uplink",
                  pr=tr.profile(U, up_to["p"], UPLINK_H, MAST))]
    highs = [s for s in sites if s["kind"] == "high"]
    if len(highs) == 2:
        links.append(dict(a=highs[1]["name"], b=highs[0]["name"], pa=highs[1]["p"], pb=highs[0]["p"], kind="backbone",
                          pr=tr.profile(highs[1]["p"], highs[0]["p"], MAST, MAST)))
    for s in sites:
        if s["kind"] == "relay":
            links.append(dict(a=s["name"], b=s["feed"], pa=s["p"], pb=site(s["feed"])["p"], kind="backbone",
                              pr=tr.profile(s["p"], site(s["feed"])["p"], MAST, MAST)))
    lodge_links = {}
    for k, p in LX.items():
        opts = [(s, tr.profile(s["p"], p, MAST, CPE)) for s in sites]
        opts = [o for o in opts if o[1]["clear"] and o[1]["D"] < MAX_LODGE_KM * 1000]
        if opts:
            s, pr = min(opts, key=lambda o: o[1]["D"])
            lodge_links[k] = dict(a=s["name"], pa=s["p"], pr=pr)
        else:
            lodge_links[k] = None

    # coverage for field terminals
    print("· coverage")
    step = 3
    gx = b[0] + (np.arange(tr.W // step) * step + 1.5) * RES
    gy = b[3] - (np.arange(tr.H // step) * step + 1.5) * RES
    GX, GY = np.meshgrid(gx, gy)
    zb = tr.z(GX, GY) + FIELD_H
    cov = np.zeros(GX.shape, bool)
    for s in sites:
        x1, y1 = s["p"]
        za = tr.z(np.array(x1), np.array(y1)) + MAST
        D = np.hypot(GX - x1, GY - y1)
        ok = np.ones(GX.shape, bool)
        for t in np.linspace(.02, .98, 120):
            d1, d2 = D * t / 1000, D * (1 - t) / 1000
            f1 = 17.32 * np.sqrt(np.maximum(d1 * d2, 1e-9) / (F_GHZ * np.maximum(D / 1000, 1e-3)))
            ok &= (za + (zb - za) * t) - (tr.z(x1 + (GX - x1) * t, y1 + (GY - y1) * t) + d1 * d2 / (12.742 * K)) >= FRESNEL_CLEAR * f1
        cov |= ok & (D < MAX_LODGE_KM * 1000)
    hull = MultiPoint(list(LX.values()) + [s["p"] for s in sites]).convex_hull.buffer(2000)
    hp = MPath(np.array(hull.exterior.coords))
    fm = hp.contains_points(np.c_[GX.ravel(), GY.ravel()]).reshape(GX.shape)
    cov_pct = float(cov[fm].mean() * 100)
    area = float(fm.sum() * (step * RES) ** 2 / 1e6)

    # ------------------------------------------------------------ images
    print("· render")
    M, P = brand["map"], brand["profile"]
    halo = [pe.Stroke(linewidth=3, foreground=M["halo"]), pe.Normal()]
    rgb = np.clip((img.transpose(1, 2, 0) / 255.0 - .02) * 1.9, 0, 1) ** .85
    iy, ix = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]]
    inside = hp.contains_points(np.c_[b[0] + ix.ravel() * 10 + 5, b[3] - iy.ravel() * 10 - 5]).reshape(ix.shape)
    rgb = np.where(inside[..., None], rgb, rgb * .5 + .02)
    aspect = (b[2] - b[0]) / (b[3] - b[1])
    fig = plt.figure(figsize=(13, 13 / aspect), dpi=130)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.imshow(rgb, extent=[b[0], b[2], b[1], b[3]])
    ov = np.zeros(cov.shape + (4,))
    ov[cov & fm] = list(matplotlib.colors.to_rgb(M["coverage"])) + [M["coverage_alpha"]]
    ax.imshow(ov, extent=[gx[0] - 45, gx[-1] + 45, gy[-1] - 45, gy[0] + 45], interpolation="nearest")
    hx, hy = hull.exterior.xy
    ax.plot(hx, hy, color=M["outline"], lw=1.2, ls=(0, (2, 2)), zorder=4)

    def line(a, c, col, lw, ls="-"):
        ax.plot([a[0], c[0]], [a[1], c[1]], color=col, lw=lw, ls=ls, solid_capstyle="round", zorder=5,
                path_effects=[pe.Stroke(linewidth=lw + 2.4, foreground=M["halo"]), pe.Normal()])

    def lab(p, t, dx=8, dy=8, fs=10, bold=False, col="white"):
        ax.annotate(t, p, xytext=(dx, dy), textcoords="offset points", color=col, fontsize=fs,
                    fontweight="bold" if bold else "normal", zorder=9,
                    path_effects=[pe.withStroke(linewidth=3, foreground=M["halo"])])

    for L in links:
        line(L["pa"], L["pb"], M["link"], 3.2 if L["kind"] == "uplink" else 3.4, (0, (6, 3)) if L["kind"] == "uplink" else "-")
    for k, L in lodge_links.items():
        if L:
            line(L["pa"], LX[k], M["lodge_link"], 1.3)
    for k, p in LX.items():
        ax.scatter(*p, s=46, c="white", edgecolors=M["halo"], linewidths=1.2, zorder=8)
        lab(p, k, 6, 7, 9)
    for s in sites:
        big = s["kind"] == "high"
        ax.scatter(*s["p"], marker="^", s=190 if big else 110, c=M["link"], edgecolors=M["halo"], linewidths=1.5, zorder=9)
        lab(s["p"], f"{s['name']}  {s['elev']:.0f} m" if big else s["name"], 10, 6 if big else -12, 11 if big else 9.5, True, M["link"])
    ax.scatter(*U, marker="s", s=120, c=M["link"], edgecolors=M["halo"], zorder=9)
    lab(U, f"Candidate carrier uplink\n({up_label})", 10, -4, 10.5, True, M["link"])
    if up.get("town"):
        lab(xy(up["lat"], up["lon"]), up["town"], -30, -18, 10, False, "#DDE6E0")
    ax.set_xlim(b[0] + 400, b[2] - 400); ax.set_ylim(b[1] + 400, b[3] - 400); ax.axis("off")
    sx, sy = b[0] + 1500, b[1] + 1300
    ax.plot([sx, sx + 5000], [sy, sy], color="white", lw=4, path_effects=[pe.withStroke(linewidth=6, foreground=M["halo"])])
    lab((sx, sy), "5 km", 0, 8, 10, True)
    ax.annotate("N", xy=(b[2] - 1600, b[3] - 1400), xytext=(b[2] - 1600, b[3] - 3400), color="white", fontsize=14,
                ha="center", fontweight="bold", arrowprops=dict(arrowstyle="-|>", color="white", lw=2),
                path_effects=[pe.withStroke(linewidth=3, foreground=M["halo"])])
    fig.savefig(work / "map.jpg", dpi=130, pil_kwargs={"quality": 84})
    plt.close()

    def prof(ax, pr, ta, tb, big=True):
        d = pr["d"] / 1000
        g = pr["g"] + pr["bulge"]
        ax.fill_between(d, g.min() - 20, g, color=P["terrain"], alpha=.9, lw=0)
        ax.plot(d, pr["los"], color=P["path"], lw=1.6)
        ax.fill_between(d, pr["los"] - pr["f1"], pr["los"] + pr["f1"], color=P["fresnel"], alpha=.16, lw=0)
        ax.plot(d, pr["los"] - FRESNEL_CLEAR * pr["f1"], color=P["path"], lw=.8, ls=":")
        ax.set_xlim(0, d[-1]); ax.set_ylim(g.min() - 20, max(pr["los"].max(), g.max()) + 25)
        for s_ in ["top", "right"]:
            ax.spines[s_].set_visible(False)
        for s_ in ["left", "bottom"]:
            ax.spines[s_].set_color(P["axis"])
        ax.set_facecolor(P["bg"])
        ax.tick_params(colors=P["tick"], labelsize=9 if big else 8)
        ax.set_xlabel("km", color=P["tick"], fontsize=8); ax.set_ylabel("m ASL", color=P["tick"], fontsize=8)
        ax.set_title(f"{ta} → {tb}   {pr['D'] / 1000:.1f} km · {'Fresnel zone clear' if pr['clear'] else 'obstructed'}",
                     fontsize=10 if big else 8.5, color=P["text"], loc="left", fontweight="bold")

    fig, axs = plt.subplots(len(links), 1, figsize=(11, 2.8 * len(links)), dpi=130, squeeze=False)
    for a_, L in zip(axs[:, 0], links):
        prof(a_, L["pr"], L["a"], L["b"])
    fig.patch.set_facecolor(P["bg"]); plt.tight_layout(); fig.savefig(work / "profiles_backbone.png", facecolor=P["bg"]); plt.close()
    ll_items = [(k, L) for k, L in lodge_links.items() if L]
    rows = math.ceil(len(ll_items) / 2)
    fig, axs = plt.subplots(rows, 2, figsize=(11, 2.5 * rows), dpi=130, squeeze=False)
    for a_, (k, L) in zip(axs.flat, ll_items):
        prof(a_, L["pr"], L["a"], k, False)
    for a_ in list(axs.flat)[len(ll_items):]:
        a_.axis("off")
    fig.patch.set_facecolor(P["bg"]); plt.tight_layout(); fig.savefig(work / "profiles_lodges.png", facecolor=P["bg"]); plt.close()

    # ------------------------------------------------------------ metrics
    ll = lambda p: tuple(round(v, 5) for v in Ti.transform(*p)[::-1])
    n_clear = sum(1 for v in lodge_links.values() if v)
    metrics = dict(
        reserve=cfg["reserve"], date=cfg["date"], imagery_date=img_date, epsg=epsg,
        coverage_pct=cov_pct, area_km2=area, lodges_total=len(LX), lodges_clear=n_clear,
        uplink=dict(label=up_label, latlon=ll(U), to=up_to["name"], km=links[0]["pr"]["D"] / 1000),
        sites=[dict(name=s["name"], kind=s["kind"], elev=s["elev"], latlon=ll(s["p"]), feed=s.get("feed")) for s in sites],
        links=[dict(a=L["a"], b=L["b"], kind=L["kind"], km=L["pr"]["D"] / 1000, fresnel_ratio=L["pr"]["ratio"]) for L in links],
        lodges={k: (dict(frm=L["a"], km=L["pr"]["D"] / 1000, fresnel_ratio=L["pr"]["ratio"]) if L else None)
                for k, L in lodge_links.items()},
    )
    (work / "metrics.json").write_text(json.dumps(metrics, indent=1))
    (work / "config.json").write_text(json.dumps(cfg, indent=1))

    # ------------------------------------------------------------ document
    print("· document")
    page = build_html(cfg, brand, evidence, metrics, work)
    stem = f"{cfg['short'].replace(' ', '_')}_Reserve_Network_CTTX"
    standalone = to_standalone(page, brand)
    (out / f"{stem}.html").write_text(standalone)
    (work / "artifact.html").write_text(page)
    r = sh(CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
           f"--print-to-pdf={out / (stem + '.pdf')}", str(out / f"{stem}.html"))
    print(r.stderr.decode().strip().splitlines()[-1] if r.stderr else "")
    print(json.dumps({k: metrics[k] for k in ("lodges_clear", "lodges_total", "coverage_pct", "area_km2")}))
    print(f"✓ {out / (stem + '.pdf')}")


# ---------------------------------------------------------------- HTML
def b64(path, mt):
    if mt == "image/png":  # trim to content and shrink
        pass
    return f"data:{mt};base64," + base64.b64encode(Path(path).read_bytes()).decode()


def trim(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(int)
    cols = np.where((a < 245).any(axis=2).mean(axis=0) > .5)[0]
    rows = np.where((a < 245).any(axis=2).mean(axis=1) > .5)[0]
    if len(cols) and len(rows):
        im.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)).save(path, quality=84)


def css_tokens(t):
    return ";".join(f"--{k.replace('_', '-')}:{v}" for k, v in t.items())


def build_html(cfg, brand, ev, m, work):
    trim(work / "map.jpg")
    e = html.escape
    tpl = (HERE / "template.html").read_text()
    sites = m["sites"]
    highs = [s for s in sites if s["kind"] == "high"]
    relays = [s for s in sites if s["kind"] == "relay"]
    bb = next((l for l in m["links"] if l["kind"] == "backbone" and not l["a"].endswith("relay")), None)
    lodge_rows = "".join(
        f"<tr><td>{e(k)}</td><td>{e(v['frm']) if v else '—'}</td><td class='num'>{v['km']:.1f} km</td>"
        f"<td><span class='pill'>Clear</span></td></tr>" if v else
        f"<tr><td>{e(k)}</td><td>—</td><td class='num'>—</td><td><span class='pill warn'>Needs survey</span></td></tr>"
        for k, v in m["lodges"].items())
    backbone_text = (f"{highs[1]['name']} ({highs[1]['elev']:.0f} m) and {highs[0]['name']} ({highs[0]['elev']:.0f} m) "
                     f"sit {bb['km']:.1f} km apart with a clear link between them." if len(highs) == 2 and bb else
                     f"{highs[0]['name']} ({highs[0]['elev']:.0f} m) sees across the lodge area.")
    if relays:
        backbone_text += " " + " ".join(f"A short {r['name']} serves a lodge the ridges cannot see." for r in relays)
    site_word = f"{'two' if len(highs) == 2 else 'one'} ridge high-site{'s' if len(highs) == 2 else ''}"
    relay_word = (f" and {'one short relay' if len(relays) == 1 else f'{len(relays)} short relays'}" if relays else "")
    named = ev["named"][0]
    proof_rows = "".join(f"<div class='proof'><span class='tag'>{e(o['driver'])}</span><p>{e(o['text'])}</p></div>" for o in named["outcomes"])
    unnamed = "".join(f"<div class='callout {e(u.get('kind', 'win'))}'><span class='callout-label'>{e(u.get('title', u['label']))}</span>"
                      f"<p>{e(u['text'])}</p><cite>{e(u['label'])}</cite></div>" for u in ev["unnamed"])
    drivers = "".join(f"<div class='driver-card'><div class='driver-label'>{e(d['name'])}</div><p>{e(d['text'])}</p></div>" for d in ev["model"]["drivers"])
    today = "".join(f"<li>{e(t)}</li>" for t in cfg.get("today", []))
    pm = json.loads((HERE / "payback_model.json").read_text())
    pay_head = "".join(f"<th>R{v:,} / lodge / month<small>{e(l)}</small></th>".replace(",", " ")
                       for v, l in zip(pm["spend_per_lodge_incl_vat"], pm["spend_labels"]))
    pay_rows = ""
    for n in pm["lodge_counts"]:
        capex = pm["capex_base_incl_vat"] + pm["capex_per_lodge_incl_vat"] * n
        mrc = (pm["carrier_monthly_incl_vat"]["large" if n >= pm["carrier_monthly_incl_vat"]["large_from_lodges"] else "small"]
               + pm.get("owned_running_monthly_incl_vat", 0))
        cells = ""
        for sp in pm["spend_per_lodge_incl_vat"]:
            sav = n * sp - mrc
            yrs = capex / sav / 12 if sav > 0 else None
            if yrs is None or yrs * 12 > pm["cap_months"]:
                cells += "<td class='yr'>5+ yrs</td>"
            else:
                good = " good" if yrs * 12 <= pm["threshold_months"] else ""
                label = "under 1 yr" if yrs < 1 else f"{yrs:.1f} yrs"
                cells += f"<td class='yr{good}'>{label}</td>"
        pay_rows += f"<tr><td>{n} lodges</td>{cells}</tr>"
    positions = "; ".join(f"{s['name']} {s['latlon'][0]:.5f}, {s['latlon'][1]:.5f}" for s in sites)
    rep = {
        "TITLE": f"{e(cfg['short'])} Reserve Network",
        "FONT_CSS": brand["fonts"]["google_css"],
        "LIGHT": css_tokens(brand["tokens"]),
        "F_DISPLAY": brand["fonts"]["display"], "F_BODY": brand["fonts"]["body"], "F_MONO": brand["fonts"]["mono"],
        "RESERVE": e(cfg["reserve"]), "SHORT": e(cfg["short"]), "PREPARED_FOR": e(cfg["prepared_for"]),
        "DATE": dt.date.fromisoformat(cfg["date"]).strftime("%-d %B %Y"), "IMG_DATE": m["imagery_date"],
        "MAP": b64(work / "map.jpg", "image/jpeg"),
        "PROF1": b64(work / "profiles_backbone.png", "image/png"), "PROF2": b64(work / "profiles_lodges.png", "image/png"),
        "N_CLEAR": str(m["lodges_clear"]), "N_TOTAL": str(m["lodges_total"]),
        "N_HIGH": str(len(highs)), "N_RELAY": str(len(relays)),
        "SITES_PHRASE": site_word + relay_word,
        "COV": f"{m['coverage_pct']:.0f}", "AREA": f"{m['area_km2']:.0f}",
        "UPKM": f"{m['uplink']['km']:.1f}", "UPLABEL": e(m["uplink"]["label"]), "UPTO": e(m["uplink"]["to"]),
        "BACKBONE_TEXT": e(backbone_text), "CONTEXT": e(cfg.get("context", "")),
        "SECURITY_NOTE": e(cfg.get("security_note", "Gate cameras, fence and trigger alarms, and after-hours communication for field teams. When something happens at night, the right people know in minutes.")),
        "TODAY": today, "ROWS": lodge_rows,
        "PROOF_NAME": e(named["name"]), "PROOF_SCALE": e(named["scale"]),
        "PROOF_BEFORE": e(named["before"]), "PROOF_AFTER": e(named["after"]), "PROOF_ROWS": proof_rows,
        "UNNAMED": unnamed, "MODEL_HEAD": e(ev["model"]["headline"]), "MODEL_PRINCIPLE": e(ev["model"]["principle"]),
        "DRIVERS": drivers, "PAY_HEAD": pay_head, "PAY_ROWS": pay_rows, "POSITIONS": e(positions), "UPLL": f"{m['uplink']['latlon'][0]:.5f}, {m['uplink']['latlon'][1]:.5f}",
        "CO_NAME": e(brand["company"]["name"]), "CO_CONTACT": e(brand["company"]["contact"]),
        "CO_EMAIL": e(brand["company"]["email"]), "CO_PHONE": e(brand["company"]["phone"]), "CO_WEB": e(brand["company"].get("web", "")),
    }
    for k, v in rep.items():
        tpl = tpl.replace("{{" + k + "}}", v)
    left = re.findall(r"\{\{[A-Z0-9_]+\}\}", tpl)
    assert not left, left
    return tpl


def to_standalone(page, brand):
    css = sh("curl", "-s", "-A", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
             brand["fonts"]["google_css"]).stdout.decode()
    faces = []
    for sub, blk in re.findall(r"/\* ([^*]+) \*/\s*(@font-face\s*\{[^}]+\})", css):
        if sub.strip() == "latin":
            u = re.search(r"url\((https[^)]+)\)", blk).group(1)
            faces.append(blk.replace(u, "data:font/woff2;base64," + base64.b64encode(sh("curl", "-s", u).stdout).decode()))
    page = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]+>', "<style>" + "\n".join(faces) + "</style>", page)
    page = re.sub(r'<link rel="preconnect"[^>]+>', "", page)
    head, body = page.split("<!--BODY-->", 1)
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">' + head +
            "<style>@page{size:A4;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}"
            "@media print{html,body{background:var(--bg)}.driver-card,.callout,.stat-grid,.proof-grid,.lens,figure,.tablewrap,.steps li{break-inside:avoid}"
            ".section-head{break-after:avoid}}</style></head><body>" + body + "</body></html>")


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else HERE / "reserves" / "amakhala.json")
