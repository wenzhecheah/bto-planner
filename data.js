// The Data & sources page: shows every section of the database as tables, so
// it can be checked against the sources without reading the code.

// Sections not checked for this long are marked as due for a check.
const REVIEW_AFTER_MONTHS = 6;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- How each figure is named and shown ----------------------------------------

const months = v => `${v} month${v === 1 ? '' : 's'}`;
const years = v => `${v} year${v === 1 ? '' : 's'}`;
const perMonth = v => `${money(v)} a month`;
const perYear = v => `${v}% a year`;
const percent = v => `${v}%`;
const shareOf = what => v => `${pct(v)} of ${what}`;
const capital = v => v[0].toUpperCase() + v.slice(1);

// [name, format] for each key in the database. 'parent.key' applies only
// inside that table or group. SECTION_FIELDS override these for one section.
const FIELDS = {
  // Sales exercises
  month: ['Launch', dateLabel], hfeDocsBy: ['Submit HFE documents by', dateLabel],
  flats: ['Flats'], towns: ['Towns'],
  // Eligibility
  minAge: ['Minimum age', v => `${v} years old`],
  privatePropertyWaitMonths: ['Wait after selling a private home', months],
  citizenPremium: ['Premium for a Singapore Citizen + PR household', money],
  solemniseWithinMonths: ['Engaged couples must marry within', v => `${months(v)} of completing the purchase`],
  sellExistingWithinMonths: ['An existing HDB flat must be sold within', v => `${months(v)} of key collection`],
  moveInWithinMonths: ['Everyone listed must move in within', v => `${months(v)} of key collection`],
  // Income ceilings
  families: ['Families', perMonth], extendedFamilies: ['Extended or multi-generation families', perMonth],
  singles: ['Singles aged 35 and above', perMonth], previous: ['Before the increase'],
  // Flat types and classifications
  optionFee: ['Option fee', money], surveyFee: ['Survey fee', money],
  incomeCeiling: ['Income ceiling', perMonth], lowerCeilingInSomeProjects: ['Lower ceiling in some projects', perMonth],
  mopYears: ['MOP', years], subsidyRecovery: ['Subsidy recovery'], rentWholeFlatAfterMop: ['Rent out the whole flat after MOP'],
  exercise: ['Launch'], project: ['Project'], classification: ['Classification', capital],
  // Grants
  employmentMonths: ['Continuous work needed', months],
  maxShareOfPrice: ['Grant used for the flat, at most', shareOf('the price')],
  'families.upTo': ['Average monthly household income, up to', money],
  'firstAndSecondTimer.upTo': ['Half the average monthly household income, up to', money],
  amount: ['Grant', money],
  // Fees
  applicationFee: ['Application fee', money], optionFeeInCash: ['Option fee must be paid in cash'],
  stampDuty: ['Stamp duty on the Agreement for Lease, by part of the price'],
  'stampDuty.upTo': ['Part of the price up to', money], 'stampDuty.rate': ['Stamp duty', v => `${v}% of this part`],
  legalFee: ['HDB legal fee, by part of the price or loan'],
  'legalFee.upTo': ['Part of the price or loan up to', money], perThousand: ['Legal fee', v => `${money(v)} per $1,000.00`],
  gst: ['GST on legal fees', percent], legalFeeMin: ['Minimum legal fee, with GST', money],
  leaseRegistration: ['Lease registration fee', money], mortgageRegistration: ['Mortgage registration fee', money],
  deedOfAssignment: ['Stamp duty on the Deed of Assignment (HDB loan only)'],
  'deedOfAssignment.rate': ['Rate', v => `${v}% of the loan`], 'deedOfAssignment.max': ['At most', money],
  // Timeline
  applicationDays: ['Application window', v => `${v} days`],
  ballotResultsWithinMonths: ['Ballot results within', v => `${months(v)} of the window closing`],
  aflWithinMonthsOfBooking: ['Agreement for Lease signed within', v => `${months(v)} of booking`],
  takeKeysWithinMonths: ['Keys collected within', v => `${months(v)} of HDB's notice`],
  waitYears: ['Usual wait for a new flat', v => `Under ${years(v)}`],
  shorterWaitYears: ['Shorter Waiting Time projects', v => `Under ${years(v)}`],
  // Ballot
  chances: ['Ballot chances'], caps: ['Most ballot chances after unsuccessful applications'],
  ftPmc: ['First-Timer (Parents & Married Couples)'], firstTimer: ['Other first-timer families'],
  secondTimer: ['Second-timer families'],
  extraAfterUnsuccessful: ['Extra chances start after', v => `${v} unsuccessful Standard applications`],
  ftPmcMaxAge: ['FT(PMC) married couples aged up to', String],
  childChanceFrom: ['Extra chance for each child, from the launch of', dateLabel],
  childMaxAge: ['Children counted up to age', String],
  fppsShare: ['Family and Parenthood Priority Scheme, up to', shareOf('BTO flats')],
  // Cancellation
  forfeitAfterAfl: ['Lost if cancelled after signing the Agreement for Lease', shareOf('the price')],
  waiveNonSelectionUpToFlats: ['No penalty for not booking if the flats left were', v => `${v} or fewer`],
  stage: ['When'], forfeit: ['You lose'], consequence: ['What happens'],
  // CPF
  oaInterest: ['OA interest', perYear], ordinaryWageCeiling: ['Salary counted for CPF, up to', perMonth],
  rates: ['Contribution rates, % of salary'], allocation: ['Share of contributions going to the SA and MA (the OA gets the rest)'],
  from: ['From', String], bands: ['By age'], 'bands.upTo': ['Age up to', String],
  employer: ['Employer', percent], employee: ['Employee', percent], sa: ['SA', pct], ma: ['MA', pct],
};

