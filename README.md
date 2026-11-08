# HandRaw Man

**Open, AI-native character asset library and modular character designer**  
HandRaw 原创及开放授权人物素材库 · AI 生图 · 分切部件 · 分层组合。

> 项目仓库：https://github.com/yang0/handraw-man  
> 关联生态：[HandRaw Style](https://github.com/yang0/handraw-style) · [HandRaw Web](https://github.com/yang0/handraw-web)

## ⚠️ 开始开发前必读：顶级规则

- **[TOP_LEVEL_RULES.md](TOP_LEVEL_RULES.md)：最高优先级、禁止程序绘制人物**
- **[AGENTS.md](AGENTS.md)：全部开发者和 AI Agent 强制执行**
- 决策 Issue：[**#12 · Asset-first + GPT Image 2.6**](https://github.com/yang0/handraw-man/issues/12)

**创作路线：** 现成合法素材优先（Open Peeps 官方 CC0）→ 缺失素材用 `gpt-image-2.6` 生成 → 真正切割/抠图/锚点 → 人工审查 → 真实素材分层组合 → SVG/PNG/工程文件导出。

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

## 当前状态

已创建文档与开发 Issues，正在从原拟议的“程序化 SVG 形体引擎”转换到**真实素材驱动的资产流水线**。Issue 的“创建”不代表代码或素材已经完成；以实际可运行的模块/下载素材/生成记录/测试/CI 为准。

[开发任务清单](https://github.com/yang0/handraw-man/issues)

## 感谢与来源

Open Peeps 是 Pablo Stanley 创作的 CC0 插画素材库，官网：https://www.openpeeps.com/ 。本项目允许使用其明确处于 CC0 的**原始素材**，并会记录文件来源。不会因此把第三方改编件、软件代码或商标一概视为 CC0。

## License

待正式确定代码与不同素材包的许可证；详见 [许可策略](docs/LICENSING.md)。GitHub 公开不等于所有贡献素材都可以任意分发。
