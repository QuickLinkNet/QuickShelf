"""Creates a small, realistic demo archive for trying the dashboard (needs: pip install pymupdf pillow).

    python scripts/make_demo_archive.py [target-folder]      # default: demo/archive

Contains documents, photos, duplicates, cryptic names, empty folders and a few files waiting in the inbox.
Everything is generated - no personal data.
"""
import os
import pathlib
import random
import shutil
import sys
import time

import fitz
from PIL import Image, ImageDraw, ImageFilter

root = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent / 'demo' / 'archive'
if root.exists():
    shutil.rmtree(root)
root.mkdir(parents=True)
rnd = random.Random(42)
NOW = time.time()
DAY = 86400


def stamp(path, days_ago):
    t = NOW - days_ago * DAY - rnd.randint(0, 80000)
    os.utime(path, (t, t))


def pdf(rel, title, lines, days_ago):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    d = fitz.open()
    page = d.new_page()
    page.insert_text((72, 90), title, fontsize=20)
    page.insert_textbox(fitz.Rect(72, 130, 520, 700), '\n'.join(lines), fontsize=11)
    d.save(str(p))
    stamp(p, days_ago)
    return p


def text(rel, body, days_ago):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(body, encoding='utf-8')
    stamp(p, days_ago)
    return p


PALETTES = [((20, 60, 120), (240, 140, 60)), ((10, 90, 70), (200, 230, 120)), ((70, 20, 100), (250, 120, 160)), ((30, 30, 50), (120, 180, 255)), ((120, 60, 20), (255, 210, 120))]


def photo(rel, days_ago, w=900, h=600):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    top, bottom = rnd.choice(PALETTES)
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        f = y / h
        row = tuple(int(top[i] * (1 - f) + bottom[i] * f) for i in range(3))
        for x in range(w):
            px[x, y] = row
    d = ImageDraw.Draw(im)
    for _ in range(rnd.randint(3, 7)):
        cx, cy, r = rnd.randint(0, w), rnd.randint(h // 3, h), rnd.randint(40, 220)
        shade = tuple(max(0, min(255, c + rnd.randint(-50, 50))) for c in rnd.choice(PALETTES)[0])
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=shade)
    im = im.filter(ImageFilter.GaussianBlur(6))
    im.save(p, quality=82)
    stamp(p, days_ago)
    return p


# ---- documents ------------------------------------------------------------------------------------
for i, year in enumerate(range(2019, 2027)):
    pdf(f'01_Documents/Invoices/Telecom/{year}-05-10_Telecom_Invoice.pdf', 'Telecom invoice', [f'Mobile plan {year}', 'Amount: 39.99 EUR', 'Customer number 4711-0815'], (2026 - year) * 365 + 120)
    pdf(f'01_Documents/Insurance/Liability/{year}-01-02_Liability_Premium.pdf', 'Liability insurance', [f'Premium notice {year}', 'Annual premium: 84.50 EUR'], (2026 - year) * 365 + 300)
    pdf(f'01_Documents/Taxes/{year}/Tax_Assessment_{year - 1}.pdf', 'Income tax assessment', [f'Tax year {year - 1}', 'Refund: 412.30 EUR'], (2026 - year) * 365 + 200)
pdf('01_Documents/Contracts/Rental_Agreement_Apartment.pdf', 'Rental agreement', ['Between landlord and tenant', 'Notice period: 3 months', 'Deposit: 2 monthly rents'], 1900)
pdf('01_Documents/Contracts/Gym_Membership.pdf', 'Gym membership', ['Monthly fee 29.90 EUR', 'Minimum term 12 months'], 640)
pdf('01_Documents/Health/Vaccination_Record.pdf', 'Vaccination record', ['Tetanus 2021', 'Influenza 2025'], 420)
pdf('01_Documents/Work/Applications/Cover_Letter_2025.pdf', 'Cover letter', ['Dear hiring team,', 'I would like to apply for the position of ...'], 300)
pdf('01_Documents/Work/Certificates/Certificate_Cloud_Fundamentals.pdf', 'Certificate', ['Cloud Fundamentals', 'Passed with distinction'], 800)
text('01_Documents/Notes/Ideas.md', '# Ideas\n\n- Digitise old photos\n- Switch electricity provider\n- Renew passport (deadline 31 March)\n', 25)
text('01_Documents/Notes/Shopping_list.txt', 'Milk\nBread\nCoffee beans\n', 4)
text('01_Documents/Finance/Budget_2026.csv', 'month,income,expenses\n2026-01,3200,2410\n2026-02,3200,2290\n2026-03,3250,2510\n', 40)

