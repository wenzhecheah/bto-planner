// The Data & sources page: shows every section of the database as tables, so
// it can be checked against the sources without reading the code.

// Sections not checked for this long are marked as due for a check.
const REVIEW_AFTER_MONTHS = 6;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Headings: camelCase keys as words ('hfeDocsBy' -> 'HFE docs by'), with
// acronyms in capitals, and some renamed. `NAMES` applies everywhere;
// `SECTION_NAMES` only in that section. Internal `key` columns are not shown.
const ACRONYMS = new Set(['hfe', 'mop', 'ltv', 'msr', 'tdsr', 'ehg', 'oa', 'gst', 'afl', 'fpps', 'ft', 'pmc']);
const NAMES = { mopYears: 'MOP' };
const SECTION_NAMES = {
  flatTypes: { label: 'Flat Type' },
  classifications: { label: 'Flat Classification' },
};
let names = NAMES; // the names for the section being drawn
function words(k) {
  if (names[k]) return names[k];
  const s = k.replace(/([A-Z])/g, ' $1').toLowerCase().split(' ')
    .map(w => ACRONYMS.has(w) ? w.toUpperCase() : w).join(' ');
  return s[0].toUpperCase() + s.slice(1);
}

// Amounts in dollars, shown as $x.xx. `upTo` is money except in CPF's age bands.
const MONEY = new Set(['optionFee', 'surveyFee', 'incomeCeiling', 'lowerCeilingInSomeProjects', 'families',
  'extendedFamilies', 'singles', 'amount', 'upTo', 'citizenPremium', 'applicationFee', 'legalFeeMin',
  'leaseRegistration', 'mortgageRegistration', 'max', 'perThousand', 'oaRetention', 'ordinaryWageCeiling']);
const isMoney = (key, parent) => MONEY.has(key) && !(key === 'upTo' && parent === 'bands');

const isTable = v => Array.isArray(v) && v.length > 0 && v.every(x => x && typeof x === 'object');

function tableHTML(rows, parent) {
  const keys = [...new Set(rows.flatMap(Object.keys))].filter(k => k !== 'key');
  return `<div class="table-wrap"><table class="text-table">
    <thead><tr>${keys.map(k => `<th>${words(k)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${keys.map(k => `<td>${valueHTML(r[k], k, parent)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

// A value as HTML. Inside an object, single figures are listed first and tables
// follow at full width (a table called `list` needs no heading).
function valueHTML(v, key = '', parent = '') {
  if (v === Infinity) return 'and above';
  if (v == null) return '';
  if (Array.isArray(v)) return isTable(v) ? tableHTML(v, key) : v.map(x => valueHTML(x, key, parent)).join(', ');
  if (typeof v === 'object') {
    const entries = Object.entries(v);
    const figures = entries.filter(([, x]) => !isTable(x));
    const tables = entries.filter(([, x]) => isTable(x));
    return (figures.length ? `<dl class="data-dl">${figures.map(([k, x]) =>
      `<dt>${words(k)}</dt><dd>${valueHTML(x, k, key)}</dd>`).join('')}</dl>` : '')
      + tables.map(([k, x]) => `${k === 'list' ? '' : `<h3 class="data-table-label">${words(k)}</h3>`}${tableHTML(x, k)}`).join('');
  }
  if (typeof v === 'number') {
    return isMoney(key, parent) ? money(v) : v.toLocaleString('en-SG', { maximumFractionDigits: 4 });
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return esc(v);
}

// Months since an ISO date.
const monthsSince = date => {
  const [y, m] = date.split('-').map(Number), now = new Date();
  return (now.getFullYear() - y) * 12 + now.getMonth() + 1 - m;
};

function sectionHTML([id, { title, about, source = [], verified, ...data }]) {
  const due = monthsSince(verified) >= REVIEW_AFTER_MONTHS;
  names = { ...NAMES, ...SECTION_NAMES[id] };
  return `<section class="panel data-section">
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
  { title: 'CPF: OA interest', about: 'The planner grows OA balances at this rate (% a year).',
    source: [{ label: 'CPF: HDB loan or bank loan? (OA rate)', url: 'https://www.cpf.gov.sg/member/infohub/educational-resources/3-differences-between-hdb-loan-and-bank-loan' }],
    verified: '2026-11-05', oaInterest: CPF_DATA.interest.base.oa },
  { title: 'CPF: contributions from salary', about: 'Contributions apply to monthly salary up to the Ordinary Wage ceiling. Rates are % of salary; the OA gets what is left after the SA and MA shares. The planner uses the Singapore Citizen rates.',
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
