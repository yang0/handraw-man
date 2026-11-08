# Open Peeps 原始素材导入记录

> Issue [#3](https://github.com/yang0/handraw-man/issues/3) · 2026-11-08

## 已完成

- 从公开第三方镜像 `jenshor/open-peeps` 在固定提交 `816c04b7d09ac23a76c9260c7a8c818057696b9a` 导入 164 个真实 SVG（accessories: 8、body: 30、face: 30、facial-hair: 16、head: 46、pose: 34）。
- 直接保留 SVG 原文件与嵌套目录，没有用代码画任何人物路径。
- 每个文件核对与上游镜像的 Git Blob SHA-1 完全一致；复制没有修改 SVG。
- 创建逐件 machine-readable manifest：文件位置、原作者、上游 URL、commit、hash、类别、大小、许可证据、审核状态。
- 新增独立完整性验证脚本 `python3 scripts/verify_open_peeps.py`；不绘制/生成任何图像。

## 来源说明与许可

- Open Peeps 原始插画作者为 Pablo Stanley；官方网站 [openpeeps.com](https://www.openpeeps.com/) 明确其原始作品为 CC0。
- 实际下载源为公开的第三方 `jenshor/open-peeps` 源码仓库（不是官网 Gumroad 原包）。因此**目前只验证了与该镜像逐件一致，未核实是否与官方最新包逐字节一致**。如未来官方包内容不同，需按许可及 provenance 逐件审查、对照，并对疑似第三方新增件暂缓再分发。
- 上游镜像中 Flutter 代码和其 MIT 许可**不一并导入**；只导入被该镜像明确归属于 Open Peeps 的 SVG atom 资产，保留源信息。
- 保留源项目与作者感谢不是 CC0 的署名义务，而是为了完整溯源。

## 阶段适用性

一期“纯人物形体白模”要求无服装、发型、五官、角色身份、道具；Open Peeps 现有大部分素材包含这些内容或为半身、姿势素材，因此目前**全部标记 `phase1Ready: false`**。必须经过实际素材裁切/去外观、视觉审核后才能升为正式 Shape Library。不得声称本次导入已创建 48 个白模。

## 还未做

- 完整的官方作者原包与第三方镜像逐文件差异验证；缺少直接可访问的官方素材压缩包。
- 素材的精确锚点、可分割部件、去服装处理和组合模板。
- 可视化浏览器、编辑器、PNG/JSON 导出和界面测试；仍按 #3、#5、#6、#7 跟进。
- 针对一期缺失的纯形体素材，通过指定的 `gpt-image-2.6` **真实生图**并切割，交由 #9；绝不使用程序几何路径替代。
