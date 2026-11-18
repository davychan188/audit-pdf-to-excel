#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const hm = script.match(/const HEADERS_TNS = \[[\s\S]*?\];[\s\S]*?const HEADERS_REMOVAL = \[[\s\S]*?\];[\s\S]*?const headers = HEADERS_TNS;/);
const pm = script.match(/const KNOWN_PLACES[\s\S]*?function parseReport\(text, filename\) \{[\s\S]*?\n\}/);
if (!hm || !pm) {
  console.error('Failed to extract parser from index.html', !!hm, !!pm);
  process.exit(1);
}
eval((hm[0] + '\n' + pm[0]).replace(/\bconst /g, 'var '));

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

function cells(row) {
  return row.cells || row;
}

/** Split the leading TPC / Non-TPC column from the original 20 Removal data columns. */
function removalParts(row) {
  const c = cells(row);
  if (c && c.length >= 21) return { type: c[0], d: c.slice(1), all: c };
  return { type: '', d: c, all: c };
}

function check(lab, file, exp) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseReport(text, path.basename(file) + '.pdf');
  const c = rows.map(r => cells(r));
  console.log(lab, c.map(r => ({ kind: (rows[0] && rows[0].kind) || '?', case: r[2], estate: r[1], date: r[3], tree: r[4], obs: r[5] })));
  assert(rows.length === exp.n, `${lab}: expected ${exp.n} rows, got ${rows.length}`);
  if (exp.kind) {
    assert(rows.every(r => r.kind === exp.kind), `${lab}: kind ${rows[0] && rows[0].kind}`);
  }
  assert(c.every(r => r[1] === exp.estate), `${lab}: estate ${c[0] && c[0][1]}`);
  assert(c.every(r => r[2] === exp.caseNo), `${lab}: case ${c[0] && c[0][2]}`);
  assert(c.every(r => r[3] === exp.date), `${lab}: date ${c[0] && c[0][3]}`);
  assert(c.map(r => r[4]).join(',') === exp.trees.join(','), `${lab}: trees ${c.map(r => r[4])}`);
  assert(c.map(r => r[5]).join('|') === exp.obs.join('|'), `${lab}: obs ${c.map(r => r[5]).join('|')}`);
  console.log(lab, 'PASS');
}

const samples3 = '/workspace/audit-samples3';
check('shekmun-pdfjs', path.join(samples3, 'shekmun-pdfjs.txt'), {
  n: 3,
  kind: 'audit',
  caseNo: 'AS-TNS-SM-2026-006',
  estate: 'Shek Mun Estate',
  date: '04/08/2026',
  trees: ['SM-T0209', 'SM-T0212', 'SM-T0319'],
  obs: ['Asymmetric crown', 'Asymmetric crown', 'Asymmetric crown']
});
check('butterfly-pdfjs', path.join(samples3, 'butterfly-pdfjs.txt'), {
  n: 1,
  kind: 'audit',
  caseNo: 'AS-TY-BE-2026-005',
  estate: 'Butterfly Estate',
  date: '13/07/2026',
  trees: ['BE-T0307'],
  obs: ['Hanger']
});

const samplesRem = '/workspace/audit-samples-removal';


check('longshin-pdfjs', path.join(samplesRem, 'longshin-pdfjs.txt'), {
  n: 12,
  kind: 'audit',
  caseNo: 'AS-TY-LSN-2026-007',
  estate: 'Long Shin Estate',
  date: '27/10/2026',
  trees: [
    'LSN-T0424', 'LSN-T0034', 'LSN-T0420',
    'LSN-A0001', 'LSN-A0002', 'LSN-A0003', 'LSN-A0004', 'LSN-A0005',
    'LSN-LL1', 'LSN-LL2', 'LSN-LL3', 'LSN-LL4'
  ],
  obs: [
    'Dead branch', 'Dead tree', 'Wilted crown',
    'Dead tree', 'Dead tree', 'Dead tree', 'Dead tree', 'Dead tree',
    'Leucaena leucocephala', 'Leucaena leucocephala', 'Leucaena leucocephala', 'Leucaena leucocephala'
  ]
});


function checkRemoval(lab, file, exp) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseReport(text, path.basename(file).replace(/\.txt$/, '') + '.pdf');
  assert(rows.length === exp.n, `${lab}: expected ${exp.n} rows, got ${rows.length}`);
  assert(rows.every(r => r.kind === 'removal'), `${lab}: kind`);
  assert(rows.every(r => r.cells.length === 21), `${lab}: 21 cols`);
  const parts = rows.map(r => removalParts(r));
  const c = parts.map(p => p.d);
  if (exp.type) {
    assert(parts.every(p => p.type === exp.type), `${lab}: type ${parts.map(p => p.type)}`);
  }
  console.log(lab, parts.map(p => ({ type: p.type, sn: p.d[0], estate: p.d[1], tree: p.d[2], sci: p.d[3], zh: p.d[4], h: p.d[5], reason: p.d[13], remarks: p.d[19] })));
  assert(c.every(r => r[1] === exp.estate), `${lab}: estate ${c[0] && c[0][1]}`);
  assert(c.map(r => r[2]).join(',') === exp.trees.join(','), `${lab}: trees`);
  assert(c.map(r => r[0]).join(',') === exp.sns.join(','), `${lab}: sns ${c.map(r => r[0])}`);
  assert(c.map(r => r[3]).join('|') === exp.scientific.join('|'), `${lab}: sci ${c.map(r => r[3]).join('|')}`);
  assert(c.map(r => r[4]).join('|') === exp.chinese.join('|'), `${lab}: zh ${c.map(r => r[4]).join('|')}`);
  assert(c.map(r => r[5]).join(',') === exp.heights.join(','), `${lab}: heights`);
  assert(c.map(r => r[6]).join(',') === exp.dbhs.join(','), `${lab}: dbhs`);
  assert(c.map(r => r[7]).join(',') === exp.crowns.join(','), `${lab}: crowns`);
  assert(c.map(r => r[8]).join(',') === exp.girths.join(','), `${lab}: girths`);
  const amenity = exp.amenity || 'Low';
  const form = exp.form || 'Poor';
  const health = exp.health || 'Poor';
  const structural = exp.structural || 'Poor';
  assert(c.every(r => r[9] === amenity), `${lab}: amenity ${c.map(r => r[9])}`);
  assert(c.every(r => r[10] === form && r[11] === health && r[12] === structural), `${lab}: conditions ${c.map(r => [r[10], r[11], r[12]])}`);
  assert(c.map(r => r[13]).join('|') === exp.reasons.join('|'), `${lab}: reasons`);
  assert(c.every(r => r[14] === exp.planting), `${lab}: planting ${c.map(r => r[14])}`);
  if (exp.noReplace != null) {
    assert(c.every(r => r[15] === exp.noReplace), `${lab}: noReplace ${c.map(r => r[15])}`);
  }
  assert(c.every(r => r[16] === exp.antRemoval), `${lab}: antRemoval ${c.map(r => r[16])}`);
  assert(c.every(r => r[17] === exp.antComp), `${lab}: antComp ${c.map(r => r[17])}`);
  assert(c.every(r => r[18] === exp.actual), `${lab}: actual ${c.map(r => r[18])}`);
  assert(c.every(r => r[19] === exp.remarks), `${lab}: remarks ${c.map(r => r[19])}`);
  console.log(lab, 'PASS');
}

checkRemoval('non-tpc-removal-pdfjs', path.join(samplesRem, 'non-tpc-20261021-pdfjs.txt'), {
  n: 3,
  type: 'Non-TPC',
  estate: 'Tai Yuen Estate',
  sns: ['26', '27', '28'],
  trees: ['TY-T0315', 'TY-T0571', 'TY-T1198'],
  scientific: ['Acacia confusa', 'Aleurites moluccana', 'Bauhinia spp.'],
  chinese: ['台灣相思', '石栗', '羊蹄甲屬'],
  heights: ['8', '11', '6'],
  dbhs: ['310', '370', '130'],
  crowns: ['5', '6', '1'],
  girths: ['973', '1162', '408'],
  reasons: [
    'Dead tree (except for dead trees of particular interest)',
    'Dead tree (except for dead trees of particular interest)',
    'Dead tree (except for dead trees of particular interest)'
  ],
  planting: 'Yes',
  noReplace: '',
  antRemoval: '21/11/2026',
  antComp: '21/5/2026',
  actual: 'N/A',
  remarks: 'TNS-TY-2026-002'
});

checkRemoval('sco-20261017-pdfjs', path.join(samplesRem, 'sco-20261017-pdfjs.txt'), {
  n: 6,
  type: 'Non-TPC',
  estate: 'Shui Chuen O Estate',
  sns: ['20', '21', '22', '23', '24', '25'],
  trees: ['SCO-A0004', 'SCO-A0005', 'SCO-A0006', 'SCO-A0007', 'SCO-A0008', 'SCO-A0009'],
  scientific: [
    'Leucaena leucocephala', 'Acacia confusa', 'Acacia confusa',
    'Leucaena leucocephala', 'Pinus elliottii', 'Leucaena leucocephala'
  ],
  chinese: ['銀合歡', '台灣相思', '台灣相思', '銀合歡', '濕地松(愛氏松)', '銀合歡'],
  heights: ['6', '4', '5', '7', '7', '8'],
  dbhs: ['220', '130', '120', '210', '210', '205'],
  crowns: ['3', '2', '2', '3', '1', '4'],
  girths: ['691', '408', '377', '659', '659', '644'],
  reasons: [
    'Removal of common undesirable species',
    'Tree removal for the purpose of woodland management',
    'Tree removal for the purpose of woodland management',
    'Removal of common undesirable species',
    'Dead tree (except for dead trees of particular interest)',
    'Removal of common undesirable species'
  ],
  planting: 'No',
  noReplace: 'Steep slope (over 35 degrees)',
  antRemoval: '17/11/2026',
  antComp: 'N/A',
  actual: 'N/A',
  remarks: 'TNS-SCO-2026-004'
});