const loanFields = {
  ltv: ['Loan-to-value (LTV) limit', shareOf('the price')],
  msr: ['Mortgage servicing ratio (MSR): instalment up to', shareOf('gross monthly income')],
  maxTenureYears: ['Longest loan', years],
};
const SECTION_FIELDS = {
  flatTypes: { label: ['Flat Type'] },
  classifications: { label: ['Flat Classification'] },
  subsidyRecovery: { rate: ['Share of the resale price', percent] },
  incomeCeilings: { from: ['Applies to HFE letters applied for from', dateLabel] },
  grants: { families: ['First-timer couples'], firstAndSecondTimer: ['A first-timer and a second-timer'] },
  hdbLoan: { ...loanFields,
    rate: ['Interest rate', perYear],
    assessmentFloor: ['Affordability checked at an interest rate of at least', perYear],
    maxAge: ['Loan must be repaid by age', String],
    leaseYears: ['Lease of a new flat', years],
    leaseBufferYears: ['Lease left when the loan ends, at least', years],
    oaRetention: ['CPF OA each applicant may keep', money] },
  bankLoan: { ...loanFields,
    lowerLtv: ['Lower LTV limit', shareOf('the price')],
    fullLtvMaxTenureYears: ['Full LTV limit only for loans up to', years],
    maxAge: ['Lower LTV limit if the loan runs past age', String],
    tdsr: ['Total debt servicing ratio (TDSR): all loan repayments up to', shareOf('gross monthly income')],
    stressRate: ['Affordability checked at an interest rate of at least', perYear] },
  paymentSchemes: { schemes: ['Who each scheme is for'], label: ['Scheme'], who: ['Who'],
    maxAge: ['Age at the HFE application', v => `${v} or younger`],
    withinMonths: ['Studies or NS finished within', months],
    schedule: ['Share of the price paid at each stage'] },
};
// Columns not shown: internal keys, and labels repeated elsewhere.
const HIDDEN = { all: ['key'], salesExercises: ['label'] };

let section = ''; // the section being drawn

// [name, format] for a key, inside `parent`.
function field(key, parent) {
  const own = SECTION_FIELDS[section] ?? {};
  const found = own[`${parent}.${key}`] ?? own[key] ?? FIELDS[`${parent}.${key}`] ?? FIELDS[key];
  if (found) return found;
  const s = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return [s[0].toUpperCase() + s.slice(1)];
}

// ---- Drawing ---------------------------------------------------------------------

const isTable = v => Array.isArray(v) && v.length > 0 && v.every(x => x && typeof x === 'object');

