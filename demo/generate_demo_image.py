"""Generate the DEMO input image for DEPTHWIZARD.

Creates ``demo/demo_rgb.jpg`` - a synthetic, clearly non-georeferenced
optical-style RGB image that resembles a small aerial scene (hills, valley,
river, fields). It is used by the "Load Demo" button so the whole UI can be
demonstrated without any external data.

This is SYNTHETIC DEMO DATA, not a real satellite image.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def make_demo_image(size: int = 1024, seed: int = 42) -> Image.Image:
    rng = np.random.default_rng(seed)
    w = h = int(size)

    # ---- elevation-like base (all strictly 2-D float32) ----------------------
    yy, xx = np.mgrid[0:h, 0:w]
    xx = xx.astype(np.float32)
    yy = yy.astype(np.float32)

    gauss1 = np.exp(-((xx - 0.72 * w) ** 2 + (yy - 0.30 * h) ** 2) / (2 * 90.0 ** 2))
    gauss2 = np.exp(-((xx - 0.28 * w) ** 2 + (yy - 0.62 * h) ** 2) / (2 * 110.0 ** 2))
    field = (
        0.30 * np.sin(xx / 180.0 + 0.5) * np.cos(yy / 220.0)
        + 0.22 * np.sin(xx / 70.0) * np.sin(yy / 90.0 + 1.0)
        + 0.18 * gauss1
        - 0.15 * gauss2
    ).astype(np.float32)
    assert field.shape == (h, w)
    field = (field - field.min()) / (field.max() - field.min())

    # ---- base colour by "land use" -------------------------------------------
    vegetation = (np.clip(field, 0.0, 1.0) ** 1.2).astype(np.float32)
    ripple_r = (10.0 * np.sin(xx / 40.0)).astype(np.float32)
    ripple_g = (15.0 * np.sin(xx / 25.0)).astype(np.float32)
    r = np.clip(48.0 + 70.0 * vegetation + ripple_r, 0.0, 255.0)
    g = np.clip(58.0 + 120.0 * vegetation + ripple_g, 0.0, 255.0)
    b = np.clip(42.0 + 70.0 * vegetation, 0.0, 255.0)
    rgb = np.stack([r, g, b], axis=-1).astype(np.uint8)
    assert rgb.shape == (h, w, 3)

    # ---- river -----------------------------------------------------------------
    img = Image.fromarray(rgb)
    draw = ImageDraw.Draw(img, "RGBA")
    pts = [(w * 0.05, h * 0.78), (w * 0.30, h * 0.62), (w * 0.52, h * 0.70),
           (w * 0.74, h * 0.55), (w * 0.96, h * 0.62)]
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i + 1]], fill=(40, 90, 160, 190), width=int(w * 0.018))
    img = img.filter(ImageFilter.GaussianBlur(2))

    # ---- fields / patches ---------------------------------------------------------
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(24):
        cx, cy = rng.integers(0, w), rng.integers(0, h)
        cw = rng.integers(30, 110)
        ch = rng.integers(30, 110)
        shade = rng.integers(0, 3)
        color = [(205, 175, 95, 45), (110, 130, 75, 45), (150, 120, 85, 45)][shade]
        draw.rectangle([cx, cy, cx + cw, cy + ch], fill=color)

    # ---- small "settlement" clusters ---------------------------------------------
    for _ in range(6):
        bx = int(rng.integers(w * 0.15, w * 0.85))
        by = int(rng.integers(h * 0.15, h * 0.85))
        for _ in range(rng.integers(6, 16)):
            draw.rectangle(
                [bx, by, bx + int(w * 0.012), by + int(h * 0.012)],
                fill=(185, 185, 175, 230),
            )
            bx += int(w * 0.016) + int(rng.integers(0, 6))
            by += int(rng.integers(-4, 6))

    img = img.filter(ImageFilter.GaussianBlur(1))
    return img.convert("RGB")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    out = Path(__file__).resolve().parent / "demo_rgb.jpg"
    img = make_demo_image()
    img.save(out, "JPEG", quality=90)
    print(f"Demo image written to: {out}")
    print(f"Size: {img.width}x{img.height}")