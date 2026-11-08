/**
 * Deterministic positioning of EXISTING raster parts around recorded joint anchors.
 * No human geometry, path, SVG, Canvas drawing primitives or missing pixels.
 */
export const DEFAULT_PIVOTS=Object.freeze({
  "head":"neck","torso":"neck",
  "left-arm":"shoulderL","right-arm":"shoulderR",
  "left-leg":"hipL","right-leg":"hipR"
});
export const PRESETS=Object.freeze({
  neutral:Object.freeze({}),
  "arms-out":Object.freeze({"left-arm":32,"right-arm":-32}),
  "walk-test":Object.freeze({"left-arm":-10,"right-arm":10,"left-leg":10,"right-leg":-10})
});
const MAX_OFFSET=120;
const MAX_ANGLE=90;
const MIN_SCALE=.8;
const MAX_SCALE=1.2;

function finite(value,name) {
  if(typeof value!=="number"||!Number.isFinite(value))throw Error(name+" 需要有限数字");
  return value;
}
function within(value,lo,hi,name) {
  finite(value,name);
  if(value<lo||value>hi)throw Error(name+" 超出允许范围 "+lo+".."+hi);
  return value;
}
export function chooseDefaultPivot(part) {
  const key=DEFAULT_PIVOTS[part.category];
  if(!key||!part.anchors||!Object.hasOwn(part.anchors,key))throw Error("部件缺少合法连接锚点: "+part?.id);
  return key;
}
export function neutralPart(original) {
  return {...original,pivotAnchor:chooseDefaultPivot(original),visible:true,
    offsetX:0,offsetY:0,rotation:0,scale:1};
}
export function validateTransform(part) {
  if(!part||typeof part!=="object"||!part.anchors)throw Error("无效部件");
  if(!Object.hasOwn(part.anchors,part.pivotAnchor))throw Error("不存在此图层锚点: "+part.pivotAnchor);
  const anchor=part.anchors[part.pivotAnchor];
  if(!anchor||!Number.isFinite(anchor.sourceX)||!Number.isFinite(anchor.sourceY))
    throw Error("部件锚点未标记实际原图像素坐标");
  if(!Array.isArray(part.sourceBoundsXYXY)||part.sourceBoundsXYXY.length!==4||
     !part.sourceBoundsXYXY.every(Number.isFinite))throw Error("源图像素范围无效");
  within(part.offsetX,-MAX_OFFSET,MAX_OFFSET,"X 偏移");
  within(part.offsetY,-MAX_OFFSET,MAX_OFFSET,"Y 偏移");
  within(part.rotation,-MAX_ANGLE,MAX_ANGLE,"旋转角");
  within(part.scale,MIN_SCALE,MAX_SCALE,"缩放");
  if(typeof part.visible!=="boolean")throw Error("显示标记无效");
  return anchor;
}
export function imageTransform(part) {
  const a=validateTransform(part);
  const [x0,y0]=part.sourceBoundsXYXY;
  return {
    translateX:a.sourceX+part.offsetX,
    translateY:a.sourceY+part.offsetY,
    offsetImageX:x0-a.sourceX,
    offsetImageY:y0-a.sourceY,
    rotationRadians:part.rotation*Math.PI/180,
    scale:part.scale
  };
}
export function sourcePointPlacement(part,point) {
  const p=imageTransform(part);
  const dx=finite(point.x,"point.x")-(p.translateX-part.offsetX);
  const dy=finite(point.y,"point.y")-(p.translateY-part.offsetY);
  const sin=Math.sin(p.rotationRadians),cos=Math.cos(p.rotationRadians);
  return {
    x:p.translateX+p.scale*(dx*cos-dy*sin),
    y:p.translateY+p.scale*(dx*sin+dy*cos)
  };
}
export function anchorPlacement(part,anchorName=part.pivotAnchor) {
  const anchor=part.anchors?.[anchorName];
  if(!anchor)throw Error("缺少需要校验的锚点: "+anchorName);
  return sourcePointPlacement(part,{x:anchor.sourceX,y:anchor.sourceY});
}
export function isOriginalPose(parts) {
  return parts.length>0 && parts.every(p=>p.visible&&p.offsetX===0&&p.offsetY===0&&
    p.rotation===0&&p.scale===1);
}
export function posePreset(parts,name) {
  if(!Object.hasOwn(PRESETS,name))throw Error("未知的姿态试验方案");
  const changes=PRESETS[name];
  return parts.map(original=>{
    const p=neutralPart(original);
    p.rotation=changes[p.category]||0;
    return p;
  });
}
export function exportPoseRecipe(parts,catalog) {
  if(!catalog||!catalog.source?.sha256||parts.length!==6)throw Error("真实来源清单缺失");
  for(const part of parts)validateTransform(part);
  return {
    schemaVersion:2,kind:"bamboo-001-joint-preview",
    sourceAssetId:"bamboo-001",sourceSha256:catalog.source.sha256,
    reviewStatus:"draft",phase1Ready:false,articulatedJoinReviewed:false,
    qualityGate:isOriginalPose(parts)?"neutral-pixel-identical-offline":"needs-manual-joint-repair",
    layers:parts.map(part=>({
      id:part.id,sourceSha256:part.sha256,
      visible:part.visible,pivotAnchor:part.pivotAnchor,
      offsetX:part.offsetX,offsetY:part.offsetY,
      rotation:part.rotation,scale:part.scale
    }))
  };
}
export function validateImportedPose(recipe,catalog) {
  if(!recipe||recipe.schemaVersion!==2||recipe.kind!=="bamboo-001-joint-preview"||
    recipe.sourceAssetId!=="bamboo-001"||
    recipe.sourceSha256!==catalog.source.sha256)throw Error("配方版本或 Bamboo 来源哈希不匹配");
  if(recipe.reviewStatus!=="draft"||recipe.phase1Ready!==false||
     recipe.articulatedJoinReviewed!==false)
    throw Error("无法导入宣称已经审核或发布的姿态");
  if(!Array.isArray(recipe.layers)||recipe.layers.length!==catalog.parts.length)
    throw Error("配方部件数量有误");
  const refs=new Map(catalog.parts.map(p=>[p.id,p]));
  const seen=new Set();
  const result=recipe.layers.map(layer=>{
    if(!layer||!refs.has(layer.id)||seen.has(layer.id))throw Error("部件 ID 无效或重复");
    seen.add(layer.id);
    const raw=refs.get(layer.id);
    if(layer.sourceSha256!==raw.sha256)throw Error("部件图片哈希不一致: "+layer.id);
    const part={...raw,visible:layer.visible,pivotAnchor:layer.pivotAnchor,
      offsetX:layer.offsetX,offsetY:layer.offsetY,
      rotation:layer.rotation,scale:layer.scale};
    validateTransform(part);
    return part;
  });
  if(seen.size!==refs.size)throw Error("配方缺失真实来源部件");
  const expected=isOriginalPose(result)?"neutral-pixel-identical-offline":"needs-manual-joint-repair";
  if(recipe.qualityGate!==expected)throw Error("配方质量状态与实际图层变换不一致");
  return result;
}
export function buildJointQARecord(parts,catalog,{defect,notes=""}={}) {
  if(!["unreviewed","visible-seam","occlusion","incomplete-outline","other"].includes(defect))
    throw Error("请选择有效的接缝观察结论");
  if(typeof notes!=="string"||notes.length>1000)throw Error("人工观察说明不能超过1000字");
  const recipe=exportPoseRecipe(parts,catalog);
  return {
    schemaVersion:1,kind:"bamboo-001-articulation-qa-evidence",
    sourceSha256:catalog.source.sha256,
    reviewStatus:"draft",articulatedJoinReviewed:false,
    finalApproval:"not-eligible-with-unrepaired-original-parts",
    poseIsOriginal:isOriginalPose(parts),
    finding:defect,observations:notes.trim(),
    recipe
  };
}
