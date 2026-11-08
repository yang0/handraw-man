/**
 * Open Peeps component placement and export.
 * No procedural human drawing: all visual layers come from existing SVG files.
 */
export const HEAD_VIEWBOX = Object.freeze({ width: 473, height: 567 });
export const HEAD_LAYERS = Object.freeze({
  head: Object.freeze({ x: 0, y: 0, width: 473, height: 567 }),
  face: Object.freeze({ x: 133.03, y: 186.05, width: 289, height: 293 }),
  "facial-hair": Object.freeze({ x: 101, y: 336.66, width: 280, height: 230 }),
  accessories: Object.freeze({ x: 39.42, y: 242.16, width: 392, height: 138 })
});
export const HEAD_LAYER_ORDER = Object.freeze(["head", "face", "facial-hair", "accessories"]);
export const SOURCE_PREFIX = "assets/sources/open-peeps/atoms/";
const ALLOWED_CATEGORIES = new Set(["head", "face", "facial-hair", "accessories", "body", "pose"]);

export function assertAsset(asset) {
  if (!asset || typeof asset !== "object") throw new Error("无效素材记录");
  if (typeof asset.id !== "string" || !/^open-peeps-[a-z0-9-]+$/.test(asset.id)) throw new Error("素材 ID 格式不正确");
  if (!ALLOWED_CATEGORIES.has(asset.category)) throw new Error("素材分类不受支持");
  if (typeof asset.originalFile !== "string" || !asset.originalFile.startsWith(SOURCE_PREFIX)) throw new Error("素材路径不允许");
  const remainder = asset.originalFile.slice(SOURCE_PREFIX.length);
  if (!/^[\w\- .()/]+\.svg$/.test(remainder) || remainder.includes("..") || remainder.startsWith("/") || !remainder.startsWith(asset.category + "/")) throw new Error("非法素材路径");
  if (typeof asset.originalHash !== "string" || !/^git-blob-sha1:[a-f0-9]{40}$/.test(asset.originalHash)) throw new Error("素材哈希缺失");
  return asset;
}

export function indexAssets(manifest) {
  if (!manifest || !Array.isArray(manifest.assets)) throw new Error("素材清单缺失");
  const byId = new Map();
  for (const item of manifest.assets) {
    assertAsset(item);
    if (byId.has(item.id)) throw new Error("重复素材 ID：" + item.id);
    byId.set(item.id, item);
  }
  if (manifest.total !== byId.size) throw new Error("清单总数与实际素材数不匹配");
  return byId;
}

export function firstOfCategory(byId, category, filename) {
  const records = [...byId.values()].filter(a => a.category === category);
  return records.find(a => a.originalFile.endsWith("/" + filename)) || records[0] || null;
}

export function defaultRecipe(byId, sourceCommit) {
  const head = firstOfCategory(byId, "head", "No Hair 1.svg");
  if (!head) throw new Error("缺少真实头部素材，不能伪造绘制");
  const face = firstOfCategory(byId, "face", "Smile.svg");
  return {
    schemaVersion: 1,
    kind: "open-peeps-layer-composition",
    upstreamCommit: sourceCommit,
    mode: "head",
    layers: {
      head: head.id,
      face: face ? face.id : null,
      "facial-hair": null,
      accessories: null
    },
    sourceId: null
  };
}

export function validateRecipe(recipe, byId, expectedCommit) {
  if (!recipe || recipe.schemaVersion !== 1 || recipe.kind !== "open-peeps-layer-composition") throw new Error("不受支持的配方版本");
  if (recipe.upstreamCommit !== expectedCommit) throw new Error("素材快照版本不一致；拒绝不兼容的配方");
  if (recipe.mode !== "head" && recipe.mode !== "source") throw new Error("无效预览模式");
  const layers = recipe.layers;
  if (!layers || typeof layers !== "object" || Array.isArray(layers) || Object.keys(layers).some(k => !HEAD_LAYER_ORDER.includes(k))) throw new Error("非法图层集合");
  for (const category of HEAD_LAYER_ORDER) {
    const id = layers[category];
    if (id == null && category !== "head") continue;
    const asset = byId.get(id);
    if (!asset || asset.category !== category) throw new Error(category + " 图层素材不存在或分类不符");
  }
  if (recipe.mode === "source" && !byId.has(recipe.sourceId)) throw new Error("单件素材不存在");
  return recipe;
}

export function layerPlacements(recipe, byId, commit) {
  validateRecipe(recipe, byId, commit);
  if (recipe.mode !== "head") return [];
  return HEAD_LAYER_ORDER.filter(category => recipe.layers[category]).map(category => ({
    category,
    id: recipe.layers[category],
    asset: byId.get(recipe.layers[category]),
    ...HEAD_LAYERS[category]
  }));
}

function escapeXml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
export function exportHeadSvg(recipe, byId, commit, sourceById) {
  const layers = layerPlacements(recipe, byId, commit);
  if (!layers.length) throw new Error("没有真实素材图层");
  const images = layers.map(layer => {
    const svg = sourceById.get(layer.id);
    if (typeof svg !== "string" || !/^\s*(<\?xml[^>]*>\s*)?<svg\b/.test(svg)) throw new Error("源 SVG 未获取：" + layer.id);
    if (/<\s*(script|foreignObject|image)\b|\son[a-z]+\s*=/.test(svg)) throw new Error("源 SVG 含不受支持的元素");
    const href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return '  <image x="' + layer.x + '" y="' + layer.y + '" width="' + layer.width + '" height="' + layer.height + '" href="' + escapeXml(href) + '" data-source-id="' + escapeXml(layer.id) + '"/>';
  }).join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="473" height="567" viewBox="0 0 473 567">\n' +
    '  <title>Open Peeps asset composition · HandRaw Man</title>\n' +
    '  <desc>Layered existing artwork; component visuals are not procedurally drawn. Open Peeps by Pablo Stanley, CC0.</desc>\n' +
    images + '\n</svg>\n';
}
