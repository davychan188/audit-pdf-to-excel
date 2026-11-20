# Audit Report PDF → Excel Converter

**Live site:** https://davychan188.github.io/audit-pdf-to-excel/

## What it does / 功能

Drag and drop Audit Report, TMU Site Check Report (TMU-Form-03), or Tree Removal PDFs to extract findings, then **copy TSV** and paste into Excel.

拖放 Audit Report、TMU Site Check Report（TMU-Form-03）或 Tree Removal PDF，自動擷取資料，按對應按鈕複製再貼到 Excel。

### Copy formats / 複製格式

TNS (Audit / TMU) and Tree Removal rows are split by official estate group so they can be pasted into two different workbooks. Both TNS buttons use the same 18-column, data-only (no header) clipboard as the TY&TNS file’s TNS sheet. Unmapped or Unknown Estate rows are not copied to either clipboard.

| Button | Target | Columns | Header on clipboard? |
|--------|--------|---------|----------------------|
| **複製 TNS（KC&WTT）** | KC&WTT workbook TNS-style paste | 18 cols (Audit Source=AS, deadline empty; TMU Source=TMU, deadline = Date Received + 14 days) | No |
| **複製 TNS（TY&TNS）** | TY&TNS workbook › `TNS` | Same 18 cols | No |
| **複製 Tree Removal Summary（KC&WTT）** | Tree Removal Summary (KC&WTT estates) | 21 cols including TPC / Non-TPC, then S/N … Remarks | No |
| **複製 Tree Removal Summary（TY&TNS）** | Tree Removal Summary (TY&TNS estates) | Same Removal columns | No |

Clipboard is tab-separated. Empty cells still emit tabs so columns stay aligned when pasting.

AS Audit rows whose Findings/Observation is only the stock sentence *No general comment on tree works maintenance and horticultural reminders after regular audit inspection.* are omitted from the TNS table and from the TNS copy buttons (wrapping, extra spaces, and a trailing period are ignored). Rows that also contain a real finding are kept.

## Privacy / 私隱

All processing happens in your browser (pdf.js via CDN). Files are **not** uploaded to any server.

所有處理都在瀏覽器本地完成，不會上傳任何檔案。

## How to use / 使用方法

1. Open https://davychan188.github.io/audit-pdf-to-excel/
2. Drop one or more PDFs (text-selectable, not scanned-image-only)
3. Click **複製 TNS（KC&WTT）** or **複製 TNS（TY&TNS）** (and the matching Tree Removal buttons if needed), then paste into Excel
4. After a site update: click **清除全部**, then hard-refresh (**Ctrl+Shift+R**) before re-opening PDFs

## Tech

- Client-side only: HTML + pdf.js (CDN)
- No build step, no backend
