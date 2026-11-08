/** Import existing real image bytes, without model API or drawing. */
import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir, open, unlink, rename } from "node:fs/promises";
import { resolve, join, relative, isAbsolute } from "node:path";
import { FAMILIES, identifyImage, sha256, MAX_IMAGE_BYTES } from "./ai-source.mjs";

export function validateImportOptions(o) {
  if (!o || typeof o.inputPath !== "string" || !o.inputPath.trim()) throw Error("缺少输入图片");
  if (!Object.hasOwn(FAMILIES, o.family)) throw Error("形体家族不合法");
  if (!["full-body","parts-sheet"].includes(o.layout || "full-body")) throw Error("布局不合法");
  if (!["chatgpt-native","other-ai"].includes(o.origin || "chatgpt-native")) throw Error("来源不合法");
  if (typeof (o.prompt || "") !== "string" || (o.prompt || "").length > 2000) throw Error("提示词过长");
  return {inputPath:resolve(o.inputPath),family:o.family,layout:o.layout||"full-body",
    origin:o.origin||"chatgpt-native",prompt:o.prompt||"",outputDir:resolve(o.outputDir||"assets/sources/ai/drafts")};
}
export async function importExistingImage(raw, {now=new Date()}={}) {
  const o=validateImportOptions(raw);
  const bytes=await readFile(o.inputPath);
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw Error("原图超过32MB");
  const image=identifyImage(bytes), hash="sha256:"+sha256(bytes);
  await mkdir(o.outputDir,{recursive:true});
  const lock=join(o.outputDir,".index.lock");let handle;
  for (let i=0;i<80;i++) {
    try {handle=await open(lock,"wx");break;}
    catch(e) {if(e.code!=="EEXIST") throw e;await new Promise(r=>setTimeout(r,50));}
  }
  if (!handle) throw Error("草稿索引被占用");
  try {
    const indexPath=join(o.outputDir,"index.json");
    let index={schemaVersion:1,kind:"handraw-ai-source-drafts",records:[]};
    try {index=JSON.parse(await readFile(indexPath,"utf8"));}
    catch(e) {if(e.code!=="ENOENT") throw e;}
    if (index.schemaVersion!==1 || !Array.isArray(index.records)) throw Error("索引版本不合法");
    if (index.records.some(x=>x.originalHash===hash && x.family===o.family && x.layout===o.layout))
      throw Error("已有相同原图、家族和布局的草稿，无需重复导入");
    const stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
    const id=stamp+"-"+o.family+"-"+randomBytes(4).toString("hex");
    const filename=id+image.extension,metadataFilename=id+".json";
    const relativeDir=relative(resolve(process.cwd()),o.outputDir).replaceAll("\\","/");
    const originalFile=relativeDir && !isAbsolute(relativeDir) && !relativeDir.startsWith("../")
      ? relativeDir+"/"+filename : filename;
    const record={schemaVersion:1,id,sourceKind:"ai-generated",reviewStatus:"draft",phase1Ready:false,
      family:o.family,layout:o.layout,originalFile,originalHash:hash,format:image.format,
      mime:image.mime,sizeBytes:bytes.length,width:image.width,height:image.height,
      modelEvidence:"model-version-not-disclosed",generation:{requestedModel:"undisclosed",
        providerReportedModel:null,providerBaseUrl:null,origin:o.origin,
        sourceTool:o.origin==="chatgpt-native"?"ChatGPT native image generation (importer claim)":"Other AI generator (importer claim)",
        generatedAt:now.toISOString(),prompt:o.prompt||null},
      licenseEvidence:"pending-human-review",sourceReview:"imported-unreviewed",anchors:{},derivatives:[]};
    await writeFile(join(o.outputDir,filename),bytes,{flag:"wx"});
    await writeFile(join(o.outputDir,metadataFilename),JSON.stringify(record,null,2)+"\n",{flag:"wx"});
    index.records.push({id,filename,metadataFilename,sourceKind:"ai-generated",originalHash:hash,
      model:"undisclosed",family:o.family,layout:o.layout,reviewStatus:"draft",phase1Ready:false});
    const tmp=join(o.outputDir,".index-"+id+".tmp");
    await writeFile(tmp,JSON.stringify(index,null,2)+"\n",{flag:"wx"});
    await rename(tmp,indexPath);
    return {id,filename,metadataFilename,outputDir:o.outputDir,record};
  } finally {await handle.close();await unlink(lock);}
}
