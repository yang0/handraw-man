#!/usr/bin/env node
/**
 * Check REAL imported bitmap candidate files on disk. No drawing or synthesis.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const ROOT=resolve(import.meta.dirname,"..");
const source=JSON.parse(await readFile(resolve(ROOT,"assets/candidates/native-2026-11-08/manifest.json"),"utf8"));
if (source.schemaVersion!==1 || !Array.isArray(source.assets)) throw Error("candidate manifest malformed");
if(source.approvedCount!==0 || source.fullBodyPrototypeCount!==0) throw Error("this test batch is not approved full-body art");
const seen=new Set();let count=0;
for(const asset of source.assets){
 if(asset.reviewStatus!=="draft" || asset.phase1Ready!==false || asset.containsFullBody!==false) throw Error("unreviewed candidate falsely approved: "+asset.id);
 if(seen.has(asset.id))throw Error("duplicate candidate ID");seen.add(asset.id);
 if(!/^assets\/candidates\/native-2026-11-08\/blank-head-\d\d\.png$/.test(asset.filename))throw Error("unsafe candidate filename");
 const png=await readFile(resolve(ROOT,asset.filename));
 if(png.length!==asset.sizeBytes || png.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")throw Error("not actual expected PNG");
 if(png.readUInt32BE(16)!==asset.width || png.readUInt32BE(20)!==asset.height)throw Error("unexpected image dimensions");
 const sha256=createHash("sha256").update(png).digest("hex");
 const blobSha=createHash("sha1").update("blob "+png.length+"\0").update(png).digest("hex");
 if(asset.sha256!=="sha256:"+sha256||asset.gitBlobSha1!==blobSha)throw Error("PNG corrupted "+asset.id);
 count++;
}
if(count!==8)throw Error("unexpected candidate number");
process.stdout.write("OK "+count+" real PNG candidates, byte-for-byte hashes match; 0 reviewed full-body prototypes.\n");
