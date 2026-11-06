// The planner page: form, shareable link and results. Calculations are in engine.js.

// Money inputs: accept pasted values like "012,345.6" or "$12345" and show
// them as $12,345.60 once the field loses focus.
const parseMoney = str => Number(String(str).replace(/[^0-9.]/g, '')) || 0;
const formatMoney = n => '$' + n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
document.querySelectorAll('input.money').forEach(input => {
  input.addEventListener('focus', () => input.select()); // typing/pasting replaces, not appends
  input.addEventListener('blur', () => {
    if (input.value.trim() !== '') input.value = formatMoney(parseMoney(input.value));
  });
});

fillHdbText();

// Choices from the database.
for (const f of HDB_DATA.flatTypes.list) byId('flatType').add(new Option(f.label, f.key));
for (const c of HDB_DATA.classifications.list) byId('classification').add(new Option(c.label, c.key));
byId('launchHint').textContent = 'Known launches: ' + HDB_DATA.salesExercises.list
  .map(e => `${e.label} (HFE documents by ${dateLabel(e.hfeDocsBy)})`).join('; ') + '.';

// Fields that depend on others.
function syncForm() {
  byId('recoveryField').hidden = byId('classification').value === 'standard';
  byId('bankFields').hidden = byId('loanType').value !== 'bank';
}
byId('classification').addEventListener('change', syncForm);
byId('loanType').addEventListener('change', syncForm);

// ---- Form values ----------------------------------------------------------

const form = byId('bto-form');
const fields = [...form.querySelectorAll('input[id], select[id]')];

function setField(el, value) {
  if (el.type === 'checkbox') el.checked = value === true || value === '1';
  else if (el.classList.contains('money')) el.value = Number(value) ? formatMoney(Number(value)) : '';
  else el.value = String(value);
}

// Starting values: config.js, and the next launch in the database.
function setDefaults() {
  for (const el of fields) {
    if (el.id in BTO_CONFIG) setField(el, BTO_CONFIG[el.id]);
    else if (el.type === 'checkbox') el.checked = /first$/.test(el.id);
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  }
  byId('launch').value = nextExercise().month;
}

// ---- Shareable links: the inputs live in the address after # --------------
// The part after # never leaves the browser, so the numbers aren't sent to
// the web server, but anyone given the link can see them.

function formToHash() {
  const p = new URLSearchParams();
  for (const el of fields) {
    if (el.type === 'checkbox') p.set(el.id, el.checked ? '1' : '0');
    else if (el.classList.contains('money')) { const n = parseMoney(el.value); if (n) p.set(el.id, n); }
    else if (el.value !== '') p.set(el.id, el.value);
  }
  return p.toString();
}

function hashToForm(hash) {
  setDefaults();
  const p = new URLSearchParams(hash);
  for (const el of fields) if (p.has(el.id)) setField(el, p.get(el.id));
}

// ---- Validation -------------------------------------------------------------

function showError(el, message) {
  const box = byId('formError');
  form.querySelectorAll('[aria-invalid]').forEach(f => f.removeAttribute('aria-invalid'));
  if (!message) { box.hidden = true; return true; }
  box.textContent = message;
  box.hidden = false;
  el.setAttribute('aria-invalid', 'true');
  el.focus();
  return false;
}

function validate() {
  const today = new Date().toISOString().slice(0, 10);
  for (const [id, who] of [['p1dob', 'your'], ['p2dob', "your partner's"]]) {
    const el = byId(id);
    if (!el.value) return showError(el, `Enter ${who} date of birth.`);
    if (el.value > today) return showError(el, `${who[0].toUpperCase()}${who.slice(1)} date of birth is in the future.`);
  }
  if (!byId('launch').value) return showError(byId('launch'), 'Choose the BTO launch you\'re applying in.');
  if (parseMoney(byId('price').value) <= 0) return showError(byId('price'), 'Enter the flat price.');
  const wait = byId('waitYears');
  if (wait.value === '' || Number(wait.value) < 0) return showError(wait, 'Enter the years from launch to key collection.');
  if (byId('loanType').value === 'bank' && !(Number(byId('bankTenure').value) > 0)) {
    return showError(byId('bankTenure'), 'Enter the bank loan tenure in years.');
  }
  return showError(null, null);
}

function readForm() {
  const val = id => parseMoney(byId(id).value);
  const num = id => Number(byId(id).value) || 0;
  const on = id => byId(id).checked;
  const partner = n => ({ dob: byId(`p${n}dob`).value, citizen: byId(`p${n}citizen`).value,
    salary: val(`p${n}salary`), oa: val(`p${n}oa`), firstTimer: on(`p${n}first`) });
  return {
    partners: [partner(1), partner(2)],
    status: byId('status').value, children: num('children'), expecting: on('expecting'),
    student: on('student'), worked12: on('worked12'), privateProperty: on('privateProperty'),
    unsuccessful: num('unsuccessful'), otherDebts: val('otherDebts'),
    flatType: byId('flatType').value, classification: byId('classification').value,
    price: val('price'), subsidyRecovery: num('subsidyRecovery'),
    launch: byId('launch').value, waitYears: num('waitYears'),
    loanType: byId('loanType').value, bankRate: num('bankRate'), bankTenure: num('bankTenure'), keepOA: on('keepOA'),
    cash: val('cash'), cashMonthly: val('cashMonthly'),
    wedding: val('wedding'), weddingMonth: byId('weddingMonth').value, reno: val('reno'),
  };
}

