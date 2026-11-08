import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { indexAssets, defaultRecipe, layerPlacements, exportHeadSvg } from "../web/composer.mjs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("../assets/sources/open-peeps/manifest.json", import.meta.url), "utf-8"));

test("all 164 real imported SVG assets are accepted by the app catalog", () => {
  const byId = indexAssets(manifest);
  assert.equal(byId.size, 164);
  assert.equal([...byId.values()].filter(a => a.category === "head").length, 46);
  assert.equal([...byId.values()].filter(a => a.category === "pose").length, 34);
  for (const asset of byId.values()) {
    assert.equal(existsSync(new URL("../" + asset.originalFile, import.meta.url)), true, "missing " + asset.originalFile);
    assert.equal(asset.phase1Ready, false, "raw imported artwork must not be mislabeled as pure-body white-model");
  }
});

test("real source SVGs can be combined and exported without drawing replacement paths", () => {
  const byId = indexAssets(manifest);
  const recipe = defaultRecipe(byId, manifest.mirrorCommit);
  const layer = layerPlacements(recipe, byId, manifest.mirrorCommit);
  assert.equal(layer.length, 2);
  const sourceById = new Map(layer.map(item => [item.id, readFileSync(new URL("../" + item.asset.originalFile, import.meta.url), "utf-8")]));
  const svg = exportHeadSvg(recipe, byId, manifest.mirrorCommit, sourceById);
  assert.match(svg, /viewBox="0 0 473 567"/);
  assert.equal((svg.match(/<image /g) || []).length, 2);
  assert.equal((svg.match(/data:image\/svg\+xml/g) || []).length, 2);
  assert.equal(svg, exportHeadSvg(recipe, byId, manifest.mirrorCommit, sourceById));
  assert.equal(JSON.parse(JSON.stringify(recipe)).layers.head, recipe.layers.head);
});
