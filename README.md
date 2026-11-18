# Audit Report PDF → Excel Converter

**Live site:** https://davychan188.github.io/audit-pdf-to-excel/

## What it does / 功能

Drag and drop Audit Report, TMU Site Check Report (TMU-Form-03), or Tree Removal PDFs to extract findings, then **copy TSV** and paste into Excel.

拖放 Audit Report、TMU Site Check Report（TMU-Form-03）或 Tree Removal PDF，自動擷取資料，按對應按鈕複製再貼到 Excel。

### Copy formats / 複製格式

| Button | Target | Columns | Header on clipboard? |
|--------|--------|---------|----------------------|
| **複製 TNS（Audit／TMU）** | Master Referral List › `TNS` | 18 cols (Audit Source=AS, deadline empty; TMU Source=TMU, deadline = Date Received + 14 days) | No |
| **複製 Tree Removal Summary** | Tree Removal Summary sheet | 20 cols (S/N … Remarks) | No |

Clipboard is tab-separated. Empty cells still emit tabs so columns stay aligned when pasting.

AS Audit rows whose Findings/Observation is only the stock sentence *No general comment on tree works maintenance and horticultural reminders after regular audit inspection.* are omitted from the TNS table and from **複製 TNS** (wrapping, extra spaces, and a trailing period are ignored). Rows that also contain a real finding are kept.

## Privacy / 私隱

All processing happens in your browser (pdf.js via CDN). Files are **not** uploaded to any server.

所有處理都在瀏覽器本地完成，不會上傳任何檔案。

## How to use / 使用方法

1. Open https://davychan188.github.io/audit-pdf-to-excel/
2. Drop one or more PDFs (text-selectable, not scanned-image-only)
3. Click **複製 TNS（Audit／TMU）** or **複製 Tree Removal Summary**, then paste into Excel
4. Hard-refresh (**Ctrl+Shift+R**) after site updates

## Tech

- Client-side only: HTML + pdf.js (CDN)
- No build step, no backend
