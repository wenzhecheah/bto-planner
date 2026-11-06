// The Data & sources page: shows every section of the database as tables, so
// it can be checked against the sources without reading the code.

// Sections not checked for this long are marked as due for a check.
const REVIEW_AFTER_MONTHS = 6;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// camelCase key as words: 'hfeDocsBy' -> 'Hfe docs by'.
const words = k => { const s = k.replace(/([A-Z])/g, ' $1').toLowerCase(); return s[0].toUpperCase() + s.slice(1); };

function valueHTML(v) {
  if (v === Infinity) return 'and above';
  if (v == null) return '';
  if (Array.isArray(v)) {
    if (!v.every(x => x && typeof x === 'object')) return v.map(valueHTML).join(', ');
    const keys = [...new Set(v.flatMap(Object.keys))];
    return `<div class="table-wrap"><table class="text-table">
      <thead><tr>${keys.map(k => `<th>${words(k)}</th>`).join('')}</tr></thead>
      <tbody>${v.map(r => `<tr>${keys.map(k => `<td>${valueHTML(r[k])}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }
  if (typeof v === 'object') {
    return `<dl class="data-dl">${Object.entries(v).map(([k, x]) => `<dt>${words(k)}</dt><dd>${valueHTML(x)}</dd>`).join('')}</dl>`;
  }
  if (typeof v === 'number') return v.toLocaleString('en-SG', { maximumFractionDigits: 4 });
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return esc(v);
}

// Months since an ISO date.
const monthsSince = date => {
  const [y, m] = date.split('-').map(Number), now = new Date();
  return (now.getFullYear() - y) * 12 + now.getMonth() + 1 - m;
};

function sectionHTML({ title, about, source = [], verified, ...data }) {
  const due = monthsSince(verified) >= REVIEW_AFTER_MONTHS;
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

const sections = [...Object.values(HDB_DATA), ...cpfSections];
byId('sections').innerHTML = sections.map(sectionHTML).join('');
const due = sections.filter(s => monthsSince(s.verified) >= REVIEW_AFTER_MONTHS);
byId('dueSummary').innerHTML = due.length
  ? `<strong>${due.length} section${due.length > 1 ? 's are' : ' is'} due for a check</strong> (not checked in ${REVIEW_AFTER_MONTHS} months): ${due.map(s => esc(s.title)).join(', ')}.`
  : `All ${sections.length} sections were checked in the last ${REVIEW_AFTER_MONTHS} months.`;
