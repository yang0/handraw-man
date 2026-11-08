# 开发路线与验收 Roadmap

## 执行规则

每一个功能先登记 Issue（目标、技术任务、依赖和验收），再改代码；通过测试后关闭 Issue。新增范围必须独立 Issue，不把后续四阶段一口气塞进一个 PR。

## Milestone 0：项目基线与基础契约

- Repo 文档、技术架构、贡献与版权策略；npm/TypeScript 工程骨架、CI。
- 独立可运行的 Shape Core：类型、安全校验、确定性 renderSVG。
- 代表性形体家族的真实示例与自动化测试。
- 交付可复用 npm SDK，而不是只放效果图片。

## Milestone 1：Shape Gallery 与 48 个原生母版

- 12 家族，每家族 4 个经人工审阅的**独立设计**。
- 锚点、Bezier 曲线、可控比例形变和自交/画布边界检查。
- 正视图库 + 筛选、母版对比、参数实时调节、SVG/PNG/JSON 导出。
- 无五官、服饰、职业、年龄、名字或性格。

## Milestone 2：Global Appearance

- 可选多元五官、头发与肤色；独立服饰/配饰素材扩展。
- 文化不绑人体、地域不可直接推断族裔、明确来源与授权记录。
- 同一形体可匹配所有外观素材。

## Milestone 3：AI Native Design

- Prompt -> 合法 Recipe，支持形体锁定、定向变体、批量。
- 审核后发布新素材、可复现版本管理、AI 失败可解释。
- 对接 HandRaw Web / HandRaw Style。

## Milestone 4：Open Ecosystem

- API、CLI、插件与社区扩展、贡献审查、国际化、对外文档。

## 首批 Issue 建议顺序

1. P0 工程骨架、TypeScript、测试、CI。
2. P0 JSON Recipe / prototype schema 与严格参数校验。
3. P0 SVG 正视形体 renderer + 首批真实示例。
4. P1 12 家族 / 48 母版的原创设计与审查。
5. P1 参数变形与锚点/关节约束。
6. P1 画廊、工作台与批量导出。
7. P2 全球多元外观模块。
8. P2 AI 受控配方规划。
9. P2 HandRaw Web / Skill 集成。

每个 Issue 以实际 code/tests/截图/CI 结果为验收证据，禁止将未实现目标标记为已完成。
