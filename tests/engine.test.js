// Run with: node --test
// Loads the app's scripts as the browser does (shared top-level names) and
// checks the calculations against HDB's own worked examples.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The CPF files live in the CPF Forecast Calculator (the pages load them from its
// site), so the tests read them from a copy of that repo cloned next to this one.
const cpfDir = process.env.CPF_DIR || path.join(__dirname, '..', '..', 'cpf-forecast-calculator');
if (!fs.existsSync(path.join(cpfDir, 'cpf-data.js'))) {
  throw new Error(`CPF files not found in ${cpfDir}. Clone cpf-forecast-calculator next to this repo, or set CPF_DIR.`);
}
const ctx = vm.createContext({});
for (const f of [path.join(cpfDir, 'cpf-data.js'), path.join(cpfDir, 'cpf-lookups.js'),
  ...['hdb-data.js', 'config.js', 'engine.js'].map(f => path.join(__dirname, '..', f))]) {
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: path.basename(f) });
}
const run = code => vm.runInContext(code, ctx);
const call = (fn, ...args) => run(fn)(...args);

test('stamp duty and legal fee match HDB\'s sample ($345,000 4-room)', () => {
  assert.equal(call('stampDuty', 345000), 5100);
  assert.equal(call('legalFee', 345000), 239.80);
  assert.equal(call('stampDuty', 700000), 1800 + 3600 + 10200); // CPF's $700k example: $15,600
  assert.equal(call('legalFee', 0), 0);
});

test('EHG matches HDB\'s examples', () => {
  assert.equal(call('ehg', 'ft', 4200), 70000);   // Mr and Mrs A
  assert.equal(call('ehg', 'ft', 3000), 95000);   // orphaned siblings example
  assert.equal(call('ehg', 'ftst', 4000), 40000); // Mr and Mrs G: half income $2,000
  assert.equal(call('ehg', 'ft', 9000), 5000);
  assert.equal(call('ehg', 'ft', 9001), 0);
  assert.equal(call('ehg', 'st', 1000), 0);
});

test('instalment: $262,500 at 2.6% over 25 years', () => {
  assert.equal(Math.round(call('instalment', 262500, 2.6, 25) * 100) / 100, 1190.88);
  const loan = call('loanFor', call('instalment', 100000, 3, 25), 3, 25);
  assert.ok(Math.abs(loan - 100000) < 0.01);
});

test('payment scheme: staggered up to the 30th birthday, deferred for students', () => {
  const p = dob => ({ dob, firstTimer: true });
  assert.equal(call('paymentScheme', [p('1996-12-15'), p('1995-01-01')], '2026-12-15', false), 'staggered');
  assert.equal(call('paymentScheme', [p('1996-12-14'), p('1995-01-01')], '2026-12-15', false), 'normal');
  assert.equal(call('paymentScheme', [p('2000-01-01'), p('1999-01-01')], '2026-12-15', true), 'deferred');
  assert.equal(call('paymentScheme', [{ dob: '2000-01-01', firstTimer: false }, { dob: '1999-01-01', firstTimer: false }], '2026-12-15', false), 'normal');
});

test('ballot chances', () => {
  const base = { partners: [{ dob: '1998-01-01', firstTimer: true }, { dob: '1997-01-01', firstTimer: true }],
                 status: 'married', children: 0, expecting: false, classification: 'standard', unsuccessful: 0, launch: '2026-11' };
  const chances = over => run('ballotChances')({ ...base, ...over }).chances;
  assert.equal(chances({}), 3);                                    // FT(PMC): married, under 40
  assert.equal(chances({ status: 'fiance' }), 2);                  // first-timer family
  assert.equal(chances({ unsuccessful: 2 }), 4);                   // +1 after 2 unsuccessful
  assert.equal(chances({ unsuccessful: 9 }), 5);                   // capped at 5
  assert.equal(chances({ unsuccessful: 9, classification: 'plus' }), 3); // Standard only
  assert.equal(chances({ children: 2 }), 3);                       // child chances start Feb 2027
  assert.equal(chances({ children: 2, launch: '2027-02' }), 5);
  assert.equal(chances({ partners: base.partners.map(p => ({ ...p, firstTimer: false })) }), 1);
});

