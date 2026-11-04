"""Creates a tiny throw-away archive for trying the write features (needs: pip install pymupdf pillow)."""
import os, random, io
import fitz
from PIL import Image, ImageDraw

import pathlib
root = str(pathlib.Path(__file__).resolve().parent.parent / '.devdata-test' / 'archive')
os.makedirs(root, exist_ok=True)

def pdf(path, title, body):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    d = fitz.open()
    p = d.new_page()
    p.insert_text((72, 90), title, fontsize=20)
    p.insert_textbox(fitz.Rect(72, 130, 520, 700), body, fontsize=11)
    d.save(path)

def img(path, color, label):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.new('RGB', (1200, 800), color)
    ImageDraw.Draw(im).text((40, 40), label, fill='white')
    im.save(path, quality=85)

# schon einsortiert (damit Vorschläge funktionieren)
for y in (2023, 2024):
    pdf(f'{root}/01_Dokumente/Rechnungen/Telekom/{y}-05-10_Telekom_Rechnung.pdf', 'Telekom Rechnung', f'Rechnung {y} Mobilfunk, Betrag 39,99 EUR')
pdf(f'{root}/01_Dokumente/Versicherungen/Haftpflicht/2024-01-02_Haftpflicht_Beitrag.pdf', 'Haftpflicht', 'Beitragsrechnung Haftpflichtversicherung')
pdf(f'{root}/01_Dokumente/Steuer/2025/Steuerbescheid_2024.pdf', 'Steuerbescheid', 'Einkommensteuerbescheid 2024')
img(f'{root}/02_Fotos_Videos/Urlaub_2024/IMG_0001.jpg', (30, 90, 160), 'Strand')
img(f'{root}/02_Fotos_Videos/Urlaub_2024/IMG_0002.jpg', (160, 90, 30), 'Berge')

# Eingang
pdf(f'{root}/99_Eingang/Rechnung_Telekom_2025.pdf', 'Telekom Rechnung 2025', 'Rechnung Mobilfunk Mai 2025 Betrag 41,99 EUR')
pdf(f'{root}/99_Eingang/Scan0042.pdf', 'Scan 42', 'Beitragsanpassung Haftpflicht 2025')
pdf(f'{root}/99_Eingang/Bescheid.pdf', 'Bescheid', 'Steuerbescheid Einkommensteuer 2025')
img(f'{root}/99_Eingang/IMG_5555.jpg', (60, 130, 60), 'Wald')
open(f'{root}/99_Eingang/notiz.txt', 'w', encoding='utf-8').write('Rückruf Steuerberater nicht vergessen\n')
print('ok', sum(len(f) for _, _, f in os.walk(root)), 'Dateien')
