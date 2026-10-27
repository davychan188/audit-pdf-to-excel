# Audit Report PDF → Excel Converter

**Live site:** https://davychan188.github.io/audit-pdf-to-excel/

## What it does / 功能

Drag and drop audit report PDFs to extract findings, then **copy the table** (TSV) and paste into Excel in Master Referral List format.

拖放 Audit Report PDF，自動擷取 Findings，按「複製表格」再貼到 Excel（Master Referral List 格式）。

## Privacy / 私隱

All processing happens in your browser (pdf.js via CDN). Files are **not** uploaded to any server.

所有處理都在瀏覽器本地完成，不會上傳任何檔案。

## How to use / 使用方法

1. Open https://davychan188.github.io/audit-pdf-to-excel/
2. Drop one or more PDFs (text-selectable, not scanned-image-only)
3. Click **複製表格（可貼到 Excel）**, then paste into Excel

## Tech

- Client-side only: HTML + pdf.js (CDN)
- No build step, no backend
