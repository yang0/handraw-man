import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";

const relative=new URL("../assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/",import.meta.url);
const data=JSON.parse(await readFile(new URL("manifest.json",relative),"utf8"));
const expected=["head","torso","left-arm","right-arm","left-leg","right-leg"];
test("actual Bamboo-001 cutouts are six distinct real PNG assets with true SHA-256",async()=>{
 assert.equal(data.schemaVersion,1);
 assert.equal(data.assetId,"bamboo-001");
 assert.equal(data.reviewStatus,"draft");
 assert.equal(data.phase1Ready,false);
 assert.equal(data.visualRecompositionOnWhite,"pixel-exact");
 assert.deepEqual(data.parts.map(p=>p.category),expected);
 for(const part of data.parts){
  assert.equal(part.reviewStatus,"draft");
  assert.equal(part.phase1Ready,false);
  assert.equal(part.articulatedJoinReviewed,false);
  assert.match(part.file,/^assets\/candidates\/phase1-fullbody-2026-11-08\/parts\/bamboo-001\/[a-z-]+\.png$/);
  const bytes=await readFile(new URL(part.category+".png",relative));
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16),part.width);
  assert.equal(bytes.readUInt32BE(20),part.height);
  assert.equal(bytes.length,part.sizeBytes);
  assert.equal("sha256:"+createHash("sha256").update(bytes).digest("hex"),part.sha256);
  const box=part.sourceBoundsXYXY;
  assert.equal(box[2]-box[0],part.width);
  assert.equal(box[3]-box[1],part.height);
  for(const [k,p] of Object.entries(part.anchors)){
   assert.ok(p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1,k+" in "+part.id);
   assert.equal(p.status,"estimated-unreviewed");
  }
 }
});
test("assembly UI does not procedurally draw characters",async()=>{
 const html=await readFile(new URL("../bamboo-parts.html",import.meta.url),"utf8");
 const js=await readFile(new URL("../web/bamboo-parts.mjs",import.meta.url),"utf8");
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 const used=new Set([...js.matchAll(/\$\("([a-zA-Z][a-zA-Z0-9-]*)"\)/g)].map(m=>m[1]));
 assert.ok(used.size>=7);
 for(const id of ["board","partList","downloadPng","downloadRecipe","reset","positionX","positionY"])
   assert.ok(ids.has(id),"required interaction missing #"+id);
 for(const id of used)assert.ok(ids.has(id),"missing control #"+id);
 assert.match(js,/ctx\.drawImage/);
 assert.doesNotMatch(js,/\b(stroke|fillRect|strokeRect|moveTo|lineTo|bezierCurveTo|arc|ellipse)\s*\(/);
 const core=await readFile(new URL("../web/part-transform.mjs",import.meta.url),"utf8");
 assert.match(core,/reviewStatus:"draft"/);
 assert.match(core,/phase1Ready:false/);
 assert.match(js,/crypto\.subtle\.digest/);
 assert.match(js,/part\.sha256/);
});
test("existing whole-body gallery provides component-view entry",async()=>{
 const gallery=await readFile(new URL("../shapes.html",import.meta.url),"utf8");
 assert.match(gallery,/bamboo-parts\.html/);
});

test("shoulder calibration UI is wired, source-preserving, and visually flagged as draft",async()=>{
  const html=await readFile(new URL("../bamboo-parts.html",import.meta.url),"utf8");
  const app=await readFile(new URL("../web/bamboo-parts.mjs",import.meta.url),"utf8");
  for(const id of ["pivotShiftX","pivotShiftY","valuePivotX","valuePivotY","resetPivot","posePreset"]){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/value="arms-out-calibrated"/);
  assert.match(html,/arms-out-calibrated\.png/);
  assert.match(app,/calibratedPivotPlacement/);
  assert.match(app,/pivotShiftX=0/);
  assert.match(app,/pivotShiftY=0/);
  assert.match(app,/ctx\.drawImage\(/);
  assert.doesNotMatch(app,/\b(stroke|fillRect|strokeRect|moveTo|lineTo|bezierCurveTo|arc|ellipse)\s*\(/);
});
