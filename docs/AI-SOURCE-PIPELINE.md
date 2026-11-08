# 可选 DSH API 的 GPT Image 2.6 原图生成与归档 · Issue #9

**强制遵守** [TOP_LEVEL_RULES.md](../TOP_LEVEL_RULES.md)：程序不绘制任何人物形体，仅从真实模型响应中接收图片字节，并将图片交给现有切割与锚点工作台。

## 结构

- `src/ai-source.mjs`：约束提示词、12 个形体家族、严格模型查询、图片响应校验、SHA-256 与原始字节归档。
- `scripts/generate-ai-source.mjs`：Node 22 CLI；只调用配置的 `/v1/models` 与 `/v1/images/generations`。
- `assets/sources/ai/drafts/`：本机生成的源图片、单件 JSON、`index.json`；**被 gitignore 排除，未经审查不能自动发布**。
- `cut-editor.html`：左侧选「AI 草稿（本机生成）」直接加载原图（哈希校验），裁切、抠图、标注锚点、再生成透明 PNG/来源 JSON。

> **不是默认开发流程：** 普通开发直接通过 ChatGPT 内置生图并运行 [无密钥本地导入工具](IMAGEGEN-DIRECT-WORKFLOW.md) 即可完成真实素材测试。以下号池方案只用于有独立 API 自动化需要的情况。

## Windows PowerShell 操作

1. 确保 DSH `chatgpt2api-dsh` 号池启动，API 接入页面已生成用户 Key，并保证本地接口可访问。
2. 在你自己的 PowerShell 会话设置变量（**不要把 Key 写进仓库、Issue、聊天消息或截图**）：

```powershell
$env:HANDRAW_IMAGE_BASE_URL = 'http://127.0.0.1:38650/v1'
$env:HANDRAW_IMAGE_API_KEY = '<从 DSH API 接入复制的用户 Key>'
node scripts/generate-ai-source.mjs --list-models
node scripts/generate-ai-source.mjs --family bamboo --dry-run
node scripts/generate-ai-source.mjs --family bamboo --brief '头小、肩极窄、长腿柔和，轮廓自然'
```

3. 正常成功后得到真实原始图像、元数据 JSON 和索引三个文件；随后运行 `py -m http.server 8000 --bind 127.0.0.1`，访问 `http://localhost:8000/cut-editor.html`。
4. 在左侧素材来源中选择 **AI 草稿（本机生成）** → 选择记录 → 点击加载。可编辑裁切、锚点并下载 PNG/JSON 对。

Linux/macOS 用 `export HANDRAW_IMAGE_API_KEY='...'`、`export HANDRAW_IMAGE_BASE_URL='...'` 代替 PowerShell 赋值。

## 命令选项

```bash
node scripts/generate-ai-source.mjs --help
node scripts/generate-ai-source.mjs --list-models
node scripts/generate-ai-source.mjs --family pear --layout full-body --aspect-ratio 3:4
node scripts/generate-ai-source.mjs --family bamboo --layout parts-sheet
node scripts/generate-ai-source.mjs --family long-legs --size 1024x1536
node scripts/generate-ai-source.mjs --family wedge --dry-run
```

模型默认 `gpt-image-2.6`。若 DSH 保存了 2K / 4K 的默认尺寸档位，可以**省略 `--size`**，由已配置的后端默认设置生效。仅当你明确希望覆盖后台默认尺寸时传 `--size`。

**禁止自动降级。** 默认先查 `/v1/models`，找不到 `gpt-image-2.6` 就失败，并且不发送生图请求。只有在提供者确实不支持模型目录时才可以显式 `--skip-model-check`，此时来源标记为未独立核对。无论哪种情况，请求都使用指定模型，不偷偷替换。如果响应含 `model` 字段且与请求不符，就拒绝存档。如果响应不含模型字段，会如实标记为“已请求、后端未回显”，不声称验证了最终服务端执行模型。

## 数据安全与格式

- 仅将 API Key 作为 `Authorization: Bearer` 发送到指定接口；Key 不写入生成记录。远程端点必须使用 HTTPS；HTTP 仅允许本机 127.0.0.1 / localhost。
- 默认只接受 `data[0].b64_json` 的真实 PNG/JPEG/WebP 字节；URL-only 响应会明确失败，而不是自动访问不可信 URL。GIF 不属于当前静态形体源图流程。
- 严格验证响应图片签名；不将模型返回的 JSON、出错文本或程序绘制的占位图伪装为图片。
- 按来源逐件保存 `id`、家族、布局、请求模型、可选回显模型、生成提示词、源图 SHA-256、生成时间、尺寸、来源审查状态。
- 所有草稿 `reviewStatus: draft` 且 `phase1Ready: false`；模型生成成功**不等于**完成了纯形体要求或拥有可任意分发的许可。
- 浏览器只读取本地草稿文件、计算 SHA-256，不存储 API Key。若找不到草稿，可先确认 CLI 输出在仓库默认目录。
- 默认草稿目录被 `.gitignore` 排除，避免未经审核的 AI 图片自动进入 Git 历史；发布前另行审核授权、原图质量和衍生记录。

## 真实视觉审核清单

- 是否完整、严格正视、头顶脚底不被裁剪、主体与背景分离。
- 是否具备指定形体家族的明显剪影特征，避免仅随机改动微小参数。
- 是否为黑白线稿、无线条断裂、无衣物特征、五官和身份叙事、无文字和水印。
- 独立部件是否有足够间距、无相互遮挡，允许自然切割透明 PNG。
- 对原图进行裁切之后是否保留来源哈希、模型请求、锚点、修改记录；关节是否视觉连接。
- 审查是否与特定 Open Peeps 原画或其他作品高度雷同；素材再分发需审阅模型服务条款。

## 当前验收边界

此阶段代码与模拟接口测试可以在 CI 中验证请求、返回格式、哈希、来源和错误处理。但**没有连接使用者本机实际号池或获得真实模型图像**，不能把 HTTP mock 测试说成真实出图。Issue #9 只有在真实 `gpt-image-2.6` 成功出图、原图归档、裁切并完成视觉质量审查后才能关闭。

> **本地草稿隐私：** 启动静态服务时必须绑定 `127.0.0.1`，不要使用默认的全部网络接口。如果将项目部署到公网，必须排除 `assets/sources/ai/drafts/`，其中可能含未公开人物图片和提示词。`.gitignore` 不会阻止已经生成的本地文件被 HTTP 服务器访问。
