/**
 * Bamboo-001 draft composition viewer.
 * It draws ONLY already generated PNGs via drawImage; no lines, paths,
 * geometric human silhouettes, face reconstruction, or new body pixels.
 */
const $ = id=>document.getElementById(id);
const SOURCE_PATH="./assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/manifest.json";
const state={catalog:null,parts:[],selected:null,images:new Map()};
const names={head:"头部",torso:"躯干","left-arm":"左手臂","right-arm":"右手臂","left-leg":"左腿","right-leg":"右腿"};
function status(message,error=false){
  $("status").textContent=message;
  $("status").style.color=error?"#ab3737":"#56775b";
}
async function loadImage(path){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(Error("真实部件加载失败: "+path));
    img.src="./"+path;
  });
}
function filenameOf(part){return part.file.split("/").at(-1);}
function selected(){return state.parts.find(p=>p.id===state.selected);}
function draw(){
  const canvas=$("board"),ctx=canvas.getContext("2d");
  if(!ctx)throw Error("当前浏览器无法处理 PNG 预览");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const part of state.parts){
    if(!part.visible)continue;
    const [x,y]=part.sourceBoundsXYXY;
    const img=state.images.get(part.id);
    if(img)ctx.drawImage(img,x+part.offsetX,y+part.offsetY);
  }
  const moved=state.parts.filter(p=>p.offsetX||p.offsetY);
  $("composeLabel").textContent=moved.length?
    "已有 "+moved.length+" 个部件被移动；关节切口可能出现断裂":
    "全部原位 · 像素级重组已通过离线检查";
}
function updateControls(){
  const part=selected();
  $("selectedLabel").textContent=part?part.id+" · "+part.width+" × "+part.height:"未选中";
  for(const axis of ["X","Y"]){
    const control=$("position"+axis);
    control.disabled=!part;
    control.value=part?part["offset"+axis]:0;
    $("value"+axis).value=control.value;
  }
  $("zeroSelected").disabled=!part;
}
function renderList(){
  const root=$("partList");root.replaceChildren();
  for(const part of state.parts){
    const row=document.createElement("div");row.className="part"+(part.id===state.selected?" selected":"");
    const box=document.createElement("input");box.type="checkbox";box.checked=part.visible;
    box.setAttribute("aria-label","显示"+names[part.category]);
    box.addEventListener("change",()=>{part.visible=box.checked;draw();});
    const image=document.createElement("img");image.src="./"+part.file;image.alt="";
    const details=document.createElement("div");details.className="info";
    const btn=document.createElement("button");btn.className="choose";
    btn.textContent=names[part.category]||part.category;
    btn.type="button";
    btn.addEventListener("click",()=>{state.selected=part.id;renderList();updateControls();});
    const caption=document.createElement("small");caption.textContent=part.width+" × "+part.height+" · Draft";
    details.append(btn,caption);row.append(box,image,details);root.append(row);
  }
}
function blobSave(blob,name){
  const href=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=href;anchor.download=name;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(href),4000);
}
function recipe(){
  if(!state.catalog)throw Error("缺少真实素材清单");
  return {
    schemaVersion:1,kind:"bamboo-001-actual-pixel-assembly",
    sourceSha256:state.catalog.source.sha256,
    reviewStatus:"draft",phase1Ready:false,
    actualImageFiles:state.parts.map(p=>({
      id:p.id,file:p.file,sha256:p.sha256,
      sourceBoundsXYXY:p.sourceBoundsXYXY,
      offset:{x:p.offsetX,y:p.offsetY},
      visible:p.visible,
      anchors:p.anchors
    }))
  };
}
function bind(){
  $("reset").addEventListener("click",()=>{
    for(const p of state.parts){p.offsetX=0;p.offsetY=0;p.visible=true;}
    draw();renderList();updateControls();status("已恢复所有真实部件的原始像素坐标");
  });
  $("zeroSelected").addEventListener("click",()=>{
    const p=selected();if(!p)return;
    p.offsetX=p.offsetY=0;draw();updateControls();
  });
  for(const axis of ["X","Y"]){
    $("position"+axis).addEventListener("input",e=>{
      const p=selected();if(!p)return;
      p["offset"+axis]=Number(e.target.value);
      $("value"+axis).value=e.target.value;draw();
    });
  }
  $("downloadRecipe").addEventListener("click",()=>{
    try{
      const content=JSON.stringify(recipe(),null,2)+"\n";
      blobSave(new Blob([content],{type:"application/json"}),"bamboo-001-parts-recipe.json");
    }catch(e){status(e.message,true);}
  });
  $("downloadPng").addEventListener("click",()=>{
    try{
      if(!state.catalog)throw Error("素材尚未载入");
      draw();$("board").toBlob(blob=>{
        if(!blob)return status("PNG 编码失败",true);
        blobSave(blob,"bamboo-001-parts-composition.png");
      },"image/png");
    }catch(e){status(e.message,true);}
  });
}
async function init(){
  bind();
  const response=await fetch(SOURCE_PATH,{cache:"no-store"});
  if(!response.ok)throw Error("六个真实部件的清单不存在，请运行素材切割脚本");
  const data=await response.json();
  if(data.schemaVersion!==1||data.assetId!=="bamboo-001"||
     !Array.isArray(data.parts)||data.parts.length!==6||
     data.reviewStatus!=="draft"||data.phase1Ready!==false){
    throw Error("素材注册或审核状态异常");
  }
  state.catalog=data;
  state.parts=data.parts.map(item=>({...item,offsetX:0,offsetY:0,visible:true}));
  for(const part of state.parts){
    if(!/^assets\/candidates\/phase1-fullbody-2026-11-08\/parts\/bamboo-001\/[a-z-]+\.png$/.test(part.file))
      throw Error("意外的素材文件路径");
  }
  const imgs=await Promise.all(state.parts.map(p=>loadImage(p.file)));
  for(let i=0;i<state.parts.length;i++){
    if(imgs[i].naturalWidth!==state.parts[i].width||imgs[i].naturalHeight!==state.parts[i].height)
      throw Error("图片尺寸与真实资产清单不一致: "+state.parts[i].id);
    state.images.set(state.parts[i].id,imgs[i]);
  }
  state.selected=state.parts[0].id;
  renderList();updateControls();draw();status("6 个 PNG 源像素部件已加载。原位恢复通过；变换后的关节质量仍待审核。");
}
init().catch(e=>status("加载失败："+e.message,true));
