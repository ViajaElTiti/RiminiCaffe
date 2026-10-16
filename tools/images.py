"""Genera WebP responsive desde los escaneos originales.
Uso: PYTHONPATH=<ruta a pillow> python3 tools/images.py
Recorta ~3% por borde (marco negro del escaneo) y exporta 480/800/1200 px de ancho."""
import os, json
from PIL import Image
B = "/Users/admin/Documents/RiminiCaffe/Rimini Caffe Branding/"
F, C = B + "Analogs_Food/", B + "Analogs_coffee/"
SRC = {
 "pizza-mortadella": F+"Mortadela.JPG",
 "pizza-margherita": F+"Margarita.JPG",
 "pizza-diavola": F+"Salami.JPG",
 "pizza-truffle": F+"Trufada 3.JPG",
 "pizza-vegetarian": F+"Vegetarian 1.JPG",
 "focaccia-mortadella": F+"Mortadella.JPG",
 "focaccia-prosciutto": F+"Prosciuto di Parma.JPG",
 "focaccia-vitello": F+"Vitello Tomate.JPG",
 "focaccia-vegetarian": F+"Vegetarian 3.JPG",
 "focaccia-beef": F+"Rimini Beef2.JPG",
 "serve-pizza": F+"000024.JPG",
 "serve-prosciutto": F+"000029.JPG",
 "bowl": F+"000014.JPG",
 "latte-heart": C+"rimini_fotos 38.jpg",
 "latte-art": C+"rimini_fotos 40.jpg",
 "matcha-marble": C+"rimini_fotos 51.jpg",
 "matcha-cup": C+"rimini_fotos 34.jpg",
 "espresso": C+"rimini_fotos 22.jpg",
 "iced-window": C+"rimini_fotos 3.jpg",
 "mug-green": C+"rimini_fotos 17.jpg",
 "barista-pour": C+"rimini_fotos 45.jpg",
 "barista-grinder": C+"rimini_fotos 29.jpg",
 "barista-wide": C+"rimini_fotos 50.jpg",
 "barista-hands": C+"rimini_fotos 46.jpg",
 "window-sip": C+"rimini_fotos 27.jpg",
}
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "img")
meta = {}
for name, path in SRC.items():
    im = Image.open(path).convert("RGB")
    w, h = im.size
    mx, my = int(w*.045), int(h*.045)
    im = im.crop((mx, my, w-mx, h-my)); w, h = im.size
    meta[name] = {"w": w, "h": h}
    for tw in (480, 800, 1200):
        if tw > w: continue
        r = im.resize((tw, round(h*tw/w)), Image.LANCZOS)
        r.save(os.path.join(OUT, f"{name}-{tw}.webp"), "WEBP", quality=74, method=6)
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"))
print(len(SRC), "ok")
