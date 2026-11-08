# HandRaw Man

**AI-native, open and extensible character shape system** · AI 原生的原创人物形体设计与组合引擎。

> 仓库：https://github.com/yang0/handraw-man  
> 关联生态：[HandRaw Style](https://github.com/yang0/handraw-style) · [HandRaw Web](https://github.com/yang0/handraw-web)

## 定位

借鉴 Open Peeps 的**分层组合思想**，但独立设计造型、矢量资产和代码。项目不仅是换装人物图库，更是可确定性复现、可编辑、可批量生成的人物设计基础设施。

**第一阶段明确限定：** 只设计有趣、夸张、适于扩展的**纯人物形体/轮廓原型**。默认产物为全身、正视、黑白手绘线稿、白底、自然站姿；**不包含职业、姓名、性格、年龄、文化身份、固定角色故事、服装**。人物母库建成之后，才在独立层扩展全球多元外观、服饰、动作，最后考虑动物拟人化继承形体 DNA。

## 核心原则

1. Shape first：比例和轮廓优先于五官、服装与叙事。
2. 结构化：所有形体由可编辑参数、几何路径和锚点描述，不依赖单张位图。
3. 组合优先：AI 先选择/调整合法的形体配方；新组件需要独立审核才能进入母库。
4. Deterministic：同版本配方与种子必须生成一致的 SVG。
5. 全球通用：人类基本形体不绑定地域；文化特征作为可选的独立扩展，避免刻板化归类。
6. 开放集成：TypeScript 核心、SVG、JSON 配方、CLI/SDK，未来接入 HandRaw Web/Skill。

## 文档

- [产品需求与范围](docs/PRODUCT.md)
- [技术架构](docs/ARCHITECTURE.md)
- [形体与资产规范](docs/ASSET-SPEC.md)
- [阶段路线图与验收](docs/ROADMAP.md)
- [素材来源与授权策略（提案）](docs/LICENSING.md)

## 开发状态

新项目，按照 **先 Issue，后开发，测试通过再关闭 Issue** 的流程推进。第一批交付以可运行的 Shape Core 和 SVG renderer 为目标。可在 [Issues](https://github.com/yang0/handraw-man/issues) 跟踪实际完成情况。

## 与 Open Peeps 的边界

仅参考**模块化组合的通用方法**，不导入或描摹 Open Peeps 的特定人物轮廓、命名、动作、素材。所有素材需记录来源、创作方式和授权状态。

## License

代码和素材许可将在正式发布前分别确认；参见 [授权策略提案](docs/LICENSING.md)。当前不应因仓库公开就推断全部资产可再分发。
