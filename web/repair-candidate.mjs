/**
 * Validate a locally edited, independently supplied PNG intended to replace
 * ONE existing raster arm/leg. This module never draws a human or changes pixels.
 * All replacements remain private draft previews until separately reviewed.
 */
const PNG_MAGIC="89504e470d0a1a0a";
const SUPPORTED_JOINTS=new Set(["left-arm","right-arm","left-leg","right-leg"]);
const MAX_BYTES=16*1024*1024;
const approvedStates=new Set(["draft"]);
function bytesOf(data){
  if(data instanceof Uint8Array)return data;
  if(data instanceof ArrayBuffer)return new Uint8Array(data);
  throw Error("候选必须来自实际上传的 PNG 字节");
}
function readUint32(data,offset){
  return ((data[offset]*2**24)+(data[offset+1]<<16)+(data[offset+2]<<8)+data[offset+3])>>>0;
}
export function inspectReplacementBytes(data,part,{filename,hash}={}){
  const bytes=bytesOf(data);
  if(!part||!SUPPORTED_JOINTS.has(part.category))throw Error("目前仅支持替换左右手臂及左右腿的真实 PNG");
  if(!/^[^\\/\u0000-\u001f]{1,120}\.png$/i.test(filename||""))throw Error("候选文件名必须是 PNG");
  if(bytes.length<45||bytes.length>MAX_BYTES)throw Error("PNG 候选必须在 45B 至 16MB 范围");
  if([...bytes.subarray(0,8)].map(x=>x.toString(16).padStart(2,"0")).join("")!==PNG_MAGIC)
    throw Error("文件实际字节不是 PNG");
  if(String.fromCharCode(...bytes.subarray(12,16))!=="IHDR")
    throw Error("PNG 缺少 IHDR");
  const width=readUint32(bytes,16),height=readUint32(bytes,20),colorType=bytes[25];
  if(width!==part.width||height!==part.height)
    throw Error("候选尺寸必须等于原始部件 "+part.width+"×"+part.height+
                "；请先在素材裁切工作台导出对齐的 RGBA PNG");
  if(colorType!==6)throw Error("候选必须是带 alpha 通道的 RGBA PNG（颜色类型 6）");
  if(typeof hash!=="string"||!/^sha256:[a-f0-9]{64}$/.test(hash))
    throw Error("必须从真实 PNG 字节计算 SHA-256");
  if(hash===part.sha256)throw Error("候选与原始部件字节完全相同，未发生真实素材修复");
  return {
    schemaVersion:1,partId:part.id,category:part.category,
    fileName:filename,sizeBytes:bytes.length,width,height,sha256:hash,
    originalPartSha256:part.sha256,
    sourceKind:"local-user-selected-png",
    reviewStatus:"draft",phase1Ready:false,articulatedJoinReviewed:false,
    sourceLicenseEvidence:"not-yet-reviewed",
    localOnly:true,assetRegistered:false,
    canReconstructRecipeWithoutFile:false
  };
}
export function candidateTrialEvidence(records,visible=true){
  const rows=[...records.values()];
  if(rows.length===0)return {hasUnregisteredCandidate:false,usedInPreview:false,candidates:[]};
  return {
    hasUnregisteredCandidate:true,usedInPreview:Boolean(visible),
    approved:false,reviewStatus:"draft",
    candidates:rows.map(r=>({...r,reviewStatus:"draft",phase1Ready:false,assetRegistered:false}))
  };
}
