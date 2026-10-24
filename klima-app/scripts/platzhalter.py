# Erzeugt neutrale Platzhalter-Produktbilder (PNG, transparenter Hintergrund).
# Aufruf: python3 scripts/platzhalter.py   (benötigt Pillow)
from PIL import Image, ImageDraw
S = 4  # Überabtastung für glatte Kanten
def neu(w, h): return Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
def fertig(img, name):
    img.resize((img.width // S, img.height // S), Image.LANCZOS).save(f"assets/geraete/{name}.png")
def rr(d, box, r, fill, outline=(150, 156, 165, 255)):
    d.rounded_rectangle([v * S for v in box], r * S, fill=fill, outline=outline, width=2 * S)
WEISS, GRAU, DUNKEL = (246, 248, 250, 255), (220, 224, 230, 255), (90, 98, 110, 255)

def wand():
    i = neu(400, 130); d = ImageDraw.Draw(i)
    rr(d, (6, 6, 394, 110), 22, WEISS)
    rr(d, (20, 84, 380, 104), 8, GRAU)
    for x in range(40, 360, 22): d.line([x * S, 92 * S, (x + 12) * S, 92 * S], fill=DUNKEL, width=2 * S)
    rr(d, (330, 24, 372, 40), 4, (60, 66, 76, 255)); fertig(i, "wand")

def kassette():
    i = neu(300, 300); d = ImageDraw.Draw(i)
    rr(d, (6, 6, 294, 294), 14, WEISS); rr(d, (50, 50, 250, 250), 10, GRAU)
    for k in range(4):
        rr(d, (60 + k * 3, 60 + k * 3, 240 - k * 3, 240 - k * 3), 6, GRAU if k % 2 else WEISS)
    fertig(i, "kassette")

def truhe():
    i = neu(360, 240); d = ImageDraw.Draw(i)
    rr(d, (6, 6, 354, 234), 14, WEISS); rr(d, (24, 24, 336, 80), 8, GRAU)
    for y in range(110, 216, 14): d.line([36 * S, y * S, 324 * S, y * S], fill=DUNKEL, width=2 * S)
    fertig(i, "truhe")

def kanal():
    i = neu(400, 140); d = ImageDraw.Draw(i)
    rr(d, (6, 20, 394, 120), 6, (200, 205, 212, 255)); rr(d, (360, 6, 394, 134), 4, GRAU)
    for y in range(36, 110, 14): d.line([20 * S, y * S, 340 * S, y * S], fill=(170, 176, 184, 255), width=2 * S)
    fertig(i, "kanal")

def aussen():
    i = neu(360, 300); d = ImageDraw.Draw(i)
    rr(d, (6, 6, 354, 294), 12, (232, 235, 239, 255))
    d.ellipse([60 * S, 50 * S, 300 * S, 250 * S], fill=GRAU, outline=DUNKEL, width=3 * S)
    for k in range(6):
        d.pieslice([100 * S, 90 * S, 260 * S, 210 * S], k * 60, k * 60 + 35, fill=DUNKEL)
    d.ellipse([160 * S, 135 * S, 200 * S, 165 * S], fill=WEISS, outline=DUNKEL, width=2 * S)
    fertig(i, "aussen")

def multisplit():
    i = neu(420, 320); d = ImageDraw.Draw(i)
    rr(d, (6, 6, 414, 314), 12, (232, 235, 239, 255))
    for cx in (130, 290):
        d.ellipse([(cx - 80) * S, 60 * S, (cx + 80) * S, 220 * S], fill=GRAU, outline=DUNKEL, width=3 * S)
        for k in range(6):
            d.pieslice([(cx - 50) * S, 90 * S, (cx + 50) * S, 190 * S], k * 60, k * 60 + 35, fill=DUNKEL)
    rr(d, (60, 250, 360, 290), 6, GRAU); fertig(i, "multisplit")

for f in (wand, kassette, truhe, kanal, aussen, multisplit): f()