// ---- Results ----------------------------------------------------------------

const SCHEMES = Object.fromEntries(HDB_DATA.paymentSchemes.schemes.map(s => [s.key, s]));
const signed = n => n < -0.5 ? `<span class="short">−${wholeMoney(-n)}</span>` : wholeMoney(Math.max(0, n));

function statusHTML(r) {
  const lines = r.issues.map(t => `<li class="issue"><strong>Not eligible:</strong> ${t}</li>`);
  if (!r.issues.length) {
    lines.push(`<li class="ok">You look eligible for a ${r.classification.label} ${r.flat.label} flat, on the
      <strong>${SCHEMES[r.scheme].label}</strong> payment schedule.</li>`);
  }
  lines.push(...r.warnings.map(t => `<li>${t}</li>`));
  return `<ul class="status-list">${lines.join('')}</ul>`;
}

function cardsHTML(r) {
  const cards = [
    ['Cash needed, booking to keys', wholeMoney(r.cashNeeded), true],
    ['Grant (EHG)', r.grant.used ? wholeMoney(r.grant.used) : 'None'],
    ['Loan', r.loan.type === 'none' ? 'No loan' : wholeMoney(r.loan.amount)],
    ['Monthly instalment', r.loan.monthly ? wholeMoney(r.loan.monthly) : '–'],
    ['CPF OA used, booking to keys', wholeMoney(r.oaUsed)],
    ['Ballot chances', String(r.ballot.chances)],
    ['Keys (estimate)', dateLabel(r.dates.keys)],
    [`Minimum occupation ends`, dateLabel(r.dates.mopEnd)],
  ];
  return `<div class="cards">${cards.map(([label, value, main]) => `
    <div class="card${main ? ' main' : ''}"><div class="card-label">${label}</div>
      <div class="card-value">${value}</div></div>`).join('')}</div>`;
}

function timelineHTML(r) {
  const plain = (label, date, note) => `<tr class="milestone"><td>${label}</td><td>${date}</td>
    <td class="items">${note}</td><td colspan="6"></td></tr>`;
  const rows = r.events.map(e => `<tr>
      <td>${e.label}</td><td>${dateLabel(e.date)}</td>
      <td class="items">${e.items.map(i => `${i.label}: ${money(i.amount)}${i.cashOnly ? ' <span class="tag">cash</span>' : ''}`).join('<br>')}</td>
      <td>${money(e.total)}</td>
      <td>${e.grant ? money(e.grant) : '–'}</td>
      <td>${money(e.fromOA)}</td><td>${money(e.fromCash)}</td>
      <td>${wholeMoney(e.oaAfter)}</td><td>${signed(e.cashAfter)}</td></tr>`).join('');
  return `
    <div class="table-wrap"><table class="timeline">
      <thead><tr><th>Stage</th><th>When</th><th>What's paid</th><th>Total</th><th>Grant into OA</th>
        <th>From CPF OA</th><th>From cash</th><th>OA left</th><th>Cash left</th></tr></thead>
      <tbody>
        ${plain('Apply for the HFE letter', dateLabel(r.dates.hfe), 'Submit all documents by this date.')}
        ${plain('Apply in the BTO launch', dateLabel(r.dates.launch), `Application fee ${wholeMoney(HDB_DATA.fees.applicationFee)}; ballot results within ${HDB_DATA.timeline.ballotResultsWithinMonths} months.`)}
        ${rows}
        ${plain('Minimum occupation period ends', dateLabel(r.dates.mopEnd), `${r.classification.mopYears} years after key collection (${r.classification.label}).`)}
      </tbody>
    </table></div>`;
}

function loanHTML(r) {
  const L = r.loan;
  if (L.type === 'none') return '<p>No loan: the whole balance is paid from CPF OA and cash at key collection.</p>';
  const covered = L.oaMonthly >= L.monthly
    ? `Yes: about ${wholeMoney(L.oaMonthly - L.monthly)} a month to spare`
    : `No: about ${wholeMoney(L.monthly - L.oaMonthly)} a month in cash`;
  const rows = [
    ['Most you could borrow', `${wholeMoney(L.max)} (limited by ${L.limitedBy})`],
    ['Loan in this plan', `${wholeMoney(L.amount)}${L.amount < L.max - 0.5 ? ' (CPF OA is used first)' : ''}`],
    ['Loan limit', `${pct(L.ltv)} of the price`],
    ['Tenure', `${L.tenure} years`],
    ['Interest rate', `${L.rate}% a year (affordability checked at ${L.assessRate}%)`],
    ['Monthly instalment', money(L.monthly)],
    ['Monthly CPF OA contributions at key collection', money(L.oaMonthly)],
    ['Can CPF contributions cover the instalment?', covered],
    ['Total interest over the loan', wholeMoney(L.totalInterest)],
  ];
  return `<div class="limits"><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>`;
}