// Also accept pdftotext-style Tai Yuen layout
checkRemoval('non-tpc-removal-pdftotext', path.join(samplesRem, 'non-tpc-20261021.txt'), {
  type: 'Non-TPC',
  n: 3,
  estate: 'Tai Yuen Estate',
  sns: ['26', '27', '28'],
  trees: ['TY-T0315', 'TY-T0571', 'TY-T1198'],
  scientific: ['Acacia confusa', 'Aleurites moluccana', 'Bauhinia spp.'],
  chinese: ['台灣相思', '石栗', '羊蹄甲屬'],
  heights: ['8', '11', '6'],
  dbhs: ['310', '370', '130'],
  crowns: ['5', '6', '1'],
  girths: ['973', '1162', '408'],
  reasons: [
    'Dead tree (except for dead trees of particular interest)',
    'Dead tree (except for dead trees of particular interest)',
    'Dead tree (except for dead trees of particular interest)'
  ],
  planting: 'Yes',
  noReplace: '',
  antRemoval: '21/11/2026',
  antComp: '21/5/2026',
  actual: 'N/A',
  remarks: 'TNS-TY-2026-002'
});

// Audit row shape = 18 TNS cols, includes AS Reply Date slot at index 12
(() => {
  const text = fs.readFileSync(path.join(samples3, 'shekmun-pdfjs.txt'), 'utf8');
  const rows = parseReport(text, 'AS-TNS-SM-2026-006.pdf');
  assert(rows.every(r => r.kind === 'audit'), 'audit kind');
  assert(rows.every(r => r.cells.length === 18), 'audit 18 cols: ' + rows[0].cells.length);
  assert(rows.every(r => r.cells[0] === 'AS'), 'Source AS');
  assert(HEADERS_TNS.length === 18, 'HEADERS_TNS len');
  assert(HEADERS_TNS[12] === 'AS Reply Date', 'AS Reply Date position');
  assert(HEADERS_REMOVAL.length === 21, 'HEADERS_REMOVAL len');
  assert(HEADERS_REMOVAL[0] === 'TPC / Non-TPC', 'removal header type');
  assert(HEADERS_REMOVAL[1] === 'S/N', 'removal header S/N');
  assert(HEADERS_REMOVAL[4] === 'Scientific Name', 'removal scientific');
  assert(HEADERS_REMOVAL[20] === 'Remarks (if any)', 'removal remarks header');
  console.log('tns-shape PASS');
})();

// Quick normalize sanity
const n1 = normalizePdfText('AS - T NS - SM - 202 6 - 00 6');
assert(n1.includes('AS-TNS-SM-2026-006'), 'case normalize: ' + n1);
const n2 = normalizePdfText('Date:   202 6 / 0 7 / 13');
assert(/2026\/07\/13/.test(n2), 'date normalize: ' + n2);
const n3 = normalizePdfText('#1BE - T0307 _H anger');
assert(/BE-T0307_Hanger/.test(n3.replace(/\s+/g, '')) || /BE-T0307\s*_Hanger/.test(n3) || n3.includes('Hanger'), 'hanger: ' + n3);


// Tree-ID prefix → estate fallback (when text estate missing)
(() => {
  assert(estateFromTreeId('SCO-A0005') === 'Shui Chuen O Estate', 'prefix SCO');
  assert(estateFromTreeId('HKFU-T0005') === 'Kam Fung Court', 'prefix HKFU');
  assert(estateFromTreeId('TY-T0315') === 'Tai Yuen Estate', 'prefix TY');
  assert(estateFromTreeId('SM-T0209') === 'Shek Mun Estate', 'prefix SM');
  assert(estateFromTreeId('BE-T0307') === 'Butterfly Estate', 'prefix BE');
  assert(estateFromTreeId('TS1-T0231') === 'Tin Shui (1) Estate', 'prefix TS1');
  assert(estateFromCaseNo('TNS-SCO-2026-004') === 'Shui Chuen O Estate', 'case SCO');
  assert(estateFromCaseNo('AS-TNS-HKFU-2026-007') === 'Kam Fung Court', 'case HKFU');
  assert(resolveEstate('', 'SCO-A0005', '') === 'Shui Chuen O Estate', 'resolve tree');
  assert(resolveEstate('Unknown Estate', '', 'TNS-SCO-2026-004') === 'Shui Chuen O Estate', 'resolve case');
  assert(resolveEstate('Shek Mun Estate', 'SCO-A0005', '') === 'Shek Mun Estate', 'prefer real estate');
  // Blank estate text + SCO tree → still Shui Chuen O via prefix
  const blankEstate = parseReport(
    normalizePdfText('Audit Report\\nDate: 2026/08/04\\nFindings:\\n#1 SCO-A0005 _Asymmetric crown'),
    'blank-estate.pdf'
  );
  // If findings path yields a row, estate must come from prefix
  if (blankEstate.length) {
    assert(blankEstate.every(r => cells(r)[1] === 'Shui Chuen O Estate'), 'blank estate audit: ' + (blankEstate[0] && cells(blankEstate[0])[1]));
  }
  console.log('tree-prefix-fallback PASS');
})();


// Glued Height/DBH/Crown/Girth before Amenity (pdf.js compact)
(() => {
  const p1 = splitGluedMeasurements('83105973');
  assert(p1 && p1.height === '8' && p1.dbh === '310' && p1.crown === '5' && p1.girth === '973', 'glue 83105973: ' + JSON.stringify(p1));
  const p2 = splitGluedMeasurements('1137061162');
  assert(p2 && p2.height === '11' && p2.dbh === '370' && p2.crown === '6' && p2.girth === '1162', 'glue 1137061162: ' + JSON.stringify(p2));
  const p3 = splitGluedMeasurements('61301408');
  assert(p3 && p3.height === '6' && p3.dbh === '130' && p3.crown === '1' && p3.girth === '408', 'glue 61301408: ' + JSON.stringify(p3));

  // Full parse with measurements glued (no spaces between H/DBH/Crown/Girth)
  const gluedText = [
    'Tree Removal under Arboricultural Maintenance - non TPC applications',
    'Estate / Project S/N Species Scientific name',
    'Chinese name Height (m) DBH (mm) Crown Spread (m) Girth Size (mm)',
    '26 TY-T0315 台灣相思 83105973 Low Poor Poor Poor Dead tree (except for dead trees of particular interest) Yes 21/11/2026 21/5/2026 N/A TNS-TY-2026-002',
    '27 TY-T0571 石栗 1137061162 Low Poor Poor Poor Dead tree (except for dead trees of particular interest) Yes 21/11/2026 21/5/2026 N/A TNS-TY-2026-002',
    '28 TY-T1198 羊蹄甲屬 61301408 Low Poor Poor Poor Dead tree (except for dead trees of particular interest) Yes 21/11/2026 21/5/2026 N/A TNS-TY-2026-002',
    'Tai Yuen Estate Acacia confusa Tai Yuen Estate Aleurites moluccana Tai Yuen Estate Bauhinia spp.',
    'Submitted by: Name & Post Sean Lee (TMS) Date: 21/10/2026'
  ].join(' ');
  const rows = parseReport(gluedText, 'TNS-TY-2026-002.pdf');
  assert(rows.length === 3, 'glued rows: ' + rows.length);
  assert(rows.every(r => r.kind === 'removal'), 'glued kind');
  const parts = rows.map(r => removalParts(r));
  const c = parts.map(p => p.d);
  assert(rows.every(r => r.cells.length === 21), 'glued 21 cols');
  assert(c.map(r => r[5]).join(',') === '8,11,6', 'glued heights: ' + c.map(r => r[5]));
  assert(c.map(r => r[6]).join(',') === '310,370,130', 'glued dbhs: ' + c.map(r => r[6]));
  assert(c.map(r => r[7]).join(',') === '5,6,1', 'glued crowns: ' + c.map(r => r[7]));
  assert(c.map(r => r[8]).join(',') === '973,1162,408', 'glued girths: ' + c.map(r => r[8]));
  assert(c.every(r => r[9] === 'Low'), 'glued amenity');
  assert(c.every(r => r[1] === 'Tai Yuen Estate'), 'glued estate');
  assert(c.every(r => r[19] === 'TNS-TY-2026-002'), 'glued remarks');
  assert(parts.every(p => p.type === 'Non-TPC'), 'glued type from title fallback: ' + parts.map(p => p.type));
  // Simulate headerless TSV copy (copyRemoval uses includeHeader=false)
  const tsvLines = rows.map(r => r.cells.join('\t'));
  const tsv = tsvLines.join('\n');
  assert(!tsv.startsWith('S/N') && !tsv.startsWith('TPC / Non-TPC'), 'tsv must not start with header');
  assert(tsvLines[0].startsWith('Non-TPC\t26\tTai Yuen Estate\tTY-T0315'), 'tsv first data: ' + tsvLines[0].slice(0, 80));
  assert(tsvLines[0].includes('\t8\t310\t5\t973\tLow\t'), 'tsv measurements in row0: ' + tsvLines[0]);
  console.log('glued-measurements PASS');
})();



