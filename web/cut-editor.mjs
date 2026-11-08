import {
  PART_CATEGORIES, ANCHOR_NAMES, clampCrop, defaultCrop, imagePoint,
  anchorFromImage, eraseConnectedWhiteBackground, assertAnchors,
  makeDerivativeRecord, alignPartAnchors, safeSlug
} from "./cut-core.mjs";

const $ = id => document.getElementById(id);
const state = {
  manifest: null, source: null, crop: null, anchors: {},
  mode: "crop", tab: "cut", drag: null, revisions: [],
  previous: [], currentPart: null, parts: [], selected: null,
  compositionDrag: null, busy: false
};
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;

function status(text, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}
function fail(e) { status("操作失败：" + (e?.message || String(e)), true); }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function jsonFile(obj, name) {
  downloadBlob(new Blob([JSON.stringify(obj, null, 2) + "\n"], {type:"application/json"}), name);
}
async function sha256(blob) {
  if (!globalThis.crypto?.subtle) throw Error("当前浏览器环境不支持 SHA-256，建议使用 localhost 或 HTTPS");
  const bytes = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2,"0")).join("");
}
function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error("无法解码该图片"));
    img.src = url;
  });
}
function selectOptions(select, entries, placeholder = null) {
  select.replaceChildren();
  if (placeholder !== null) select.add(new Option(placeholder, ""));
  for (const {value,label} of entries) select.add(new Option(label, value));
}
function safeAssetUrl(asset) {
  const path = asset.originalFile;
  if (!path.startsWith("assets/sources/open-peeps/atoms/") || path.includes("..")) throw Error("非法来源路径");
  return "./" + path.split("/").map(encodeURIComponent).join("/");
}
function listSourceAssets() {
  return state.manifest?.assets.filter(a => a.category === $("sourceCategory").value) || [];
}
function setSourceOptions() {
  const assets = listSourceAssets();
  selectOptions($("sourceSelect"), assets.map(a => ({value:a.id,label:a.originalFile.split("/").pop().replace(/\.svg$/,"")})));
  $("sourceSelect").disabled = !assets.length;
}
async function fetchManifest() {
  const response = await fetch("./assets/sources/open-peeps/manifest.json");
  if (!response.ok) throw Error("加载 Open Peeps 素材清单失败");
  const manifest = await response.json();
  if (!Array.isArray(manifest.assets) || manifest.assets.length !== manifest.total) throw Error("资产清单不完整");
  state.manifest = manifest;
  setSourceOptions();
}
function currentSnapshot(reason) {
  return {reason, timestamp:new Date().toISOString(), crop:{...state.crop},
    anchors:structuredClone(state.anchors)};
}
function track(reason) {
  if (!state.crop) return;
  state.previous.push(currentSnapshot(reason));
  if (state.previous.length > 30) state.previous.shift();
  state.revisions.push(currentSnapshot(reason));
  if (state.revisions.length > 100) state.revisions.shift();
}
function edited() {
  state.currentPart = null;
  $("downloadPng").disabled = true;
  $("downloadMeta").disabled = true;
}
async function initializeSource(blob, name, details) {
  if (blob.size > MAX_FILE_BYTES) throw Error("图片超过 20MB 上限");
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImageUrl(url);
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > 32_000_000) throw Error("图片尺寸无效或超过 3200 万像素");
    const digest = await sha256(blob);
    if (state.source?.url) URL.revokeObjectURL(state.source.url);
    state.source = {url, image, blob, name, width, height, sha256:digest, ...details};
    state.crop = defaultCrop(width, height);
    state.anchors = {};
    state.revisions = [];
    state.previous = [];
    edited();
    $("sourceImage").src = url;
    $("stagePlaceholder").hidden = true;
    $("stage").classList.add("visible");
    $("partName").value = safeSlug(name.replace(/\.[^.]+$/, ""));
    $("partCategory").value = details.suggestedCategory || "other";
    $("sourceInfo").textContent = [name, width + " × " + height + " px",
      "源图 SHA-256: " + digest.slice(0,20) + "…",
      details.assetId ? "Open Peeps: " + details.assetId : "用户上传：未核验授权"]
      .join("\n");
    $("sourceInfo").style.whiteSpace="pre-line";
    resizeStage();
    await drawPreview();
    updateAnchors();
    status("已加载原始素材：" + name + "。可拖拽重新框选，原图不会被改写。");
  } catch(e) { URL.revokeObjectURL(url); throw e; }
}
async function openMirrorAsset() {
  const asset = state.manifest?.assets.find(a => a.id === $("sourceSelect").value);
  if (!asset) throw Error("请先选择真实 SVG 原件");
  const response = await fetch(safeAssetUrl(asset));
  if (!response.ok) throw Error("源文件下载失败，HTTP " + response.status);
  const blob = await response.blob();
  await initializeSource(blob, asset.originalFile.split("/").pop(), {
    sourceKind:"open-peeps-cc0", assetId:asset.id, sourceUrl:asset.sourceUrl,
    licenseEvidence:asset.licenseEvidence, gitBlobHash:asset.originalHash,
    suggestedCategory:asset.category === "pose" ? "full-body" : PART_CATEGORIES.includes(asset.category) ? asset.category : "other"
  });
}
async function openUpload(file) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw Error("只支持 PNG/JPEG/WebP 本地源图");
  await initializeSource(file, file.name, {
    sourceKind:"user-authored", assetId:null, sourceUrl:null,
    licenseEvidence:"pending-owner-review", gitBlobHash:null, suggestedCategory:"other"
  });
}
function resizeStage() {
  if (!state.source) return;
  const shell = $("stage").parentElement;
  const allowedW = Math.max(80, shell.clientWidth - 38);
  const allowedH = 580;
  const s = Math.min(allowedW / state.source.width, allowedH / state.source.height, 1);
  $("stage").style.width = Math.round(state.source.width * s) + "px";
  $("stage").style.height = Math.round(state.source.height * s) + "px";
  updateCropOutline();
  updateAnchors();
}
function updateCropOutline() {
  if (!state.source || !state.crop) return;
  const {x,y,width,height} = state.crop, src = state.source;
  const el = $("cropOutline");
  el.style.left = x/src.width*100 + "%";
  el.style.top = y/src.height*100 + "%";
  el.style.width = width/src.width*100 + "%";
  el.style.height = height/src.height*100 + "%";
  $("cropSummary").textContent = "裁切 " + width + " × " + height + " px · 起点 ("+x+", "+y+")";
  $("cropX").value = x; $("cropY").value = y;
  $("cropWidth").value = width; $("cropHeight").value = height;
}
function updateAnchors() {
  const layer=$("anchorMarkers");layer.replaceChildren();
  if (!state.source || !state.crop) return;
  const summary=[];
  for (const [name,pt] of Object.entries(state.anchors)) {
    const x=(state.crop.x+pt.x*state.crop.width)/state.source.width*100;
    const y=(state.crop.y+pt.y*state.crop.height)/state.source.height*100;
    const el=document.createElement("span");
    el.className="marker"+(name===$("anchorName").value?" current":"");
    el.style.left=x+"%";el.style.top=y+"%";el.textContent=name;
    layer.appendChild(el);
    summary.push(name+" = ("+pt.x+", "+pt.y+")");
  }
  $("anchorList").textContent=summary.length?summary.join(" · "):"暂无已标记锚点；选择锚点模式并点击选区内位置。";
  const current=state.anchors[$("anchorName").value];
  $("anchorX").value=current?current.x:"";
  $("anchorY").value=current?current.y:"";
}
function changeMode(mode) {
  state.mode=mode;
  $("cropMode").classList.toggle("active",mode==="crop");
  $("anchorMode").classList.toggle("active",mode==="anchor");
  $("cropMode").setAttribute("aria-pressed",String(mode==="crop"));
  $("anchorMode").setAttribute("aria-pressed",String(mode==="anchor"));
  $("stage").style.cursor=mode==="anchor"?"crosshair":"crosshair";
}
function cursorImagePoint(event) {
  if (!state.source) throw Error("尚未选取源图");
  return imagePoint(event.clientX,event.clientY,$("stage").getBoundingClientRect(),state.source.width,state.source.height);
}
function onStageDown(event) {
  if (!state.source || event.button!==0) return;
  event.preventDefault();
  const point=cursorImagePoint(event);
  if (state.mode==="anchor") {
    try {
      const value=anchorFromImage(point,state.crop);
      track("mark-"+$("anchorName").value);
      state.anchors[$("anchorName").value]=value;
      edited();updateAnchors();
      status("锚点 "+$("anchorName").value+" 已标记；其坐标相对于裁切件。");
    } catch(e) { fail(e); }
    return;
  }
  state.drag={start:point,end:point,original:{...state.crop}};
  $("stage").setPointerCapture(event.pointerId);
}
function onStageMove(event) {
  if (!state.drag || !state.source) return;
  const p=cursorImagePoint(event);state.drag.end=p;
  const x=Math.min(p.x,state.drag.start.x),y=Math.min(p.y,state.drag.start.y);
  const width=Math.abs(p.x-state.drag.start.x),height=Math.abs(p.y-state.drag.start.y);
  const el=$("cropOutline"),src=state.source;
  el.style.left=x/src.width*100+"%";el.style.top=y/src.height*100+"%";
  el.style.width=width/src.width*100+"%";el.style.height=height/src.height*100+"%";
}
async function onStageUp(event) {
  if (!state.drag || !state.source) return;
  const drag=state.drag;state.drag=null;
  try {
    const p=cursorImagePoint(event);
    const x=Math.min(p.x,drag.start.x),y=Math.min(p.y,drag.start.y);
    const width=Math.abs(p.x-drag.start.x),height=Math.abs(p.y-drag.start.y);
    const next=clampCrop({x,y,width,height},state.source.width,state.source.height);
    track("change-crop");
    state.crop=next;state.anchors={}; // A crop changes the normalized coordinate origin.
    edited();updateCropOutline();updateAnchors();await drawPreview();
    status("裁切选区已更新。由于坐标基准变化，旧锚点已清空；请重新标记。");
  } catch(e) {
    state.crop=drag.original;updateCropOutline();fail(e);
  }
}
function undo() {
  const last=state.previous.pop();
  if (!last) { status("没有可撤销的改动");return; }
  state.crop=last.crop;state.anchors=last.anchors;
  edited();updateCropOutline();updateAnchors();drawPreview().catch(fail);
  status("已撤销："+last.reason);
}
function resultCanvas() { return $("resultCanvas"); }
async function drawPreview() {
  if (!state.source || !state.crop) return;
  const {x,y,width,height}=state.crop;
  if (width*height>MAX_PIXELS) throw Error("裁切区域超过 1600 万像素，请缩小选区");
  const canvas=resultCanvas();
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if (!ctx) throw Error("浏览器不支持 Canvas 图像加工");
  ctx.clearRect(0,0,width,height);
  ctx.drawImage(state.source.image,x,y,width,height,0,0,width,height);
  if ($("removeWhite").checked) {
    const pixels=ctx.getImageData(0,0,width,height);
    eraseConnectedWhiteBackground(pixels,Number($("whiteThreshold").value));
    ctx.putImageData(pixels,0,0);
  }
  return canvas;
}
function pngBlob(canvas) {
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(Error("PNG 编码失败")),"image/png");
  });
}
async function makePart() {
  if (!state.source) throw Error("请先加载真实源图");
  const category=$("partCategory").value;
  if (!PART_CATEGORIES.includes(category)) throw Error("无效部件分类");
  assertAnchors(state.anchors);
  const zIndex=Number($("zIndex").value);
  const canvas=await drawPreview();
  const blob=await pngBlob(canvas);
  const hash=await sha256(blob);
  const safeSource={...state.source,name:$("partName").value.trim()||state.source.name};
  const metadata=makeDerivativeRecord({
    source:safeSource,crop:state.crop,anchors:state.anchors,category,
    pngHash:hash,zIndex,removeWhite:$("removeWhite").checked,revisions:state.revisions
  });
  metadata.original.filename=state.source.name; // Track actual source, not cosmetic part name.
  const imageUrl=URL.createObjectURL(blob);
  let image;
  try { image=await loadImageUrl(imageUrl); }
  catch(e){URL.revokeObjectURL(imageUrl);throw e;}
  // Preview assembly only copies decoded, cropped real image pixels.
  const scale=Math.min(1,370/canvas.width,690/canvas.height);
  const part={id:metadata.id,blob,imageUrl,image,metadata,width:canvas.width,height:canvas.height,
    x:350,y:450,scale,rotation:0,zIndex};
  const existing=state.parts.findIndex(p=>p.id===part.id);
  if (existing>=0){URL.revokeObjectURL(state.parts[existing].imageUrl);state.parts.splice(existing,1);}
  state.parts.push(part);state.selected=part.id;state.currentPart=part;
  $("downloadPng").disabled=false;$("downloadMeta").disabled=false;
  renderPartList();renderAssembly();updateAssemblyControls();
  status("已从真实源图裁切并归档当前会话中的部件："+metadata.id+"。请分别下载 PNG 与 JSON 以永久保存。");
}
function selectedPart() {return state.parts.find(p=>p.id===state.selected)||null;}
function renderPartList() {
  const el=$("partItems");el.replaceChildren();
  if (!state.parts.length){el.textContent="还没有部件，先到裁切工作台保存 PNG。";return;}
  for (const part of state.parts){
    const btn=document.createElement("button");btn.type="button";
    btn.className="part-item"+(part.id===state.selected?" active":"");
    const img=document.createElement("img");img.src=part.imageUrl;img.alt="";
    const label=document.createElement("span");label.textContent=part.metadata.category+" · "+part.metadata.id;
    btn.append(img,label);
    btn.addEventListener("click",()=>{state.selected=part.id;renderPartList();updateAssemblyControls();});
    el.appendChild(btn);
  }
}
function renderAssembly() {
  const canvas=$("assemblyCanvas"),ctx=canvas.getContext("2d");
  if (!ctx) throw Error("无法初始化组合画布");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const part of [...state.parts].sort((a,b)=>a.zIndex-b.zIndex)){
    ctx.save();
    ctx.translate(part.x,part.y);
    ctx.rotate(part.rotation*Math.PI/180);
    ctx.scale(part.scale,part.scale);
    ctx.drawImage(part.image,-part.width/2,-part.height/2,part.width,part.height);
    ctx.restore();
  }
}
function updateAssemblyControls() {
  const part=selectedPart();
  $("selectedPartName").textContent=part ? part.id : "尚无部件";
  const fields={placementX:"x",placementY:"y",placementScale:"scale",placementRotation:"rotation"};
  for(const [id,key] of Object.entries(fields)){
    $(id).disabled=!part;$(id).value=part?part[key]:"";
  }
  selectOptions($("movingAnchor"),part?Object.keys(part.metadata.anchors).map(n=>({value:n,label:n})):[]);
  selectOptions($("referencePart"),state.parts.filter(p=>p.id!==part?.id).map(p=>({value:p.id,label:p.id})),"请选择");
  updateReferenceAnchors();
}
function updateReferenceAnchors(){
  const part=state.parts.find(p=>p.id===$("referencePart").value);
  selectOptions($("referenceAnchor"),part?Object.keys(part.metadata.anchors).map(n=>({value:n,label:n})):[]);
}
function changePlacement() {
  const part=selectedPart();if(!part)return;
  const x=Number($("placementX").value),y=Number($("placementY").value),
    scale=Number($("placementScale").value),rotation=Number($("placementRotation").value);
  if (![x,y,scale,rotation].every(Number.isFinite)||scale<0.1||scale>5||rotation< -180||rotation>180){
    status("装配参数超出允许范围",true);return;
  }
  Object.assign(part,{x,y,scale,rotation});renderAssembly();
}
function alignAnchors() {
  const part=selectedPart(),reference=state.parts.find(p=>p.id===$("referencePart").value);
  if(!part||!reference)throw Error("先选择两个不同部件");
  const movingAnchor=$("movingAnchor").value, referenceAnchor=$("referenceAnchor").value;
  if(!movingAnchor||!referenceAnchor)throw Error("两个部件都必须有对应锚点");
  Object.assign(part,alignPartAnchors(part,movingAnchor,reference,referenceAnchor));
  renderAssembly();updateAssemblyControls();status("锚点已重合。请目视检查是否有明显缝隙或遮挡。");
}
function composeRecipe() {
  if(!state.parts.length)throw Error("至少需要一个真实裁切部件");
  return {schemaVersion:1,kind:"handraw-man-asset-composition",canvas:{width:700,height:900},
    reviewStatus:"draft",phase1Ready:false,
    layers:[...state.parts].sort((a,b)=>a.zIndex-b.zIndex).map(p=>({
      derivativeId:p.id,filename:p.metadata.processed.filename,
      sha256:p.metadata.processed.sha256,source:p.metadata.original,
      anchors:p.metadata.anchors,zIndex:p.zIndex,
      transform:{x:p.x,y:p.y,scale:p.scale,rotation:p.rotation}
    }))};
}
async function importPartFiles(files){
  const list=[...files];
  if(list.length!==2)throw Error("请同时选择一张 PNG 和相应 JSON 文件");
  const png=list.find(f=>f.name.toLowerCase().endsWith(".png"));
  const meta=list.find(f=>f.name.toLowerCase().endsWith(".json"));
  if(!png||!meta)throw Error("需要一张 PNG 与一个 JSON");
  if(png.size>MAX_FILE_BYTES||meta.size>100_000)throw Error("导入文件超过限制");
  const info=JSON.parse(await meta.text());
  if(info.schemaVersion!==1||!PART_CATEGORIES.includes(info.category)||!info.original||!info.processed)throw Error("不是受支持的部件配方");
  if(info.processed.filename!==png.name)throw Error("PNG 文件名与元数据不符");
  if(!/^sha256:[a-f0-9]{64}$/.test(info.original.sha256||"")||
     !/^sha256:[a-f0-9]{64}$/.test(info.processed.sha256||""))throw Error("来源哈希缺失");
  assertAnchors(info.anchors);
  const digest=await sha256(png);
  if(info.processed.sha256!=="sha256:"+digest)throw Error("PNG SHA-256 与记录不匹配，文件可能已修改");
  const url=URL.createObjectURL(png);
  let image;
  try {image=await loadImageUrl(url);}
  catch(e){URL.revokeObjectURL(url);throw e;}
  if(image.naturalWidth!==info.processed.width||image.naturalHeight!==info.processed.height){
    URL.revokeObjectURL(url);throw Error("PNG 尺寸不一致");
  }
  info.reviewStatus="draft";info.phase1Ready=false;
  const width=image.naturalWidth,height=image.naturalHeight;
  const part={id:info.id,blob:png,imageUrl:url,image,metadata:info,width,height,
    x:350,y:450,scale:Math.min(1,370/width,690/height),rotation:0,
    zIndex:Number.isInteger(info.zIndex)?info.zIndex:0};
  const existing=state.parts.findIndex(p=>p.id===part.id);
  if(existing>=0){URL.revokeObjectURL(state.parts[existing].imageUrl);state.parts.splice(existing,1);}
  state.parts.push(part);state.selected=part.id;renderPartList();renderAssembly();updateAssemblyControls();
  status("已载入并校验裁切部件："+part.id);
}
function setTab(name) {
  state.tab=name;
  $("cutWorkspace").hidden=name!=="cut";
  $("assembleWorkspace").hidden=name!=="assemble";
  $("cutTab").classList.toggle("active",name==="cut");
  $("assembleTab").classList.toggle("active",name==="assemble");
  $("cutTab").setAttribute("aria-pressed",String(name==="cut"));
  $("assembleTab").setAttribute("aria-pressed",String(name==="assemble"));
  if(name==="assemble")renderAssembly();
  else resizeStage();
}
function bind() {
  $("sourceCategory").addEventListener("change",setSourceOptions);
  $("openSource").addEventListener("click",async()=>{try{await openMirrorAsset();}catch(e){fail(e);}});
  $("uploadSource").addEventListener("change",async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    try{await openUpload(file);}catch(error){fail(error);}finally{e.target.value="";}
  });
  $("cropMode").addEventListener("click",()=>changeMode("crop"));
  $("anchorMode").addEventListener("click",()=>changeMode("anchor"));
  $("anchorName").addEventListener("change",updateAnchors);
  $("applyCrop").addEventListener("click", async()=>{
    if(!state.source)return fail(Error("尚未加载源图"));
    try{
      const crop=clampCrop({
        x:Number($("cropX").value),y:Number($("cropY").value),
        width:Number($("cropWidth").value),height:Number($("cropHeight").value)
      },state.source.width,state.source.height);
      track("set-crop-numerically");
      state.crop=crop;state.anchors={};edited();
      updateCropOutline();updateAnchors();await drawPreview();
      status("精确裁切区域已应用，原锚点已清空。");
    }catch(e){fail(e);updateCropOutline();}
  });
  $("applyAnchor").addEventListener("click",()=>{
    if(!state.source)return fail(Error("尚未加载源图"));
    try{
      if($("anchorX").value===""||$("anchorY").value==="")throw Error("请输入 0–1 的锚点 X/Y 坐标");
      const x=Number($("anchorX").value),y=Number($("anchorY").value);
      assertAnchors({[$("anchorName").value]:{x,y}});
      track("set-anchor-numerically-"+$("anchorName").value);
      state.anchors[$("anchorName").value]={x,y};edited();updateAnchors();
      status("精确锚点已应用。");
    }catch(e){fail(e);}
  });
  $("stage").addEventListener("pointerdown",onStageDown);
  $("stage").addEventListener("pointermove",onStageMove);
  $("stage").addEventListener("pointerup",e=>onStageUp(e).catch(fail));
  $("stage").addEventListener("pointercancel",()=>{
    if(state.drag){state.crop=state.drag.original;state.drag=null;updateCropOutline();}
  });
  $("clearAnchor").addEventListener("click",()=>{
    const name=$("anchorName").value;
    if(!Object.hasOwn(state.anchors,name))return;
    track("remove-"+name);delete state.anchors[name];edited();updateAnchors();
  });
  $("undo").addEventListener("click",undo);
  $("removeWhite").addEventListener("change",()=>{edited();drawPreview().catch(fail);});
  $("whiteThreshold").addEventListener("input",e=>{
    $("thresholdLabel").value=e.target.value;edited();
    if($("removeWhite").checked)drawPreview().catch(fail);
  });
  $("partCategory").addEventListener("change",edited);
  $("partName").addEventListener("input",edited);
  $("zIndex").addEventListener("input",edited);
  $("savePart").addEventListener("click",async()=>{
    if(state.busy)return;
    state.busy=true;$("savePart").disabled=true;
    try{await makePart();}catch(e){fail(e);}
    finally{state.busy=false;$("savePart").disabled=false;}
  });
  $("downloadPng").addEventListener("click",()=>{
    if(state.currentPart)downloadBlob(state.currentPart.blob,state.currentPart.metadata.processed.filename);
  });
  $("downloadMeta").addEventListener("click",()=>{
    if(state.currentPart){
      const name=state.currentPart.metadata.processed.filename.replace(/\.png$/,".json");
      jsonFile(state.currentPart.metadata,name);
    }
  });
  $("cutTab").addEventListener("click",()=>setTab("cut"));
  $("assembleTab").addEventListener("click",()=>setTab("assemble"));
  $("importParts").addEventListener("change",async e=>{
    try{await importPartFiles(e.target.files);}catch(error){fail(error);}
    finally{e.target.value="";}
  });
  for(const id of ["placementX","placementY","placementScale","placementRotation"]){
    $(id).addEventListener("input",changePlacement);
  }
  $("referencePart").addEventListener("change",updateReferenceAnchors);
  $("alignAnchors").addEventListener("click",()=>{try{alignAnchors();}catch(e){fail(e);}});
  $("exportAssemblyJson").addEventListener("click",()=>{
    try{jsonFile(composeRecipe(),"handraw-man-assembly.json");status("组合配方已导出；须同时保存每张裁切件 PNG/JSON。");}catch(e){fail(e);}
  });
  $("exportAssemblyPng").addEventListener("click",async()=>{
    try {
      if(!state.parts.length)throw Error("暂无已裁切素材可导出");
      renderAssembly();
      downloadBlob(await pngBlob($("assemblyCanvas")),"handraw-man-assembly.png");
      status("组合 PNG 已导出；请继续检查连接位置和遮挡。");
    }catch(e){fail(e);}
  });
  const canvas=$("assemblyCanvas");
  canvas.addEventListener("pointerdown",e=>{
    const part=selectedPart();if(!part||e.button!==0)return;
    const rect=canvas.getBoundingClientRect();
    state.compositionDrag={px:e.clientX,py:e.clientY,scaleX:canvas.width/rect.width,scaleY:canvas.height/rect.height};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove",e=>{
    const drag=state.compositionDrag,part=selectedPart();
    if(!drag||!part)return;
    part.x+=(e.clientX-drag.px)*drag.scaleX;
    part.y+=(e.clientY-drag.py)*drag.scaleY;
    drag.px=e.clientX;drag.py=e.clientY;
    $("placementX").value=Math.round(part.x);
    $("placementY").value=Math.round(part.y);
    renderAssembly();
  });
  const end=()=>{state.compositionDrag=null;};
  canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
  window.addEventListener("resize",resizeStage);
}
async function init() {
  bind();
  try {
    await fetchManifest();
    await openMirrorAsset();
    renderPartList();updateAssemblyControls();
    status("可用：真实 SVG 裁切 / 锚点标记 / 透明 PNG 导出 / 带哈希来源 JSON / 分层装配。");
  } catch(e){fail(e);}
}
init();
