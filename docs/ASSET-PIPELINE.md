# 资产驱动创作流水线（必须遵守 TOP_LEVEL_RULES.md）

## 目标

`素材检索/授权审查 -> 导入或 GPT Image 生成 -> 切割/抠图 -> 人工对齐锚点 -> 质量审核 -> 资产注册 -> 分层组合 -> 导出`

**绝不让代码凭几何公式绘制人物。**

## 路径 A：复用 Open Peeps

1. 从 [官方资源](https://www.openpeeps.com/) 获取真实源文件（SVG/PNG/原生设计稿）。
2. 记录原始分发 URL、作者、官方 CC0 许可声明地址、获取日期、文件 hash。
3. 为已存在的角色部件识别 body/head/face/hair/arm/leg 等分类，**不强制拆坏原素材**；如果本期仅做轮廓形体，优先选用合规的无服饰/身份内容，或以实际图片编辑方式去除，而非程序画一个假的身体。
4. 将源文件放 `assets/sources/open-peeps/`（后续任务），处理稿放 `assets/processed/`，元数据进入 catalog。
5. 人工检查连接与风格；确认哪些属于官方 CC0、哪些为第三方改动并分别声明。

## 路径 B：缺少素材时使用 `gpt-image-2.6`

1. 输入主题与具体形体家族，利用结构化 prompt 模板生成原创纯正视全身人物/部件。
2. 先输出实际完整图像并**保留未经修改的原图**，记录模型名、提示词、配置、时间和 hash；如果提供者不支持相应模型，停止并提示，不偷偷改用程序绘制。
3. 选择切割方案：a) 分层/抠图切割头、颈、躯干、左右手臂、左右腿等；b) 直接生成分离部件排版图再分切。
4. 透明背景 PNG 是合法的一等资产；SVG 如需提供只能保存已有的源 SVG 或描摹已有图像（图像处理），不得数学造型绘制。
5. 人工校正边缘/风格/锚点/缺损，并审核版权与模型条款，然后登记为可正式使用。
6. 后续新人物通过素材层的组合、缩放、定位与替换实现。

## 典型元数据（仅示意）

```json
{
  "id": "bamboo-head-001",
  "category": "head",
  "sourceKind": "ai-generated",
  "sourceUrl": null,
  "generation": {
    "model": "gpt-image-2.6",
    "promptFile": "prompts/bamboo-head-001.md"
  },
  "originalFile": "assets/sources/ai/bamboo-head-001.png",
  "processedFile": "assets/processed/heads/bamboo-head-001.png",
  "originalHash": "sha256:...",
  "processedHash": "sha256:...",
  "anchors": {"neck": [0.50, 0.92]},
  "reviewStatus": "draft",
  "licenseEvidence": "pending",
  "version": "0.1.0"
}
```

发布前将示例 `...` 替换为真实元数据；无真实素材不能将 `reviewStatus` 升为 approved。

## 工程任务

- Asset registry：分类、路径、hash、来源与许可验证。
- Importer：Open Peeps 真正原始素材导入与元数据整理。
- AI generator adapter：可配置调用 `gpt-image-2.6`，无假冒模型或静默降级。
- Segmentation pipeline：抠图、分切、边缘检查、锚点工具。
- Composer：只叠加**已经存在的真实图层**，不画任何人体路径。
- Exports：SVG/PNG/工程 JSON，允许 SVG 引用 raster 图层或直接组合 SVG；确保独立文件可用。

## 里程碑验收

- 路径 A：至少一个真实 Open Peeps 部件连同来源证据进入可预览 catalog。
- 路径 B：至少一个真实模型生成图完成原图归档、部件切割与人工审查。
- Composer：能够混合 A/B 的实际素材完成一个全身正视人物组合。
- 没有图像时明确“缺少素材”；不能显示程序画的假人替代。
