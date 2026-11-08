#!/usr/bin/env python3
"""Pixel-exact source references for shoulder/hip image edits, NOT repaired art."""
from pathlib import Path
from PIL import Image
from io import BytesIO
import argparse,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"assets/candidates/phase1-fullbody-2026-11-08"
SOURCE=BASE/"processed/bamboo-001-transparent.png"
OUTPUT=ROOT/"assets/repair-inputs/bamboo-001"
CROPS={"left-shoulder":(92,238,190,425),"right-shoulder":(204,238,302,425),
       "left-hip":(108,620,203,845),"right-hip":(191,620,286,845)}
def digest(data):return "sha256:"+hashlib.sha256(data).hexdigest()
def build():
    src=SOURCE.read_bytes()
    root=json.loads((BASE/"manifest.json").read_text("utf8"))
    expected=root["assets"][0]["processed"]["sha256"]
    if digest(src)!=expected:raise ValueError("Original source image hash mismatch")
    with Image.open(BytesIO(src)) as image: im=image.convert("RGBA")
    if im.size!=(394,1493):raise ValueError("Unexpected original Bamboo image size")
    files={};assets=[]
    for name,bbox in CROPS.items():
        patch=im.crop(bbox)
        fp=BytesIO();patch.save(fp,format="PNG",optimize=True,compress_level=9)
        binary=fp.getvalue();file=name+".png";files[file]=binary
        assets.append({"id":"bamboo-001-"+name+"-source","joint":name,
         "file":"assets/repair-inputs/bamboo-001/"+file,
         "originalBoundsXYXY":list(bbox),"width":patch.width,"height":patch.height,
         "sha256":digest(binary),"sizeBytes":len(binary),"sourceSha256":expected,
         "role":"reference-only-not-a-replacement-joint","reviewStatus":"reference-only",
         "phase1Ready":False,"artApproved":False,"independentJointAsset":False})
    manifest={"schemaVersion":1,"kind":"bamboo-001-real-source-joint-crops",
      "sourceOriginalFile":"assets/candidates/phase1-fullbody-2026-11-08/processed/bamboo-001-transparent.png",
      "sourceSha256":expected,"sourceImageSize":[394,1493],"model":"undisclosed",
      "method":"exact crop of real PNG pixels, no human paths drawn",
      "referenceCount":4,"approvedRepairCount":0,"assets":assets}
    files["manifest.json"]=(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n").encode()
    return files,manifest
def main():
    p=argparse.ArgumentParser();p.add_argument("--verify",action="store_true");args=p.parse_args()
    data,manifest=build()
    if args.verify:
        saved=json.loads((OUTPUT/"manifest.json").read_text("utf8"))
        if saved!=manifest or saved["approvedRepairCount"]!=0:
            raise ValueError("Reference provenance or draft state tampered")
        for name,buf in data.items():
            if (OUTPUT/name).read_bytes()!=buf:raise ValueError("Real PNG crop altered: "+name)
        print("PASS: 4 exact real-image cropped references; 0 approved repair parts")
    else:
        OUTPUT.mkdir(parents=True,exist_ok=True)
        for name,buf in data.items():(OUTPUT/name).write_bytes(buf)
        print("Saved 4 source PNG crop references only (not repaired art)")
if __name__=="__main__":main()
