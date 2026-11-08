# 技术架构（Architecture RFC 0001）

状态：提案，优先实现无框架依赖的 Core，再建设 Web UI。

## 1. 逻辑分层

```text
HandRaw Web / CLI / Figma-like editor / AI adapters
                    |
             Recipe JSON / SDK
                    |
   Validation + Versioned Catalog + Constraints
                    |
       Shape Geometry / Anchors / Paths
                    |
            SVG Renderer / Exporter
```

- `core` 只接收数据并返回 SVG/可计算的几何结果，不读写网络/数据库、不调用 AI。
- `catalog` 保存原创母版与声明式形体参数，不绑定年龄、性别、地域、职业、叙事。
- `editor` 为后续前端，可选 Vite + React + TS；渲染和业务完全解耦。
- `ai-adapter` 仅将自然语言映射为合法配置，所有执行先过 validator，人工批准新素材。
- `global-appearance` Phase 2 插件化引入，不污染抽象形体核心。

## 2. 关键契约

- 画布基准 viewBox 为 `0 0 512 768`；正面朝向观众；人物底部留白与贴地线规则统一。
- 参数归一化使用数值（如 `shoulderScale=1` 为母版默认），设置闭区间；校验显式失败，禁止静默截断导出。
- Recipe 带 `schemaVersion`、`libraryVersion`、`renderVersion`、`prototypeId`、`seed`、`parameters`；排序稳定。
- 路径/锚点使用语义命名：head, neck, shoulderL/R, elbowL/R, wristL/R, hipL/R, kneeL/R, ankleL/R, ground。
- SVG 输出需稳定、无外部资源引用、无脚本、无依赖图像和文字；可单文件分发。
- 角色部件采用局部坐标，人体连接由锚点和约束变换推导；每个几何组件不得暗自读取其他组件状态。

## 3. Shape Core 设计

首个垂直切片优先建立明确的 TypeScript 类型、运行时验证、少量代表性家族、简单矢量轮廓、SVG renderer、测试。不要先把纸面上 48 个母版都放进占位文件。

建议模块：

```text
src/
  contracts.ts       # 类型与版本
  catalog.ts         # 形体母版注册
  validate.ts        # recipe 校验
  geometry.ts        # 锚点、路径生成
  render-svg.ts      # 输出稳定 SVG
  index.ts           # SDK public API
test/
  core.test.ts       # 确定性、边界、语义
```

中期可引入 Paper.js 等依赖，但最初以纯 TypeScript 实现，降低依赖与隐性画风偏移。

## 4. AI 设计数据流

```text
user intent
  -> planner (suggest prototypeId + parameter changes)
  -> schema validation
  -> constraint check
  -> deterministic render
  -> visual QA
  -> export + recipe provenance
```

任何 AI 生成的原始 SVG 都不得直接替换 canonical 母版；应先矢量质量检查、检查相似性/来源/授权，人工评审后新增新版本。

## 5. 可测试性与 CI

- 单测：确定性、合法 XML 字符、浮点有限性、闭区间参数、种子不破坏几何、ID 处理。
- 回归：家族基线 SVG 快照或固定摘要；更改 renderer 必须审查预期变化。
- CI：`npm ci`、`npm run typecheck`、`npm test`、`npm run build`。
- 安全：防止 SVG 注入、外部 href、脚本、任意嵌入数据；对所有来自 AI 的字段做 whitelist 检查。
- 版本策略：Schema 破坏性改动需迁移，catalog/renderer 版本独立；不要让旧配方被新代码静默变更外观。

## 6. 后续明确的拓展点

外观组件、全身多姿势、局部可编辑贝塞尔控制点、批量生成、PNG 转换、Web/Skill 集成和社区资产包均独立 Issue 迭代。不在核心渲染函数内混入上述业务。
