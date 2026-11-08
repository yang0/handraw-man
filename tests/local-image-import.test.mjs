import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {importExistingImage,validateImportOptions} from "../src/local-image-import.mjs";
import {sha256} from "../src/ai-source.mjs";
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z4kAAAAASUVORK5CYII=","base64");
test("import real source bytes without API key and never claim a known model",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"handraw-native-"));
 try{
  const input=join(dir,"source.png"),out=join(dir,"drafts");await writeFile(input,png);
  const options={inputPath:input,outputDir:out,family:"bamboo"};
  const one=await importExistingImage(options,{now:new Date("2026-11-08T10:00:00Z")});
  assert.equal((await readFile(join(out,one.filename))).equals(png),true);
  assert.equal(one.record.originalHash,"sha256:"+sha256(png));
  assert.equal(one.record.generation.requestedModel,"undisclosed");
  assert.equal(one.record.reviewStatus,"draft");assert.equal(one.record.phase1Ready,false);
  const index=JSON.parse(await readFile(join(out,"index.json"),"utf8"));
  assert.equal(index.records[0].model,"undisclosed");
  await assert.rejects(importExistingImage(options),/相同原图/);
  await importExistingImage({...options,family:"pear"});
  assert.equal(JSON.parse(await readFile(join(out,"index.json"),"utf8")).records.length,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test("reject nonimage content, fake provider labels and unknown shape families",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"handraw-invalid-"));
 try{
  const input=join(dir,"fake.png");await writeFile(input,Buffer.from("Not an image"));
  await assert.rejects(importExistingImage({inputPath:input,family:"bamboo",outputDir:join(dir,"out")}),/图像|图片/);
  assert.throws(()=>validateImportOptions({inputPath:input,family:"not-real"}),/家族/);
  assert.throws(()=>validateImportOptions({inputPath:input,family:"bamboo",origin:"fake-gpt-image-2.6"}),/来源/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
