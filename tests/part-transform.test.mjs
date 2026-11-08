import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_PIVOTS,PRESETS,neutralPart,chooseDefaultPivot,validateTransform,
  imageTransform,sourcePointPlacement,anchorPlacement,isOriginalPose,posePreset,
  exportPoseRecipe,validateImportedPose,buildJointQARecord
} from "../web/part-transform.mjs";
const manifest=JSON.parse(await readFile(new URL(
  "../assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/manifest.json",import.meta.url),"utf8"));
const neutral=manifest.parts.map(neutralPart);
test("all 6 real bitmap fragments have valid default joint anchors",()=>{
  assert.equal(neutral.length,6);
  assert.deepEqual(neutral.map(p=>p.pivotAnchor),["neck","neck","shoulderL","shoulderR","hipL","hipR"]);
  for(const p of neutral)assert.deepEqual(anchorPlacement(p),{
    x:p.anchors[p.pivotAnchor].sourceX,y:p.anchors[p.pivotAnchor].sourceY
  });
  assert.ok(isOriginalPose(neutral));
});
test("zero angle and scale 1 keep ALL image pixels at original source coords",()=>{
  for(const p of neutral) {
    const t=imageTransform(p),[x0,y0]=p.sourceBoundsXYXY;
    assert.equal(t.translateX+t.offsetImageX,x0);
    assert.equal(t.translateY+t.offsetImageY,y0);
    for(const point of [{x:x0,y:y0},{x:x0+p.width,y:y0+p.height}]){
      const transformed=sourcePointPlacement(p,point);
      assert.ok(Math.abs(transformed.x-point.x)<1e-9);
      assert.ok(Math.abs(transformed.y-point.y)<1e-9);
    }
  }
});
test("rotation about real source anchor cannot move the pivot itself",()=>{
  const base=neutral.find(p=>p.category==="left-arm");
  const rotated={...base,rotation:40,offsetX:10,offsetY:-7};
  assert.deepEqual(anchorPlacement(rotated),{
    x:base.anchors.shoulderL.sourceX+10,y:base.anchors.shoulderL.sourceY-7
  });
  assert.equal(isOriginalPose([rotated]),false);
  const point={x:base.anchors.shoulderL.sourceX,y:base.anchors.shoulderL.sourceY+10};
  const moved=sourcePointPlacement({...base,rotation:90},point);
  assert.ok(Math.abs(moved.x-(point.x-10))<1e-8);
});
test("presets only transform original PNG placements and never count as art approval",()=>{
  assert.equal(Object.keys(PRESETS).length,3);
  assert.ok(isOriginalPose(posePreset(neutral,"neutral")));
  const out=posePreset(neutral,"arms-out");
  assert.equal(out.find(p=>p.category==="left-arm").rotation,32);
  assert.equal(out.find(p=>p.category==="right-arm").rotation,-32);
  assert.equal(out.find(p=>p.category==="torso").rotation,0);
  assert.equal(isOriginalPose(out),false);
  assert.throws(()=>posePreset(neutral,"approved"),/未知/);
});
test("JSON round trip checks source+part hashes, IDs, numeric range, review state",()=>{
  const moved=posePreset(neutral,"walk-test");
  const saved=exportPoseRecipe(moved,manifest);
  assert.equal(saved.qualityGate,"needs-manual-joint-repair");
  assert.equal(saved.phase1Ready,false);
  assert.equal(saved.articulatedJoinReviewed,false);
  assert.deepEqual(validateImportedPose(JSON.parse(JSON.stringify(saved)),manifest),moved);
  const corrupt=structuredClone(saved);
  corrupt.layers[0].sourceSha256="sha256:"+"0".repeat(64);
  assert.throws(()=>validateImportedPose(corrupt,manifest),/哈希/);
  const fake=structuredClone(saved);fake.reviewStatus="approved";
  assert.throws(()=>validateImportedPose(fake,manifest),/宣称已经审核/);
  const duplicate=structuredClone(saved);duplicate.layers[1].id=duplicate.layers[0].id;
  assert.throws(()=>validateImportedPose(duplicate,manifest),/重复/);
  const over=structuredClone(saved);over.layers[1].rotation=200;
  assert.throws(()=>validateImportedPose(over,manifest),/超出/);
  const invalid=structuredClone(saved);invalid.layers[1].offsetX=NaN;
  assert.throws(()=>validateImportedPose(invalid,manifest),/有限数字/);
});
test("QA evidence never indicates repaired or approved joints",()=>{
  const p=posePreset(neutral,"arms-out");
  const evidence=buildJointQARecord(p,manifest,{defect:"visible-seam",notes:"左肩切口出现断线"});
  assert.equal(evidence.finalApproval,"not-eligible-with-unrepaired-original-parts");
  assert.equal(evidence.articulatedJoinReviewed,false);
  assert.equal(evidence.finding,"visible-seam");
  assert.equal(evidence.recipe.layers.length,6);
  assert.throws(()=>buildJointQARecord(p,manifest,{defect:"passed"}),/有效/);
  assert.throws(()=>buildJointQARecord(p,manifest,{defect:"other",notes:"x".repeat(1001)}),/1000/);
});
