# Bamboo-001 · 真实肩髋修复素材的输入与试装（Issue #16）

此文档描述**已经实际产生**的四份原图参考，以及当前允许的修复试装工作流。顶级约束：[TOP_LEVEL_RULES](../TOP_LEVEL_RULES.md)。

## 当前取得的真实素材

真正的 Bamboo-001 原图此前已存入 GitHub，六个独立部件与四个姿态 QA 图都来自实际图片。此次从**相同的真实透明 PNG**（394×1493）按既定矩形，只进行像素裁切，得到以下四个修复参考区域：

| 参考区域 | 源图矩形（x0,y0,x1,y1） | 图片 |
|---|---|---|
| 左肩 | 92,238,190,425 | [left-shoulder.png](../assets/repair-inputs/bamboo-001/left-shoulder.png) |
| 右肩 | 204,238,302,425 | [right-shoulder.png](../assets/repair-inputs/bamboo-001/right-shoulder.png) |
| 左髋 | 108,620,203,845 | [left-hip.png](../assets/repair-inputs/bamboo-001/left-hip.png) |
| 右髋 | 191,620,286,845 | [right-hip.png](../assets/repair-inputs/bamboo-001/right-hip.png) |

[来源哈希及逐件 PNG 信息](../assets/repair-inputs/bamboo-001/manifest.json)，[纯裁切脚本](../scripts/prepare_joint_repair_refs.py)。

**严格说明：以上四图是原始部件的局部参考裁片，不是已经绘制、修好的“新关节”或可供直接替换的旋转部件。** 这四张 PNG 由 GitHub Actions 从仓库中已有源图提取并提交，避免了此前“只存了裁切件没存来源”的缺陷。

## 本轮真实图像生成的结果

2026-11-08 本轮尝试使用 ChatGPT 内置生图两次获取肩髋连接件。生成结果均为带有大量文字和未经证实「修复完成」声明的说明海报，**不满足可切割、可复用的独立 PNG 关节素材要求**，因此未进入库，也不把海报中的状态文字作为验收证据。

当前新生成且通过肩髋艺术审核的替换图：**0 张**。Bamboo-001 仍为 Draft，完整母版正式批准数仍 **0/48**。

## 真实 PNG 替换试装的步骤

1. 打开 [Bamboo-001 六部件装配器](../bamboo-parts.html)，选择左臂、右臂、左腿或右腿。
2. 使用 ChatGPT 图像编辑、已有合法素材或人工编辑方法得到**真正的新部件 PNG**。不要通过程序自动补绘人体线条，也不要直接把四个小裁片冒充修复部件。
3. 在源素材裁切编辑器中对齐后，导出与**要替换的原部件完全相同宽高**的 RGBA PNG。关键：完整部件范围不应该只是一块肩膀/髋部参考区，必须包含该部件实际轮廓。
4. 点击「加载所选部件的本地修复 PNG」，本地读取字节、校验 PNG 签名、RGBA 类型、宽高及 SHA-256；不会上传到远端。
5. 开启或关闭「在预览中使用本地替换 PNG」，对同一姿态进行旧件/候选件 A/B 检查，至少覆盖 20°、35°、60° 与走路姿态。
6. 记录接缝、重复墨线、遮挡、末端缺损，导出 QA JSON 和 Draft PNG。QA JSON 包含候选文件原始字节哈希及来源，但不会嵌入候选图片二进制，因此**不能单靠 JSON 复原未归档的替换部件**。
7. 原始六件和源图仍保留不变。未经人工来源、版权与接缝审查，不得批准或加入正式母版库。

**安全边界：** 用户本地候选尚未入库时禁止导出会把旧部件误当成候选的“可复现装配配方”；如需旧配方，关闭候选试装再导出。候选图仅可输出带明确 DRAFT 标识的 PNG 预览与 QA 证据。

## 构建和验收

\`\`\`bash
python3 -m pip install "Pillow>=11,<14"
python3 scripts/prepare_joint_repair_refs.py --verify
python3 scripts/slice_bamboo_001.py --verify
python3 scripts/qa_bamboo_motion.py --verify
npm test
python3 -m http.server 8000 --bind 127.0.0.1
\`\`\`

[Issue #16](https://github.com/yang0/handraw-man/issues/16) 保持 open，直到真正独立的肩髋 PNG 修改产出、溯源入库，并在真实转动后通过美术审核。修复参考图与试装工具的完成并**不**满足这一最终条件。
