# 技术架构 RFC 0002 · Asset First, No Procedural Drawing

**Status: Mandatory**（依据 [顶级规范](../TOP_LEVEL_RULES.md) 和 [Issue #12](https://github.com/yang0/handraw-man/issues/12)；撤销旧 RFC 0001 中的几何人物绘制设计）。

## 系统目标

让**真实来源图像素材**能够被检索、处理、切分、叠加及导出。代码不设计人物曲线，不通过图形算法创作新角色。

```text
Open Peeps CC0 original SVG/PNG ----[source & license audit]----+
                                                             |
GPT Image 2.6 actual image generation --[archive metadata]----+
                                                             v
                     import / segment / remove background / normalize
                                                             |
                    asset registry + provenance + anchor metadata
                                                             |
                     layer composer (use actual image files only)
                                                             |
                  preview / SVG+PNG export / composition JSON
```

## 模块

1. **Source Importer**：导入真实的 Open Peeps 官方 CC0 原文件，哈希校验，来源文档；没有资产时不能生成虚拟 placeholder 人体。
2. **AI Generation Adapter**：可配置模型服务；`gpt-image-2.6` 是首选模型。实际 API/能力以用户可访问服务为准；模型不可用时明确报错，不用程序绘画替代。
3. **Segmentation & Edit Pipeline**：智能或手工抠图、部件切割、裁剪、透明 PNG、已存在图像的矢量追踪（可选）。自动裁剪后的缺损必须可以人工修复。
4. **Asset Catalog**：静态 JSON manifest，记录 asset id/category/format/bounds/anchor/provenance/license/review。
5. **Layer Composer**：显示与叠加**已有** SVG/PNG，调整锚点、图层、平移、缩放、旋转、镜像；不可数学画形体或以 `path` 填补缺失人体部分。
6. **Export & Recipe**：保存素材 ID、版本、位置、层序和缩放，并导出 PNG/SVG/JSON。SVG 可使用已有 SVG 和内嵌已处理 PNG；不能生成新的几何角色路径。

## 核心配方（例）

```json
{
  "schemaVersion": "1.0",
  "compositionVersion": "1.0.0",
  "canvas": {"width": 512, "height": 768, "background": "#ffffff"},
  "layers": [
    {
      "assetId": "open-peeps-body-001",
      "assetVersion": "1.0.0",
      "x": 170,
      "y": 110,
      "scale": 1,
      "rotation": 0,
      "flipX": false,
      "zIndex": 0
    }
  ]
}
```

这里的参数是**现成素材的图层变换**，不是用参数画人体！

## 安全和质量

- 禁止任意不受信任 SVG 的脚本、外部加载、事件属性；内嵌图像对外分发时校验安全。
- AI/第三方素材必须过来源许可状态、内容安全、输出质量和人工审查。
- 对齐检验：部件锚点、碰撞/穿帮、画布边缘、线条一致、缩略图辨识度。
- 真正资产缺失时显示可解释错误，不能由代码自动画人物兜底。
- 在所有 Issue/PR 的 code review 中，把程序人物绘制视为禁止项。

## 技术建议（非强制）

TypeScript 构建 asset registry 和 compositing contracts，React/Vite 构建可视编辑器；Sharp 等仅用于图片处理、切割、透明化/导出，不用于程序化绘制人物；后端模型适配层可独立服务。渲染 UI/导出真实资产是允许的，禁止的是画出新的造型。

## 测试

- Asset manifest 严格校验与许可追溯。
- 完整导入真实来源文件、切割/注册后仍可溯源至原始素材。
- 重复组合输出一致，锚点和变换正确。
- 安全检查 SVG/嵌入图像。
- CI 用 typecheck/test/build；人工查看真实图层组合结果。
- 禁止的 geometry/path-renderer 文件和 API 不应作为里程碑交付。

## 集成边界

全球多元外观资产作为独立包；HandRaw Web/Skill 通过 JSON 配方引用真实资产。核心不绑定登录、数据库与 AI 账号。
