import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const page=readFileSync(new URL("../cut-editor.html",import.meta.url),"utf8");
const studio=readFileSync(new URL("../web/cut-editor.mjs",import.meta.url),"utf8");
const cutter=readFileSync(new URL("../web/cut-core.mjs",import.meta.url),"utf8");

test("AI drafts are a separate optional source type, never labeled original CC0",()=>{
  assert.match(page,/option value="ai-drafts"/);
  assert.match(studio,/fetchAiManifest/);
  assert.match(studio,/record\.sourceKind\s*!==\s*"ai-generated"/);
  assert.match(studio,/expectedSha256:/);
  assert.match(studio,/details\.expectedSha256/);
  assert.match(cutter,/generation: source\.sourceKind === "ai-generated"/);
  assert.match(cutter,/modelEvidence:/);
});
test("the browser contains no privileged image API requests or tokens",()=>{
  assert.doesNotMatch(studio,/\/images\/generations|Authorization\s*:/);
  assert.doesNotMatch(page,/api[_-]?key.*type="text"/i);
});
test("CLI prompt preview needs no model credentials and generates no asset",()=>{
  const run=spawnSync(process.execPath,["scripts/generate-ai-source.mjs","--family","bamboo","--dry-run"],{
    cwd:new URL("../",import.meta.url),encoding:"utf8",
    env:{...process.env,HANDRAW_IMAGE_API_KEY:"",HANDRAW_IMAGE_BASE_URL:"http://127.0.0.1:38650/v1"}
  });
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/不调用 API/);
  assert.match(run.stdout,/竹竿/);
});
test("CLI generation without a key fails explicitly, not a mock success",()=>{
  const run=spawnSync(process.execPath,["scripts/generate-ai-source.mjs","--family","bamboo"],{
    cwd:new URL("../",import.meta.url),encoding:"utf8",
    env:{...process.env,HANDRAW_IMAGE_API_KEY:""}
  });
  assert.equal(run.status,1);
  assert.match(run.stderr,/HANDRAW_IMAGE_API_KEY/);
});
