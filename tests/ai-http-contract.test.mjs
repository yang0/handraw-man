import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requestProviderImage,saveGeneratedDraft } from "../src/ai-source.mjs";

const fixture=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z4kAAAAASUVORK5CYII=","base64");
test("real local HTTP contract /v1/models + /v1/images/generations stores ONLY served bytes",async()=>{
  let modelsCalls=0,imagesCalls=0;
  const server=createServer(async(req,res)=>{
    let json;
    if(req.url==="/v1/models"){
      modelsCalls++;
      assert.equal(req.headers.authorization,"Bearer test-key");
      json={data:[{id:"gpt-image-2.6"}]};
    }else if(req.url==="/v1/images/generations"){
      imagesCalls++;
      assert.equal(req.headers.authorization,"Bearer test-key");
      const chunks=[];for await(const part of req)chunks.push(part);
      const payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.equal(payload.model,"gpt-image-2.6");
      assert.match(payload.prompt,/人形抽象手绘轮廓/);
      json={id:"mocked-route-contract",data:[{b64_json:fixture.toString("base64")}]};
    }else{res.writeHead(404);res.end();return;}
    res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(json));
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const address=server.address();
  const folder=await mkdtemp(join(tmpdir(),"handraw-http-contract-"));
  try{
    const result=await requestProviderImage({
      baseUrl:"http://127.0.0.1:"+address.port+"/v1",apiKey:"test-key",
      options:{family:"pear",model:"gpt-image-2.6",layout:"full-body"}
    });
    const saved=await saveGeneratedDraft({result,outputDir:folder});
    assert.equal((await readFile(join(folder,saved.filename))).equals(fixture),true);
    const record=JSON.parse(await readFile(join(folder,saved.metadataFilename),"utf8"));
    assert.equal(record.reviewStatus,"draft");
    assert.equal(record.phase1Ready,false);
    assert.equal(record.sourceKind,"ai-generated");
    assert.equal(modelsCalls,1);assert.equal(imagesCalls,1);
  }finally{
    await new Promise(resolve=>server.close(resolve));
    await rm(folder,{recursive:true,force:true});
  }
});