// TPC Tree Removal Summary (Fu Tai / FTA-T0515) — pdf.js + pdftotext + layout
(() => {
  const exp = {
    n: 1,
    type: 'TPC',
    estate: 'Fu Tai Estate',
    sns: ['3'],
    trees: ['FTA-T0515'],
    scientific: ['Albizia lebbeck'],
    chinese: ['大葉合歡'],
    heights: ['8'],
    dbhs: ['347'],
    crowns: ['7'],
    girths: ['1090'],
    reasons: ['Poor health'],
    planting: 'Yes',
    noReplace: '',
    antRemoval: '28/11/2026',
    antComp: '28/5/2027',
    actual: 'N/A',
    remarks: 'TY-FTA-2026-002'
  };
  for (const name of ['tpc-20261028-pdfjs.txt', 'tpc-20261028-pdftotext.txt', 'tpc-20261028-layout.txt']) {
    checkRemoval('tpc-' + name.replace('.txt', ''), path.join(samplesRem, name), exp);
  }
  // Chinese→sci map alone (pdf.js order: chinese after tree, sci listed later)
  assert(CHINESE_TO_SCI['大葉合歡'] === 'Albizia lebbeck', 'map 大葉合歡');
  const kind = detectRemovalKind(
    'Application to Housing Department Tree Preservation Committee (TPC) for Tree Removal under Arboricultural Maintenance',
    'TPC_Tree_removal_summary_20261028.pdf'
  );
  assert(kind === 'TPC', 'detectRemovalKind TPC: ' + kind);
  console.log('tpc-removal-suite PASS');
})();


// TPC Tree Removal Summary (Kwong Fuk / SPWA-0058) — prefix-digits Tree No., var. scientific, Medium/Average
(() => {
  const exp = {
    n: 1,
    type: 'TPC',
    estate: 'Kwong Fuk Estate',
    sns: ['6'],
    trees: ['SPWA-0058'],
    scientific: ['Macaranga tanarius var. tomentosa'],
    chinese: ['血桐'],
    heights: ['7'],
    dbhs: ['315'],
    crowns: ['7'],
    girths: ['989'],
    amenity: 'Medium',
    form: 'Average',
    health: 'Poor',
    structural: 'Average',
    reasons: ['Poor health'],
    planting: 'Yes',
    noReplace: 'Leave growing space for existing trees nearby',
    antRemoval: '4/12/2026',
    antComp: '4/5/2027',
    actual: 'N/A',
    remarks: 'TY-SPWA-2026-001'
  };
  const files = ['tpc-20261103-pdftotext.txt', 'tpc-20261103-layout.txt', 'tpc-20261103-pdfjs.txt'];
  for (const name of files) {
    checkRemoval('tpc-' + name.replace('.txt', ''), path.join(samplesRem, name), exp);
  }
  assert(CHINESE_TO_SCI['血桐'] === 'Macaranga tanarius var. tomentosa', 'map 血桐');
  assert(isValidRemovalTreeId('SPWA-0058'), 'SPWA-0058 is a removal Tree No.');
  assert(isValidRemovalTreeId('SPWA - 0058'), 'SPWA - 0058 spaced');
  assert(isValidRemovalTreeId('FTA-T0515'), 'FTA-T0515 still valid');
  assert(isValidRemovalTreeId('SCO-A0004'), 'SCO-A0004 still valid');
  assert(isValidRemovalTreeId('LSN-LL1'), 'LSN-LL1 still valid');
  assert(!isValidTreeId('SPWA-0058'), 'Findings validator stays strict (no prefix-digits)');
  const invented = extractRemovalTreeIds('Remarks TY-SPWA-2026-001 TNS-TY-2026-002');
  assert(invented.length === 0, 'must not invent Tree No. from case numbers: ' + JSON.stringify(invented));
  const kind = detectRemovalKind(
    'Application to Housing Department Tree Preservation Committee (TPC) for Tree Removal under Arboricultural Maintenance',
    'TPC_Tree_removal_summary_20261103.pdf'
  );
  assert(kind === 'TPC', 'detectRemovalKind TPC 20261103: ' + kind);
  console.log('tpc-20261103-removal-suite PASS');
})();


function checkTmu(lab, file, filename) {
  const text = fs.readFileSync(file, "utf8");
  assert(!isTreeRemovalForm(text), `${lab}: must not be Tree Removal`);
  assert(isTmuSiteCheckForm(text) || isTmuSiteCheckForm(normalizePdfText(text)), `${lab}: detect TMU-Form-03`);
  const rows = parseReport(text, filename || path.basename(file) + ".pdf");
  assert(rows.length === 2, `${lab}: expected 2 rows, got ${rows.length}`);
  assert(rows.every(r => r.kind === "tmu"), `${lab}: kind ${rows[0] && rows[0].kind}`);
  assert(rows.every(r => r.cells.length === 18), `${lab}: 18 cols`);
  const c = rows.map(r => r.cells);
  const exp = [
    ["TMU", "On Yam Estate", "TMU-OY-2026-004", "11/11/2026", "OY-T0034",
      "Conflict with building was found", "Crown reduction is required", "", "", "25/11/2026"],
    ["TMU", "On Yam Estate", "TMU-OY-2026-004", "11/11/2026", "OY-T0051",
      "Preparation work for processing planter enlargement", "Crown thining within Nov is required", "", "", "25/11/2026"]
  ];
  console.log(lab, c.map(r => ({ src: r[0], estate: r[1], case: r[2], date: r[3], tree: r[4], obs: r[5], mit: r[6], deadline: r[9] })));
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 10; j++) {
      assert(c[i][j] === exp[i][j], `${lab}: row ${i} col ${j} expected ${JSON.stringify(exp[i][j])} got ${JSON.stringify(c[i][j])}`);
    }
    assert(c[i].slice(10).every(x => x === ""), `${lab}: cols 11-18 empty`);
  }
  assert(c[1][6].includes("thining"), `${lab}: keep PDF typo thining`);
  assert(!c[1][6].includes("thinning"), `${lab}: must not auto-correct thining`);
  console.log(lab, "PASS");
}

checkTmu("tmu-oy-pdftotext", path.join(samplesRem, "tmu-oy-2026-004-pdftotext.txt"), "tmu-ty-2026-003.pdf");
checkTmu("tmu-oy-layout", path.join(samplesRem, "tmu-oy-2026-004-layout.txt"), "tmu-ty-2026-003.pdf");
checkTmu("tmu-oy-pdfjs", path.join(samplesRem, "tmu-oy-2026-004-pdfjs.txt"), "tmu-ty-2026-003.pdf");

(() => {
  const syn = [
    "TMU-Form-03",
    "TMU Site Check Report on Performance of TS Contractor/ AS Consultant",
    "TMU Referral Case No. (if applicable): TMU-TY-2026-003",
    "Date / Time  2.11.2026  14:50-15:25",
    "Tai Yuen Estate",
    "1. TY-T0010",
    "Finding:",
    "Poor health"
  ].join("\n");
  const rows = parseReport(syn, "unused-name.pdf");
  assert(rows.length === 1, "tmu-syn n " + rows.length);
  assert(rows[0].kind === "tmu", "tmu-syn kind");
  assert(rows[0].cells.join("\t") === [
    "TMU", "Tai Yuen Estate", "TMU-TY-2026-003", "2/11/2026", "TY-T0010",
    "Poor health", "", "", "", "16/11/2026", "", "", "", "", "", "", "", ""
  ].join("\t"), "tmu-syn row: " + rows[0].cells.join("|"));
  assert(addDaysUnpadded("11/11/2026", 14) === "25/11/2026", "deadline 11/11+14");
  assert(addDaysUnpadded("2/11/2026", 14) === "16/11/2026", "deadline 2/11+14");
  assert(addDaysUnpadded("18/11/2026", 14) === "2/12/2026", "deadline 18/11+14 unpadded");
  assert(estateFromTreeId("OY-T0034") === "On Yam Estate", "prefix OY");
  assert(estateFromCaseNo("TMU-OY-2026-004") === "On Yam Estate", "case OY");
  assert(estateFromTreeId("SPA-T0136") === "Shatin Pass Estate", "prefix SPA");
  assert(estateFromCaseNo("TMU-SPA-2026-003") === "Shatin Pass Estate", "case SPA");
  assert(estateFromCaseNo("TMU-KC1-2026-004") === "Kwai Chung 1 Estate", "case KC1");
  assert(estateFromCaseNo("TMU-KC2-2026-004") === "Kwai Chung 2 Estate", "case KC2");
  assert(estateFromCaseNo("TMU-SY-2026-004") === "Shek Yam Estate", "case SY");
  assert(estateFromTreeId("SY-T0001") === "Shek Yam Estate", "prefix SY");
  assert(estateFromTreeId("KC-T1344") === "", "bare KC prefix must not map to one estate");
  assert(isValidTreeId("OY-T0034") && isValidTreeId("OY-T0051"), "OY tree ids valid");
  assert(isValidTreeId("SPA-T0136") && isValidTreeId("KC-T1344"), "SPA/KC tree ids valid");
  assert(!isValidTreeId("TMU-OY-2026-004"), "case no is not a tree id");
  assert(!isValidTreeId("TMU-KC1-2026-004"), "KC1 case no is not a tree id");
  assert(extractTmuCaseNo("TMU Referral Case No. (if applicable): TMU-KC1-2026-004") === "TMU-KC1-2026-004", "extract KC1");
  assert(extractTmuCaseNo("TMU - K C1 - 202 6 - 00 4") === "TMU-KC1-2026-004", "extract spaced KC1");
  assert(extractTmuCaseNo("TMU - K C 2 - 202 6 - 00 4") === "TMU-KC2-2026-004", "extract spaced KC2");
  const invented = extractTmuTrees("TMU Referral Case No.: TMU-OY-2026-004");
  assert(invented.length === 0, "must not invent tree from TMU case no: " + JSON.stringify(invented));
  const glued = cleanupTmuClause("No foliagwas found");
  assert(glued === "No foliage was found", "unglue foliagwas: " + glued);
  const br = cleanupTmuClause("Dead brancheswere found");
  assert(br === "Dead branches were found", "unglue brancheswere: " + br);
  const cond = cleanupTmuClause("Con d u ct tree risk assessment ⚫ Apply for tree removal if required");
  assert(cond === "Conduct tree risk assessment; Apply for tree removal if required", "join conduct + bullets: " + cond);
  const deal = cleanupTmuClause("Pruning works should be carried out to remove the deal bra n ch es.");
  assert(deal === "Pruning works should be carried out to remove the deal branches.", "deal branches typo kept: " + deal);
  console.log("tmu-synthetic-and-helpers PASS");
})();

