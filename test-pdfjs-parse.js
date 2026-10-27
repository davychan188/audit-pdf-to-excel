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

function checkRemoval(lab, file, exp) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseReport(text, path.basename(file).replace(/\.txt$/, '') + '.pdf');
  assert(rows.length === exp.n, `${lab}: expected ${exp.n} rows, got ${rows.length}`);
  assert(rows.every(r => r.kind === 'removal'), `${lab}: kind`);
  assert(rows.every(r => r.cells.length === 20), `${lab}: 20 cols`);
  const c = rows.map(r => r.cells);
  console.log(lab, c.map(r => ({ sn: r[0], estate: r[1], tree: r[2], sci: r[3], zh: r[4], h: r[5], reason: r[13], remarks: r[19] })));
  assert(c.every(r => r[1] === exp.estate), `${lab}: estate ${c[0] && c[0][1]}`);
  assert(c.map(r => r[2]).join(',') === exp.trees.join(','), `${lab}: trees`);
  assert(c.map(r => r[0]).join(',') === exp.sns.join(','), `${lab}: sns ${c.map(r => r[0])}`);
  assert(c.map(r => r[3]).join('|') === exp.scientific.join('|'), `${lab}: sci ${c.map(r => r[3]).join('|')}`);
  assert(c.map(r => r[4]).join('|') === exp.chinese.join('|'), `${lab}: zh ${c.map(r => r[4]).join('|')}`);
  assert(c.map(r => r[5]).join(',') === exp.heights.join(','), `${lab}: heights`);
  assert(c.map(r => r[6]).join(',') === exp.dbhs.join(','), `${lab}: dbhs`);
  assert(c.map(r => r[7]).join(',') === exp.crowns.join(','), `${lab}: crowns`);
  assert(c.map(r => r[8]).join(',') === exp.girths.join(','), `${lab}: girths`);
  assert(c.every(r => r[9] === 'Low'), `${lab}: amenity`);
  assert(c.every(r => r[10] === 'Poor' && r[11] === 'Poor' && r[12] === 'Poor'), `${lab}: conditions`);
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
  assert(HEADERS_REMOVAL.length === 20, 'HEADERS_REMOVAL len');
  assert(HEADERS_REMOVAL[0] === 'S/N', 'removal header S/N');
  assert(HEADERS_REMOVAL[3] === 'Scientific Name', 'removal scientific');
  assert(HEADERS_REMOVAL[19] === 'Remarks (if any)', 'removal remarks header');
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
  const c = rows.map(r => r.cells);
  assert(c.map(r => r[5]).join(',') === '8,11,6', 'glued heights: ' + c.map(r => r[5]));
  assert(c.map(r => r[6]).join(',') === '310,370,130', 'glued dbhs: ' + c.map(r => r[6]));
  assert(c.map(r => r[7]).join(',') === '5,6,1', 'glued crowns: ' + c.map(r => r[7]));
  assert(c.map(r => r[8]).join(',') === '973,1162,408', 'glued girths: ' + c.map(r => r[8]));
  assert(c.every(r => r[9] === 'Low'), 'glued amenity');
  assert(c.every(r => r[1] === 'Tai Yuen Estate'), 'glued estate');
  assert(c.every(r => r[19] === 'TNS-TY-2026-002'), 'glued remarks');
  // Simulate headerless TSV copy (copyRemoval uses includeHeader=false)
  const tsvLines = c.map(r => r.join('\t'));
  const tsv = tsvLines.join('\n');
  assert(!tsv.startsWith('S/N'), 'tsv must not start with header');
  assert(tsvLines[0].startsWith('26\tTai Yuen Estate\tTY-T0315'), 'tsv first data: ' + tsvLines[0].slice(0, 80));
  assert(tsvLines[0].includes('\t8\t310\t5\t973\tLow\t'), 'tsv measurements in row0: ' + tsvLines[0]);
  console.log('glued-measurements PASS');
})();


console.log('ALL PDFJS TESTS PASSED');
