# 素材资产标准（v1.1）

**此文档受 [TOP_LEVEL_RULES.md](../TOP_LEVEL_RULES.md) 约束。禁止使用程序画人物。**

## 一期成品规范

- 人物全身、正视、自然中立站姿、白底、黑色手绘线稿；不含职业、姓名、年龄设定、服装、外观标签、故事。
- 母版优先来自合法可复用真实插画 SVG/PNG；不足时由 `gpt-image-2.6` 生图并切割。
- 可存放原生 SVG、透明 PNG 或对真实图片矢量追踪的 SVG。不得用 TypeScript/Python 手写曲线或硬编码 SVG path 创作人体。
- 推荐逻辑画布 512×768，素材可独立保存原始分辨率与局部边界。不要为了迎合固定尺寸重新程序画人体。
- 提供自然、不重复的形体线条；视觉创作由真实素材提供，非随机几何效果。

## 资产类别

`full-body`, `head`, `neck`, `torso`, `left-arm`, `right-arm`, `left-leg`, `right-leg`, `hand`, `foot`, `face`, `hair`, `outfit`, `accessory`。

- 一期仅用 `full-body` 和形体构成所需部件。
- 源素材不一定能无损拆分所有部件；不强制人为地把完整人物切成无用残片。
- 使用归一化锚点（0..1 坐标）注明 neck/shoulder/elbow/wrist/hip/knee/ankle 等连接点，**锚点只用于放置已有素材**。

## 素材来源（必填）

每个资产 manifest 需有：

| 字段 | 说明 |
|---|---|
| id、version、category、family | 唯一 ID、版本、角色部件与形体家族 |
| sourceKind | open-peeps-cc0 / ai-generated / user-authored 等 |
| sourceUrl 或 generation | 上游原始资源地址，或模型/提示词元数据 |
| originalFile / originalHash | 未修改原图及文件 hash |
| processedFile / processedHash | 经过裁切/抠图的真实部件 |
| licenseEvidence、reviewStatus | 许可核验与人工审查状态 |
| bounds、anchors、layerHints | 尺寸、连结位置、遮挡建议 |

未经真实文件、来源及授权审核的空壳记录不得标记为可发布。

## 48 母版的验收

- 12 类形体家族 × 4 个目标，每件是**实在的完整素材**，可以来自已授权复用或 GPT Image 生成；要明确标注“复用/衍生/AI”。
- “原创形体”仅用在真正独立创作的资产上，Open Peeps 复用件保留原始作者归属和 CC0 说明。
- 相似素材不能仅改缩放或随机参数后重复计数；需有独立视觉价值。
- 人工评审正面视角、轮廓、关节连接、线条风格、边界、PNG 透明边缘、文化准确性。
- 任何图片不得用程序化 path 人体生成器顶替。

## 输出与测试

- 原图、裁切图、元数据、组合工程 JSON；有源 SVG 才能导出纯矢量 SVG，否则可选择将位图嵌入 SVG 或导出 PNG。
- 无损与有损格式区别在 UI 中明确说明，不把 PNG 封装 SVG 称为“真正可编辑矢量”。
- 使用真实图片的回归预览/导出测试，抽查人工视觉结果。