function tableHTML(rows, parent) {
  const hidden = [...HIDDEN.all, ...(HIDDEN[section] ?? [])];
  const keys = [...new Set(rows.flatMap(Object.keys))].filter(k => !hidden.includes(k));
  return `<div class="table-wrap"><table class="text-table">
    <thead><tr>${keys.map(k => `<th>${field(k, parent)[0]}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${keys.map(k => `<td>${valueHTML(r[k], k, parent)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

// The downpayment schedule as one table: a row per scheme and loan, a column per stage.
function scheduleHTML(schedule) {
  const P = HDB_DATA.paymentSchemes, K = HDB_DATA.bankLoan;
  const loans = { hdb: 'HDB loan, or no loan', bank75: `Bank loan, LTV ${pct(K.ltv)}`, bank55: `Bank loan, LTV ${pct(K.lowerLtv)}` };
  const stage = s => `${pct(s.total)}${s.cash ? `<br><span class="hint">At least ${pct(s.cash)} in cash</span>` : ''}`;
  const rows = Object.entries(schedule).flatMap(([scheme, byLoan]) => Object.entries(byLoan).map(([loan, s], i, all) =>
    `<tr class="${i === 0 ? 'group-start' : ''}">${i === 0
      ? `<td rowspan="${all.length}"><strong>${P.schemes.find(x => x.key === scheme)?.label ?? capital(scheme)}</strong></td>` : ''}
      <td>${loans[loan] ?? loan}</td><td>${stage(s.afl)}</td><td>${stage(s.keys)}</td></tr>`));
  return `<div class="table-wrap"><table class="text-table schedule">
    <thead><tr><th>Payment scheme</th><th>Loan</th><th>When signing the Agreement for Lease</th><th>At key collection</th></tr></thead>
    <tbody>${rows.join('')}</tbody></table></div>`;
}
const CUSTOM = { schedule: scheduleHTML };

// A value as HTML. Inside a group, single figures are listed first and tables
// follow at full width (a table called `list` needs no heading).
function valueHTML(v, key = '', parent = '') {
  if (v === Infinity) return 'and above';
  if (v == null) return '';
  if (Array.isArray(v)) return isTable(v) ? tableHTML(v, key) : v.map(x => valueHTML(x, key, parent)).join(', ');
  if (typeof v === 'object') {
    const entries = Object.entries(v);
    const block = ([k, x]) => isTable(x) || CUSTOM[k];
    const figures = entries.filter(e => !block(e));
    return (figures.length ? `<dl class="data-dl">${figures.map(([k, x]) =>
      `<dt>${field(k, key)[0]}</dt><dd>${valueHTML(x, k, key)}</dd>`).join('')}</dl>` : '')
      + entries.filter(block).map(([k, x]) => `${k === 'list' ? '' : `<h3 class="data-table-label">${field(k, key)[0]}</h3>`}${
        CUSTOM[k] ? CUSTOM[k](x) : tableHTML(x, k)}`).join('');
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const format = field(key, parent)[1];
  if (format) return esc(format(v));
  return typeof v === 'number' ? v.toLocaleString('en-SG', { maximumFractionDigits: 4 }) : esc(v);
}

// Months since an ISO date.
const monthsSince = date => {
  const [y, m] = date.split('-').map(Number), now = new Date();
  return (now.getFullYear() - y) * 12 + now.getMonth() + 1 - m;
};

function sectionHTML([id, { title, about, source = [], verified, ...data }]) {
  const due = monthsSince(verified) >= REVIEW_AFTER_MONTHS;
  section = id;
  return `<section class="panel data-section data-${id}">
    <h2>${esc(title)}</h2>
    <p class="data-meta">Last checked <strong>${dateLabel(verified)}</strong>${due ? ' <span class="due">Due for a check</span>' : ''}
      · ${source.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>
    ${about ? `<p class="prose">${esc(about)}</p>` : ''}
    ${valueHTML(data)}
  </section>`;
}

// CPF figures the planner uses, from cpf-data.js (whose own notes give the sources).
// `verified`: the date in cpf-data.js's own "Last verified" note.
const cpfSections = [
  { title: 'CPF: OA interest', about: 'The planner grows OA balances at this rate.',
    source: [{ label: 'CPF: HDB loan or bank loan? (OA rate)', url: 'https://www.cpf.gov.sg/member/infohub/educational-resources/3-differences-between-hdb-loan-and-bank-loan' }],
    verified: '2026-11-05', oaInterest: CPF_DATA.interest.base.oa },
  { title: 'CPF: contributions from salary', about: 'Contributions apply to monthly salary up to the Ordinary Wage ceiling. The planner uses the Singapore Citizen rates.',
    source: [{ label: 'CPF: saving as an employee (contribution and allocation rates)', url: 'https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/saving-as-an-employee' }],
    verified: '2026-11-05',
    ordinaryWageCeiling: CPF_DATA.contributions.owCeiling,
    rates: CPF_DATA.contributions.rates.full, allocation: CPF_DATA.contributions.allocation },
];

const sections = [...Object.entries(HDB_DATA), ...cpfSections.map((s, i) => [`cpf${i}`, s])];
byId('sections').innerHTML = sections.map(sectionHTML).join('');
const due = sections.map(([, s]) => s).filter(s => monthsSince(s.verified) >= REVIEW_AFTER_MONTHS);
byId('dueSummary').innerHTML = due.length
  ? `<strong>${due.length} section${due.length > 1 ? 's are' : ' is'} due for a check</strong> (not checked in ${REVIEW_AFTER_MONTHS} months): ${due.map(s => esc(s.title)).join(', ')}.`
  : `All ${sections.length} sections were checked in the last ${REVIEW_AFTER_MONTHS} months.`;
