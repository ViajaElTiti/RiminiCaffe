"""Genera og.png (1200x630) y apple-touch-icon.png (180x180) con los logos oficiales sobre verde #00291B."""
import os
from PIL import Image
B = "/Users/admin/Documents/RiminiCaffe/Rimini Caffe Branding/Logo PNG/"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "static")
G = (0, 41, 27)
def put(canvas, logo_path, width):
    lg = Image.open(logo_path).convert("RGBA")
    h = round(lg.height * width / lg.width)
    lg = lg.resize((width, h), Image.LANCZOS)
    canvas.alpha_composite(lg, ((canvas.width - width)//2, (canvas.height - h)//2))
og = Image.new("RGBA", (1200, 630), G + (255,)); put(og, B + "Layer_1.png", 780); og.convert("RGB").save(os.path.join(OUT, "og.png"), optimize=True)
ic = Image.new("RGBA", (180, 180), G + (255,)); put(ic, B + "Layer_1-4.png", 128); ic.convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)
