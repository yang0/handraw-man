# Native image generation · head outline candidates (2026-11-08)

**This folder contains 8 REAL cropped transparent PNG files**, derived from an actual ChatGPT image generation. They are **not** produced by procedural SVG/Canvas drawing.

- Parent ChatGPT image generation ID: `4ee27ad6-3795-44aa-bac3-efc27f9af8cb`.
- Parent original SHA-256: `1aa382e8ad30815f0a2d3810ea8bdaefaf272b8d705d08c8e3ce9261ffa4d6e9`.
- Parent file is retained in its originating ChatGPT conversation, **not** in the repository; do not claim this git checkout contains the raw parent.
- Actual cropped/processed PNG bytes are committed here. Every output has its own SHA-256 and Git blob SHA-1 in [manifest.json](manifest.json).
- Source model version is **undisclosed**; do not label as `gpt-image-2.6`.
- Processing is real-image crop, boundary-connected white-background removal, 8-tone grayscale palette compression. No new human drawing paths were generated.

**Curation result:** 8 isolated blank-head candidates, **0 approved full-body morphology prototypes**. They are very similar to one another and low-resolution, and should not be counted as 8 unique originals. All are `reviewStatus=draft`, `phase1Ready=false`. This batch is distinct from Open Peeps CC0 source assets.

Run `node scripts/verify_candidates.mjs` from the repository root to verify the actual committed PNG files.

[View candidate gallery](../../../candidates.html) · [QA decision](../../../docs/SHAPE-CANDIDATE-QA.md)
