# Audit Report PDF → Excel Converter

**Live site:** https://davychan188.github.io/audit-pdf-to-excel/

## What it does / 功能

Drag and drop audit report PDFs to extract findings and export them as an Excel file in Master Referral List format.

拖放 Audit Report PDF，自動擷取 Findings，匯出為 Master Referral List 格式的 Excel。

## Privacy / 私隱

All processing happens in your browser (pdf.js + SheetJS via CDN). Files are **not** uploaded to any server.

所有處理都在瀏覽器本地完成，不會上傳任何檔案。

## How to use / 使用方法

1. Open https://davychan188.github.io/audit-pdf-to-excel/
2. Drop one or more PDFs (text-selectable, not scanned-image-only)
3. Click **匯出為 Excel (.xlsx)**

## Tech

- Client-side only: HTML + pdf.js + xlsx (CDN)
- No build step, no backend
