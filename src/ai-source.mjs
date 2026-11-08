/**
 * Model-image source acquisition for HandRaw Man. Makes API requests and
 * saves actual returned image bytes. Never generates drawings in code.
 * No secret is written to metadata or logs.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, rename, open, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";

export const DEFAULT_MODEL = "gpt-image-2.6";
export const DEFAULT_BASE_URL = "http://127.0.0.1:38650/v1";
export const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
export const FAMILIES = Object.freeze({
  bamboo: "超细长竹竿形体，小头、窄肩、柔和弯曲的修长四肢",
  orb: "圆球形躯干与短小四肢，大块面形成圆润强烈的剪影",
  pear: "上窄下宽的梨形整体轮廓，稳定的下半身重心",
  wedge: "宽肩窄腰的倒三角轮廓，腿部简洁",
  block: "偏方形和矩形的大块面，简洁厚重、四肢相对短",
  sprout: "小躯干与极为轻盈伸展的四肢，芽苗式趣味比例",
  gourd: "上下两个大小不同的圆体块，中段自然收窄",
  "big-head": "比例极大的单纯几何头部和非常小的身体",
  "long-torso": "极长躯干、相对短腿，轮廓夸张但结构清楚",
  "long-legs": "极长双腿、小上半身，高腰线和强烈比例反差",
  asymmetry: "适当的左右不对称比例，重心略偏但能独立站立",
  angular: "硬朗折线式人物外轮廓，几何角转折鲜明"
});
const LAYOUTS = new Set(["full-body", "parts-sheet"]);

export function normalizeProviderBaseUrl(raw = DEFAULT_BASE_URL) {
  if (typeof raw !== "string" || !raw.trim()) throw Error("缺少 API Base URL");
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash) throw Error("Base URL 不允许携带密钥、查询或锚点");
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw Error("远程 API 必须使用 HTTPS；HTTP 仅允许本机 localhost/127.0.0.1");
  }
  const base = url.href.replace(/\/+$/, "");
  if (!base.endsWith("/v1")) throw Error("API Base URL 必须指向 /v1，例如 http://127.0.0.1:38650/v1");
  return base;
}

export function assertGenerationOptions(options) {
  const {model = DEFAULT_MODEL, family, layout = "full-body", brief = "", size = "", aspectRatio = "3:4"} = options || {};
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{1,95}$/.test(model)) throw Error("模型名格式无效");
  if (!Object.hasOwn(FAMILIES, family)) throw Error("形体家族不合法：" + family);
  if (!LAYOUTS.has(layout)) throw Error("布局只能为 full-body 或 parts-sheet");
  if (typeof brief !== "string" || brief.length > 600) throw Error("附加描述最多 600 字");
  if (size && !/^(?:auto|[1-9]\d{2,4}x[1-9]\d{2,4})$/.test(size)) throw Error("尺寸必须为 auto 或 1024x1536 格式");
  if (!["3:4", "9:16", "1:1", "2:3"].includes(aspectRatio)) throw Error("不支持的画幅比例");
  return { model, family, layout, brief:brief.trim(), size, aspectRatio };
}

export function buildSourcePrompt(options) {
  const o = assertGenerationOptions(options);
  const visual = o.layout === "full-body"
    ? "仅一个完整人物，正面直视的全身站姿，双臂与身体之间留出明显空隙，双腿可分辨，头顶与脚底都完整入画，不裁切四肢；中立姿态。"
    : "同一张画布上分别绘制人体轮廓的头、躯干、左臂、右臂、左腿、右腿各一个真实独立素材。每件清楚分离、不接触、不重叠、等比例、周围留白，便于之后人工裁切，不能加字标注。";
  return [
    "制作一幅原创的人形抽象手绘轮廓素材，供手绘角色白模库使用。",
    "这是非写实、非裸露的人形几何原型，不出现身体解剖细节或真实人物身份。",
    "形体设计：" + FAMILIES[o.family] + "。",
    visual,
    "画风：白色纯净背景、黑色自然有生命力的手绘封闭线稿、均匀清晰线条，低装饰、高轮廓辨识度。",
    "禁止发型、五官、皮肤纹理、衣服褶皱、道具、职业特征、故事、背景元素、阴影、高光、文字、水印、logo。",
    "重视形体整体剪影和真实图像品质；画幅" + o.aspectRatio + "，竖版优先；留足裁切安全边距。",
    "这是新创作的原创比例语言，不要照搬 Open Peeps 或任何现成角色的具体造型。",
    o.brief ? "补充设计要求：" + o.brief : ""
  ].filter(Boolean).join("\n");
}

export function sha256(data) { return createHash("sha256").update(data).digest("hex"); }

export function identifyImage(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24 || bytes.length > MAX_IMAGE_BYTES) {
    throw Error("服务未返回有效图像字节，或超过 32MB 大小限制");
  }
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    const width=bytes.readUInt32BE(16), height=bytes.readUInt32BE(20);
    if (!width || !height || width * height > 80_000_000) throw Error("PNG 尺寸异常");
    return {format:"png",extension:".png",mime:"image/png",width,height};
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return {format:"jpeg",extension:".jpg",mime:"image/jpeg",width:null,height:null};
  }
  if (bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP") {
    return {format:"webp",extension:".webp",mime:"image/webp",width:null,height:null};
  }
  if (bytes.toString("ascii",0,3) === "GIF") throw Error("当前形体母库只接收静态图像，拒绝 GIF 输出");
  throw Error("上游返回了非 PNG/JPEG/WebP 文件；拒绝归档伪图像");
}

export function decodeProviderImage(payload, requestedModel) {
  if (!payload || typeof payload !== "object") throw Error("生成接口返回了无效 JSON");
  const reportedModel = typeof payload.model === "string" ? payload.model : null;
  if (reportedModel && reportedModel !== requestedModel) {
    throw Error("模型不一致：请求 " + requestedModel + "，返回 " + reportedModel + "；拒绝冒用模型");
  }
  const list = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.images) ? payload.images : [];
  const entry = list[0];
  if (!entry || typeof entry !== "object") throw Error("生成接口没有返回任何图像");
  if (!entry.b64_json || typeof entry.b64_json !== "string") {
    if (entry.url) throw Error("上游只返回了图片 URL；当前安全适配器要求 b64_json，未自动访问不可信链接");
    throw Error("上游响应缺少 data[0].b64_json（不支持自动模型降级）");
  }
  const raw = entry.b64_json.startsWith("data:")
    ? entry.b64_json.replace(/^data:image\/(?:png|jpeg|webp);base64,/i, "")
    : entry.b64_json;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw) || raw.length % 4 !== 0) throw Error("返回图像的 base64 编码不合法");
  const bytes = Buffer.from(raw,"base64");
  const image = identifyImage(bytes);
  return {bytes,image,reportedModel};
}

function bearerToken(value) {
  if (typeof value !== "string" || !value.trim()) throw Error("缺少 HANDRAW_IMAGE_API_KEY");
  return value.trim().replace(/^Bearer\s+/i,"");
}
function errorMessage(text, token) {
  const noToken = String(text).split(token).join("[REDACTED]");
  return noToken.replace(/(authorization|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[^\s,"'}]+/gi,"$1=[REDACTED]").slice(0,800);
}
export async function listProviderModels({baseUrl=DEFAULT_BASE_URL,apiKey,fetchImpl=fetch,timeoutMs=30000}={}) {
  const base=normalizeProviderBaseUrl(baseUrl),token=bearerToken(apiKey);
  const response=await fetchImpl(base+"/models",{
    method:"GET",headers:{Authorization:"Bearer "+token},
    signal:AbortSignal.timeout(timeoutMs)
  });
  if(!response.ok)throw Error("查询模型失败 HTTP "+response.status+": "+errorMessage(await response.text(),token));
  const payload=await response.json();
  if(!Array.isArray(payload?.data))throw Error("模型列表不是 data 数组");
  return payload.data.filter(a=>a && typeof a.id==="string").map(a=>a.id);
}

export async function requestProviderImage({
  baseUrl=DEFAULT_BASE_URL,apiKey,options,
  fetchImpl=fetch,timeoutMs=300000,skipModelCheck=false
}={}) {
  const base=normalizeProviderBaseUrl(baseUrl);
  const o=assertGenerationOptions(options),token=bearerToken(apiKey);
  if(!Number.isInteger(timeoutMs)||timeoutMs<5000||timeoutMs>900000)throw Error("timeoutMs 范围：5000–900000");
  let modelListed=false;
  if(!skipModelCheck) {
    const models=await listProviderModels({baseUrl:base,apiKey:token,fetchImpl,timeoutMs:Math.min(timeoutMs,30000)});
    if(!models.includes(o.model))throw Error("后端模型列表未公布 "+o.model+"，拒绝降级；可在 DSH 号池检查模型可用性");
    modelListed=true;
  }
  const request={model:o.model,prompt:buildSourcePrompt(o),n:1,aspect_ratio:o.aspectRatio};
  if(o.size && o.size!=="auto")request.size=o.size;
  const response=await fetchImpl(base+"/images/generations",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify(request),signal:AbortSignal.timeout(timeoutMs)
  });
  if(!response.ok)throw Error("图片生成失败 HTTP "+response.status+": "+errorMessage(await response.text(),token));
  const payload=await response.json();
  const decoded=decodeProviderImage(payload,o.model);
  return {
    bytes:decoded.bytes,image:decoded.image,prompt:request.prompt,
    options:o,modelListChecked:modelListed,providerReportedModel:decoded.reportedModel,
    requestId:typeof payload.id==="string"?payload.id:null,
    providerBase:base
  };
}

export async function saveGeneratedDraft({result,outputDir,now=new Date(),idSuffix}={}) {
  if(!result?.bytes || !result.image || !result.options)throw Error("缺少真实模型图片字节");
  const image=identifyImage(result.bytes);
  const dir=resolve(outputDir || "assets/sources/ai/drafts");
  const stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  const id=stamp+"-"+result.options.family+"-"+(idSuffix||randomBytes(4).toString("hex"));
  if(!/^[A-Za-z0-9_-]+$/.test(id))throw Error("草稿 ID 不安全");
  const filename=id+image.extension, metadataFilename=id+".json";
  const imageHash=sha256(result.bytes);
  const record={
    schemaVersion:1,id,sourceKind:"ai-generated",reviewStatus:"draft",phase1Ready:false,
    family:result.options.family,layout:result.options.layout,
    originalFile:"assets/sources/ai/drafts/"+filename,originalHash:"sha256:"+imageHash,
    format:image.format,mime:image.mime,sizeBytes:result.bytes.length,
    width:image.width,height:image.height,
    modelEvidence:result.providerReportedModel === result.options.model ? "provider-echoed-requested-model"
      : result.modelListChecked ? "requested-and-listed-not-confirmed-by-response" : "requested-not-independently-verified",
    generation:{
      requestedModel:result.options.model,
      providerReportedModel:result.providerReportedModel,
      providerBaseUrl:result.providerBase,
      family:result.options.family,layout:result.options.layout,
      prompt:result.prompt,aspectRatio:result.options.aspectRatio,
      size:result.options.size||"provider-default",requestId:result.requestId,
      generatedAt:now.toISOString()
    },
    licenseEvidence:"pending-provider-terms-and-manual-review",
    anchors:{},derivatives:[],sourceReview:"not-yet-reviewed"
  };
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,filename),result.bytes,{flag:"wx"});
  await writeFile(join(dir,metadataFilename),JSON.stringify(record,null,2)+"\n",{flag:"wx"});
  // Exclusive lock avoids overwriting simultaneous generators' local manifest.
  const lockPath=join(dir,".index.lock");
  let lock;
  for(let i=0;i<100;i++){
    try{lock=await open(lockPath,"wx");break;}
    catch(e){if(e.code!=="EEXIST")throw e;await new Promise(resolve=>setTimeout(resolve,50));}
  }
  if(!lock)throw Error("草稿索引被占用；原图和元数据已归档，但需手工重建索引");
  try{
    const indexPath=join(dir,"index.json");
    let index={schemaVersion:1,kind:"handraw-ai-source-drafts",records:[]};
    try{index=JSON.parse(await readFile(indexPath,"utf8"));}
    catch(e){if(e.code!=="ENOENT")throw e;}
    if(index.schemaVersion!==1||!Array.isArray(index.records))throw Error("现有草稿索引格式错误");
    index.records.push({
      id,filename,metadataFilename,
      sourceKind:record.sourceKind,originalHash:record.originalHash,
      model:record.generation.requestedModel,
      family:record.family,layout:record.layout,
      reviewStatus:"draft",phase1Ready:false
    });
    const tmp=join(dir,".index-"+id+".tmp");
    await writeFile(tmp,JSON.stringify(index,null,2)+"\n",{flag:"wx"});
    await rename(tmp,indexPath);
  }finally{await lock.close();await unlink(lockPath);}
  return {id,filename,metadataFilename,outputDir:dir,record};
}
