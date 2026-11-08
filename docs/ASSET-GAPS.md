# 素材缺口与适用范围 · Open Peeps -> HandRaw Man

更新：2026-11-08 · 对应 [Issue #3](https://github.com/yang0/handraw-man/issues/3)、[Issue #5](https://github.com/yang0/handraw-man/issues/5)、[Issue #9](https://github.com/yang0/handraw-man/issues/9)。

## 已有：164 个真实 Open Peeps SVG atom

head 46 · face 30 · facial-hair 16 · accessories 8 · body 30 · pose 34。原件保留在 `assets/sources/open-peeps/atoms`，逐件来源详见 manifest。

### 复用方式

- **可立即使用**：现成头部、表情、胡须、眼镜的分层图；姿势和上身 SVG 可独立浏览、作为编辑参考。首批 Web 预览遵循已公开的 Open Peeps Flutter 图层相对坐标（来自 jenshor/open-peeps peep_avatar.dart），不是算法绘制。
- **不得直接声称符合一期**：Open Peeps 很多原件包含衣服、头发、表情、道具、坐姿；不是“无身份、无衣服、全身正视、纯黑白形体”的原型母库。
- **尚不具备**：经过真实抠图和锚点人工调整、可与任何头部无缝装配的全身身形组件；可供更换的透明独立双臂/双腿；风格一致的 12 类纯形体、48 个经审查母版。

## 不要用代码填补的缺口

1. 纯全身正视人体白模，优先各种有趣夸张的轮廓，不能根据现有穿衣 SVG 程序“抹去衣服重画身体”。
2. 独立手脚、躯干、头颈等可分切透明原件，以及可审查的连接位置。
3. 单个形体家族内视觉上有本质差异的真实母版。
4. 经审查的图片来源和合法许可，若需要使用 AI 则由 `gpt-image-2.6` 生成实图并切割，不得模型名称造假。

## 下一条实际制作路径

- 先选少量接近目标的 Open Peeps 原件，用真实 SVG 元素整理与编辑软件手工/半自动分切；保留可回滚原件。
- 缺乏对应全身正视原型时，使用官方或配置好真实适配器的 `gpt-image-2.6` 生成：无五官、无服装、无颜色、白底、全身站姿、头颈/手/脚清晰、独特剪影。原图落盘 → 透明化/分切 → 人审 → 登记来源。
- 根据每个真实部件的边缘位置设置规范化锚点，只负责定位/缩放已有图片。
- 对 AI 原图建单独 provenance，严禁把它们混成 Open Peeps CC0 素材或虚称为官方模型输出。

## 审核状态

源图的 Git Blob 校验合格不代表通过艺术质量、素材归属或一期白模审核。现有 164 项全部 `phase1Ready:false`。原始镜像尚未与作者官方压缩包逐字节比对。

首版 Web 工作台是**可运行的真实来源资产浏览与头部图层组合功能**；全身白模组合、AI 生成/裁切仍需 #5/#9 后续开发。
