# Bamboo-001 六部件真实像素拆分 · 技术验收

关联 [Issue #5](https://github.com/yang0/handraw-man/issues/5)。最高级规则：[TOP_LEVEL_RULES](../TOP_LEVEL_RULES.md)。

## 本轮可验证成果

从仓库中已有的 **394 × 1493 透明 Bamboo-001** 完整素材，仅切割和重新归属**真实来源 PNG 的像素**，制作头部、躯干、左/右手臂、左/右腿共六个独立透明 PNG。原件未修改，分件默认均为草稿。

- [实际六部件 PNG 目录](../assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001)
- [每件实际哈希、矩形范围及锚点 JSON](../assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/manifest.json)
- [浏览器可拖动偏移的组装预览](../bamboo-parts.html)
- [仅处理现有像素的生产脚本](../scripts/slice_bamboo_001.py)

### 检查点

1. 原源图的 SHA-256 先与 Bamboo-001 源素材清单校验；若改变则拒绝加工。
2. 每个非透明原图像素被**排他地分配**给且只给一个部件；不会编写轮廓、补画笔触或凭空造人。
3. 每件独立裁切出带真实原位置边界的 PNG；保留 12px 安全空白，实际字节 SHA-256 记录在 JSON。
4. 将六件按原图相对坐标依次放回透明画布，与原素材在白色背景合成比较，**像素完全一致**；Python 验证失败则构建报错。
5. 可用 [六部件实验室](../bamboo-parts.html) 单独隐藏/移动图层和导出组合 PNG/JSON；Canvas 只调用 `drawImage` 放置已有 PNG。
6. 每个连接锚点仅作“预估”，没有经过人工关节质量审核。

## 不等于完成的内容

**本轮只完成原位重组验证，并没有完成真正可任意换姿势的身体组件。** 原始手臂和肩膀、腿和髋部的线条相连，分割边缘仍会有硬切口；手脚移动后会出现明显接缝。要实现高质量自由摆姿，必须用真实图像编辑解决这些部位的缺损、隐藏轮廓和遮挡，而不是通过程序自动画线补人体。

因此 **正式可活动关节审核数：0**，所有部件 `reviewStatus=draft`、`phase1Ready=false`、`articulatedJoinReviewed=false`；六件不能计为六个母版。Bamboo-001 原完整形体仍为 1 件初步视觉合格候选、0 件正式批准。

本轮另一次 Orb 原图生成出现了**带文字分类海报**，未能成为独立完整形体，因此不进入新家族名额，也不增加正式计数。

## 复现

```bash
python3 -m pip install "Pillow>=11,<14"
python3 scripts/slice_bamboo_001.py
python3 scripts/slice_bamboo_001.py --verify
python3 -m http.server 8000 --bind 127.0.0.1
# 浏览器访问 http://127.0.0.1:8000/bamboo-parts.html
```

真正提交的 PNG 位于 `assets/candidates/phase1-fullbody-2026-11-08/parts/bamboo-001/`，生成与校验均由 GitHub Actions 在 feature branch 自动完成，并保留可复验脚本。继续人工审阅锚点和关节后才能升级资产状态。
