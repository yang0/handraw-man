import { HEAD_VIEWBOX, indexAssets, defaultRecipe, validateRecipe, layerPlacements, exportHeadSvg } from "./composer.mjs";

const LABELS = { head: "头部", face: "表情", "facial-hair": "胡须", accessories: "配饰", body: "身体", pose: "全身姿势" };
const ORDER = ["head", "face", "facial-hair", "accessories", "body", "pose"];
const PAGE_SIZE = 36;
const $ = id => document.getElementById(id);
const state = { byId: null, manifest: null, recipe: null, category: "head", query: "", page: 0, busy: false };
const titleOf = asset => asset.originalFile.split("/").pop().replace(/\.svg$/i, "");

function urlOf(asset) { return "./" + asset.originalFile.split("/").map(encodeURIComponent).join("/"); }
function byCategory(category) { return [...state.byId.values()].filter(a => a.category === category); }
function message(text, error = false) { $("message").textContent = text; $("message").classList.toggle("error", error); }
function create(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function saveBlob(name, contents, mime) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function chosenAsset() {
  const id = state.recipe.mode === "source" ? state.recipe.sourceId : state.recipe.layers.head;
  return state.byId.get(id);
}
function setMode(mode) {
  state.recipe.mode = mode;
  if (mode === "source" && !state.recipe.sourceId) state.recipe.sourceId = chosenAsset()?.id || state.byId.values().next().value.id;
  update();
}
function renderCategories() {
  const el = $("categories"); el.replaceChildren();
  for (const category of ORDER) {
    const btn = create("button", state.category === category ? "cat active" : "cat", LABELS[category]);
    btn.type = "button";
    btn.appendChild(create("span", "count", String(byCategory(category).length)));
    btn.setAttribute("aria-pressed", String(state.category === category));
    btn.addEventListener("click", () => { state.category = category; state.page = 0; renderCategories(); renderGallery(); });
    el.appendChild(btn);
  }
}
function renderGallery() {
  const matches = byCategory(state.category).filter(a => titleOf(a).toLowerCase().includes(state.query) || a.category.includes(state.query));
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  state.page = Math.max(0, Math.min(state.page, pages - 1));
  const el = $("gallery"); el.replaceChildren();
  for (const asset of matches.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE)) {
    const active = asset.id === state.recipe.sourceId || Object.values(state.recipe.layers).includes(asset.id);
    const btn = create("button", active ? "asset active" : "asset");
    btn.type = "button";
    btn.title = asset.id;
    btn.setAttribute("aria-label", "选择 " + titleOf(asset));
    const art = create("span", "thumb"); const img = create("img");
    img.src = urlOf(asset); img.alt = ""; img.loading = "lazy";
    art.appendChild(img);
    btn.appendChild(art);
    btn.appendChild(create("span", "asset-name", titleOf(asset)));
    btn.addEventListener("click", () => {
      if (["head", "face", "facial-hair", "accessories"].includes(asset.category)) {
        state.recipe.layers[asset.category] = asset.id;
        state.recipe.mode = "head";
      } else {
        state.recipe.sourceId = asset.id;
        state.recipe.mode = "source";
      }
      update();
    });
    el.appendChild(btn);
  }
  if (!matches.length) el.appendChild(create("p", "tiny empty", "没有匹配的真实素材"));
  $("pageLabel").textContent = (state.page + 1) + " / " + pages;
  $("prevPage").disabled = state.page === 0;
  $("nextPage").disabled = state.page >= pages - 1;
  $("assetCount").textContent = state.byId.size + " 个原始 SVG · " + matches.length + " 个当前结果";
}
function addLayerImage(parent, layer) {
  const img = create("img", "visual-layer");
  img.src = urlOf(layer.asset);
  img.alt = LABELS[layer.category];
  img.style.left = layer.x / HEAD_VIEWBOX.width * 100 + "%";
  img.style.top = layer.y / HEAD_VIEWBOX.height * 100 + "%";
  img.style.width = layer.width / HEAD_VIEWBOX.width * 100 + "%";
  img.style.height = layer.height / HEAD_VIEWBOX.height * 100 + "%";
  parent.appendChild(img);
}
function renderPreview() {
  const board = $("artboard"); board.replaceChildren();
  if (state.recipe.mode === "head") {
    const portrait = create("div", "portrait");
    for (const layer of layerPlacements(state.recipe, state.byId, state.manifest.mirrorCommit)) addLayerImage(portrait, layer);
    board.appendChild(portrait);
    $("previewCaption").textContent = "头部组件叠加 · " + Object.values(state.recipe.layers).filter(Boolean).length + " 个真实 SVG 图层";
  } else {
    const asset = state.byId.get(state.recipe.sourceId);
    const img = create("img", "single-source");
    img.src = urlOf(asset); img.alt = titleOf(asset);
    board.appendChild(img);
    $("previewCaption").textContent = LABELS[asset.category] + " · 原始 SVG · " + titleOf(asset);
  }
  $("headMode").classList.toggle("active", state.recipe.mode === "head");
  $("sourceMode").classList.toggle("active", state.recipe.mode === "source");
  $("headMode").setAttribute("aria-selected", String(state.recipe.mode === "head"));
  $("sourceMode").setAttribute("aria-selected", String(state.recipe.mode === "source"));
  $("layerOptions").hidden = state.recipe.mode !== "head";
}
function renderSelects() {
  const selects = { head: $("headSelect"), face: $("faceSelect"), "facial-hair": $("beardSelect"), accessories: $("accessorySelect") };
  for (const [category, select] of Object.entries(selects)) {
    select.replaceChildren();
    if (category !== "head") select.add(new Option("不使用", ""));
    for (const asset of byCategory(category)) select.add(new Option(titleOf(asset), asset.id));
    select.value = state.recipe.layers[category] || "";
  }
}
function renderProvenance() {
  const asset = chosenAsset();
  $("hashValue").textContent = asset?.originalHash.slice(-12) || "—";
  $("sourceName").textContent = asset?.originalFile.split("/").slice(-2).join("/") || "—";
  $("mirrorLink").href = asset?.sourceUrl || "https://github.com/jenshor/open-peeps";
}
function update() {
  validateRecipe(state.recipe, state.byId, state.manifest.mirrorCommit);
  renderGallery(); renderSelects(); renderPreview(); renderProvenance();
  message("");
}
async function exportSvg() {
  if (state.busy) return;
  state.busy = true; $("svgDownload").disabled = true;
  try {
    if (state.recipe.mode === "source") {
      const asset = state.byId.get(state.recipe.sourceId);
      const source = await getSvg(asset);
      saveBlob("handraw-" + asset.id + ".svg", source, "image/svg+xml");
    } else {
      const placements = layerPlacements(state.recipe, state.byId, state.manifest.mirrorCommit);
      const pairings = await Promise.all(placements.map(async p => [p.id, await getSvg(p.asset)]));
      const result = exportHeadSvg(state.recipe, state.byId, state.manifest.mirrorCommit, new Map(pairings));
      saveBlob("handraw-peep-composition.svg", result, "image/svg+xml");
    }
    message("SVG 已导出。头部组合 SVG 内嵌原 SVG 图层，不是手绘新路径。");
  } catch (err) { message("导出失败：" + err.message, true); }
  finally { state.busy = false; $("svgDownload").disabled = false; }
}
async function getSvg(asset) {
  const response = await fetch(urlOf(asset));
  if (!response.ok) throw new Error("无法加载源 SVG：" + titleOf(asset));
  return response.text();
}
function bind() {
  $("search").addEventListener("input", e => { state.query = e.target.value.trim().toLowerCase(); state.page = 0; renderGallery(); });
  $("prevPage").addEventListener("click", () => { state.page--; renderGallery(); });
  $("nextPage").addEventListener("click", () => { state.page++; renderGallery(); });
  $("headMode").addEventListener("click", () => setMode("head"));
  $("sourceMode").addEventListener("click", () => setMode("source"));
  document.querySelectorAll("select[data-layer]").forEach(el => el.addEventListener("change", e => {
    state.recipe.layers[e.target.dataset.layer] = e.target.value || null;
    state.recipe.mode = "head"; update();
  }));
  $("recipeDownload").addEventListener("click", () => {
    try {
      validateRecipe(state.recipe, state.byId, state.manifest.mirrorCommit);
      saveBlob("handraw-peep-recipe.json", JSON.stringify(state.recipe, null, 2) + "\n", "application/json");
      message("配方 JSON 已导出（带固定素材快照版本）。");
    } catch (err) { message("配方导出失败：" + err.message, true); }
  });
  $("svgDownload").addEventListener("click", exportSvg);
  $("recipeImport").addEventListener("click", () => $("recipeFile").click());
  $("recipeFile").addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error("配方文件过大");
      const imported = JSON.parse(await file.text());
      validateRecipe(imported, state.byId, state.manifest.mirrorCommit);
      state.recipe = imported; update();
      message("已恢复保存的组合配方");
    } catch (err) { message("无法导入配方：" + err.message, true); }
    finally { e.target.value = ""; }
  });
  $("reset").addEventListener("click", () => { state.recipe = defaultRecipe(state.byId, state.manifest.mirrorCommit); update(); });
}
async function init() {
  try {
    const response = await fetch("./assets/sources/open-peeps/manifest.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("无法加载 manifest.json，需通过本地 HTTP 服务访问");
    state.manifest = await response.json();
    state.byId = indexAssets(state.manifest);
    state.recipe = defaultRecipe(state.byId, state.manifest.mirrorCommit);
    bind(); renderCategories(); update();
  } catch (err) {
    $("gallery").replaceChildren(create("p", "error", err.message));
    $("artboard").replaceChildren(create("p", "error", "真实素材加载失败，不使用程序绘制占位人物。"));
    message("初始化失败：" + err.message, true);
  }
}
init();
