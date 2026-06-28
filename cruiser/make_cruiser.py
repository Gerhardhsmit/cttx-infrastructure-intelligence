from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1080, 1080
img = Image.new('RGB', (W, H), (0, 0, 0))
draw = ImageDraw.Draw(img)

# Dark gradient background (dark olive/charcoal)
for y in range(H):
    ratio = y / H
    r = int(18 + ratio * 30)
    g = int(20 + ratio * 25)
    b = int(10 + ratio * 15)
    draw.rectangle([(0, y), (W, y+1)], fill=(r, g, b))

# Golden accent bar
draw.rectangle([(0, 0), (W, 8)], fill=(255, 165, 0))

# Title
try:
    font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 52)
    font_med = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 38)
    font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 26)
    font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 20)
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 28)
except:
    font_big = font_med = font_sm = font_xs = font_title = ImageFont.load_default()

# Draw speedometer arc
cx, cy, r = 540, 360, 220

# Background circle
draw.ellipse([(cx-r-10, cy-r-10), (cx+r+10, cy+r+10)], fill=(20, 25, 20), outline=(40, 50, 35), width=2)

# Colored arc (red -> yellow -> green -> cyan)
arc_colors = [
    (0, 180, (220, 30, 30)),
    (180, 270, (255, 165, 0)),
    (270, 330, (50, 200, 50)),
    (330, 360, (0, 220, 220)),
]

def draw_arc_thick(d, cx, cy, r, start_deg, end_deg, color, thickness=18):
    for t in range(-thickness//2, thickness//2):
        rad = r + t
        d.arc([(cx-rad, cy-rad), (cx+rad, cy+rad)], start=start_deg, end=end_deg, fill=color, width=2)

# Speedometer goes from -225deg to 45deg (270deg sweep) for 0-100 Mbps
# Map 0-100 Mbps -> PIL arc angles
# PIL: 0=right, 90=bottom, going clockwise
# We want gauge from bottom-left to bottom-right going clockwise
# Start angle: 135 (bottom-left), End angle: 45 (bottom-right) going clockwise = 270 degree sweep

speed = 85.5
angle_start = 135  # PIL degrees
angle_sweep = 270
angle_for_speed = angle_start + (speed / 100.0) * angle_sweep

# Draw full gauge background (grey)
for thickness_offset in range(-9, 10):
    rad = r + thickness_offset
    draw.arc([(cx-rad, cy-rad), (cx+rad, cy+rad)], start=135, end=45, fill=(40, 45, 35), width=1)

# Draw colored gauge up to current speed
segments = [
    (0, 20, (220, 30, 30)),    # Red: 0-20%
    (20, 40, (220, 100, 0)),   # Orange: 20-40%
    (40, 60, (200, 165, 0)),   # Yellow: 40-60%
    (60, 80, (80, 180, 50)),   # Light green: 60-80%
    (80, 100, (0, 220, 180)),  # Cyan: 80-100%
]

for seg_start_pct, seg_end_pct, color in segments:
    seg_start_deg = 135 + (seg_start_pct / 100.0) * 270
    seg_end_pct_capped = min(seg_end_pct, speed)
    if seg_end_pct_capped <= seg_start_pct:
        break
    seg_end_deg = 135 + (seg_end_pct_capped / 100.0) * 270
    for thickness_offset in range(-9, 10):
        rad = r + thickness_offset
        draw.arc([(cx-rad, cy-rad), (cx+rad, cy+rad)], start=seg_start_deg, end=seg_end_deg, fill=color, width=1)

# Needle
needle_angle_deg = 135 + (speed / 100.0) * 270
needle_rad = math.radians(needle_angle_deg)
nx = cx + int((r - 30) * math.cos(needle_rad))
ny = cy + int((r - 30) * math.sin(needle_rad))
draw.line([(cx, cy), (nx, ny)], fill=(255, 255, 255), width=3)
draw.ellipse([(cx-8, cy-8), (cx+8, cy+8)], fill=(200, 200, 200))

# Center text
draw.text((cx, cy - 50), "COMPLETE", fill=(0, 220, 180), font=font_sm, anchor="mm")
draw.text((cx, cy + 10), "85.5", fill=(255, 255, 255), font=font_big, anchor="mm")
draw.text((cx, cy + 60), "Mbps", fill=(180, 180, 180), font=font_sm, anchor="mm")

# Tick marks
for i in range(0, 101, 10):
    tick_angle_deg = 135 + (i / 100.0) * 270
    tick_rad = math.radians(tick_angle_deg)
    inner = r - 30
    outer = r + 15
    x1 = cx + int(inner * math.cos(tick_rad))
    y1 = cy + int(inner * math.sin(tick_rad))
    x2 = cx + int(outer * math.cos(tick_rad))
    y2 = cy + int(outer * math.sin(tick_rad))
    draw.line([(x1,y1),(x2,y2)], fill=(120,120,100), width=2)

# Stat boxes
stats = [
    ("↓", "85.5", "DOWNLOAD\nMbps", (0, 180, 140)),
    ("↑", "81.2", "UPLOAD\nMbps", (0, 160, 220)),
    ("◉", "56", "PING\nms", (255, 190, 0)),
    ("~", "21", "JITTER\nms", (180, 180, 100)),
]

box_y = 660
box_w = 220
box_h = 120
total_w = len(stats) * box_w + (len(stats)-1) * 12
start_x = (W - total_w) // 2

for i, (icon, val, label, color) in enumerate(stats):
    bx = start_x + i * (box_w + 12)
    # Box background
    draw.rectangle([(bx, box_y), (bx+box_w, box_y+box_h)], fill=(25, 30, 20), outline=color, width=2)
    # Icon + value
    draw.text((bx + box_w//2, box_y + 25), icon, fill=color, font=font_sm, anchor="mm")
    draw.text((bx + box_w//2, box_y + 65), val, fill=(255, 255, 255), font=font_med, anchor="mm")
    lines = label.split('\n')
    for j, line in enumerate(lines):
        draw.text((bx + box_w//2, box_y + 90 + j*18), line, fill=(140, 140, 120), font=font_xs, anchor="mm")

# Status bar
bar_y = 810
draw.rectangle([(50, bar_y), (W-50, bar_y+4)], fill=(0, 180, 120))
draw.text((W//2, bar_y + 25), "TEST COMPLETE — CRUISING SPEED!", fill=(0, 200, 140), font=font_title, anchor="mm")

# ALL SYSTEMS GO box
box2_y = 880
draw.rectangle([(80, box2_y), (W-80, box2_y+100)], fill=(15, 25, 15), outline=(0, 180, 80), width=2)
draw.text((W//2, box2_y + 30), "⊙  ALL SYSTEMS GO", fill=(0, 220, 100), font=font_med, anchor="mm")
draw.text((W//2, box2_y + 70), "You're cruising like a Land Cruiser on fresh tar.", fill=(140, 160, 130), font=font_xs, anchor="mm")

# CRUISER branding
draw.rectangle([(0, 0), (W, 70)], fill=(10, 12, 8))
draw.text((W//2, 35), "CRUISER", fill=(0, 200, 140), font=font_big, anchor="mm")
draw.text((20, 580), "CTTX | Authorised Vodacom Business Reseller", fill=(80, 80, 60), font=font_xs, anchor="lm")

out_path = "/sessions/zealous-wizardly-lamport/mnt/outputs/CRUISER_85Mbps_Complete.png"
img.save(out_path, "PNG")
print(f"Saved: {out_path}")
print(f"Size: {os.path.getsize(out_path)} bytes")
