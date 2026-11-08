# HandRaw Man

**Open, AI-native character asset library and modular character designer**  
HandRaw 原创及开放授权人物素材库 · AI 生图 · 分切部件 · 分层组合。

> 项目仓库：https://github.com/yang0/handraw-man  
> 关联生态：[HandRaw Style](https://github.com/yang0/handraw-style) · [HandRaw Web](https://github.com/yang0/handraw-web)

## ⚠️ 开始开发前必读：顶级规则

- **[TOP_LEVEL_RULES.md](TOP_LEVEL_RULES.md)：最高优先级、禁止程序绘制人物**
- **[AGENTS.md](AGENTS.md)：全部开发者和 AI Agent 强制执行**
- 决策 Issue：[**#12 · Asset-first + GPT Image 2.6**](https://github.com/yang0/handraw-man/issues/12)

**创作路线：** 现成合法素材优先（Open Peeps 官方 CC0）→ 缺失素材直接使用 ChatGPT 内置生图（或可选 API）生成 → 真正切割/抠图/锚点 → 人工审查 → 真实素材分层组合 → SVG/PNG/工程文件导出。

**绝不通过程序的数学图形、SVG path、Bezier 曲线、Canvas 绘制人物形体。** 程序仅负责导入、处理、组合已有真实图片素材和交互。无素材时不能用程序假画角色占位。

## 产品范围

- **第一阶段：纯形体母库。** 全身正视、白底、黑白手绘线稿、自然站姿、不带身份、性格、职业、年龄设定、故事、服饰。12 类形体家族，计划策展整理 48 个质量合格的母版。合法复用和 AI 制作都允许，来源要区分，不强制全部自行制作。
- **第二阶段：全球多元外观组件。** 头型、五官、发型、肤色、服装等模块，与形体自由组合，覆盖东西方及更多人群，不用刻板化模板推断族裔。
- **第三阶段：AI 工作台。** 自然语言指导选材、生成缺失素材、拆分、质量检查和批量创作。
- **第四阶段：HandRaw Web、Skill 与开放 SDK。**

## 文档

- [产品需求 PRD](docs/PRODUCT.md)
- [架构方案](docs/ARCHITECTURE.md)
- [素材标准](docs/ASSET-SPEC.md)
- [资产生产流水线](docs/ASSET-PIPELINE.md)
- [路线图与验收](docs/ROADMAP.md)
- [许可与素材来源策略](docs/LICENSING.md)

## Bamboo-001 · 真实六部件拆分装配实验（Issue #5）

- [六部件装配实验室](bamboo-parts.html)：真实透明 PNG 的头、躯干、左右手臂、左右腿；可以调整位置、显示/隐藏、导出 PNG/JSON。
- [源像素切割脚本](scripts/slice_bamboo_001.py) · [技术验收与限制](docs/BAMBOO-PART-SLICING.md) · [六部件哈希/锚点清单](assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/manifest.json)。
- **原位六图层重组验证通过；自由摆姿的关节质量仍未通过**。6 张部件不是 6 个正式母版，全部保留草稿审核状态。

## 正视全身形体 · 第一件高质量候选（Issue #4）

**[浏览 Bamboo-001 实际全身白模](shapes.html)**：已在 GitHub 保存真正的 **1024×1536 原始 PNG** 和 **394×1493 透明 PNG**（均有 Git Blob SHA-1 和 SHA-256），并完成一轮初步视觉审查。

- 视觉门槛：**1 件候选通过**（无五官、无服饰、完整正视、明确竹竿型比例）。
- 正式批准母版：**0 / 48**，仍需维护者做原创性、许可与可拆分质量审核。
- [来源、两份真实二进制及处理参数](assets/candidates/phase1-fullbody-2026-11-08/manifest.json) · [人工审核记录](docs/PHASE1-BAMBOO-QA-2026-11-08.md)
- 字节完整性验证：`npm run verify:phase1`；**程序没有绘制人物**。

## 真实生图候选素材（Issue #4）

- **[真实 PNG 候选图库](candidates.html)**：已导入 8 张无五官头形裁切图，全部保留原始生成来源与文件 SHA-256，**未通过全身人体母版审核**。
- [来源与审核结果](docs/SHAPE-CANDIDATE-QA.md) · [逐件候选清单](assets/candidates/native-2026-11-08/manifest.json)
- 历史批次未产生合格全身素材，已有 8 个头形草稿仍未审核；本次 Bamboo-001 是**另一个独立、初步视觉通过的完整形体候选**，但正式母版依然为 0/48。

## Open Peeps 导入

- [已导入的 164 个原始 SVG 部件](assets/sources/open-peeps/README.md) · [逐件资产 manifest](assets/sources/open-peeps/manifest.json) · [导入审计](docs/OPEN-PEEPS-IMPORT.md)
- 完整性校验：`python3 scripts/verify_open_peeps.py`
- 从 Open Peeps 第三方公开镜像按固定 Git SHA 导入；**尚未与官方下载包逐字节对比，全部素材为待人工审核的原件，并非一期纯形体成品**。

## 本地运行素材实验室

本项目当前为**纯静态网页**，无需调用 AI 模型、无需 Docker、无需安装前端依赖。

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# 浏览器打开 http://localhost:8000/
```

可浏览全部 164 个原始 SVG，按头部 / 表情 / 胡须 / 配饰进行图层组合，单独预览身体及姿势原件，并导入导出配方 JSON、导出自包含 SVG。页面必须通过 HTTP 访问，直接双击本地 HTML 可能受到浏览器 file:// 跨源限制。

### 使用 ChatGPT 内置生图制作素材（默认方式 · Issue #13）

不需要 DSH 号池或 API Key。本对话中可直接生成实际图片并测试裁切；把下载的图片按 [无密钥导入指南](docs/IMAGEGEN-DIRECT-WORKFLOW.md) 导入本地草稿目录后，切割工作台即可自动识别。

```powershell
node scripts/import-imagegen-source.mjs --input "D:\\images\\character.png" --family bamboo --origin chatgpt-native
```

代码只归档已有真实图像、哈希与来源，**绝不凭空生成角色**。内置生图没有提供底层模型版本时如实记录为 `undisclosed`，未经审查一律不成为一期正式母版。第一批 [真实图像生成与切割 QA 记录](docs/REAL-IMAGEGEN-QA-2026-11-08.md) 说明已生成 3 张原图、8 个测试裁切件，但仍不满足一期无衣服无五官要求。

### 外部 DSH 号池生图（可选 · Issue #9）

新增 [生图命令行入口](scripts/generate-ai-source.mjs)：通过你现有 DSH 号池 `/v1/models` 与 `/v1/images/generations` 请求真正的 `gpt-image-2.6` 图片，并归档原始字节、SHA-256、模型/提示词和来源 JSON，不生成代码人物。生成草稿可直接在裁切工作台左侧选「AI 草稿（本机生成）」加载。

**只有主动使用这条可选接口时才需要在本机设置环境变量；绝非项目开发前提。** 详见 [AI 素材生成、归档与验收操作手册](docs/AI-SOURCE-PIPELINE.md)。尚未完成真实账号端到端验收。

### 切割与锚点编辑器

访问 [cut-editor.html](cut-editor.html)（本地地址：http://localhost:8000/cut-editor.html）。可以裁切已导入的真实 SVG，或本地上传 PNG/JPG/WebP；标记颈部、肩部、髋部等锚点，透明 PNG 与来源 JSON 分开导出，并把本次裁切的真实图片分层摆放和按锚点对齐。编辑器不通过程序绘制人体。

详见 [使用与验收说明](docs/CUTTING-WORKFLOW.md)。目前仍是手工框选工具，并非自动人物语义分割或已审核的 48 个白模。

Node 测试：`npm test`；语法检查：`npm run check`；素材哈希核验：`python3 scripts/verify_open_peeps.py`。

使用与限制请参见 [素材组合 MVP 说明](docs/COMPOSER-MVP.md)、[尚缺的形体素材](docs/ASSET-GAPS.md)。**当前头部组件可组合，身体和姿势只是原件浏览，不是已完成的一期无服饰全身白模。**

## 当前状态

已完成原始 SVG 归档、头部组合、人工裁切与锚点编辑，以及真实模型生成 CLI/草稿归档适配层；在本地提供密钥并成功出图、真实全身部件切割和人工视觉审核之前，Issue #9 仍为未完成。Issue 的“创建”不代表代码或素材已经完成；以实际可运行的模块/下载素材/生成记录/测试/CI 为准。

[开发任务清单](https://github.com/yang0/handraw-man/issues)

## 感谢与来源

Open Peeps 是 Pablo Stanley 创作的 CC0 插画素材库，官网：https://www.openpeeps.com/ 。本项目允许使用其明确处于 CC0 的**原始素材**，并会记录文件来源。不会因此把第三方改编件、软件代码或商标一概视为 CC0。

## License

待正式确定代码与不同素材包的许可证；详见 [许可策略](docs/LICENSING.md)。GitHub 公开不等于所有贡献素材都可以任意分发。
