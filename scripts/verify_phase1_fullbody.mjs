#!/usr/bin/env node
/**
 * Read and validate imported true PNG files only; no geometry or image drawing.
 */
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
const root=resolve(import.meta.dirname,"..");
const manifest=JSON.parse(await readFile(resolve(root,"assets/candidates/phase1-fullbody-2026-11-08/manifest.json"),"utf8"));
if(manifest.schemaVersion!==1 || !Array.isArray(manifest.assets) || manifest.assets.length!==1)throw Error("Phase1 manifest invalid");
if(manifest.formalApprovedCount!==0 || manifest.visualGatePassedCount!==1)throw Error("Phase1 aggregate review count mismatch");
for (const asset of manifest.assets){
 if(asset.audit.reviewStatus!=="draft" || asset.audit.phase1Ready!==false || asset.audit.formalApproval==="approved")throw Error("Unreviewed asset misrepresented as released");
 if(asset.family!=="bamboo"||asset.id!=="bamboo-001"||asset.category!=="full-body-shape")throw Error("Asset registry mismatch");
 if(asset.source.generatedImageId!=="954864ef-99c5-4579-b2ed-1276ccfa5be6"||manifest.model!=="undisclosed")throw Error("Source provenance mismatch");
 for(const [key,expectedMode] of [["source","rgb"],["processed","rgba"]]){
  const f=asset[key];
  if(!/^assets\/candidates\/phase1-fullbody-2026-11-08\/(?:sources|processed)\/bamboo-001-(?:original|transparent)\.png$/.test(f.file))throw Error("Unexpected asset path");
  const bytes=await readFile(resolve(root,f.file));
  if(bytes.length!==f.sizeBytes)throw Error("Byte count mismatch "+f.file);
  if(bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")throw Error("Not a PNG");
  if(bytes.readUInt32BE(16)!==f.width||bytes.readUInt32BE(20)!==f.height)throw Error("Wrong image dimensions");
  const hash=createHash("sha256").update(bytes).digest("hex");
  const gitBlob=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
  if(f.sha256!=="sha256:"+hash||f.gitBlobSha1!==gitBlob)throw Error("Original file bytes changed "+f.file);
  console.log(key+": "+f.file+" byte+hash+dimensions OK");
 }
 const [x1,y1,x2,y2]=asset.processed.cropXYXY;
 if(x2-x1!==asset.processed.width||y2-y1!==asset.processed.height)throw Error("Crop dimension mismatch");
}
console.log("PASS: real full-body source and transparent derivative verified; visual gate 1/1; formally approved 0/1.");
