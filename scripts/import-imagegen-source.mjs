#!/usr/bin/env node
// Import real image bytes from disk; no DSH, API key or character drawing.
import { importExistingImage } from "../src/local-image-import.mjs";
const HELP="HandRaw Man · 无密钥真实生图素材导入\n"+
  "node scripts/import-imagegen-source.mjs --input path/to/image.png --family bamboo\n"+
  "Options: --input PATH --family FAMILY --layout full-body|parts-sheet\n"+
  " --origin chatgpt-native|other-ai --prompt TEXT --output-dir PATH --help\n";
function parse(argv){
  const a={},allowed=new Set(["input","family","layout","origin","prompt","output-dir"]);
  for(let i=0;i<argv.length;i++){
    const key=argv[i];
    if(key==="--help"){a.help=true;continue;}
    if(!key.startsWith("--")||!allowed.has(key.slice(2)))throw Error("未知参数："+key);
    if(!argv[i+1]||argv[i+1].startsWith("--"))throw Error("缺少参数值："+key);
    a[key.slice(2)]=argv[++i];
  }
  return a;
}
async function main(){
  const a=parse(process.argv.slice(2));if(a.help){process.stdout.write(HELP);return;}
  const result=await importExistingImage({inputPath:a.input,family:a.family,layout:a.layout,
    origin:a.origin,prompt:a.prompt,outputDir:a["output-dir"]});
  process.stdout.write("真实源图归档："+result.outputDir+"/"+result.filename+"\n"+
    "SHA-256: "+result.record.originalHash+"\n"+
    "模型版本：未披露（不会冒充 gpt-image-2.6）\n"+
    "审核：draft / phase1Ready=false\n"+
    "切割入口：cut-editor.html → AI 草稿（本机生成）\n");
}
main().catch(e=>{process.stderr.write("ERROR: "+e.message+"\n");process.exitCode=1;});
