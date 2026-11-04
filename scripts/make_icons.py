"""Renders the QuickShelf logo (same geometry as public/favicon.svg) to PNG icons and the GitHub social preview.

    pip install pillow
    python scripts/make_icons.py
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SS = 4  # supersampling factor


def gradient(size):
    """Diagonal #818cf8 -> #4338ca."""
    a, b = (0x81, 0x8C, 0xF8), (0x43, 0x38, 0xCA)
    im = Image.new('RGB', (size, size))
    px = im.load()
    for y in range(size):
        for x in range(size):
            f = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * f) for i in range(3))
    return im


def logo(size, rounded=True, art=1.0):
    """The tile. `art` < 1 shrinks the symbol (maskable icons need a safe zone)."""
    s = size * SS
    im = gradient(s).convert('RGBA')
    d = ImageDraw.Draw(im)
    k = s / 64
    c = lambda v: 32 * k + (v - 32) * k * art  # map 64-grid coordinate into the (scaled) art area

    r = 15 * k * art
    cx = cy = c(29)
    d.ellipse((cx - r - 2.75 * k * art, cy - r - 2.75 * k * art, cx + r + 2.75 * k * art, cy + r + 2.75 * k * art), outline='white', width=max(1, round(5.5 * k * art)))
    for y, x2 in ((25.5, 35.5), (30, 35.5), (34.5, 30.5)):
        d.line((c(22.5), c(y), c(x2), c(y)), fill=(255, 255, 255, 230), width=max(1, round(2.6 * k * art)))
        for x in (22.5, x2):
            rr = 1.3 * k * art
            d.ellipse((c(x) - rr, c(y) - rr, c(x) + rr, c(y) + rr), fill=(255, 255, 255, 230))
    w = 6.5 * k * art
    d.line((c(40.5), c(40.5), c(50.5), c(50.5)), fill='#67e8f9', width=round(w))
    for x in (40.5, 50.5):
        d.ellipse((c(x) - w / 2, c(x) - w / 2, c(x) + w / 2, c(x) + w / 2), fill='#67e8f9')

    if rounded:
        mask = Image.new('L', (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=16 * k, fill=255)
        im.putalpha(mask)
    return im.resize((size, size), Image.LANCZOS)


def font(bold, px):
    for name in (('segoeuib.ttf' if bold else 'segoeui.ttf'), ('arialbd.ttf' if bold else 'arial.ttf'), 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default()


def social(path):
    w, h = 1280, 640
    im = Image.new('RGB', (w, h), '#0b1020')
    d = ImageDraw.Draw(im)
    for i in range(h):  # soft glow
        f = i / h
        d.line((0, i, w, i), fill=(int(11 + 18 * (1 - f)), int(16 + 14 * (1 - f)), int(32 + 50 * (1 - f))))
    mark = logo(300)
    im.paste(mark, (110, 170), mark)
    d.text((470, 195), 'QuickShelf', font=font(True, 108), fill='white')
    d.text((474, 330), 'Your NAS archive, searchable and beautiful.', font=font(False, 40), fill='#c7d2fe')
    d.text((474, 395), 'No Docker  ·  PHP + SQLite  ·  Login included  ·  EN / DE', font=font(False, 28), fill='#818cf8')
    im.save(path)


if __name__ == '__main__':
    pub = ROOT / 'public'
    logo(192).save(pub / 'icon-192.png')
    logo(512).save(pub / 'icon-512.png')
    logo(512, rounded=False, art=0.78).save(pub / 'icon-maskable-512.png')
    logo(180, rounded=False).save(pub / 'apple-touch-icon.png')
    (ROOT / 'docs').mkdir(exist_ok=True)
    social(ROOT / 'docs' / 'social-preview.png')
    print('icons written')
