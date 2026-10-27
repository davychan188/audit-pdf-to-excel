# Audit Report PDF → Excel Converter

**Live site:** https://davychan188.github.io/audit-pdf-to-excel/

## What it does / 功能

Drag and drop audit / tree-removal PDFs to extract findings, then **copy TSV** (no header) and paste into the matching Master Referral List sheet.

拖放 Audit Report 或 Tree Removal PDF，自動擷取資料，按對應按鈕複製（**不含表頭**）再貼到 Excel。

### Copy formats / 複製格式

| Button | Sheet | Columns |
|--------|-------|---------|
| **複製 TNS（Audit）** | `TNS` | 18 cols (includes AS Reply Date) |
| **複製 TPC/Non-TPC** | `TNS_TPC & Non-TPC` | 20 cols |

Clipboard is **data rows only** (tab-separated). Empty cells still emit tabs so columns stay aligned when pasting.

## Privacy / 私隱

All processing happens in your browser (pdf.js via CDN). Files are **not** uploaded to any server.

所有處理都在瀏覽器本地完成，不會上傳任何檔案。

## How to use / 使用方法

1. Open https://davychan188.github.io/audit-pdf-to-excel/
2. Drop one or more PDFs (text-selectable, not scanned-image-only)
3. Click **複製 TNS（Audit）** or **複製 TPC/Non-TPC**, then paste into the matching Excel sheet
4. Hard-refresh (**Ctrl+Shift+R**) after site updates

## Tech

- Client-side only: HTML + pdf.js (CDN)
- No build step, no backend
