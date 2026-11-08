# Bamboo-001 肩关节锚点校准与 A/B 视觉审查 · Issue #15

日期：2026-11-08。关联 [#5](https://github.com/yang0/handraw-man/issues/5)、[#14](https://github.com/yang0/handraw-man/issues/14) 和 [#15](https://github.com/yang0/handraw-man/issues/15)。规则以 [TOP_LEVEL_RULES.md](../TOP_LEVEL_RULES.md) 为准。

## 真实素材与问题

Bamboo-001 源自真实 ChatGPT 内置生图，仓库已有原图和六张透明 PNG 部件。早期肩部锚点标在手臂内侧区域，导致左、右手臂旋转 ±32° 后，在肩部顶部产生肉眼明显的**断线**。2026-11-08 本轮实际用已有 PNG 的图层旋转制作多组候选对照，检查其视觉连接状况，没有使用程序绘制、补线、Bezier 或重新合成人体轮廓。

## 人工挑选的旋转轴候选

| 部件 | 源 manifest 估算锚点 | 新候选旋转中心 | 修正（dx, dy） |
|---|---|---|---|
| 左手臂 | (142, 302) | **(125, 313)** | **(-17, +11)** |
| 右手臂 | (252, 302) | **(269, 313)** | **(+17, +11)** |

这只是对**原有 PNG 的旋转中心**进行人工校准：没有移动原始源图、修改 PNG 源文件字节，也没有新绘制任何肩关节。旧方案保留，可随时切换、撤销。现有髋部锚点、腿部原件仍保持原样。

## 实际生成的对比证据

- [旧锚点：arms-out.png](../assets/qa/bamboo-001/arms-out.png)。
- [校准锚点：arms-out-calibrated.png](../assets/qa/bamboo-001/arms-out-calibrated.png)。
- [中立姿态：neutral.png](../assets/qa/bamboo-001/neutral.png)。
- [髋部问题：walk-test.png](../assets/qa/bamboo-001/walk-test.png)。
- [机器可核查的真实 PNG SHA-256 与来源](../assets/qa/bamboo-001/manifest.json)。

四张 QA 图由 [Python 图像处理脚本](../scripts/qa_bamboo_motion.py) 对真实 PNG 进行旋转/叠加生成，不绘制人体。原位重组继续保留白底像素完全一致的校验；所有活动姿态截图都是 `draft` 且 `articulatedJoinReviewed=false`。

视觉对比显示：**校准后肩部原先的大裂口明显缩小，轮廓更连贯**。但并非无缝：连接处有局部墨线加粗/轻微凸点，腋下轮廓并未完成独立修补。当前不符合可自由摆姿的正式发行标准。

## 编辑器交付

- [Bamboo-001 工作台](../bamboo-parts.html) 新增「双臂张开（人工校准）」预设，可立即与「双臂张开（原始锚点）」对照。
- 每个部件可单独微调锚点偏移：X / Y 的范围为 -60..60 像素；可以单独撤销校准，或一键恢复全部原位。
- [姿态数据契约](../web/part-transform.mjs) 导出 v3 JSON，包含 `pivotShiftX/pivotShiftY`、六个原始 PNG 哈希与草稿状态；旧版 v2 导入时校准默认清零，保证兼容。
- 导入校验仍禁止任意错误值、缺失 SHA-256、越界、非法锚点和虚假正式审核。
- 原位不旋转、比例 1、位移 0 时，调节转轴不改变任何源像素的正常位置；计算已加入单测。

## 剩余缺陷与发布门禁

1. **肩部**：新方案仅缩小裂口，轮廓仍有局部加粗和不自然过渡，未来需要对真实原图进行 AI/人工图像编辑并导入经过来源追溯的修复 PNG。
2. **髋部**：走路测试的硬切口仍在，尚无新的独立髋/腿部真实修复图。
3. **关节旋转**：这里只验证特定角度 ±32° 的候选效果；尚未完成 20°/35°/60° 多角度美术验收。
4. **正式库**：本次不批准任何新母版，`phase1Ready=false`，正式总数仍 0/48。
5. **图像模型尝试**：本轮再次要求生图工具只生成独立关节补件，但得到带文字的产品展示海报，**拒绝作为素材**；不会用这张海报冒充修复 PNG。

## 可重复验收

```bash
python3 scripts/slice_bamboo_001.py --verify
python3 scripts/qa_bamboo_motion.py --verify
npm test
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/bamboo-parts.html
```

关键结论：这次是真实已有图像的**锚点与连接效果优化**，不是生成了新的肩、髋独立修复素材。待实际编辑原图获得新部件后，仍要经过视觉与授权审核。
