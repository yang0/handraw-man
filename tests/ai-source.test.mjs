import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MODEL,FAMILIES,normalizeProviderBaseUrl,assertGenerationOptions,
  buildSourcePrompt,identifyImage,decodeProviderImage,
  listProviderModels,requestProviderImage,saveGeneratedDraft,sha256
} from "../src/ai-source.mjs";

// Pre-existing 1×1 PNG fixture for a fake HTTP response; never an "AI image".
const fixture=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z4kAAAAASUVORK5CYII=","base64");
const payload={data:[{b64_json:fixture.toString("base64")}]};
const opts={model:DEFAULT_MODEL,family:"bamboo",layout:"full-body",aspectRatio:"3:4",size:"",brief:"柔和曲线"};
test("twelve family prompts constrain layout without drawing any human body in code",()=>{
  assert.equal(Object.keys(FAMILIES).length,12);
  assert.match(buildSourcePrompt(opts),/原创/);
  assert.match(buildSourcePrompt(opts),/不裁切四肢/);
  assert.match(buildSourcePrompt({...opts,layout:"parts-sheet"}),/不重叠/);
  assert.throws(()=>assertGenerationOptions({...opts,family:"unknown"}),/形体家族/);
  assert.throws(()=>assertGenerationOptions({...opts,brief:"x".repeat(601)}),/600/);
});
test("provider URL rejects unsafe remote HTTP and credentials",()=>{
  assert.equal(normalizeProviderBaseUrl("http://127.0.0.1:38650/v1/"),"http://127.0.0.1:38650/v1");
  assert.throws(()=>normalizeProviderBaseUrl("http://192.168.0.2:38650/v1"),/HTTPS/);
  assert.throws(()=>normalizeProviderBaseUrl("https://u:p@example.com/v1"),/密钥/);
  assert.throws(()=>normalizeProviderBaseUrl("http://localhost:9999/notv1"),/必须指向/);
});
test("decode genuine raster data and reject URL, GIF, wrong model, garbage",()=>{
  assert.equal(identifyImage(fixture).format,"png");
  assert.equal(identifyImage(fixture).width,1);
  const out=decodeProviderImage(payload,DEFAULT_MODEL);
  assert.equal(sha256(out.bytes),sha256(fixture));
  assert.throws(()=>decodeProviderImage({...payload,model:"wrong-model"},DEFAULT_MODEL),/模型不一致/);
  assert.throws(()=>decodeProviderImage({data:[{url:"https://example.com/whatever"}]},DEFAULT_MODEL),/b64_json/);
  assert.throws(()=>decodeProviderImage({data:[{b64_json:Buffer.from("NOT AN IMAGE").toString("base64")}]},DEFAULT_MODEL),/有效图像|非 PNG/);
});
test("API adapter checks listed model and only requests exact configured model",async()=>{
  const calls=[];
  const fakeFetch=async(url,init)=>{
    calls.push({url,method:init.method,headers:init.headers,body:init.body&&JSON.parse(init.body)});
    if(url.endsWith("/models"))return new Response(JSON.stringify({data:[{id:DEFAULT_MODEL}]}),{status:200});
    return new Response(JSON.stringify(payload),{status:200});
  };
  const result=await requestProviderImage({baseUrl:"http://127.0.0.1:38650/v1",apiKey:"Bearer private",options:opts,fetchImpl:fakeFetch});
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,"http://127.0.0.1:38650/v1/models");
  assert.equal(calls[1].url,"http://127.0.0.1:38650/v1/images/generations");
  assert.equal(calls[1].body.model,DEFAULT_MODEL);
  assert.equal(calls[1].body.aspect_ratio,"3:4");
  assert.equal(Object.hasOwn(calls[1].body,"size"),false);
  assert.equal(calls[1].headers.Authorization,"Bearer private");
  assert.equal(result.modelListChecked,true);
  assert.equal(result.providerReportedModel,null);
});
test("unknown model never silently falls back or creates a fake source",async()=>{
  let called=false;
  const fakeFetch=async(url)=>{
    if(url.endsWith("/models"))return new Response(JSON.stringify({data:[{id:"gpt-image-1"}]}));
    called=true;return new Response(JSON.stringify(payload));
  };
  await assert.rejects(requestProviderImage({apiKey:"secret",options:opts,fetchImpl:fakeFetch}),/未公布/);
  assert.equal(called,false);
});
test("unauthorized / upstream errors redact credentials, and no fake success",async()=>{
  const fetchFail=async()=>new Response("wrong token 'tokenSECRET' status 502",{status:502});
  await assert.rejects(requestProviderImage({
    apiKey:"tokenSECRET", options:opts, fetchImpl:fetchFail,skipModelCheck:true
  }),error=>error.message.includes("502")&&!error.message.includes("tokenSECRET"));
});
test("actual returned bytes are archived unchanged with real hash and DRAFT provenance",async()=>{
  const folder=await mkdtemp(join(tmpdir(),"handraw-ai-test-"));
  try {
    const result={bytes:fixture,image:identifyImage(fixture),options:opts,prompt:"original-prompt",
      providerBase:"http://127.0.0.1:38650/v1",modelListChecked:true,providerReportedModel:null,requestId:"real-response-identifier"};
    const saved=await saveGeneratedDraft({result,outputDir:folder,now:new Date("2026-11-08T10:00:00Z"),idSuffix:"aabbccdd"});
    const original=await readFile(join(folder,saved.filename));
    assert.equal(original.equals(fixture),true);
    const record=JSON.parse(await readFile(join(folder,saved.metadataFilename),"utf8"));
    const index=JSON.parse(await readFile(join(folder,"index.json"),"utf8"));
    assert.equal(record.originalHash,"sha256:"+sha256(fixture));
    assert.equal(record.reviewStatus,"draft");
    assert.equal(record.phase1Ready,false);
    assert.equal(record.modelEvidence,"requested-and-listed-not-confirmed-by-response");
    assert.equal(record.generation.requestedModel,DEFAULT_MODEL);
    assert.equal(index.records.length,1);
    assert.equal(index.records[0].id,record.id);
    assert.doesNotMatch(JSON.stringify(record),/secret|private-api-key/i);
  }finally{await rm(folder,{recursive:true,force:true});}
});
