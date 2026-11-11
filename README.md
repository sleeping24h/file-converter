# 文件转换（File Converter）

免费、本地、免上传的文件格式转换单页网站。中国大陆可直接访问：转换组件优先从国内 BootCDN 加载，失败自动切换 jsDelivr；页面本身除转换组件外没有任何外部引用。

## 功能

- 拖放 / 点击选择 / Ctrl+V 粘贴，支持多文件批量转换
- PDF → PNG / JPG 图片（每页一张，清晰度 1x–3x 可选）、→ TXT 文本
- Word (.docx) → PNG 图片（分页 A4 渲染）、→ PDF、→ HTML、→ TXT
- 图片 PNG / JPG / WebP / BMP / GIF 互转（质量滑杆）、→ PDF（每张图一个文件）
- 文本 / Markdown → PNG 图片、→ PDF、→ DOS 格式（CRLF 换行）
- CSV ↔ JSON 互转
- 任意文件 → ZIP 打包、→ Base64 文本
- 转换结果逐个下载，或一键打包 ZIP 下载全部

## 诚实说明（页面里也有）

- 所有转换都在访问者浏览器本地完成，文件不上传服务器
- 老版 .doc 二进制文件浏览器无法解析，需先另存为 .docx
- 转换速度取决于访问者设备性能和文件大小，与网速无关
- 文本、Word 转 PDF 是按渲染页面图片生成的，PDF 内文字不可选中复制

## 文件

- `index.html` — 页面结构与全部样式（无任何外部引用）
- `app.js` — 全部转换逻辑与 CDN 懒加载（含 BootCDN → jsDelivr 备用）

## 部署到 GitHub Pages（4 步）

1. 在 GitHub 新建一个公开仓库，例如 `file-converter`（不要勾选 README，让仓库保持为空，或之后直接覆盖）。
2. 把这两个文件推上去（仓库根目录）：
   ```bash
   git init
   git add index.html app.js README.md
   git commit -m "file converter: client-side, China-friendly CDN"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/file-converter.git
   git push -u origin main
   ```
3. 打开仓库页面 → **Settings → Pages** → **Build and deployment** → Source 选择 **Deploy from a branch** → Branch 选择 **main**、文件夹 **/ (root)** → **Save**。
4. 等 1–2 分钟，打开 `https://<你的用户名>.github.io/file-converter/` 即可使用。后续改版只需重新 push，Pages 会自动更新。

## 本地验证（已做）

- `node --check app.js` 通过
- `python3 -m http.server` 本地服务：`index.html` 与 `app.js` 均返回 HTTP 200
- 代码中引用的 12 个 CDN 地址（6 个库 × BootCDN + jsDelivr）逐个 curl 均为 HTTP 200

## 未验证（需要真机浏览器）

- 没有在本环境做真实文件转换的端到端测试（无浏览器自动化）：PDF 转图片、Word 转图片等实际转换流程尚未实测，部署后请先用一个 PDF 和一个 .docx 各转一次确认。