# ---- photos ---------------------------------------------------------------------------------------
albums = [('Summer_Trip_Italy', 2023, 24), ('Family_Christmas', 2024, 14), ('Hiking_Alps', 2025, 18), ('City_Weekend_Berlin', 2022, 12), ('Birthday_Party', 2021, 8)]
for name, year, count in albums:
    for n in range(count):
        photo(f'02_Photos_Videos/{year}_{name}/IMG_{rnd.randint(1000, 9999)}.jpg', (2026 - year) * 365 + rnd.randint(0, 40))
photo('02_Photos_Videos/Screenshots/Screenshot 2026-01-14 at 09.12.33.png', 280, 1200, 700)
photo('02_Photos_Videos/Screenshots/Screenshot 2026-02-02 at 18.40.01.png', 260, 1200, 700)

# ---- business / 3D / tech -------------------------------------------------------------------------
text('03_Business/Projects/Website_Relaunch/Briefing.md', '# Website relaunch\n\nGoal: faster, cleaner, accessible.\n', 90)
pdf('03_Business/Projects/Website_Relaunch/Offer_Agency.pdf', 'Offer', ['Total: 4,800 EUR', 'Delivery: 6 weeks'], 85)
pdf('03_Business/Accounting/2025_Annual_Report.pdf', 'Annual report 2025', ['Revenue 62,000 EUR', 'Costs 41,500 EUR'], 150)
for n in range(6):
    text(f'04_3D/Printing/Own_Designs/part_{n + 1}.stl', 'solid part\n' + 'facet normal 0 0 1\n' * 60 + 'endsolid\n', 40 + n * 17)
text('05_Tech/Network/Router_Settings.txt', 'Router 192.168.0.1\nDHCP range .100-.200\n(Example data)\n', 700)
text('05_Tech/Manuals/Printer_Manual.txt', 'Printer manual (placeholder)\n', 1200)

# ---- duplicates, cryptic names, empty folders -----------------------------------------------------
dup = pdf('01_Documents/Invoices/Online_Shop/Invoice_Headphones.pdf', 'Shop invoice', ['Headphones', '129.00 EUR', 'Order 99-1234'], 200)
shutil.copy2(dup, root / '01_Documents' / 'Invoices' / 'Invoice_Headphones (1).pdf')
pdf('01_Documents/Scans/Scan0042.pdf', 'Scan', ['Doctor appointment confirmation'], 90)
pdf('01_Documents/Scans/Scan0043.pdf', 'Scan', ['Parking permit'], 88)
pdf('01_Documents/Scans/document (2).pdf', 'Document', ['Warranty card washing machine'], 500)
for d in ('06_Software_Installers/Old', '01_Documents/Archive_2015/Empty'):
    (root / d).mkdir(parents=True, exist_ok=True)

# ---- inbox ----------------------------------------------------------------------------------------
pdf('99_Inbox/Invoice_Telecom_2026.pdf', 'Telecom invoice 2026', ['Mobile plan May 2026', 'Amount: 41.99 EUR'], 3)
pdf('99_Inbox/Scan0101.pdf', 'Scan', ['Liability insurance premium adjustment 2026'], 2)
pdf('99_Inbox/Notice.pdf', 'Tax notice', ['Income tax assessment 2025', 'Refund: 388.10 EUR'], 1)
photo('99_Inbox/IMG_5555.jpg', 1)
text('99_Inbox/note.txt', 'Call the tax advisor tomorrow\n', 0)

count = sum(len(files) for _, _, files in os.walk(root))
print(f'Demo archive ready: {count} files in {root}')
