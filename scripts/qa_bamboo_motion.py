#!/usr/bin/env python3
"""Art QA snapshots from EXISTING real Bamboo-001 PNG fragments only.

No procedural human geometry, strokes, vector paths or missing parts are drawn.
The only operation is moving/rotating/compositing pixels from original PNGs.
"""
from __future__ import annotations
import argparse
from io import BytesIO
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REL = Path("assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001")
BATCH = ROOT / REL
SOURCE = ROOT / "assets/candidates/phase1-fullbody-2026-11-08/processed/bamboo-001-transparent.png"
OUTPUT = ROOT / "assets/qa/bamboo-001"
BOARD_W, BOARD_H = 994, 1573
ORIGIN_X, ORIGIN_Y = 300, 40
PRESETS = {
    "neutral": {},
    "arms-out": {"left-arm": 32, "right-arm": -32},
    "arms-out-calibrated": {"left-arm": 32, "right-arm": -32},
    "walk-test": {"left-arm": -10, "right-arm": 10, "left-leg": 10, "right-leg": -10}
}
SHOULDER_CORRECTION = {"left-arm": (-17, 11), "right-arm": (17, 11)}
PIVOT_NAME = {
    "head": "neck", "torso": "neck",
    "left-arm": "shoulderL", "right-arm": "shoulderR",
    "left-leg": "hipL", "right-leg": "hipR"
}
def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def build():
    manifest_bytes = (BATCH / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest.get("assetId") != "bamboo-001" or len(manifest.get("parts", [])) != 6:
        raise ValueError("The six real PNG source assets are unavailable")
    with Image.open(SOURCE) as source_file:
        original = source_file.convert("RGBA")
    if original.size != (394, 1493):
        raise ValueError("Original transparent Bamboo PNG has unexpected size")
    if "sha256:"+digest(SOURCE.read_bytes()) != manifest["source"]["sha256"]:
        raise ValueError("Source PNG hash mismatch")
    parts = []
    for part in manifest["parts"]:
        name = part["category"]
        path = ROOT / part["file"]
        content = path.read_bytes()
        if "sha256:"+digest(content) != part["sha256"]:
            raise ValueError("Real source part hash mismatch "+name)
        with Image.open(path) as img:
            part_image = img.convert("RGBA")
        if part_image.size != (part["width"], part["height"]):
            raise ValueError("Source part has wrong dimensions "+name)
        if part["reviewStatus"] != "draft" or part["articulatedJoinReviewed"]:
            raise ValueError("Unreviewed joint parts cannot be approved")
        parts.append((part,part_image))
    records = []
    pngs = {}
    for preset, motions in PRESETS.items():
        board = Image.new("RGBA", (BOARD_W, BOARD_H), (0, 0, 0, 0))
        for part, img in parts:
            name = part["category"]
            pivot = part["anchors"][PIVOT_NAME[name]]
            x0,y0,_,_ = part["sourceBoundsXYXY"]
            dx,dy = SHOULDER_CORRECTION.get(name,(0,0)) if preset=="arms-out-calibrated" else (0,0)
            anchor_x = pivot["sourceX"]+dx+ORIGIN_X
            anchor_y = pivot["sourceY"]+dy+ORIGIN_Y
            layer = Image.new("RGBA", (BOARD_W, BOARD_H), (0, 0, 0, 0))
            layer.alpha_composite(img, (x0+ORIGIN_X, y0+ORIGIN_Y))
            angle = motions.get(name, 0)
            if angle:
                # Pillow positive angle rotates CCW; browser positive rotates CW.
                # Rotation is applied to the REAL PNG layer, not to a human path.
                layer = layer.rotate(-angle, center=(anchor_x,anchor_y),
                                     resample=Image.Resampling.BICUBIC, expand=False)
            board.alpha_composite(layer)
        box = board.getbbox()
        if box is None:
            raise ValueError("Empty pose preview "+preset)
        margins = [box[0],box[1],BOARD_W-box[2],BOARD_H-box[3]]
        if min(margins) < 12:
            raise ValueError("Pose preview unexpectedly clipped at the canvas edge: "+preset)
        if preset=="neutral":
            restored = board.crop((ORIGIN_X,ORIGIN_Y,ORIGIN_X+394,ORIGIN_Y+1493))
            white_1 = Image.new("RGBA",restored.size,"white")
            white_1.alpha_composite(restored)
            white_2 = Image.new("RGBA",original.size,"white")
            white_2.alpha_composite(original)
            if white_1.tobytes()!=white_2.tobytes():
                raise ValueError("Neutral pose is not pixel-identical on white background")
        stream = BytesIO()
        board.save(stream,format="PNG",optimize=True,compress_level=9)
        data = stream.getvalue()
        file_name = preset+".png"
        pngs[file_name] = data
        records.append({
            "pose":preset,
            "file":"assets/qa/bamboo-001/"+file_name,
            "width":BOARD_W,"height":BOARD_H,
            "sizeBytes":len(data),"sha256":"sha256:"+digest(data),
            "alphaBoundsXYXY":list(box),"marginLTRB":margins,
            "partAnglesDegrees":motions,
            "pivotCalibrationXY":SHOULDER_CORRECTION if preset=="arms-out-calibrated" else {},
            "artStatus":"visual-candidate-only" if preset=="arms-out-calibrated" else "unmodified-pivot",
            "reviewStatus":"draft","articulatedJoinReviewed":False,
            "qualityGate":"neutral-pixel-identical" if preset=="neutral" else "joint-seams-require-repair"
        })
    report = {
        "schemaVersion":1,"kind":"bamboo-001-motion-evidence",
        "sourcePartManifestSha256":"sha256:"+digest(manifest_bytes),
        "sourceTransparentSha256":manifest["source"]["sha256"],
        "artCreationMethod":"transform existing PNG layer pixels only; NO generated body geometry",
        "canvas":{"width":BOARD_W,"height":BOARD_H,
                  "sourceOffsetX":ORIGIN_X,"sourceOffsetY":ORIGIN_Y},
        "formalApproved":False,"reviewStatus":"draft",
        "findings":["Neutral pose reproduces source pixels on white background.",
                    "Articulated arm and leg poses can expose hard seams or disconnected outlines.",
                    "The shoulder-calibrated variant uses only existing pixels and manually selected pivot offsets, not edited joint artwork.",
                    "These screenshots are QA evidence, NOT curated finished poses."],
        "variants":records
    }
    pngs["manifest.json"] = (json.dumps(report,ensure_ascii=False,indent=2)+"\n").encode()
    return pngs,report

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--verify",action="store_true")
    args=parser.parse_args()
    outputs,manifest=build()
    if args.verify:
        data=json.loads((OUTPUT/"manifest.json").read_text("utf8"))
        if data["schemaVersion"]!=1 or data["formalApproved"]:
            raise ValueError("Motion QA evidence corrupted or falsely approved")
        if len(data.get("variants",[]))!=len(manifest["variants"]):
            raise ValueError("QA variation count altered")
        for idx,item in enumerate(manifest["variants"]):
            saved=data["variants"][idx]
            if saved["pose"]!=item["pose"] or saved["reviewStatus"]!="draft" or saved["articulatedJoinReviewed"]:
                raise ValueError("Art QA record altered or falsely approved")
            if saved["qualityGate"]!=item["qualityGate"]:
                raise ValueError("Pose QA status does not match actual transformation")
            original = (OUTPUT/(item["pose"]+".png")).read_bytes()
            if "sha256:"+digest(original) != data["variants"][list(PRESETS).index(item["pose"])]["sha256"]:
                raise ValueError("Committed QA image hash mismatch "+item["pose"])
            with Image.open(BytesIO(original)) as img:
                actual=img.convert("RGBA")
            with Image.open(BytesIO(outputs[item["pose"]+".png"])) as img:
                expected=img.convert("RGBA")
            if actual.size!=expected.size or actual.tobytes()!=expected.tobytes():
                raise ValueError("QA image pixels differ from real PNG composition "+item["pose"])
        if data["sourcePartManifestSha256"]!=manifest["sourcePartManifestSha256"]:
            raise ValueError("Source manifest hash changed")
        print("PASS: 4 committed real-image motion QA previews, neutral pixel-exact; calibrated shoulder art still draft.")
    else:
        OUTPUT.mkdir(parents=True,exist_ok=True)
        for name,content in outputs.items():
            (OUTPUT/name).write_bytes(content)
        print("Generated 4 QA-only PNG previews from existing Bamboo-001 PNGs; no body drawing.")

if __name__=="__main__":
    main()
