/**
 * Joint QA viewer for REAL Bamboo-001 PNG cutouts.
 * Never draws human geometry. Only place/rotate/scale pre-existing image pixels.
 */
import {
  chooseDefaultPivot,neutralPart,validateTransform,imageTransform,anchorPlacement,
  isOriginalPose,posePreset,exportPoseRecipe,validateImportedPose,buildJointQARecord
} from "./part-transform.mjs";

const $=id=>document.getElementById(id);
const SOURCE="./assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/manifest.json";
const BOARD={width:994,height:1573,originX:300,originY:40};
const names={head:"头部",torso:"躯干","left-arm":"左手臂","right-arm":"右手臂","left-leg":"左腿","right-leg":"右腿"};
const state={catalog:null,parts:[],images:new Map(),selected:null,preset:"neutral"};
function status(message,error=false) {
  $("status").textContent=message;
  $("status").style.color=error?"#a23c38":"#52775c";
}
function sourceUrl(file) {
  if(!/^assets\/candidates\/phase1-fullbody-2026-11-08\/parts\/bamboo-001\/[a-z-]+\.png$/.test(file))
    throw Error("素材路径不在已审核来源目录");
  return "./"+file;
}
async function loadImage(part) {
  if(!globalThis.crypto?.subtle)throw Error("图片完整性校验需要 localhost 或 HTTPS 安全上下文");
  const response=await fetch(sourceUrl(part.file),{cache:"no-store"});
  if(!response.ok)throw Error("真实 PNG 加载失败："+part.id);
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==part.sizeBytes)throw Error("实际图片字节大小和清单不一致："+part.id);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  const hex=[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,"0")).join("");
  if("sha256:"+hex!==part.sha256)throw Error("图片 SHA-256 校验失败："+part.id);
  const url=URL.createObjectURL(new Blob([bytes],{type:"image/png"}));
  try{
    return await new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(Error("真实 PNG 解码失败："+part.id));
      image.src=url;
    });
  } finally {URL.revokeObjectURL(url);}
}
function selectedPart() { return state.parts.find(p=>p.id===state.selected)||null; }
function draw() {
  const canvas=$("board"),ctx=canvas.getContext("2d");
  if(!ctx)throw Error("当前浏览器不支持真实 PNG 合成");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(BOARD.originX,BOARD.originY);
  for(const p of state.parts) {
    if(!p.visible)continue;
    const img=state.images.get(p.id);
    if(!img)continue;
    const t=imageTransform(p);
    ctx.save();
    ctx.translate(t.translateX,t.translateY);
    ctx.rotate(t.rotationRadians);
    ctx.scale(t.scale,t.scale);
    ctx.drawImage(img,t.offsetImageX,t.offsetImageY); // existing source bytes ONLY
    ctx.restore();
  }
  ctx.restore();
  renderAnchors();
  const neutral=isOriginalPose(state.parts);
  $("composeLabel").textContent=neutral?
    "原始中立姿态 · 六张真实 PNG 原位合成" :
    "活动姿态试验 · 未经过关节视觉审查，禁止发布";
  $("poseQuality").textContent=neutral?
    "原位回拼已通过离线像素一致性检查" :
    "接缝待修复：这只是已有 PNG 的变换预览";
  $("poseQuality").classList.toggle("risk",!neutral);
}
function renderAnchors() {
  const root=$("anchorOverlay");root.replaceChildren();
  if(!$("showAnchors").checked)return;
  const p=selectedPart();
  if(!p)return;
  for(const [name] of Object.entries(p.anchors)){
    const pos=anchorPlacement(p,name);
    const el=document.createElement("span");
    el.className="anchor-dot"+(name===p.pivotAnchor?" active":"");
    el.textContent=name;
    el.style.left=(pos.x+BOARD.originX)/BOARD.width*100+"%";
    el.style.top=(pos.y+BOARD.originY)/BOARD.height*100+"%";
    root.append(el);
  }
}
function renderList() {
  const root=$("partList");root.replaceChildren();
  for(const p of state.parts){
    const row=document.createElement("div");
    row.className="part"+(p.id===state.selected?" selected":"");
    const visible=document.createElement("input");visible.type="checkbox";visible.checked=p.visible;
    visible.setAttribute("aria-label","显示"+names[p.category]);
    visible.addEventListener("change",()=>{
      p.visible=visible.checked;setCustom();draw();
    });
    const img=document.createElement("img");img.src=sourceUrl(p.file);img.alt="";
    const content=document.createElement("div");content.className="info";
    const button=document.createElement("button");button.type="button";button.className="choose";
    button.textContent=names[p.category]||p.category;
    button.addEventListener("click",()=>{
      state.selected=p.id;renderList();updateControls();draw();
    });
    const detail=document.createElement("small");
    detail.textContent=p.width+"×"+p.height+" · "+p.pivotAnchor+" · 未审";
    content.append(button,detail);row.append(visible,img,content);root.append(row);
  }
}
function updateControls() {
  const p=selectedPart();
  $("selectedLabel").textContent=p?names[p.category]+" · "+p.width+"×"+p.height+" · Draft":"尚未选择部件";
  for(const [id,value] of [
    ["positionX",p?.offsetX??0],["positionY",p?.offsetY??0],
    ["rotation",p?.rotation??0],["scale",Math.round((p?.scale??1)*100)]
  ]){
    $(id).disabled=!p;$(id).value=value;
  }
  $("valueX").value=p?.offsetX??0;
  $("valueY").value=p?.offsetY??0;
  $("valueRotation").value=(p?.rotation??0)+"°";
  $("valueScale").value=Math.round((p?.scale??1)*100)+"%";
  const pivot=$("pivotAnchor");pivot.replaceChildren();
  if(p){
    for(const name of Object.keys(p.anchors)){
      pivot.add(new Option(name+" · 源图 ("+p.anchors[name].sourceX+", "+p.anchors[name].sourceY+")",name));
    }
    pivot.value=p.pivotAnchor;
  }
  pivot.disabled=!p;
  $("zeroSelected").disabled=!p;
}
function setCustom(){
  state.preset="custom";
  $("posePreset").value="custom";
}
function showPreset(name) {
  state.parts=posePreset(state.parts,name);
  state.preset=name;
  $("posePreset").value=name;
  draw();renderList();updateControls();
  status(name==="neutral"?"已恢复真实原位重组":"已加载模拟姿态；请检查关节缺口，不代表已经修复");
}
function saveBlob(blob,filename){
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function saveJSON(obj,filename){
  saveBlob(new Blob([JSON.stringify(obj,null,2)+"\n"],{type:"application/json"}),filename);
}
function applyControl(control,key,convert=x=>Number(x)){
  $(control).addEventListener("input",e=>{
    const p=selectedPart();if(!p)return;
    const v=convert(e.target.value);
    const backup=p[key];
    p[key]=v;
    try{validateTransform(p);}
    catch(error){p[key]=backup;status(error.message,true);return;}
    setCustom();updateControls();draw();
  });
}
function bind(){
  $("reset").addEventListener("click",()=>showPreset("neutral"));
  $("zeroSelected").addEventListener("click",()=>{
    const p=selectedPart();if(!p)return;
    Object.assign(p,{offsetX:0,offsetY:0,rotation:0,scale:1,pivotAnchor:chooseDefaultPivot(p)});
    setCustom();updateControls();renderList();draw();
  });
  applyControl("positionX","offsetX");
  applyControl("positionY","offsetY");
  applyControl("rotation","rotation");
  applyControl("scale","scale",v=>Number(v)/100);
  $("pivotAnchor").addEventListener("change",e=>{
    const p=selectedPart();if(!p)return;
    const old=p.pivotAnchor;p.pivotAnchor=e.target.value;
    try{validateTransform(p);}catch(error){p.pivotAnchor=old;return status(error.message,true);}
    setCustom();renderList();draw();
  });
  $("showAnchors").addEventListener("change",renderAnchors);
  $("applyPreset").addEventListener("click",()=>{
    const name=$("posePreset").value;
    if(name==="custom")return status("当前为自定义姿态，不能重新应用此选项",true);
    try{showPreset(name);}catch(error){status(error.message,true);}
  });
  $("downloadRecipe").addEventListener("click",()=>{
    try{saveJSON(exportPoseRecipe(state.parts,state.catalog),"bamboo-001-joint-recipe.json");}
    catch(error){status(error.message,true);}
  });
  $("importRecipe").addEventListener("click",()=>$("recipeFile").click());
  $("recipeFile").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try {
      if(file.size>100000)throw Error("配方文件超过100KB");
      const json=JSON.parse(await file.text());
      state.parts=validateImportedPose(json,state.catalog);
      state.selected=state.parts[0].id;
      setCustom();renderList();updateControls();draw();
      status("已按真实 PNG 哈希校验并恢复六个部件的姿态；仍为未批准草稿");
    }catch(error){status("导入失败："+error.message,true);}
    finally{e.target.value="";}
  });
  $("downloadQA").addEventListener("click",()=>{
    try{
      const report=buildJointQARecord(state.parts,state.catalog,{
        defect:$("qaDefect").value,notes:$("qaNotes").value
      });
      saveJSON(report,"bamboo-001-joint-defect-report.json");
      status("接缝审查记录已导出：本批部件仍为 Draft，不能作为已修复素材发布");
    }catch(error){status(error.message,true);}
  });
  $("downloadPng").addEventListener("click",()=>{
    try{
      if(!state.catalog)throw Error("真实素材尚未加载");
      draw();
      $("board").toBlob(blob=>{
        if(!blob)return status("无法导出 PNG",true);
        saveBlob(blob,"bamboo-001-joint-preview.png");
      },"image/png");
    }catch(error){status(error.message,true);}
  });
}
async function init(){
  bind();
  const response=await fetch(SOURCE,{cache:"no-store"});
  if(!response.ok)throw Error("真实部件清单不存在");
  const data=await response.json();
  if(data.schemaVersion!==1||data.assetId!=="bamboo-001"||
     data.reviewStatus!=="draft"||data.phase1Ready!==false||
     !Array.isArray(data.parts)||data.parts.length!==6)throw Error("真实部件审查状态异常");
  const parts=posePreset(data.parts,"neutral");
  const loaded=await Promise.all(parts.map(p=>loadImage(p)));
  for(let i=0;i<parts.length;i++){
    const p=parts[i];
    if(p.reviewStatus!=="draft"||p.phase1Ready!==false||p.articulatedJoinReviewed!==false)
      throw Error("发现未经允许发布的关节素材");
    if(loaded[i].naturalWidth!==p.width||loaded[i].naturalHeight!==p.height)
      throw Error("真实 PNG 尺寸与来源不符："+p.id);
    state.images.set(p.id,loaded[i]);
  }
  state.catalog=data;state.parts=parts;state.selected=parts[0].id;
  renderList();updateControls();draw();
  status("已加载 6 个真实 PNG；所有锚点暂为 estimated-unreviewed，旋转后接缝必须人工检查。");
}
init().catch(error=>status("加载失败："+error.message,true));
