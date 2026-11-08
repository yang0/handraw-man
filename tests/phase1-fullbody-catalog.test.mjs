import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const prefix=new URL("../assets/candidates/phase1-fullbody-2026-11-08/",import.meta.url);
const catalog=JSON.parse(await readFile(new URL("manifest.json",prefix),"utf8"));
test("full-body catalog has one real silhouette visual pass but ZERO formally approved artwork",()=>{
 assert.equal(catalog.assets.length,1);
 assert.equal(catalog.visualGatePassedCount,1);
 assert.equal(catalog.formalApprovedCount,0);
 const a=catalog.assets[0];
 assert.equal(a.id,"bamboo-001");assert.equal(a.family,"bamboo");
 assert.equal(a.source.generatedImageId,"954864ef-99c5-4579-b2ed-1276ccfa5be6");
 assert.equal(catalog.model,"undisclosed");
 assert.equal(a.audit.visualGate,"pass");
 assert.equal(a.audit.reviewStatus,"draft");
 assert.equal(a.audit.phase1Ready,false);
 assert.equal(a.provenance.derivedFromOpenPeeps,false);
 assert.notEqual(a.audit.formalApproval,"approved");
});
test("real source and real processed file paths are backed by actual PNG bytes",async()=>{
 const a=catalog.assets[0];
 for(const item of [a.source,a.processed]){
  const file=new URL("../"+item.file,import.meta.url);
  const bytes=await readFile(file);
  assert.equal(bytes.length,item.sizeBytes);
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16),item.width);
  assert.equal(bytes.readUInt32BE(20),item.height);
  assert.ok((await stat(file)).isFile());
 }
});
test("browser full-body gallery displays only registered raster assets, not procedural paths",async()=>{
 const s=await readFile(new URL("../shapes.html",import.meta.url),"utf8");
 assert.match(s,/\.\/assets\/candidates\/phase1-fullbody-2026-11-08\/manifest\.json/);
 assert.doesNotMatch(s,/<svg[\s>]|<canvas[\s>]|bezierCurveTo\(/);
 assert.match(s,/a\.source\.file/);
 assert.match(s,/a\.processed\.file/);
});
