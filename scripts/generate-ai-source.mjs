#!/usr/bin/env node
/**
 * One-shot real image-generation CLI. All API secrets remain in environment
 * variables; this is not a drawing script or an API emulator.
 */
import {
  DEFAULT_MODEL, DEFAULT_BASE_URL, FAMILIES, assertGenerationOptions,
  buildSourcePrompt, listProviderModels, requestProviderImage, saveGeneratedDraft
} from "../src/ai-source.mjs";

function parseArgs(args) {
  const result={};
  const flags=new Set(["help","dry-run","list-models","skip-model-check"]);
  const values=new Set(["family","layout","brief","model","base-url","size","aspect-ratio","timeout-ms","output-dir"]);
  for(let i=0;i<args.length;i++){
    const key=args[i];
    if(!key.startsWith("--"))throw Error("未知参数："+key);
    const name=key.slice(2);
    if(flags.has(name)){result[name]=true;continue;}
    if(!values.has(name))throw Error("未知选项："+key);
    if(i+1>=args.length || args[i+1].startsWith("--"))throw Error("参数缺少值："+key);
    result[name]=args[++i];
  }
  return result;
}
function usage() {
  process.stdout.write([
    "HandRaw Man · GPT Image 2.6 真实图片源素材生成器（Node.js ≥22）",
    "Usage:",
    "  node scripts/generate-ai-source.mjs --family bamboo --brief \"极瘦长人物轮廓\"",
    "  node scripts/generate-ai-source.mjs --family pear --layout parts-sheet --aspect-ratio 3:4",
    "  node scripts/generate-ai-source.mjs --family bamboo --dry-run",
    "  node scripts/generate-ai-source.mjs --list-models",
    "",
    "Options: --family NAME --layout full-body|parts-sheet --brief TEXT --model NAME",
    "         --base-url URL --size auto|1024x1536 --aspect-ratio 3:4|9:16|1:1|2:3",
    "         --timeout-ms 300000 --output-dir PATH --skip-model-check --dry-run",
    "",
    "Environment:",
    "  HANDRAW_IMAGE_BASE_URL   default " + DEFAULT_BASE_URL,
    "  HANDRAW_IMAGE_MODEL      default " + DEFAULT_MODEL,
    "  HANDRAW_IMAGE_API_KEY    generated user access key, never written to repository",
    "",
    "Families: " + Object.keys(FAMILIES).join(", "),
    "Real calls require an available provider; no mock/fallback drawing is performed.",
    ""
  ].join("\n"));
}
async function main() {
  const args=parseArgs(process.argv.slice(2));
  if(args.help){usage();return;}
  const baseUrl=args["base-url"]||process.env.HANDRAW_IMAGE_BASE_URL||DEFAULT_BASE_URL;
  const model=args.model||process.env.HANDRAW_IMAGE_MODEL||DEFAULT_MODEL;
  const apiKey=process.env.HANDRAW_IMAGE_API_KEY;
  if(args["list-models"]){
    const models=await listProviderModels({baseUrl,apiKey});
    process.stdout.write(models.join("\n")+"\n");
    return;
  }
  const options=assertGenerationOptions({
    model, family:args.family, layout:args.layout||"full-body",
    brief:args.brief||"",size:args.size||"",
    aspectRatio:args["aspect-ratio"]||"3:4"
  });
  if(args["dry-run"]){
    process.stdout.write("仅预览提示词：不调用 API、不产生图片。\n\n"+buildSourcePrompt(options)+"\n");
    return;
  }
  if(!apiKey)throw Error("未配置 HANDRAW_IMAGE_API_KEY；请从 DSH 的 API 接入页面获取用户 Key");
  const timeoutMs=args["timeout-ms"]?Number(args["timeout-ms"]):300000;
  process.stdout.write("[1/3] 核验后端模型目录与图片生成功能…\n");
  const result=await requestProviderImage({
    baseUrl,apiKey,options,timeoutMs,skipModelCheck:Boolean(args["skip-model-check"])
  });
  process.stdout.write("[2/3] 收到真实图像："+result.image.format+"，"+result.bytes.length+" bytes。归档原始字节与来源…\n");
  const saved=await saveGeneratedDraft({result,outputDir:args["output-dir"]||"assets/sources/ai/drafts"});
  process.stdout.write("[3/3] 已保存草稿："+saved.id+"\n"+
    "源图："+saved.outputDir+"/"+saved.filename+"\n"+
    "元数据："+saved.outputDir+"/"+saved.metadataFilename+"\n"+
    "审核状态：draft（尚未切割/审核/发布）。\n"+
    "请启动本地网页并到 cut-editor.html → AI 草稿，裁切并标注锚点。\n");
}
main().catch(e=>{
  process.stderr.write("ERROR: "+(e instanceof Error?e.message:String(e))+"\n");
  process.exitCode=1;
});
