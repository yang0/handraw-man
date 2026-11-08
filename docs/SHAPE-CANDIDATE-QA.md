# Shape Candidate QA · 2026-11-08

Issue: [#4](https://github.com/yang0/handraw-man/issues/4). Rules: [TOP_LEVEL_RULES](../TOP_LEVEL_RULES.md).

## Outcomes, without inflated counts

| Metric | Verified |
|---|---:|
| Actual image generations attempted this round | 3 |
| Unclothed, faceless, full-body approved shape prototypes | **0 / 48** |
| Actual transparent cropped head-outline component drafts committed | **8** |
| Unique approved head designs | **0** |
| Open Peeps original SVGs kept separately | 164 |

The new ChatGPT image generations repeatedly produced clothed, face-bearing characters or style-guide posters, instead of the requested pure full-body morphology sketches. **Those images fail Phase 1 art acceptance and are not registered as original full-body shapes.**

A poster generated in this session happened to contain a row of eight blank head outline components, which were genuinely cropped, transparentized, and indexed as draft parts. This is a legitimate partial asset import but not a full-body shape library. All eight head candidates have highly similar silhouettes and low source resolution; do not count them as eight distinct art designs.

## Reproducibility and source integrity

- Parent image: actual ChatGPT image generation `4ee27ad6-3795-44aa-bac3-efc27f9af8cb`; source full-size PNG SHA-256 `1aa382e8ad30815f0a2d3810ea8bdaefaf272b8d705d08c8e3ce9261ffa4d6e9`.
- Actual parent image exists in the conversation, **not in the GitHub checkout**. For true end-to-end reproduction, the maintainer must retain that generated parent PNG; this limitation is explicit.
- [Machine-readable candidate manifest](../assets/candidates/native-2026-11-08/manifest.json) records each original crop rectangle, output hash, dimensions, source and color/pixel operations.
- Actual derivative bytes are stored in GitHub under `assets/candidates/native-2026-11-08/*.png`; they are not text placeholders. Git Blob SHA-1 was independently computed from the container output and matched the GitHub uploaded blobs for all 8.
- Art review of head candidates: *draft only*. Files are ~56–60px wide and 67–70px tall, cropped from a single sheet. Similarity and pixel-edge quality require additional review.
- No model name available for the ChatGPT built-in generation, so `model=undisclosed`; the words “CC0” on a generated poster are not a legal authorization.

## Required Phase 1 quality gate

Each proposed full-body prototype must be physically present as a real generated or permitted reused file, complete from head to feet in neutral front view, with no facial features, clothing, gender/age/job/story markings, readable boundaries, and distinct silhouette. Only after manual visual QA + source/licensing review may a curator mark it `approved`; byte hash checks do not constitute art approval.

**Next content work:** commission/generate specific individual full-body silhouettes, one family at a time, rather than asking an image generator for an all-purpose infographic. Reject clothed variants. Do not patch missing body parts with coded geometry or mark duplicates as original families.
