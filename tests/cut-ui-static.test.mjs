import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const html = readFileSync(new URL("../cut-editor.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../web/cut-editor.mjs", import.meta.url), "utf8");
const css = readFileSync(new URL("../web/cut-editor.css", import.meta.url), "utf8");

test("all interactive cutting-studio DOM IDs exist in static HTML", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  const used = new Set([...js.matchAll(/\$\("([a-zA-Z][a-zA-Z0-9-]*)"\)/g)].map(m=>m[1]));
  for(const id of used) assert.ok(ids.has(id), "missing #" + id);
  assert.ok(used.size > 30, "test must cover meaningful UI wiring");
});
test("no programmatic body rendering code or user model API is used", () => {
  assert.doesNotMatch(js, /\b(bezierCurveTo|quadraticCurveTo|fillText|strokeText|arc|ellipse|lineTo|moveTo|fillRect)\s*\(/);
  assert.doesNotMatch(js, /api\.openai\.com|gpt-image/);
  assert.match(js, /ctx\.drawImage\(/);
  assert.match(js, /crypto\.subtle\.digest/);
  assert.match(js, /eraseConnectedWhiteBackground/);
});
test("static entry points and underlying documents exist", () => {
  for(const filename of ["index.html","cut-editor.html","web/cut-editor.css","web/cut-editor.mjs","web/cut-core.mjs","docs/CUTTING-WORKFLOW.md"]){
    assert.ok(existsSync(new URL("../" + filename,import.meta.url)), filename);
  }
  assert.match(html, /web\/cut-editor\.mjs/);
  assert.match(html, /id="sourceSelect"/);
  assert.match(html, /id="assemblyCanvas"/);
  assert.ok(css.length>1000);
});
