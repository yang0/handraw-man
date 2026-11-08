#!/usr/bin/env python3
"""Slice existing Bamboo-001 PNG pixels into draft layers. NEVER draws character strokes."""
from __future__ import annotations
import argparse
from io import BytesIO
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BATCH = ROOT / "assets/candidates/phase1-fullbody-2026-11-08"
SOURCE = BATCH / "processed/bamboo-001-transparent.png"
PARTS = BATCH / "parts/bamboo-001"
PART_NAMES = ("head", "torso", "left-arm", "right-arm", "left-leg", "right-leg")
CUT_HEAD, CUT_LEGS, CUT_ARMS_START, CUT_ARMS_END, CENTER, PADDING = 246, 700, 300, 900, 197, 12
BOUNDARY_CONTROLS = (
    (300, 142, 252), (380, 147, 247), (520, 131, 263),
    (690, 105, 289), (900, 103, 291)
)
SOURCE_ANCHORS = {
    "head": {"neck": (197, 228), "head": (197, 115)},
    "torso": {"neck": (197, 245), "shoulderL": (139, 321), "shoulderR": (255, 321),
              "hipL": (146, 695), "hipR": (247, 695)},
    "left-arm": {"shoulderL": (142, 302), "wristL": (65, 823)},
    "right-arm": {"shoulderR": (252, 302), "wristR": (333, 823)},
    "left-leg": {"hipL": (150, 701), "ankleL": (116, 1381), "ground": (99, 1468)},
    "right-leg": {"hipR": (245, 701), "ankleR": (280, 1381), "ground": (293, 1468)},
}
def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
def threshold(y: int) -> tuple[float, float]:
    if y < CUT_ARMS_START:
        return -1.0, 10000.0
    for (y0, l0, r0), (y1, l1, r1) in zip(BOUNDARY_CONTROLS, BOUNDARY_CONTROLS[1:]):
        if y0 <= y < y1:
            t = (y - y0) / (y1 - y0)
            return l0 + (l1 - l0) * t, r0 + (r1 - r0) * t
    return 103.0, 291.0
def choose_part(x: int, y: int) -> str:
    if y < CUT_HEAD:
        return "head"
    left, right = threshold(y)
    if CUT_ARMS_START <= y < CUT_ARMS_END:
        if x < left:
            return "left-arm"
        if x >= right:
            return "right-arm"
    if y < CUT_LEGS:
        return "torso"
    return "left-leg" if x < CENTER else "right-leg"
def create_parts() -> tuple[dict[str, bytes], dict]:
    source_bytes = SOURCE.read_bytes()
    src_manifest = json.loads((BATCH / "manifest.json").read_text("utf-8"))
    expected = src_manifest["assets"][0]["processed"]["sha256"]
    if "sha256:" + sha256(source_bytes) != expected:
        raise RuntimeError("Bamboo-001 source hash changed; refusing to slice")
    with Image.open(SOURCE) as img:
        img = img.convert("RGBA")
    w, h = img.size
    if (w, h) != (394, 1493):
        raise RuntimeError(f"Unexpected image dimensions {w}x{h}")
    pieces = {name: Image.new("RGBA", (w, h), (0, 0, 0, 0)) for name in PART_NAMES}
    src_pixels = img.load()
    dst_pixels = {name: pic.load() for name, pic in pieces.items()}
    for y in range(h):
        for x in range(w):
            pixel = src_pixels[x, y]
            if pixel[3]:
                dst_pixels[choose_part(x, y)][x, y] = pixel
    outputs = {}
    rows = []
    reconstructed = Image.new("RGBA", img.size, (0, 0, 0, 0))
    for name in PART_NAMES:
        section = pieces[name]
        bounds = section.getbbox()
        if not bounds:
            raise RuntimeError(f"Empty part {name}")
        x0, y0, x1, y1 = bounds
        box = (max(0, x0-PADDING), max(0, y0-PADDING), min(w, x1+PADDING), min(h, y1+PADDING))
        crop = section.crop(box)
        data = BytesIO()
        crop.save(data, "PNG", optimize=True, compress_level=9)
        png = data.getvalue()
        outputs[name + ".png"] = png
        reconstructed.alpha_composite(crop, (box[0], box[1]))
        anchors = {}
        for label, (px, py) in SOURCE_ANCHORS[name].items():
            anchors[label] = {
                "x": round((px-box[0])/(box[2]-box[0]), 5),
                "y": round((py-box[1])/(box[3]-box[1]), 5),
                "sourceX": px, "sourceY": py, "status": "estimated-unreviewed"
            }
        rows.append({
            "id": "bamboo-001-" + name, "category": name,
            "file": "assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/" + name + ".png",
            "sourceBoundsXYXY": list(box), "width": crop.width, "height": crop.height,
            "sizeBytes": len(png), "sha256": "sha256:" + sha256(png),
            "anchors": anchors, "reviewStatus": "draft", "phase1Ready": False,
            "articulatedJoinReviewed": False
        })
    # This compares the actual composited pixels. No contours are generated.
    white = Image.new("RGBA", img.size, "white")
    white.alpha_composite(img)
    composed_white = Image.new("RGBA", img.size, "white")
    composed_white.alpha_composite(reconstructed)
    if white.tobytes() != composed_white.tobytes():
        raise RuntimeError("Pixel-exact neutral-pose reconstruction FAILED")
    result = {
        "schemaVersion": 1, "assetId": "bamboo-001",
        "derivation": "segmentation of existing true PNG pixels only; no human paths or drawing",
        "source": {
            "file": "assets/candidates/phase1-fullbody-2026-11-08/processed/bamboo-001-transparent.png",
            "sha256": expected, "width": w, "height": h, "generatorModel": "undisclosed"
        },
        "strategy": {
            "headCutY": CUT_HEAD, "armsStartY": CUT_ARMS_START, "legsStartY": CUT_LEGS,
            "armsEndY": CUT_ARMS_END, "midlineX": CENTER,
            "armBoundaryControlRows": [list(row) for row in BOUNDARY_CONTROLS],
            "cropPadding": PADDING, "characterGeometryGeneratedByProgram": False
        },
        "parts": rows, "visualRecompositionOnWhite": "pixel-exact",
        "reviewStatus": "draft", "phase1Ready": False,
        "limitations": [
            "Source outline crosses some cut boundaries; moving individual parts exposes hard seams.",
            "Anchor positions are estimates, not human-approved joint coordinates.",
            "Only the original neutral pose has passed pixel-exact compositing validation.",
            "No inpainting, drawing or occlusion repair of missing limbs was performed."
        ]
    }
    outputs["manifest.json"] = (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode()
    return outputs, result
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true",
                        help="Verify on-disk candidate PNG parts against actual source data")
    args = parser.parse_args()
    outputs, metadata = create_parts()
    if args.verify:
        for filename, data in outputs.items():
            path = PARTS / filename
            if not path.is_file() or path.read_bytes() != data:
                raise RuntimeError("Missing or altered real-part file: " + str(path))
        print("PASS:", len(metadata["parts"]), "real PNG parts; pixel-exact neutral pose; all drafts")
    else:
        PARTS.mkdir(parents=True, exist_ok=True)
        for filename, data in outputs.items():
            (PARTS / filename).write_bytes(data)
        print("Created", len(metadata["parts"]), "draft pieces from actual source pixels")
if __name__ == "__main__":
    main()
