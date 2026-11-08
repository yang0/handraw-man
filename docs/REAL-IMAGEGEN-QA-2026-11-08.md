# HandRaw Man · 2026-11-08 真实内置生图与裁切 QA

## 执行方式及结论

- 通过本次 ChatGPT 会话中的**真实内置图像生成功能**生成原始 PNG 共 **3 张**，不是模拟 HTTP 图片，也不是算法绘制的人物 SVG。
- 对三张原图人工选框，进行真实矩形裁切与外边界连通白背景去除，输出**8 个透明 PNG 测试样例**。
- 原始字节文件与所有裁切件均保存在本次会话交付的 `handraw_man_imagegen_pilot.zip` 中，ZIP 自带 `manifest.json`、源图、裁切图和接触表。**未通过 GitHub API 将 4.8MB 二进制 ZIP 导入仓库；此处只存真实测试报告与哈希证据。**
- **美术验收不通过（一期）**：生成的图包含头发、五官、衣服和复杂姿势，且不是全身无身份人物白模。素材全部按 `draft`、`phase1Ready:false` 对待，可用来验证组件处理，但**正式母版验收数为 0**。
- 由于 ChatGPT 生图工具不提供明确底层模型版本，原始文件一律只标记 `chatgpt-native`，模型版本 `undisclosed`，不应冒称 `gpt-image-2.6`。

## 实际原图 SHA-256

| 文件 | SHA-256 |
|---|---|
| `sources/sheet_a.png` | `c3d789bc099440b20125082171950a86fedcaa6890f874a478f06c9e84d56d4d` |
| `sources/sheet_b.png` | `2afaa2d48649872817572b5226971aad27ce8b3c32862a8a49cbbf260cb5b094` |
| `sources/sheet_c.png` | `f3cdcdda1f3db321595a89efe663d6c68fdc7e6f9480241e9a4c956125ed6e2d` |

## 切割样例 SHA-256

| 裁切件 | SHA-256 前 12 位 | 来源 |
|---|---|---|
| full-standing-slim-a | `56aa70a9e100` | sheet_a |
| head-hair-blank | `9238b9a3ca1e` | sheet_c |
| shirt-short-sleeve | `bf0e3ab1a76f` | sheet_a |
| arm-open-hand | `fced8a7a1ebd` | sheet_a |
| pants-straight | `6a52f4260b8e` | sheet_a |
| full-standing-slim-b | `2ac5d39c0ad3` | sheet_b |
| head-round-smile | `a1f4dccd5a37` | sheet_b |
| full-standing-hoodie | `ce78839c39d3` | sheet_c |

所有完整裁切哈希、裁切矩形和去背景像素计数见 ZIP 中 `manifest.json`。源/裁切件哈希在构建测试包后已经逐一重新计算核对通过。

## 产品与质量问题

1. 原图不符合 Phase 1：生成工具倾向于输出已着装人物与五官。下一轮必须严格限制外观，不应为了赶工冒充合格白模。
2. 矩形裁切不是语义分割：手/脚与邻近图层可能被遮挡，局部须人工修图。
3. 背景透明处理是外边界近白色区域填充去除，可能存在白色衣服的边缘抠图缺陷；必须人工视觉审查。
4. 本轮只证明**不用号池就能直接生图和裁切**，并未证明全身独立部件已无缝装配。
5. 复制图片到本机草稿后可直接测试现有 `cut-editor.html`，不需 DSH。

下一步以合格原始形体/部件的视觉质量为先，再做自动化/批量迭代。
