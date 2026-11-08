import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {inspectReplacementBytes,candidateTrialEvidence} from "../web/repair-candidate.mjs";
const base=new URL("../assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/",import.meta.url);
const m=JSON.parse(await readFile(new URL("manifest.json",base),"utf8"));
const arm=m.parts.find(p=>p.category==="left-arm");
const actual=await readFile(new URL("left-arm.png",base));
const digest=x=>"sha256:"+createHash("sha256").update(x).digest("hex");
test("replacements must be real RGBA PNGs matching actual arm crop dimensions",()=>{
  assert.throws(()=>inspectReplacementBytes(Buffer.from("This is a fake PNG"),arm,
    {filename:"bad.png",hash:digest(actual)}),/PNG/);
  assert.throws(()=>inspectReplacementBytes(actual,arm,{filename:"same.png",hash:digest(actual)}),/完全相同/);
  const other={...arm,width:arm.width+1};
  assert.throws(()=>inspectReplacementBytes(actual,other,{filename:"different.png",hash:digest(actual)}),/尺寸/);
  const wrongName={filename:"x.svg",hash:digest(actual)};
  assert.throws(()=>inspectReplacementBytes(actual,arm,wrongName),/文件名/);
});
test("candidate metadata is draft and never embeds image contents or approval",()=>{
  // Change only PNG metadata/encoding tail for validation test; not test/claim a repaired image.
  const bytes=Buffer.concat([actual,Buffer.from("test-different-binary-draft")]);
  const metadata=inspectReplacementBytes(bytes,arm,{filename:"trial.png",hash:digest(bytes)});
  assert.equal(metadata.localOnly,true);
  assert.equal(metadata.assetRegistered,false);
  assert.equal(metadata.articulatedJoinReviewed,false);
  assert.equal(metadata.canReconstructRecipeWithoutFile,false);
  const evidence=candidateTrialEvidence(new Map([[arm.id,metadata]]),true);
  assert.equal(evidence.hasUnregisteredCandidate,true);
  assert.equal(evidence.usedInPreview,true);
  assert.equal(evidence.approved,false);
  assert.equal(evidence.candidates.length,1);
  assert.doesNotMatch(JSON.stringify(evidence),/base64|data:image\/png/);
});