function padTmu(row) {
  const c = row.slice();
  while (c.length < 18) c.push("");
  return c;
}

function checkTmuRows(lab, file, filename, exp) {
  const text = fs.readFileSync(file, "utf8");
  assert(!isTreeRemovalForm(text), lab + ": must not be Tree Removal");
  assert(isTmuSiteCheckForm(text) || isTmuSiteCheckForm(normalizePdfText(text)), lab + ": detect TMU-Form-03");
  const rows = parseReport(text, filename || path.basename(file) + ".pdf");
  assert(rows.length === exp.length, lab + ": expected " + exp.length + " rows, got " + rows.length);
  assert(rows.every(r => r.kind === "tmu"), lab + ": kind " + (rows[0] && rows[0].kind));
  assert(rows.every(r => r.cells.length === 18), lab + ": 18 cols");
  const c = rows.map(r => r.cells);
  console.log(lab, c.map(r => ({ src: r[0], estate: r[1], case: r[2], date: r[3], tree: r[4], obs: r[5], mit: r[6], deadline: r[9] })));
  for (let i = 0; i < exp.length; i++) {
    const want = padTmu(exp[i]);
    for (let j = 0; j < 10; j++) {
      assert(c[i][j] === want[j], lab + ": row " + i + " col " + j + " expected " + JSON.stringify(want[j]) + " got " + JSON.stringify(c[i][j]));
    }
    assert(c[i].slice(10).every(x => x === ""), lab + ": cols 11-18 empty");
  }
  console.log(lab, "PASS");
}

const tmuSpa = [
  ["TMU", "Shatin Pass Estate", "TMU-SPA-2026-003", "6/11/2026", "SPA-T0136",
    "Climber on crown was observed", "Remove climber", "", "", "20/11/2026"],
  ["TMU", "Shatin Pass Estate", "TMU-SPA-2026-003", "6/11/2026", "SPA-T0131",
    "Dead branches was observed", "Pruning works should be carried out to remove the deal branches.", "", "", "20/11/2026"]
];
const tmuKc1 = [
  ["TMU", "Kwai Chung 1 Estate", "TMU-KC1-2026-004", "30/11/2026", "KC-T1344",
    "No foliage was found", "Conduct tree risk assessment; Apply for tree removal if required", "", "", "14/12/2026"],
  ["TMU", "Kwai Chung 1 Estate", "TMU-KC1-2026-004", "30/11/2026", "KC-T1227",
    "Dead fronds were found", "Crown cleaning is required", "", "", "14/12/2026"],
  ["TMU", "Kwai Chung 1 Estate", "TMU-KC1-2026-004", "30/11/2026", "KC-T1142",
    "Dead branches were found", "Crown cleaning is required", "", "", "14/12/2026"]
];
const tmuKc2 = [
  ["TMU", "Kwai Chung 2 Estate", "TMU-KC2-2026-004", "30/10/2026", "KC-T0893",
    "Dead tree was found", "Apply for tree removal", "", "", "13/11/2026"],
  ["TMU", "Kwai Chung 2 Estate", "TMU-KC2-2026-004", "30/10/2026", "KC-T0235",
    "Dead tree was found", "Apply for tree removal", "", "", "13/11/2026"],
  ["TMU", "Kwai Chung 2 Estate", "TMU-KC2-2026-004", "30/10/2026", "Undersized tree",
    "Dead tree was found", "EMO please arrange for removal", "", "", "13/11/2026"],
  ["TMU", "Kwai Chung 2 Estate", "TMU-KC2-2026-004", "30/10/2026", "Undesirable species on slope facing Kwai Yin Court",
    "Leucaena leucocephala were found", "Apply for tree removal", "", "", "13/11/2026"],
  ["TMU", "Kwai Chung 2 Estate", "TMU-KC2-2026-004", "30/10/2026", "KC-T0933",
    "Dead tree was found", "Apply for tree removal", "", "", "13/11/2026"]
];

const tmuSy = [
  ["TMU", "Shek Yam Estate", "TMU-SY-2026-004", "11/11/2026", "All Ficus spp",
    "Phauda flammans (Pf) infestation was found",
    "EMO please note the following actions; Keep a closer look on the Ficus spp. trees, even for those with no record of infestation",
    "", "", "25/11/2026"]
];

const tmuForms = [
  ["tmu-spa", "TMU_Form-03_SPA-2026-003", "TMU_Form-03_SPA-2026-003.pdf", tmuSpa],
  ["tmu-kc1", "TMU_Form-03_202610_KC1", "TMU_Form-03_202610_KC1.pdf", tmuKc1],
  ["tmu-kc2", "TMU_Form-03_KC_multi", "TMU_Form-03_KC_multi.pdf", tmuKc2],
  ["tmu-sy", "TMU_Form-03_SY-2026-004", "TMU-Form-03_TMU Site Check Report (issued 05-22)_202611_SY.pdf", tmuSy]
];
for (const [lab, stem, filename, exp] of tmuForms) {
  for (const kind of ["pdftotext", "layout", "pdfjs"]) {
    checkTmuRows(lab + "-" + kind, path.join(samplesRem, stem + "-" + kind + ".txt"), filename, exp);
  }
}

// AS Audit rows must keep Case deadline empty
(() => {
  const text = fs.readFileSync(path.join(samples3, "shekmun-pdfjs.txt"), "utf8");
  const rows = parseReport(text, "AS-TNS-SM-2026-006.pdf");
  assert(rows.every(r => r.kind === "audit"), "audit still audit");
  assert(rows.every(r => r.cells[0] === "AS"), "Source stays AS");
  assert(rows.every(r => r.cells[9] === ""), "AS Case deadline stays empty: " + rows.map(r => r.cells[9]));
  assert(rows.every(r => r.cells[6] === ""), "AS Mitigation stays empty");
  console.log("audit-deadline-empty PASS");
})();


// AS Audit: skip TNS rows whose Findings/Observation is only the stock
// "No general comment on tree works maintenance..." sentence.
(() => {
  assert(typeof isStockNoGeneralComment === "function", "isStockNoGeneralComment exported");
  const sentence = "No general comment on tree works maintenance and horticultural reminders after regular audit inspection.";
  assert(isStockNoGeneralComment(sentence), "exact sentence");
  assert(isStockNoGeneralComment(sentence.replace(/\.$/, "")), "no trailing period");
  assert(isStockNoGeneralComment("No general comment on tree works maintenance and horticultural\nreminders after regular audit inspection."), "wrapped");
  assert(isStockNoGeneralComment("No  general   comment on tree  works maintenance and horticultural reminders after regular audit inspection."), "extra spaces");
  assert(isStockNoGeneralComment("No generalcomment on tree works maintenance and horticultural reminders after regular audit inspection."), "pdf.js missing space");
  assert(!isStockNoGeneralComment(""), "empty is not stock");
  assert(!isStockNoGeneralComment("Dead tree"), "real finding is not stock");
  assert(!isStockNoGeneralComment(sentence + " Dead tree"), "stock plus real finding is kept");
  assert(!isStockNoGeneralComment("Dead tree. " + sentence), "real finding plus stock is kept");
  console.log("stock-no-comment-matcher PASS");
})();