function ballotHTML(r) {
  const B = r.ballot;
  const priority = B.ftPmc && r.classification.key === 'standard' && ['2rf', '3rm', '4rm'].includes(r.flat.key)
    ? ' You get first priority under the Family and Parenthood Priority Scheme for this 4-room-or-smaller Standard flat.'
    : B.fpps ? ` You can also apply under the Family and Parenthood Priority Scheme (up to ${pct(HDB_DATA.ballot.fppsShare)} of flats).` : '';
  return `<p><strong>${B.chances} ballot chance${B.chances === 1 ? '' : 's'}</strong>: ${B.parts.join('; ')}.${priority}</p>
    <p class="hint">Check the live application rates on the HDB Flat Portal during the launch: HDB suggests projects at a rate of about 1 or lower.</p>`;
}

function recoveryHTML(r) {
  if (!r.classification.subsidyRecovery) return '';
  const rate = r.recovery;
  return `<h3>Selling a ${r.classification.label} flat later</h3>
    <p>You can sell after ${r.classification.mopYears} years, and never rent out the whole flat. When you sell, you pay HDB
    ${rate ? `<strong>${rate}%</strong> of the resale price or valuation (whichever is higher): ${wholeMoney(rate * 1000)}
    for every $100,000 of resale price` : 'a share of the resale price set for the project at launch (enter it above to see it)'}.</p>`;
}

function footnoteHTML(r) {
  return `<p class="footnote">An estimate, not advice. Dates assume booking ${BTO_CONFIG.assumptions.bookingMonthsAfterLaunch} months
    after the launch and the AFL ${BTO_CONFIG.assumptions.aflMonthsAfterBooking} months after booking (HDB allows up to
    ${HDB_DATA.timeline.aflWithinMonthsOfBooking}). Income is today's monthly salaries; HDB uses the 12-month average before the HFE
    application. CPF OA grows with contributions at CPF's rates (Singapore Citizen rates, salary up to
    ${wholeMoney(CPF_DATA.contributions.owCeiling)} a month, no bonuses) and ${CPF_DATA.interest.base.oa}% interest. The grant is
    paid into the first-timers' OA at ${r.grant.stage === 'keys' ? 'key collection' : 'the AFL signing'}. CPF OA is used before the
    loan and before cash. Fees assume HDB acts for you. Not included: fire insurance and Home Protection Scheme premiums,
    resale levy, and moving costs. Figures from HDB and CPF are in the <a href="data.html">Data &amp; sources</a> page.</p>`;
}

function render(r) {
  byId('results').innerHTML = `
    <h2>Your plan</h2>
    ${statusHTML(r)}
    ${cardsHTML(r)}
    <div class="actions">
      <button type="button" id="copyLink">Copy link to this plan</button>
      <button type="button" id="print">Print or save as PDF</button>
      <span id="actionStatus" class="hint" role="status"></span>
    </div>
    <h3>Payment timeline</h3>
    ${timelineHTML(r)}
    <h3>Loan${{ hdb: ': HDB housing loan', bank: ': bank loan' }[r.loan.type] ?? ''}</h3>
    ${loanHTML(r)}
    <h3>Ballot</h3>
    ${ballotHTML(r)}
    ${recoveryHTML(r)}
    ${footnoteHTML(r)}`;
  byId('copyLink').addEventListener('click', async () => {
    const status = byId('actionStatus');
    try {
      await navigator.clipboard.writeText(location.href);
      status.textContent = 'Link copied. Anyone with it can see the numbers you entered.';
    } catch {
      status.textContent = 'Copy the address from the address bar to share this plan.';
    }
  });
  byId('print').addEventListener('click', () => window.print());
}

function calculate() {
  if (!validate()) return false;
  const now = new Date();
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(n => String(n).padStart(2, '0')).join('-');
  render(plan(readForm(), today));
  history.replaceState(null, '', `#${formToHash()}`); // the address is now a link to this plan
  return true;
}

form.addEventListener('submit', e => {
  e.preventDefault();
  if (calculate()) byId('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Fill the form from a shared link, if any, and show its plan.
function loadFromAddress() {
  if (location.hash.length > 1) hashToForm(location.hash.slice(1));
  else setDefaults();
  syncForm();
  if (location.hash.length > 1) calculate();
}
window.addEventListener('hashchange', loadFromAddress);
loadFromAddress();
