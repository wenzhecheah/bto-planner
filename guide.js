// The guide page: fills figures and tables from the HDB database.
fillHdbText();

const table = (head, rows, cls = '') => `<div class="table-wrap"><table class="${cls}">
  <thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const yes = b => b ? 'Yes' : 'No';

const D = HDB_DATA;
const tables = {
  classifications: () => {
    const rates = c => {
      const list = D.subsidyRecovery.list.filter(r => r.classification === c.key).map(r => r.rate);
      return list.length ? `Yes: ${Math.min(...list)}% to ${Math.max(...list)}% of the resale price in recent launches` : 'Yes';
    };
    return table(['', 'Minimum occupation', 'Pay part of the resale price to HDB', 'Rent out the whole flat after MOP'],
      D.classifications.list.map(c => [c.label, `${c.mopYears} years`, c.subsidyRecovery ? rates(c) : 'No', yes(c.rentWholeFlatAfterMop)]),
      'text-table');
  },
  ehg: () => {
    // Two matching tables side by side (stacked on phones), so each half reads on its own.
    const bands = D.grants.families;
    const half = Math.ceil(bands.length / 2);
    const label = (b, i) => i === 0 ? `Up to ${money(b.upTo)}` : `${money(bands[i - 1].upTo + 1)} to ${money(b.upTo)}`;
    const rows = bands.map((b, i) => [label(b, i), money(b.amount)]);
    const head = ['Average household income a month', 'Grant'];
    return `<div class="ehg-pair">${table(head, rows.slice(0, half), 'ehg')}${table(head, rows.slice(half), 'ehg')}</div>`;
  },
  schedule: () => {
    const S = D.paymentSchemes.schedule;
    const row = (label, s) => [label, pct(s.afl.total) + (s.afl.cash ? ` (at least ${pct(s.afl.cash)} cash)` : ''),
      pct(s.keys.total) + (s.keys.cash ? ` (at least ${pct(s.keys.cash)} cash)` : '')];
    return table(['', 'At the Agreement for Lease', 'At key collection'], [
      row('HDB loan', S.normal.hdb), row('HDB loan, younger applicant under 30 (Staggered Downpayment)', S.staggered.hdb),
      row('Bank loan', S.normal.bank75), row('Bank loan, under 30 (Staggered Downpayment)', S.staggered.bank75)],
      'text-table') + `<p class="hint">Shares of the price paid by you, from CPF OA or cash unless shown. The rest is the loan. Without a loan, the balance is paid at key collection. Stamp duty and legal fees are paid at the Agreement for Lease, and can come from CPF OA.</p>`;
  },
  loans: () => {
    const H = D.hdbLoan, K = D.bankLoan;
    return table(['', 'HDB loan', 'Bank loan'], [
      ['Interest', `${H.rate}% a year, reviewed every quarter`, 'Set by the bank, fixed or floating'],
      ['Most you can borrow', `${pct(H.ltv)} of the price`, `${pct(K.ltv)} (${pct(K.lowerLtv)} if over ${K.fullLtvMaxTenureYears} years or past age ${K.maxAge})`],
      ['Cash needed upfront', 'None: CPF OA can pay it all', 'At least 5% of the price'],
      ['Income ceiling', money(D.incomeCeilings.families), 'None'],
      ['Affordability check', `Instalment up to ${pct(H.msr)} of income, at ${H.assessmentFloor}%`, `Up to ${pct(K.msr)} of income, all debts up to ${pct(K.tdsr)}, at ${K.stressRate}%`],
      ['Longest loan', `${H.maxTenureYears} years, ending by ${H.maxAge}`, `${K.maxTenureYears} years`],
      ['CPF OA', `Must be used first; you may keep ${money(H.oaRetention)} each`, 'Your choice'],
    ], 'text-table');
  },
  cancellation: () => table(['When', 'You lose', 'What happens'],
    D.cancellation.list.map(c => [c.stage, c.forfeit, c.consequence]), 'text-table'),
};
document.querySelectorAll('[data-table]').forEach(el => { el.innerHTML = tables[el.dataset.table](); });
