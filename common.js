// Helpers shared by every page.
const byId = id => document.getElementById(id);
const money = n => n.toLocaleString('en-SG', { style: 'currency', currency: 'SGD' });
const pct = share => `${+(share * 100).toFixed(1)}%`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// 'YYYY-MM' or 'YYYY-MM-DD' as 'Feb 2027' or '15 Dec 2026'.
function dateLabel(s) {
  const [y, m, d] = s.split('-').map(Number);
  return `${d ? `${d} ` : ''}${MONTHS[m - 1]} ${y}`;
}
// The next sales exercise in the database that can still be prepared for (its
// HFE documents date hasn't passed), or the last one.
function nextExercise() {
  const now = new Date();
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(n => String(n).padStart(2, '0')).join('-');
  const list = HDB_DATA.salesExercises.list;
  return list.find(e => e.hfeDocsBy >= today) ?? list[list.length - 1];
}

// Page text that quotes HDB figures, so it always matches the database.
// Elements with data-hdb="key" get the text for that key.
function hdbText() {
  const D = HDB_DATA, G = D.grants, next = nextExercise();
  const cls = Object.fromEntries(D.classifications.list.map(c => [c.key, c]));
  return {
    nextLaunch: next.label, nextHfe: dateLabel(next.hfeDocsBy), nextTowns: next.towns,
    familiesCeiling: money(D.incomeCeilings.families), extendedCeiling: money(D.incomeCeilings.extendedFamilies),
    ceilingFrom: dateLabel(D.incomeCeilings.from), minAge: String(D.eligibility.minAge),
    privateWait: String(D.eligibility.privatePropertyWaitMonths), citizenPremium: money(D.eligibility.citizenPremium),
    solemnise: String(D.eligibility.solemniseWithinMonths), moveIn: String(D.eligibility.moveInWithinMonths),
    ehgMax: money(G.families[0].amount), ehgCeiling: money(G.families[G.families.length - 1].upTo),
    ehgFtStMax: money(G.firstAndSecondTimer[0].amount),
    hdbRate: `${D.hdbLoan.rate}%`, hdbFloor: `${D.hdbLoan.assessmentFloor}%`, ltv: pct(D.hdbLoan.ltv),
    msr: pct(D.hdbLoan.msr), hdbTenure: String(D.hdbLoan.maxTenureYears), hdbMaxAge: String(D.hdbLoan.maxAge),
    oaRetention: money(D.hdbLoan.oaRetention), tdsr: pct(D.bankLoan.tdsr), stressRate: `${D.bankLoan.stressRate}%`,
    bankLowerLtv: pct(D.bankLoan.lowerLtv), bankFullTenure: String(D.bankLoan.fullLtvMaxTenureYears),
    appFee: money(D.fees.applicationFee), applicationDays: String(D.timeline.applicationDays),
    ballotMonths: String(D.timeline.ballotResultsWithinMonths), aflMonths: String(D.timeline.aflWithinMonthsOfBooking),
    waitYears: String(D.timeline.waitYears), swtYears: String(D.timeline.shorterWaitYears),
    keysMonths: String(D.timeline.takeKeysWithinMonths),
    optionFees: D.flatTypes.list.map(f => `${money(f.optionFee)} (${f.label.replace(/ \(.*\)/, '')})`).join(', '),
    mopStandard: String(cls.standard.mopYears), mopPlus: String(cls.plus.mopYears),
    forfeitAfl: pct(D.cancellation.forfeitAfterAfl), ftPmcChances: String(D.ballot.chances.ftPmc),
    ftChances: String(D.ballot.chances.firstTimer), childFrom: dateLabel(D.ballot.childChanceFrom),
    staggeredAge: String(D.paymentSchemes.schemes[1].maxAge),
  };
}
function fillHdbText() {
  const text = hdbText();
  document.querySelectorAll('[data-hdb]').forEach(el => { el.textContent = text[el.dataset.hdb]; });
}
