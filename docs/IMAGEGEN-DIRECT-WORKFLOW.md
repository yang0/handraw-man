# HandRaw Man · 内置生图优先（真实素材工作流）

决策：[#13](https://github.com/yang0/handraw-man/issues/13)。**不要要求用户先装号池或提供 API Key**；手工样本设计与测试直接用 ChatGPT 当前对话的内置生图能力。

## 直接工作流

1. 在 ChatGPT 生成人物全身线稿/部件排版图。必须尽量满足一期：全身正视、无五官、无发型、无服饰、黑白线稿、白底、完整头颈躯干及四肢。可以分别出各家族并人工挑选，不用代码画人。
2. 保存模型真正输出的原始 PNG/JPEG/WebP，**不要仅保存截图或压缩版缩略图**。
3. 将真实图片放在本机路径，运行：
   ```powershell
   node scripts/import-imagegen-source.mjs --input "D:\images\source.png" --family bamboo --origin chatgpt-native --layout full-body
   ```
4. CLI 检查真实图片签名并复制原始字节，保存 SHA-256、来源申明及明确的 `modelEvidence=model-version-not-disclosed`。默认保存到被 gitignore 排除的 `assets/sources/ai/drafts/`。
5. 在仓库目录运行 `py -m http.server 8000 --bind 127.0.0.1`，打开 `http://127.0.0.1:8000/cut-editor.html` →「AI 草稿（本机生成）」；从真实素材图裁切、去白底、定位锚点并下载透明 PNG/JSON。
6. 逐件评审原图、裁切边缘和组合完整性。记录通过/失败，不合规样本仍为 `draft`，不得加入正式一期白模库。

## 与 DSH 的关系

- 普通素材生成、测试、切割 **不需要** `chatgpt2api-dsh`、Key 或外部收费 API。
- DSH 仅用于需要脚本批量、外部客户端集成时的**可选**接口，详见 [API 适配](AI-SOURCE-PIPELINE.md)。
- CLI 导入工具本身绝不调用模型；只接收 ChatGPT 已经真实生成并保存的图像文件。
- 如果内置生成结果没有公开 backend 模型版本，记录为 `undisclosed`，不能宣称它一定是 `gpt-image-2.6`。

## 测试样本与限制

参考 [2026-11-08 实际生图与裁切质检](REAL-IMAGEGEN-QA-2026-11-08.md)：当前聊天已真实生成 3 张源图及 8 个裁切件，在会话附件中提供压缩包。**原始二进制没有经 GitHub 提交**，因此仓库无法单独复现图片内容；需从对应聊天下载 ZIP 并使用其 manifest 复验 SHA。不要以仓库中的文字清单冒充已有图片。
