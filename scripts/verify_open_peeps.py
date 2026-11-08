#!/usr/bin/env python3
"""Integrity check for imported SVG originals. Does NOT draw or modify people."""
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "assets" / "sources" / "open-peeps" / "manifest.json"
PREFIX = PurePosixPath("assets/sources/open-peeps/atoms")

def main() -> int:
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors = []
    seen = set()
    counts = Counter()
    for item in m["assets"]:
        path = PurePosixPath(item["originalFile"])
        if path.is_absolute() or ".." in path.parts or path.parts[: len(PREFIX.parts)] != PREFIX.parts:
            errors.append(f"unsafe path: {path}")
            continue
        if item["id"] in seen:
            errors.append(f"duplicate id: {item['id']}")
        seen.add(item["id"])
        file = ROOT.joinpath(*path.parts)
        if not file.is_file():
            errors.append(f"missing: {path}")
            continue
        data = file.read_bytes()
        blob = hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()
        if item["originalHash"] != f"git-blob-sha1:{blob}":
            errors.append(f"hash mismatch: {path}")
        if len(data) != item["sizeBytes"]:
            errors.append(f"size mismatch: {path}")
        try:
            svg = ElementTree.fromstring(data)
            if svg.tag != "{http://www.w3.org/2000/svg}svg":
                errors.append(f"not SVG root: {path}")
        except ElementTree.ParseError as exc:
            errors.append(f"invalid XML: {path}: {exc}")
        if re.search(rb"<\s*(script|foreignObject|image)\b|\son[a-z]+\s*=", data, re.I):
            errors.append(f"unexpected unsafe element/attribute: {path}")
        counts[item["category"]] += 1
        if item["reviewStatus"] == "approved" or item["phase1Ready"]:
            errors.append(f"unreviewed mirror asset must not be marked approved: {path}")
    if m["total"] != len(m["assets"]) or dict(counts) != m["byCategory"]:
        errors.append("manifest count mismatch")
    if errors:
        for problem in errors:
            print("FAIL:", problem, file=sys.stderr)
        return 1
    print(f"OK: {len(seen)} SVG assets, SHA-1 Git blob hashes matched; groups: {dict(counts)}")
    print("NOTE: upstream mirror has not been independently compared to the official download.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