// The worked example in docs/research.md: $350k 4-room, $7k income, HDB loan, normal scheme.
const couple = (over = {}) => ({
  partners: [
    { dob: '1990-01-01', salary: 3500, oa: 60000, citizen: 'sc', firstTimer: true },
    { dob: '1990-06-01', salary: 3500, oa: 60000, citizen: 'sc', firstTimer: true },
  ],
  status: 'married', children: 0, expecting: false, student: false, worked12: true,
  privateProperty: false, unsuccessful: 0, otherDebts: 0,
  flatType: '4rm', classification: 'standard', price: 350000, subsidyRecovery: 0,
  launch: '2027-02', waitYears: 4, loanType: 'hdb', bankRate: 2.6, bankTenure: 25, keepOA: false,
  cash: 30000, cashMonthly: 0, wedding: 0, weddingMonth: '', reno: 0, ...over,
});

test('plan: worked example', () => {
  const r = run('plan')(couple(), '2026-11-06');
  assert.equal(r.issues.length, 0);
  assert.equal(r.scheme, 'normal');
  assert.equal(r.grant.used, 30000);
  const afl = r.events.find(e => e.key === 'afl');
  assert.equal(afl.total, 35000 - 2000 + 5200 + 243.07);
  assert.equal(afl.grant, 30000);
  // Plenty of OA: the loan is what's left after OA, so less than the 75% maximum.
  assert.equal(r.loan.max, 262500);
  assert.ok(r.loan.amount < r.loan.max);
  // Everything is paid: price + fees = OA + cash + loan.
  const total = r.events.reduce((s, e) => s + e.total, 0);
  assert.ok(Math.abs(total - (r.oaUsed + r.cashNeeded)) < 0.01);
  const priceParts = r.events.flatMap(e => e.items).filter(i => /option fee|Downpayment|Balance/i.test(i.label)).reduce((s, i) => s + i.amount, 0);
  assert.ok(Math.abs(priceParts + r.loan.amount - 350000) < 0.01);
});

test('plan: on a dearer flat, income (MSR) limits the loan', () => {
  // $7k income: 30% = $2,100 a month at the 3% floor over 25 years = $442,841.
  const r = run('plan')(couple({ price: 600000, cash: 200000 }), '2026-11-06');
  assert.equal(r.loan.limitedBy, 'income (MSR)');
  assert.equal(Math.round(r.loan.max), 442841);
  assert.ok(r.loan.amount <= r.loan.max); // OA is used first, so the loan can be smaller
  assert.equal(r.grant.used, 30000);
});

test('plan: bank loan needs 5% cash at the AFL; long tenure drops to 55%', () => {
  const r = run('plan')(couple({ loanType: 'bank' }), '2026-11-06');
  const afl = r.events.find(e => e.key === 'afl');
  assert.ok(afl.fromCash >= 0.05 * 350000 - 2000 - 0.01);
  const long = run('plan')(couple({ loanType: 'bank', bankTenure: 30 }), '2026-11-06');
  assert.equal(long.loan.ltv, 0.55);
});

test('plan: ineligible cases are reported', () => {
  const rich = couple({ partners: couple().partners.map(p => ({ ...p, salary: 9000 })) });
  assert.equal(run('plan')(rich, '2026-11-06').issues.length, 1);
  assert.equal(run('plan')(couple({ privateProperty: true }), '2026-11-06').issues.length, 1);
  const prs = couple({ partners: couple().partners.map(p => ({ ...p, citizen: 'spr' })) });
  assert.equal(run('plan')(prs, '2026-11-06').issues.length, 1);
});
