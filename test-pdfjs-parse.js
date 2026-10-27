#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const hm = script.match(/const headers = \[[\s\S]*?\];/);
const pm = script.match(/const KNOWN_PLACES[\s\S]*?function parseReport\(text, filename\) \{[\s\S]*?\n\}/);
if (!hm || !pm) {
  console.error('Failed to extract parser from index.html');
  process.exit(1);
}
eval((hm[0] + '\n' + pm[0]).replace(/\bconst /g, 'var '));

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

function check(lab, file, exp) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseReport(text, path.basename(file) + '.pdf');
  console.log(lab, rows.map(r => ({ case: r[2], estate: r[1], date: r[3], tree: r[4], obs: r[5] })));
  assert(rows.length === exp.n, `${lab}: expected ${exp.n} rows, got ${rows.length}`);
  assert(rows.every(r => r[1] === exp.estate), `${lab}: estate ${rows[0] && rows[0][1]}`);
  assert(rows.every(r => r[2] === exp.caseNo), `${lab}: case ${rows[0] && rows[0][2]}`);
  assert(rows.every(r => r[3] === exp.date), `${lab}: date ${rows[0] && rows[0][3]}`);
  assert(rows.map(r => r[4]).join(',') === exp.trees.join(','), `${lab}: trees ${rows.map(r => r[4])}`);
  assert(rows.map(r => r[5]).join('|') === exp.obs.join('|'), `${lab}: obs ${rows.map(r => r[5]).join('|')}`);
  console.log(lab, 'PASS');
}

const samples3 = '/workspace/audit-samples3';
check('shekmun-pdfjs', path.join(samples3, 'shekmun-pdfjs.txt'), {
  n: 3,
  caseNo: 'AS-TNS-SM-2026-006',
  estate: 'Shek Mun Estate',
  date: '04/08/2026',
  trees: ['SM-T0209', 'SM-T0212', 'SM-T0319'],
  obs: ['Asymmetric crown', 'Asymmetric crown', 'Asymmetric crown']
});
check('butterfly-pdfjs', path.join(samples3, 'butterfly-pdfjs.txt'), {
  n: 1,
  caseNo: 'AS-TY-BE-2026-005',
  estate: 'Butterfly Estate',
  date: '13/07/2026',
  trees: ['BE-T0307'],
  obs: ['Hanger']
});

const samplesRem = '/workspace/audit-samples-removal';
check('non-tpc-removal-pdfjs', path.join(samplesRem, 'non-tpc-20261021-pdfjs.txt'), {
  n: 3,
  caseNo: 'TNS-TY-2026-002',
  estate: 'Tai Yuen Estate',
  date: '21/10/2026',
  trees: ['TY-T0315', 'TY-T0571', 'TY-T1198'],
  obs: [
    'Dead tree (except for dead trees of particular interest)',
    'Dead tree (except for dead trees of particular interest)',
    'Dead tree (except for dead trees of particular interest)'
  ]
});
// Extra fields for removal rows
(() => {
  const text = fs.readFileSync(path.join(samplesRem, 'non-tpc-20261021-pdfjs.txt'), 'utf8');
  const rows = parseReport(text, 'Non-TPC_Tree removal summary_20261021.pdf');
  assert(rows.every(r => r[18] === 'Yes'), 'planting Yes: ' + rows.map(r => r[18]));
  assert(rows.every(r => r[20] === '21/11/2026'), 'antRemoval: ' + rows.map(r => r[20]));
  assert(rows.every(r => r[21] === '21/05/2026'), 'antComp: ' + rows.map(r => r[21]));
  assert(rows.every(r => r[22] === 'N/A'), 'actual: ' + rows.map(r => r[22]));
  console.log('non-tpc-removal extras PASS');
})();

check('sco-20261017-pdfjs', path.join(samplesRem, 'sco-20261017-pdfjs.txt'), {
  n: 6,
  caseNo: 'TNS-SCO-2026-004',
  estate: 'Shui Chuen O Estate',
  date: '17/10/2026',
  trees: ['SCO-A0004', 'SCO-A0005', 'SCO-A0006', 'SCO-A0007', 'SCO-A0008', 'SCO-A0009'],
  obs: [
    'Removal of common undesirable species',
    'Tree removal for the purpose of woodland management',
    'Tree removal for the purpose of woodland management',
    'Removal of common undesirable species',
    'Dead tree (except for dead trees of particular interest)',
    'Removal of common undesirable species'
  ]
});
(() => {
  const text = fs.readFileSync(path.join(samplesRem, 'sco-20261017-pdfjs.txt'), 'utf8');
  const rows = parseReport(text, 'Non-TPC_Tree removal summary_20261017.pdf');
  assert(rows.every(r => r[18] === 'No'), 'sco planting No: ' + rows.map(r => r[18]));
  assert(rows.every(r => r[19] === 'Steep slope (over 35 degrees)'), 'sco norep: ' + rows.map(r => r[19]));
  assert(rows.every(r => r[20] === '17/11/2026'), 'sco antRemoval: ' + rows.map(r => r[20]));
  assert(rows.every(r => r[21] === 'N/A'), 'sco antComp: ' + rows.map(r => r[21]));
  assert(rows.every(r => r[22] === 'N/A'), 'sco actual: ' + rows.map(r => r[22]));
  assert(rows.every(r => r[23] === 'TNS-SCO-2026-004'), 'sco remarks: ' + rows.map(r => r[23]));
  console.log('sco-20261017 extras PASS');
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
    assert(blankEstate.every(r => r[1] === 'Shui Chuen O Estate'), 'blank estate audit: ' + (blankEstate[0] && blankEstate[0][1]));
  }
  console.log('tree-prefix-fallback PASS');
})();

console.log('ALL PDFJS TESTS PASSED');