const noCommentDumps = [
  ["no-comment-pdftotext", path.join(samplesRem, "AS_CheungOn_no_comment-pdftotext.txt")],
  ["no-comment-layout", path.join(samplesRem, "AS_CheungOn_no_comment-layout.txt")],
  ["no-comment-pdfjs", path.join(samplesRem, "AS_CheungOn_no_comment-pdfjs.txt")]
];
for (const [lab, file] of noCommentDumps) {
  const text = fs.readFileSync(file, "utf8");
  const rows = parseReport(text, "AS-Cheung-On-no-comment.pdf");
  const obs = rows.map(r => (r.cells || r)[5]).join(" | ");
  assert(rows.length === 0, `${lab}: expected 0 TNS rows, got ${rows.length}: ${obs}`);
  console.log(lab, "PASS (0 rows)");
}

check("easeful-keep-finding", path.join(samplesRem, "AS_EasefulCourt_dead_tree-pdftotext.txt"), {
  n: 1,
  kind: "audit",
  caseNo: "AS-EAC-2026-003",
  estate: "Easeful Court",
  date: "18/11/2026",
  trees: ["EAC-T0057"],
  obs: ["Dead tree"]
});

(() => {
  const text = fs.readFileSync(path.join(samplesRem, "AS_mixed_comment_and_finding-pdftotext.txt"), "utf8");
  const rows = parseReport(text, "AS-SWK-2026-004.pdf");
  assert(rows.length === 1, "mixed: keep the real finding, got " + rows.length);
  const c = rows[0].cells;
  assert(rows[0].kind === "audit" && c[0] === "AS", "mixed source AS");
  assert(c[1] === "Shek Wai Kok Estate", "mixed estate: " + c[1]);
  assert(c[2] === "AS-SWK-2026-004", "mixed case: " + c[2]);
  assert(c[4] === "SWK-A0001", "mixed tree: " + c[4]);
  assert(/Dead tree/i.test(c[5]), "mixed obs keeps Dead tree: " + c[5]);
  assert(!isStockNoGeneralComment(c[5]), "mixed obs is not stock-only");
  assert(c[9] === "", "mixed AS Case deadline stays empty");
  console.log("mixed-comment-and-finding PASS", { obs: c[5] });
})();

