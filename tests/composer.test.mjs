import test from "node:test";
import assert from "node:assert/strict";
import { HEAD_LAYERS, indexAssets, defaultRecipe, validateRecipe, layerPlacements, exportHeadSvg } from "../web/composer.mjs";

const prefix = "assets/sources/open-peeps/atoms/";
const commit = "c".repeat(40);
function asset(category, filename) {
  return { id: "open-peeps-" + category.replaceAll("/", "-") + "-" + filename.replace(/\.svg$/, "").toLowerCase().replaceAll(" ", "-"), category,
    originalFile: prefix + category + "/" + filename, originalHash: "git-blob-sha1:" + "a".repeat(40) };
}
const resources = [
  asset("head", "No Hair 1.svg"), asset("face", "Smile.svg"),
  asset("facial-hair", "Full.svg"), asset("accessories", "Glasses.svg"),
  asset("pose", "standing/walking-1.svg")
];
const byId = indexAssets({ total: resources.length, assets: resources });
const svgText = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 473 567"><path d="M0 0"/></svg>';

test("manifest indexes only constrained real source file paths", () => {
  assert.equal(byId.size, 5);
  assert.throws(() => indexAssets({ total: 1, assets: [ { ...resources[0], originalFile: prefix + "head/../oops.svg" } ] }), /非法素材路径/);
  assert.throws(() => indexAssets({ total: 2, assets: [resources[0], resources[0]] }), /重复/);
});
test("default head recipe uses actual registered SVG IDs", () => {
  const recipe = defaultRecipe(byId, commit);
  assert.equal(recipe.layers.head, resources[0].id);
  assert.equal(recipe.layers.face, resources[1].id);
  assert.equal(recipe.layers.accessories, null);
  assert.equal(layerPlacements(recipe, byId, commit).length, 2);
});
test("mismatched components and missing source are rejected", () => {
  const recipe = defaultRecipe(byId, commit);
  recipe.layers.face = resources[4].id;
  assert.throws(() => validateRecipe(recipe, byId, commit), /分类不符/);
  recipe.layers.face = null;
  assert.throws(() => validateRecipe(recipe, byId, "d".repeat(40)), /版本不一致/);
  recipe.mode = "source"; recipe.sourceId = "missing";
  assert.throws(() => validateRecipe(recipe, byId, commit), /不存在/);
});
test("SVG assembly contains existing source data only and respects offsets", () => {
  const recipe = defaultRecipe(byId, commit);
  recipe.layers.accessories = resources[3].id;
  const sourceById = new Map([resources[0], resources[1], resources[3]].map(a => [a.id, svgText]));
  const output = exportHeadSvg(recipe, byId, commit, sourceById);
  assert.equal((output.match(/<image /g) || []).length, 3);
  assert.match(output, /data:image\/svg\+xml;charset=utf-8/);
  assert.match(output, /data-source-id="open-peeps-head-no-hair-1"/);
  assert.match(output, new RegExp('x="' + HEAD_LAYERS.face.x + '"'));
  assert.doesNotMatch(output, /<path\b/);
  assert.equal(output, exportHeadSvg(recipe, byId, commit, sourceById));
});
test("SVG assembly rejects missing real source data", () => {
  assert.throws(() => exportHeadSvg(defaultRecipe(byId, commit), byId, commit, new Map()), /源 SVG 未获取/);
});