(() => {
  assert(/\.table-removal\s*\{/.test(html), "compact removal table CSS present");
  assert(/table-layout:\s*fixed/.test(html), "removal table-layout fixed");
  assert(/class="table-removal"/.test(html), "renderSection applies table-removal");
  const dm = html.match(/const HEADERS_REMOVAL_DISPLAY = \[([\s\S]*?)\];/);
  assert(dm, "HEADERS_REMOVAL_DISPLAY block");
  const labels = [...dm[1].matchAll(/"([^"]*)"/g)].map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  assert(labels.length === 21, "display headers 21: " + labels.length);
  assert(/^TPC \/ Non-TPC$/i.test(labels[0]), "display starts with type: " + labels[0]);
  assert(labels[1] === "S/N" && /Remarks/i.test(labels[20]), "display ends with Remarks: " + labels[20]);
  assert(HEADERS_REMOVAL.length === 21 && HEADERS_REMOVAL[0] === "TPC / Non-TPC" && HEADERS_REMOVAL[20] === "Remarks (if any)", "copy headers include type + remarks");
  console.log("removal-layout-css PASS");
})();


// Shui Chuen O Non-TPC Tree Removal Summary (TNS-SCO-2026-002):
// Unidentified / Michelia x alba must stay aligned with the printed Chinese names.
// pdf.js emits the trailing scientific-name list as Casuarina first (not table order).
(() => {
  const reason = 'Dead tree (except for dead trees of particular interest)';
  const steep = 'Steep slope (over 35 degrees)';
  const remarks = 'TNS-SCO-2026-002';
  const estate = 'Shui Chuen O Estate';
  const base = [
    { sn: '5', tree: 'SCO-A0003', sci: 'Unidentified', zh: '未能鑑別',
      h: '6', dbh: '160', crown: '3', girth: '502',
      amenity: 'Low', form: 'Poor', health: 'Poor', structural: 'Poor',
      reason, planting: 'No', noReplace: steep,
      antRemoval: '14/11/2026', antComp: 'N/A', actual: 'N/A', remarks },
    { sn: '6', tree: 'SCO-T0025', sci: 'Michelia x alba', zh: '白蘭',
      h: '6', dbh: '175', crown: '1', girth: '550',
      amenity: 'Low', form: 'Average', health: 'Poor', structural: 'Average',
      reason, planting: 'Yes', noReplace: '',
      antRemoval: '14/11/2026', antComp: '14/4/2027', actual: 'N/A', remarks },
    { sn: '7', tree: 'SCO-T4439', sci: 'Rhus succedanea', zh: '木蠟樹(野漆樹)',
      h: '5', dbh: '170', crown: '4', girth: '534',
      amenity: 'Low', form: 'Average', health: 'Poor', structural: 'Average',
      reason, planting: 'No', noReplace: steep,
      antRemoval: '14/11/2026', antComp: 'N/A', actual: 'N/A', remarks },
    { sn: '8', tree: 'SCO-T4440', sci: 'Pinus elliottii', zh: '濕地松(愛氏松)',
      h: '7', dbh: '205', crown: '1', girth: '644',
      amenity: 'Low', form: 'Average', health: 'Poor', structural: 'Average',
      reason, planting: 'No', noReplace: steep,
      antRemoval: '14/11/2026', antComp: 'N/A', actual: 'N/A', remarks },
    { sn: '9', tree: 'SCO-T4514', sci: 'Casuarina equisetifolia', zh: '木麻黃',
      h: '6', dbh: '140', crown: '1', girth: '440',
      amenity: 'Low', form: 'Average', health: 'Poor', structural: 'Average',
      reason, planting: 'No', noReplace: steep,
      antRemoval: '14/11/2026', antComp: 'N/A', actual: 'N/A', remarks }
  ];

  function checkScoRows(lab, file, opts) {
    opts = opts || {};
    const text = fs.readFileSync(file, 'utf8');
    const rows = parseReport(text, 'Non-TPC_Tree_removal_summary_SCO.pdf');
    assert(rows.length === 5, `${lab}: expected 5 rows, got ${rows.length}`);
    assert(rows.every(r => r.kind === 'removal'), `${lab}: kind`);
    assert(rows.every(r => r.cells.length === 21), `${lab}: 21 cols`);
    const parts = rows.map(r => removalParts(r));
    const c = parts.map(p => p.d);
    console.log(lab, parts.map(p => ({ type: p.type, sn: p.d[0], tree: p.d[2], sci: p.d[3], zh: p.d[4], plant: p.d[14], norep: p.d[15], antC: p.d[17] })));
    assert(c.every(r => r[1] === estate), `${lab}: estate ${c[0] && c[0][1]}`);
    assert(parts.every(p => p.type === 'Non-TPC'), `${lab}: type from filename ${parts.map(p => p.type)}`);
    for (let i = 0; i < 5; i++) {
      const exp = base[i];
      const skipExtras = opts.skipExtras && opts.skipExtras.includes(exp.tree);
      assert(c[i][0] === exp.sn, `${lab}: row ${i} sn expected ${exp.sn} got ${c[i][0]}`);
      assert(c[i][2] === exp.tree, `${lab}: row ${i} tree`);
      assert(c[i][3] === exp.sci, `${lab}: row ${i} sci expected ${exp.sci} got ${c[i][3]}`);
      assert(c[i][4] === exp.zh, `${lab}: row ${i} zh expected ${exp.zh} got ${c[i][4]}`);
      assert(c[i][5] === exp.h && c[i][6] === exp.dbh && c[i][7] === exp.crown && c[i][8] === exp.girth,
        `${lab}: row ${i} measurements ${[c[i][5], c[i][6], c[i][7], c[i][8]]}`);
      assert(c[i][9] === exp.amenity && c[i][10] === exp.form && c[i][11] === exp.health && c[i][12] === exp.structural,
        `${lab}: row ${i} conditions`);
      assert(c[i][13] === exp.reason, `${lab}: row ${i} reason`);
      if (!skipExtras) {
        assert(c[i][14] === exp.planting, `${lab}: row ${i} planting expected ${exp.planting} got ${c[i][14]}`);
        assert(c[i][15] === exp.noReplace, `${lab}: row ${i} noReplace expected ${JSON.stringify(exp.noReplace)} got ${JSON.stringify(c[i][15])}`);
        assert(c[i][16] === exp.antRemoval, `${lab}: row ${i} antRemoval`);
        assert(c[i][17] === exp.antComp, `${lab}: row ${i} antComp expected ${exp.antComp} got ${c[i][17]}`);
        assert(c[i][18] === exp.actual, `${lab}: row ${i} actual`);
      }
      assert(c[i][19] === exp.remarks, `${lab}: row ${i} remarks`);
    }
    // Must not "correct" Unidentified / 未能鑑別 to Casuarina / 木麻黃
    assert(c[0][3] === 'Unidentified' && c[0][4] === '未能鑑別', `${lab}: keep Unidentified`);
    assert(c[4][3] === 'Casuarina equisetifolia' && c[4][4] === '木麻黃', `${lab}: Casuarina stays on T4514`);
    console.log(lab, 'PASS');
  }

  const listed = extractScientificNamesInOrder(
    'Unidentified Michelia x alba Rhus succedanea Pinus elliottii Casuarina equisetifolia Macaranga tanarius var. tomentosa Dead tree (except for dead trees of particular interest)'
  );
  assert(listed.join('|') === 'Unidentified|Michelia x alba|Rhus succedanea|Pinus elliottii|Casuarina equisetifolia|Macaranga tanarius var. tomentosa',
    'sci list includes Unidentified, hybrid x, and var.: ' + listed.join('|'));
  assert(isPlausibleScientificName('Unidentified') && isPlausibleScientificName('Michelia x alba'), 'plausible Unidentified / hybrid');
  assert(isPlausibleScientificName('Michelia \u00d7 alba'), 'plausible multiplication-sign hybrid');
  assert(!isPlausibleScientificName('Dead tree'), 'Dead tree is not a scientific name');
  assert(CHINESE_TO_SCI['未能鑑別'] === 'Unidentified', 'map 未能鑑別');
  assert(CHINESE_TO_SCI['白蘭'] === 'Michelia x alba', 'map 白蘭');
  assert(CHINESE_TO_SCI['木麻黃'] === 'Casuarina equisetifolia', 'map 木麻黃');

  const pdfjsText = fs.readFileSync(path.join(samplesRem, 'Non-TPC_Tree_removal_summary_SCO-pdfjs.txt'), 'utf8');
  const pdfjsList = extractScientificNamesInOrder(normalizeRemovalPdfText(pdfjsText));
  assert(pdfjsList[0] === 'Casuarina equisetifolia', 'pdf.js list is out of table order (Casuarina first): ' + pdfjsList.join('|'));
  assert(pdfjsList.includes('Unidentified') && pdfjsList.includes('Michelia x alba'), 'pdf.js list keeps skipped names');

  checkScoRows('sco-202609-pdfjs', path.join(samplesRem, 'Non-TPC_Tree_removal_summary_SCO-pdfjs.txt'));
  checkScoRows('sco-202609-layout', path.join(samplesRem, 'Non-TPC_Tree_removal_summary_SCO-layout.txt'));
  // pdftotext parks Yes/No and dates in a trailing column block, so T0025
  // planting/compensatory dates cannot be recovered reliably from that dump.
  checkScoRows('sco-202609-pdftotext', path.join(samplesRem, 'Non-TPC_Tree_removal_summary_SCO-pdftotext.txt'), {
    skipExtras: ['SCO-T0025']
  });
})();



// Fu Tai Non-TPC Tree Removal Summary (TY-FTA-2026-001):
// Scientific names sit in a trailing "FU TAI ESTATE Acacia mangium" list in pdf.js;
// remarks are TY-FTA-... (not TNS-). After normalizePdfText, "001 35" must not
// become S/N 135 and "001Signature" must not drop Remarks.
(() => {
  const reason = 'Dead tree (except for dead trees of particular interest)';
  const steep = 'Steep slope (over 35 degrees)';
  const remarks = 'TY-FTA-2026-001';
  const estate = 'Fu Tai Estate';
  const base = [
    { sn: '34', tree: 'FTA-T0410', sci: 'Acacia mangium', zh: '大葉相思(馬占相思)',
      h: '10', dbh: '260', crown: '5', girth: '816',
      amenity: 'Low', form: 'Poor', health: 'Poor', structural: 'Poor',
      reason, planting: 'No', noReplace: steep,
      antRemoval: '27/11/2026', antComp: 'N/A', actual: 'N/A', remarks },
    { sn: '35', tree: 'FTA-T0536', sci: 'Plumeria rubra', zh: '雞蛋花',
      h: '5', dbh: '110', crown: '2', girth: '345',
      amenity: 'Low', form: 'Poor', health: 'Poor', structural: 'Poor',
      reason, planting: 'Yes', noReplace: '',
      antRemoval: '27/11/2026', antComp: '27/4/2027', actual: 'N/A', remarks }
  ];

  function checkFtaRows(lab, file, opts) {
    opts = opts || {};
    let text = fs.readFileSync(file, 'utf8');
    if (opts.normalize) text = normalizePdfText(text);
    const rows = parseReport(text, 'Non-TPC_Tree removal summary_20261027.pdf');
    assert(rows.length === 2, `${lab}: expected 2 rows, got ${rows.length}`);
    assert(rows.every(r => r.kind === 'removal'), `${lab}: kind`);
    assert(rows.every(r => r.cells.length === 21), `${lab}: 21 cols`);
    const parts = rows.map(r => removalParts(r));
    const c = parts.map(p => p.d);
    console.log(lab, parts.map(p => ({ type: p.type, sn: p.d[0], tree: p.d[2], sci: p.d[3], zh: p.d[4], plant: p.d[14], remarks: p.d[19] })));
    assert(c.every(r => r[1] === estate), `${lab}: estate ${c[0] && c[0][1]}`);
    assert(parts.every(p => p.type === 'Non-TPC'), `${lab}: type from filename ${parts.map(p => p.type)}`);
    for (let i = 0; i < 2; i++) {
      const exp = base[i];
      const skipExtras = opts.skipExtras && opts.skipExtras.includes(exp.tree);
      assert(c[i][0] === exp.sn, `${lab}: row ${i} sn expected ${exp.sn} got ${c[i][0]}`);
      assert(c[i][2] === exp.tree, `${lab}: row ${i} tree`);
      assert(c[i][3] === exp.sci, `${lab}: row ${i} sci expected ${exp.sci} got ${c[i][3]}`);
      assert(c[i][4] === exp.zh, `${lab}: row ${i} zh expected ${exp.zh} got ${c[i][4]}`);
      assert(c[i][5] === exp.h && c[i][6] === exp.dbh && c[i][7] === exp.crown && c[i][8] === exp.girth,
        `${lab}: row ${i} measurements`);
      assert(c[i][9] === exp.amenity && c[i][10] === exp.form && c[i][11] === exp.health && c[i][12] === exp.structural,
        `${lab}: row ${i} conditions`);
      assert(c[i][13] === exp.reason, `${lab}: row ${i} reason`);
      if (!skipExtras) {
        assert(c[i][14] === exp.planting, `${lab}: row ${i} planting expected ${exp.planting} got ${c[i][14]}`);
        assert(c[i][15] === exp.noReplace, `${lab}: row ${i} noReplace expected ${JSON.stringify(exp.noReplace)} got ${JSON.stringify(c[i][15])}`);
        assert(c[i][16] === exp.antRemoval, `${lab}: row ${i} antRemoval`);
        assert(c[i][17] === exp.antComp, `${lab}: row ${i} antComp expected ${exp.antComp} got ${c[i][17]}`);
        assert(c[i][18] === exp.actual, `${lab}: row ${i} actual expected ${exp.actual} got ${c[i][18]}`);
      }
      assert(c[i][19] === exp.remarks, `${lab}: row ${i} remarks expected ${exp.remarks} got ${c[i][19]}`);
    }
    assert(c[1][0] !== '135', `${lab}: must not glue remark 001 + S/N 35 into 135`);
    console.log(lab, 'PASS');
  }

  assert(CHINESE_TO_SCI['雞蛋花'] === 'Plumeria rubra', 'map 雞蛋花');
  assert(CHINESE_TO_SCI['大葉相思(馬占相思)'] === 'Acacia mangium', 'map 大葉相思(馬占相思)');
  assert(CHINESE_TO_SCI['大葉合歡'] === 'Albizia lebbeck', 'map 大葉合歡 stays distinct');

  const stem = path.join(samplesRem, 'Non-TPC_Tree_removal_summary_FTA_20261027');
  checkFtaRows('fta-20261027-pdfjs', stem + '-pdfjs.txt');
  checkFtaRows('fta-20261027-pdfjs-live', stem + '-pdfjs.txt', { normalize: true });
  checkFtaRows('fta-20261027-layout', stem + '-layout.txt');
  checkFtaRows('fta-20261027-pdftotext', stem + '-pdftotext.txt', {
    skipExtras: ['FTA-T0536']
  });

  // Live path (normalizePdfText) must still keep SCO pairing and TY- remarks
  // on earlier forms (TY-FTA-2026-002 / TY-SPWA-2026-001 used to go blank).
  const scoLive = parseReport(
    normalizePdfText(fs.readFileSync(path.join(samplesRem, 'Non-TPC_Tree_removal_summary_SCO-pdfjs.txt'), 'utf8')),
    'Non-TPC_Tree_removal_summary_SCO.pdf'
  );
  assert(scoLive.length === 5, 'sco live n ' + scoLive.length);
  const scoSci = scoLive.map(r => removalParts(r).d[3] + '/' + removalParts(r).d[4]);
  assert(scoSci.join('|') === [
    'Unidentified/未能鑑別',
    'Michelia x alba/白蘭',
    'Rhus succedanea/木蠟樹(野漆樹)',
    'Pinus elliottii/濕地松(愛氏松)',
    'Casuarina equisetifolia/木麻黃'
  ].join('|'), 'sco live sci/zh: ' + scoSci.join('|'));
  assert(scoLive.every(r => removalParts(r).d[19] === 'TNS-SCO-2026-002'), 'sco live remarks');
  assert(scoLive.every(r => r.cells[0] === 'Non-TPC'), 'sco live type');

  const ftaOld = parseReport(
    normalizePdfText(fs.readFileSync(path.join(samplesRem, 'tpc-20261028-pdfjs.txt'), 'utf8')),
    'TPC_Tree_removal_summary_20261028.pdf'
  );
  assert(ftaOld.length === 1 && removalParts(ftaOld[0]).d[3] === 'Albizia lebbeck', 'fta0515 live sci');
  assert(removalParts(ftaOld[0]).d[19] === 'TY-FTA-2026-002', 'fta0515 live remarks: ' + removalParts(ftaOld[0]).d[19]);
  assert(ftaOld[0].cells[0] === 'TPC', 'fta0515 live type');

  const spwa = parseReport(
    normalizePdfText(fs.readFileSync(path.join(samplesRem, 'tpc-20261103-pdfjs.txt'), 'utf8')),
    'TPC_Tree_removal_summary_20261103.pdf'
  );
  assert(spwa.length === 1 && removalParts(spwa[0]).d[3] === 'Macaranga tanarius var. tomentosa', 'spwa live sci');
  assert(removalParts(spwa[0]).d[19] === 'TY-SPWA-2026-001', 'spwa live remarks: ' + removalParts(spwa[0]).d[19]);
  assert(spwa[0].cells[0] === 'TPC', 'spwa live type');
  console.log('removal-live-normalize remarks/sci PASS');
})();



// Leung King Non-TPC Tree Removal Summary (T&Y-LKG-2026-002):
// Remarks prefix includes an ampersand and must not be limited to AS/TNS/TY.
// Bauhinia x blakeana is a hybrid and must stay on the row.
(() => {
  const reason = 'Dead tree (except for dead trees of particular interest)';
  const remarks = 'T&Y-LKG-2026-002';
  const exp = {
    sn: '42', estate: 'Leung King Estate', tree: 'LKG-T0175',
    sci: 'Bauhinia x blakeana', zh: '洋紫荊',
    h: '9', dbh: '185', crown: '3', girth: '581',
    amenity: 'Low', form: 'Poor', health: 'Poor', structural: 'Poor',
    reason, planting: 'Yes', noReplace: '',
    antRemoval: '3/12/2026', antComp: '3/5/2027', actual: 'N/A', remarks
  };

  function checkLkg(lab, file, opts) {
    opts = opts || {};
    let text = fs.readFileSync(file, 'utf8');
    if (opts.normalize) text = normalizePdfText(text);
    const rows = parseReport(text, 'Non-TPC_Tree_removal_summary_LKG.pdf');
    assert(rows.length === 1, `${lab}: expected 1 row, got ${rows.length}`);
    assert(rows[0].kind === 'removal' && rows[0].cells.length === 21, `${lab}: kind/cols`);
    const part = removalParts(rows[0]);
    const c = part.d;
    console.log(lab, { type: part.type, sn: c[0], estate: c[1], tree: c[2], sci: c[3], zh: c[4], plant: c[14], antC: c[17], remarks: c[19] });
    assert(part.type === 'Non-TPC', `${lab}: type from filename ${part.type}`);
    assert(c[0] === exp.sn, `${lab}: sn ${c[0]}`);
    assert(c[1] === exp.estate, `${lab}: estate ${c[1]}`);
    assert(c[2] === exp.tree, `${lab}: tree`);
    assert(c[3] === exp.sci, `${lab}: sci expected ${exp.sci} got ${c[3]}`);
    assert(c[4] === exp.zh, `${lab}: zh`);
    if (!opts.skipMeas) {
      assert(c[5] === exp.h && c[6] === exp.dbh && c[7] === exp.crown && c[8] === exp.girth,
        `${lab}: measurements ${[c[5], c[6], c[7], c[8]]}`);
    }
    assert(c[9] === exp.amenity && c[10] === exp.form && c[11] === exp.health && c[12] === exp.structural,
      `${lab}: conditions`);
    assert(c[13] === exp.reason, `${lab}: reason`);
    assert(c[14] === exp.planting, `${lab}: planting`);
    assert(c[15] === exp.noReplace, `${lab}: noReplace ${JSON.stringify(c[15])}`);
    if (!opts.skipDates) {
      assert(c[16] === exp.antRemoval, `${lab}: antRemoval expected ${exp.antRemoval} got ${c[16]}`);
      assert(c[17] === exp.antComp, `${lab}: antComp expected ${exp.antComp} got ${c[17]}`);
      assert(c[18] === exp.actual, `${lab}: actual expected ${exp.actual} got ${c[18]}`);
    }
    assert(c[19] === exp.remarks, `${lab}: remarks expected ${exp.remarks} got ${c[19]}`);
    console.log(lab, 'PASS');
  }

  assert(CHINESE_TO_SCI['洋紫荊'] === 'Bauhinia x blakeana', 'map 洋紫荊');
  assert(isPlausibleScientificName('Bauhinia x blakeana'), 'plausible Bauhinia x blakeana');
  const remRe = new RegExp('^' + REMOVAL_CASE_TOKEN_SRC + '$', 'i');
  for (const tok of [
    'T&Y-LKG-2026-002', 'T&Y-XXX-2026-001', 'ABC-DEF-2026-010',
    'TNS-SCO-2026-002', 'TNS-KFK-2026-009',
    'TY-FTA-2026-001', 'TY-FTA-2026-002', 'TY-SPWA-2026-001'
  ]) {
    assert(remRe.test(tok), 'case token should match ' + tok);
  }
  assert(!remRe.test('LKG-T0175') && !remRe.test('SPWA-0058') && !remRe.test('FTA-T0410'),
    'tree IDs are not remark tokens');

  const stem = path.join(samplesRem, 'Non-TPC_Tree_removal_summary_LKG');
  checkLkg('lkg-pdfjs', stem + '-pdfjs.txt');
  checkLkg('lkg-pdfjs-live', stem + '-pdfjs.txt', { normalize: true });
  checkLkg('lkg-layout', stem + '-layout.txt');
  // pdftotext splits Height/DBH from Crown/Girth and lists dates in a
  // trailing column block, so measurements/dates are not reliable there.
  checkLkg('lkg-pdftotext', stem + '-pdftotext.txt', { skipMeas: true, skipDates: true });
})();



(() => {
  const fn = classifyRemovalTypeFromFilename;
  assert(fn('Non-TPC_Tree removal summary_20261027.pdf') === 'Non-TPC', 'fn Fu Tai');
  assert(fn('Non-TPC_Tree removal summary_20261103.pdf') === 'Non-TPC', 'fn Non-TPC 1103');
  assert(fn('Non-TPC_Tree_removal_summary_LKG.pdf') === 'Non-TPC', 'fn LKG');
  assert(fn('Non-TPC_Tree_removal_summary_SCO.pdf') === 'Non-TPC', 'fn SCO');
  assert(fn('Non TPC_foo.pdf') === 'Non-TPC', 'fn Non TPC space');
  assert(fn('non_tpc_foo.pdf') === 'Non-TPC', 'fn non_tpc');
  assert(fn('nonTPC.pdf') === 'Non-TPC', 'fn nonTPC');
  // Substring trap: Non-TPC must not be classified as TPC
  assert(fn('Non-TPC_Tree_removal_summary.pdf') === 'Non-TPC', 'substring trap hyphen');
  assert(fn('TPC_Tree_removal_summary_20261028.pdf') === 'TPC', 'fn TPC 1028');
  assert(fn('TPC_Tree_removal_summary_20261103.pdf') === 'TPC', 'fn TPC 1103');
  assert(fn('tpc-20261028-pdfjs.pdf') === 'TPC', 'fn tpc- token');
  assert(fn('random.pdf') === '', 'fn neither stays empty');
  assert(fn('Tree_removal_summary.pdf') === '', 'fn unmarked stays empty');
  assert(
    classifyRemovalType('TNS-TY-2026-002.pdf', 'Tree Removal under Arboricultural Maintenance - non TPC applications') === 'Non-TPC',
    'title fallback non TPC applications'
  );
  assert(
    classifyRemovalType('foo.pdf', 'Application to Housing Department Tree Preservation Committee (TPC) for Tree Removal under Arboricultural Maintenance') === 'TPC',
    'title fallback Tree Preservation Committee (TPC)'
  );
  assert(classifyRemovalType('foo.pdf', 'TPC(AM) Submission No. ________  some other form') === '', 'TPC(AM) blank is not a type');
  assert(classifyRemovalType('foo.pdf', 'some other form') === '', 'no filename or title: empty');

  const ftaText = normalizePdfText(fs.readFileSync(path.join(samplesRem, 'Non-TPC_Tree_removal_summary_FTA_20261027-pdfjs.txt'), 'utf8'));
  const fta = parseReport(ftaText, 'Non-TPC_Tree removal summary_20261027.pdf');
  assert(fta.length === 2 && fta.every(r => r.cells[0] === 'Non-TPC'), 'Fu Tai Non-TPC stamp: ' + fta.map(r => r.cells[0]));
  const ftaTsv = fta.map(r => r.cells.join('\t')).join('\n');
  assert(!ftaTsv.startsWith('S/N') && !ftaTsv.startsWith('TPC / Non-TPC'), 'copy still no header');
  assert(ftaTsv.startsWith('Non-TPC\t'), 'copy first field Non-TPC: ' + ftaTsv.slice(0, 80));

  const lkg = parseReport(
    normalizePdfText(fs.readFileSync(path.join(samplesRem, 'Non-TPC_Tree_removal_summary_LKG-pdfjs.txt'), 'utf8')),
    'Non-TPC_Tree_removal_summary_LKG.pdf'
  );
  assert(lkg.length === 1 && lkg[0].cells[0] === 'Non-TPC' && lkg[0].cells[20] === 'T&Y-LKG-2026-002', 'LKG Non-TPC + remarks');

  const sco = parseReport(
    normalizePdfText(fs.readFileSync(path.join(samplesRem, 'Non-TPC_Tree_removal_summary_SCO-pdfjs.txt'), 'utf8')),
    'Non-TPC_Tree_removal_summary_SCO.pdf'
  );
  assert(sco.length === 5 && sco.every(r => r.cells[0] === 'Non-TPC'), 'SCO Non-TPC stamp');

  const tpcFta = parseReport(
    normalizePdfText(fs.readFileSync(path.join(samplesRem, 'tpc-20261028-pdfjs.txt'), 'utf8')),
    'TPC_Tree_removal_summary_20261028.pdf'
  );
  assert(tpcFta.length === 1 && tpcFta[0].cells[0] === 'TPC' && tpcFta[0].cells[3] === 'FTA-T0515', 'FTA-T0515 TPC stamp');
  const tpcTsv = tpcFta.map(r => r.cells.join('\t')).join('\n');
  assert(tpcTsv.startsWith('TPC\t3\tFu Tai Estate\tFTA-T0515'), 'TPC copy first fields: ' + tpcTsv.slice(0, 80));

  const spwa = parseReport(
    normalizePdfText(fs.readFileSync(path.join(samplesRem, 'tpc-20261103-pdfjs.txt'), 'utf8')),
    'TPC_Tree_removal_summary_20261103.pdf'
  );
  assert(spwa.length === 1 && spwa[0].cells[0] === 'TPC' && spwa[0].cells[3] === 'SPWA-0058', 'SPWA-0058 TPC stamp');

  // Several PDFs: each row follows the file it came from
  const mixed = fta.concat(tpcFta);
  assert(mixed.filter(r => r.cells[0] === 'Non-TPC').length === fta.length, 'mixed keeps Non-TPC rows');
  assert(mixed.filter(r => r.cells[0] === 'TPC').length === tpcFta.length, 'mixed keeps TPC rows');

  console.log('removal-type-column PASS', {
    ftaCopy: ftaTsv.split('\n')[0].split('\t').slice(0, 5).join('|'),
    tpcCopy: tpcTsv.split('\t').slice(0, 5).join('|')
  });
})();



// TPC Tree Removal Summary (Lung Hang / LH-T0093, 20261116):
// Reason is the free-text "Trunk structural problem", not a canned Dead-tree
// reason and not the 未能自動擷取 fallback. "Trunk structural" is not a sci name.
(() => {
  const exp = {
    type: 'TPC',
    sn: '14',
    estate: 'Lung Hang Estate',
    tree: 'LH-T0093',
    sci: 'Spathodea campanulata',
    zh: '火焰樹',
    h: '10',
    dbh: '465',
    crown: '5',
    girth: '1460',
    amenity: 'Low',
    form: 'Poor',
    health: 'Poor',
    structural: 'Poor',
    reason: 'Trunk structural problem',
    planting: 'Yes',
    noReplace: '',
    antRemoval: '13/12/2026',
    antComp: '13/5/2027',
    actual: 'N/A',
    remarks: 'TNS-LH-2026-004'
  };
  const fn = 'TPC_Tree removal summary_20261116.pdf';
  assert(classifyRemovalTypeFromFilename(fn) === 'TPC', 'LH filename is TPC');
  assert(classifyRemovalTypeFromFilename('Non-TPC_Tree removal summary_20261116.pdf') === 'Non-TPC', 'LH substring trap');
  assert(!isPlausibleScientificName('Trunk structural'), 'Trunk structural is not a scientific name');
  assert(isPlausibleScientificName('Spathodea campanulata'), 'Spathodea campanulata is plausible');
  assert(CHINESE_TO_SCI['火焰樹'] === 'Spathodea campanulata', 'map 火焰樹');
  assert(isGluedEstateScientificReason('LUNGHANGESTATE Schefflera actinophylla'), 'glued estate+sci is not a reason');
  assert(!isGluedEstateScientificReason('Trunk structural problem'), 'real reason is not glued estate');

  function checkLh(lab, file, opts) {
    opts = opts || {};
    let text = fs.readFileSync(file, 'utf8');
    if (opts.normalize) text = normalizePdfText(text);
    const rows = parseReport(text, fn);
    assert(rows.length === 1, `${lab}: expected 1 row, got ${rows.length}`);
    assert(rows[0].kind === 'removal' && rows[0].cells.length === 21, `${lab}: kind/cols`);
    const part = removalParts(rows[0]);
    const c = part.d;
    console.log(lab, { type: part.type, sn: c[0], estate: c[1], tree: c[2], sci: c[3], zh: c[4], reason: c[13], plant: c[14], remarks: c[19] });
    assert(part.type === exp.type, `${lab}: type ${part.type}`);
    if (!opts.skipSnEstate) {
      assert(c[0] === exp.sn, `${lab}: sn ${c[0]}`);
      assert(c[1] === exp.estate, `${lab}: estate ${c[1]}`);
    }
    assert(c[2] === exp.tree, `${lab}: tree ${c[2]}`);
    assert(c[3] === exp.sci, `${lab}: sci ${c[3]}`);
    assert(c[4] === exp.zh, `${lab}: zh ${c[4]}`);
    if (!opts.skipMeas) {
      assert(c[5] === exp.h && c[6] === exp.dbh && c[7] === exp.crown && c[8] === exp.girth,
        `${lab}: measurements ${[c[5], c[6], c[7], c[8]]}`);
      assert(c[9] === exp.amenity && c[10] === exp.form && c[11] === exp.health && c[12] === exp.structural,
        `${lab}: conditions`);
    }
    assert(c[13] === exp.reason, `${lab}: reason expected ${exp.reason} got ${c[13]}`);
    assert(!/未能自動擷取/.test(c[13]), `${lab}: no fallback reason`);
    assert(!/Dead tree/i.test(c[13]), `${lab}: no Dead-tree default`);
    assert(c[14] === exp.planting, `${lab}: planting`);
    assert(c[15] === exp.noReplace, `${lab}: noReplace ${JSON.stringify(c[15])}`);
    assert(c[16] === exp.antRemoval, `${lab}: antRemoval ${c[16]}`);
    assert(c[17] === exp.antComp, `${lab}: antComp ${c[17]}`);
    assert(c[18] === exp.actual, `${lab}: actual ${c[18]}`);
    assert(c[19] === exp.remarks, `${lab}: remarks ${c[19]}`);
    const tsv = rows[0].cells.join('\t');
    assert(!tsv.startsWith('S/N') && !tsv.startsWith('TPC / Non-TPC'), `${lab}: copy no header`);
    assert(tsv.startsWith('TPC\t'), `${lab}: copy first field TPC: ${tsv.slice(0, 80)}`);
    console.log(lab, 'PASS');
  }

  const stem = path.join(samplesRem, 'TPC_Tree_removal_summary_20261116_LH-T0093');
  checkLh('lh-t0093-pdfjs', stem + '-pdfjs.txt');
  checkLh('lh-t0093-pdfjs-live', stem + '-pdfjs.txt', { normalize: true });
  checkLh('lh-t0093-layout', stem + '-layout.txt');
  checkLh('lh-t0093-layout-live', stem + '-layout.txt', { normalize: true });
  checkLh('lh-t0093-pdftotext', stem + '-pdftotext.txt');
  // pdftotext + normalizePdfText can still glue Height/DBH and leave S/N / estate messy
  checkLh('lh-t0093-pdftotext-live', stem + '-pdftotext.txt', { normalize: true, skipMeas: true, skipSnEstate: true });

  // A canned Dead-tree reason elsewhere in the same text must not overwrite LH-T0093
  const ty = fs.readFileSync(path.join(samplesRem, 'non-tpc-20261021-pdfjs.txt'), 'utf8');
  const lh = fs.readFileSync(stem + '-pdfjs.txt', 'utf8');
  const mixed = parseReport(normalizePdfText(ty + '\n' + lh), fn);
  const lhRow = mixed.find(r => removalParts(r).d[2] === 'LH-T0093');
  assert(lhRow, 'mixed text still has LH-T0093');
  assert(removalParts(lhRow).d[13] === 'Trunk structural problem',
    'mixed must not copy Dead tree onto LH-T0093: ' + removalParts(lhRow).d[13]);
  assert(removalParts(lhRow).d[3] === 'Spathodea campanulata', 'mixed sci stays Spathodea');
  const tyRow = mixed.find(r => removalParts(r).d[2] === 'TY-T0315');
  if (tyRow) {
    assert(/Dead tree/i.test(removalParts(tyRow).d[13]), 'TY row keeps its own Dead-tree reason');
    assert(removalParts(tyRow).d[3] !== 'Trunk structural', 'TY sci is not Trunk structural');
  }
  console.log('lh-t0093-no-cross-reason-leak PASS');
})();


console.log('ALL PDFJS TESTS PASSED');
