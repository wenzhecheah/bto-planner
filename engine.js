// The BTO plan: eligibility, grant, loan, payment schedule, CPF OA and cash at
// each stage, and ballot chances. No page code here, so it can be tested on
// its own (see tests/). Reads HDB_DATA (hdb-data.js), CPF_DATA and
// getMonthlyContribution (cpf-data.js, cpf-lookups.js) and BTO_CONFIG.

// ---- Dates ------------------------------------------------------------------

// Months as numbers (year * 12 + month - 1), so they can be added and compared.
const toMonth = s => { const [y, m] = s.split('-').map(Number); return y * 12 + m - 1; };
const fromMonth = n => `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`;
// Age in whole years on a date, both 'YYYY-MM-DD'.
function ageOn(dob, date) {
  const age = Number(date.slice(0, 4)) - Number(dob.slice(0, 4));
  return date.slice(5) < dob.slice(5) ? age - 1 : age;
}
// Age at the start of month `n` (an approximation good to a month).
const ageAtMonth = (dob, n) => Math.floor((n - toMonth(dob)) / 12);

// Amounts in messages: 9000 -> '$9,000.00'.
const dollars = n => n.toLocaleString('en-SG', { style: 'currency', currency: 'SGD' });

// ---- Fees, grant and loan maths ---------------------------------------------

// Sum of `amount` split into tiers, each tier charged by `charge(part, tier)`.
function tiered(amount, tiers, charge) {
  let below = 0, total = 0;
  for (const t of tiers) {
    const part = Math.min(Math.max(0, amount - below), t.upTo - below);
    total += charge(part, t);
    below = t.upTo;
  }
  return total;
}

// Buyer's stamp duty on the Agreement for Lease, rounded down to the dollar (IRAS).
const stampDuty = price => Math.floor(tiered(price, HDB_DATA.fees.stampDuty, (p, t) => p * t.rate / 100) + 1e-9);

// HDB legal fee on a price or loan: rounded up to the dollar, then GST added.
function legalFee(amount) {
  if (amount <= 0) return 0;
  const { legalFee: tiers, gst, legalFeeMin } = HDB_DATA.fees;
  const fee = Math.ceil(tiered(amount, tiers, (p, t) => p / 1000 * t.perThousand) - 1e-9);
  return Math.max(legalFeeMin, Math.round(fee * (1 + gst / 100) * 100) / 100);
}

// Enhanced CPF Housing Grant for a household ('ft': first-timer couple,
// 'ftst': first-timer + second-timer, 'st': second-timers) on its average
// gross monthly income. 0 if above the ceiling.
function ehg(household, income) {
  const { families, firstAndSecondTimer } = HDB_DATA.grants;
  if (household === 'ft') return families.find(b => income <= b.upTo)?.amount ?? 0;
  if (household === 'ftst') return firstAndSecondTimer.find(b => income / 2 <= b.upTo)?.amount ?? 0;
  return 0;
}

// Monthly instalment on a loan, and the loan a monthly instalment pays off.
function instalment(loan, ratePct, years) {
  const r = ratePct / 1200, n = Math.round(years * 12);
  if (loan <= 0 || n <= 0) return 0;
  return r ? loan * r / (1 - (1 + r) ** -n) : loan / n;
}
function loanFor(monthly, ratePct, years) {
  const r = ratePct / 1200, n = Math.round(years * 12);
  if (monthly <= 0 || n <= 0) return 0;
  return r ? monthly * (1 - (1 + r) ** -n) / r : monthly * n;
}

// ---- Who you are --------------------------------------------------------------

// 'ft', 'ftst' or 'st', from each partner's first-timer status.
function household(partners) {
  const ft = partners.filter(p => p.firstTimer).length;
  return ft === partners.length ? 'ft' : ft ? 'ftst' : 'st';
}

// Downpayment scheme: 'deferred', 'staggered' or 'normal'. `hfeDate` is the
// HFE letter application date ('YYYY-MM-DD').
function paymentScheme(partners, hfeDate, student) {
  if (household(partners) === 'st') return 'normal';
  const youngest = partners.map(p => p.dob).sort().pop();
  const [, staggered, deferred] = HDB_DATA.paymentSchemes.schemes;
  if (student && ageOn(youngest, hfeDate) <= deferred.maxAge) return 'deferred';
  // On or before the younger applicant's 30th birthday.
  const birthday = `${Number(youngest.slice(0, 4)) + staggered.maxAge}${youngest.slice(4)}`;
  return hfeDate <= birthday ? 'staggered' : 'normal';
}

// Ballot chances for this application, with what they're made of.
function ballotChances(inp) {
  const B = HDB_DATA.ballot;
  const h = household(inp.partners);
  if (h === 'st') return { chances: B.chances.secondTimer, ftPmc: false, parts: ['Second-timer family: 1 chance'] };
  const ages = inp.partners.map(p => ageOn(p.dob, `${inp.launch}-01`));
  const young = inp.status === 'married' && ages.every(a => a <= B.ftPmcMaxAge);
  const ftPmc = h === 'ft' && (inp.children > 0 || inp.expecting || young);
  const base = ftPmc ? B.chances.ftPmc : B.chances.firstTimer;
  const cap = ftPmc ? B.caps.ftPmc : B.caps.firstTimer;
  const parts = [ftPmc ? `First-Timer (Parents & Married Couples): ${base} chances`
    : `First-timer family: ${base} chances`];
  let chances = base;
  if (inp.classification === 'standard' && inp.unsuccessful >= B.extraAfterUnsuccessful) {
    const extra = Math.min(inp.unsuccessful - B.extraAfterUnsuccessful + 1, cap - base);
    chances += extra;
    parts.push(`+${extra} after ${inp.unsuccessful} unsuccessful Standard applications (capped at ${cap})`);
  }
  if (inp.launch >= B.childChanceFrom && inp.children > 0) {
    chances += inp.children;
    parts.push(`+${inp.children} for Singapore Citizen children aged ${B.childMaxAge} or below`);
  }
  const fpps = h === 'ft' && (inp.children > 0 || inp.expecting);
  return { chances, ftPmc, fpps, parts };
}

// ---- The plan -------------------------------------------------------------------

// inputs: {
//   partners: [{ dob, salary, oa, citizen: 'sc'|'spr', firstTimer }] (two),
//   status: 'married'|'fiance', children, expecting, student, worked12,
//   privateProperty, unsuccessful, otherDebts,
//   flatType, classification, price, subsidyRecovery (%), launch ('YYYY-MM'), waitYears,
//   loanType: 'hdb'|'bank'|'none', bankRate, bankTenure, keepOA,
//   cash, cashMonthly, wedding, weddingMonth ('YYYY-MM' or ''), reno }
// today: 'YYYY-MM-DD'. Balances entered are today's.
function plan(inp, today) {
  const A = BTO_CONFIG.assumptions;
  const issues = [], warnings = [];
  const h = household(inp.partners);
  const income = inp.partners.reduce((s, p) => s + p.salary, 0);
  const flat = HDB_DATA.flatTypes.list.find(f => f.key === inp.flatType);
  const cls = HDB_DATA.classifications.list.find(c => c.key === inp.classification);
  const price = inp.price;

  // When each stage happens (months).
  const exercise = HDB_DATA.salesExercises.list.find(e => e.month === inp.launch);
  const launch = toMonth(inp.launch);
  const hfeDate = exercise?.hfeDocsBy ?? `${fromMonth(launch - A.hfeMonthsBeforeLaunch)}-01`;
  const keys = launch + Math.round(inp.waitYears * 12);
  const booking = Math.min(launch + A.bookingMonthsAfterLaunch, keys);
  const afl = Math.min(booking + A.aflMonthsAfterBooking, keys);
  const dates = { hfe: hfeDate, launch: inp.launch, booking: fromMonth(booking), afl: fromMonth(afl),
                  keys: fromMonth(keys), mopEnd: fromMonth(keys + cls.mopYears * 12) };
  if (!exercise) warnings.push(`${inp.launch} is not a sales exercise in the database, so the HFE date (${hfeDate}) is an estimate.`);
  if (hfeDate < today) warnings.push(`The date to submit HFE documents for this launch (${hfeDate}) has passed. Apply now, or plan for a later launch.`);

  // Eligibility.
  const E = HDB_DATA.eligibility;
  const ages = inp.partners.map(p => ageOn(p.dob, hfeDate));
  if (!inp.partners.some(p => p.citizen === 'sc')) issues.push('At least one of you must be a Singapore Citizen to buy a new flat.');
  if (ages.every(a => a < E.minAge)) issues.push(`At least one of you must be ${E.minAge} or older at the HFE application.`);
  else if (ages.some(a => a < E.minAge)) warnings.push(`A partner under ${E.minAge} can only be listed as an occupier, not an applicant.`);
  if (inp.privateProperty) issues.push(`Neither of you can own a private home, or have sold one in the ${E.privatePropertyWaitMonths} months before the HFE application.`);
  if (income > flat.incomeCeiling) issues.push(`Household income of ${dollars(income)} a month is above the ${flat.label} ceiling of ${dollars(flat.incomeCeiling)}.`);
  else if (flat.lowerCeilingInSomeProjects && income > flat.lowerCeilingInSomeProjects) {
    warnings.push(`Some 3-room projects cap income at ${dollars(flat.lowerCeilingInSomeProjects)} a month: check the launch details.`);
  }
  const mixed = h === 'ft' && inp.partners.some(p => p.citizen === 'sc') && inp.partners.some(p => p.citizen === 'spr');
  if (h === 'st') warnings.push('As second-timers you get 1 ballot chance, no EHG, and pay a resale levy (in cash) at key collection: HDB tells you the amount at booking.');
  if (inp.status === 'fiance') warnings.push(`Fiancé/fiancée couples must marry within ${E.solemniseWithinMonths} months of completing the purchase.`);

  // Grant: the EHG, paid into the first-timers' OA at the AFL (at key
  // collection with deferred income assessment).
  const scheme = paymentScheme(inp.partners, hfeDate, inp.student);
  const G = HDB_DATA.grants;
  let grant = ehg(h, income);
  if (grant && !inp.worked12) { grant = 0; warnings.push(`No EHG: one of you must have worked continuously for ${G.employmentMonths} months before the HFE application.`); }
  if (!grant && h !== 'st' && inp.worked12) warnings.push(`No EHG: household income is above the grant ceiling of ${dollars(G.families[G.families.length - 1].upTo)} a month.`);
  const grantUsed = Math.min(grant, price * G.maxShareOfPrice);
  const grantStage = scheme === 'deferred' ? 'keys' : 'afl';

  // Loan: the most that can be borrowed, by price (LTV) and by income.
  const L = inp.loanType === 'bank' ? HDB_DATA.bankLoan : HDB_DATA.hdbLoan;
  const avgAge = ages.reduce((s, a) => s + a, 0) / ages.length;
  let loan = { type: inp.loanType, max: 0, tenure: 0, rate: 0, assessRate: 0, ltv: 0, limitedBy: '' };
  let row = 'hdb';
  if (inp.loanType === 'hdb') {
    const tenure = Math.max(0, Math.min(L.maxTenureYears, L.maxAge - Math.round(avgAge), L.leaseYears - L.leaseBufferYears));
    const assessRate = Math.max(L.rate, L.assessmentFloor);
    const byIncome = loanFor(income * L.msr, assessRate, tenure);
    loan = { ...loan, tenure, rate: L.rate, assessRate, ltv: L.ltv,
             max: Math.min(price * L.ltv, byIncome), limitedBy: byIncome < price * L.ltv ? 'income (MSR)' : 'price (LTV)' };
    if (inp.otherDebts > 0) warnings.push('HDB also looks at your other loans when deciding the HDB loan amount; this plan uses the 30% income limit only.');
  } else if (inp.loanType === 'bank') {
    // MAS uses the income-weighted average age for joint loans.
    const wAge = income ? inp.partners.reduce((s, p, i) => s + p.salary * ages[i], 0) / income : avgAge;
    const tenure = Math.min(inp.bankTenure, L.maxTenureYears);
    const full = tenure <= L.fullLtvMaxTenureYears && wAge + tenure <= L.maxAge;
    const ltv = full ? L.ltv : L.lowerLtv;
    row = full ? 'bank75' : 'bank55';
    const assessRate = Math.max(inp.bankRate, L.stressRate);
    const byMsr = loanFor(income * L.msr, assessRate, tenure);
    const byTdsr = loanFor(Math.max(0, income * L.tdsr - inp.otherDebts), assessRate, tenure);
    const limits = [[price * ltv, 'price (LTV)'], [byMsr, 'income (MSR)'], [byTdsr, 'all debts (TDSR)']].sort((a, b) => a[0] - b[0]);
    loan = { ...loan, tenure, rate: inp.bankRate, assessRate, ltv, max: limits[0][0], limitedBy: limits[0][1] };
    if (!full) warnings.push(`Bank loan limited to ${L.lowerLtv * 100}% of the price: the tenure is over ${L.fullLtvMaxTenureYears} years or runs past age ${L.maxAge}.`);
    warnings.push('With a bank loan, a private law firm acts for you: its fees are not included. A bank loan cannot be switched back to an HDB loan later.');
  }
  if (inp.loanType !== 'none' && loan.tenure <= 0) issues.push('Too old for a loan on these rules: the loan would have to end by 65.');

  // The payment schedule: what's due at each stage, and the minimum in cash.
  const sched = HDB_DATA.paymentSchemes.schedule[scheme][row];
  const F = HDB_DATA.fees;
  const aflShare = sched.afl.total * price;
  const premium = mixed ? E.citizenPremium : 0;
  const events = [
    { key: 'booking', label: 'Book a flat', month: booking, items: [
      { label: 'Option fee (part of the downpayment)', amount: flat.optionFee, cashOnly: true }] },
    { key: 'afl', label: 'Sign the Agreement for Lease', month: afl, minCash: Math.max(0, sched.afl.cash * price - flat.optionFee), items: [
      { label: `Downpayment: ${+(sched.afl.total * 100).toFixed(1)}% of the price, less the option fee`, amount: Math.max(0, aflShare - flat.optionFee) },
      { label: 'Stamp duty', amount: stampDuty(price) },
      { label: 'Legal fee for the purchase', amount: legalFee(price) },
      ...(premium ? [{ label: 'Premium for a Singapore Citizen + SPR household', amount: premium, cashOnly: true }] : [])] },
    { key: 'keys', label: 'Collect the keys', month: keys, minCash: sched.keys.cash * price, items: [] },
  ];
  if (inp.wedding > 0) {
    const m = inp.weddingMonth ? toMonth(inp.weddingMonth) : booking;
    events.push({ key: 'wedding', label: 'Wedding', month: m, items: [{ label: 'Wedding', amount: inp.wedding, cashOnly: true }] });
  }
  events.sort((a, b) => a.month - b.month || (a.key === 'wedding') - (b.key === 'wedding'));

  // Walk month by month from today: OA grows with contributions and interest,
  // cash with monthly savings; each stage is paid as it comes.
  const oaRate = CPF_DATA.interest.base.oa;
  const retain = inp.keepOA ? HDB_DATA.hdbLoan.oaRetention : 0;
  const oa = inp.partners.map(p => p.oa);
  let cash = inp.cash;
  let month = toMonth(today);
  const firstTimers = inp.partners.map(p => h === 'st' ? false : p.firstTimer);
  const usable = () => oa.reduce((s, b) => s + Math.max(0, b - retain), 0);
  // Take up to `amount` from the OAs, in proportion to what each can give.
  function fromOA(amount) {
    const total = usable();
    const take = Math.min(amount, total);
    oa.forEach((b, i) => { oa[i] -= total ? take * Math.max(0, b - retain) / total : 0; });
    return take;
  }
  function advanceTo(target) {
    for (; month < target; month++) {
      const m = month + 1, year = Math.floor(m / 12);
      inp.partners.forEach((p, i) => {
        oa[i] = oa[i] * (1 + oaRate / 1200) + getMonthlyContribution(p.salary, ageAtMonth(p.dob, m), year).oa;
      });
      cash += inp.cashMonthly;
    }
  }

  let loanAmount = 0;
  for (const ev of events) {
    advanceTo(ev.month);
    ev.date = fromMonth(ev.month);
    ev.grant = 0;
    if (ev.key === grantStage && grantUsed) {
      const n = firstTimers.filter(Boolean).length;
      firstTimers.forEach((ft, i) => { if (ft) oa[i] += grantUsed / n; });
      ev.grant = grantUsed;
    }
    ev.oaBefore = oa.reduce((s, b) => s + b, 0);
    ev.cashBefore = cash;
    if (ev.key === 'keys') {
      // OA is used before the loan (keeping enough for the fees); the loan
      // covers what's left, up to its limit.
      const due = price - aflShare;
      const fees = amount => [
        { label: 'Survey fee', amount: flat.surveyFee },
        { label: 'Lease registration fee', amount: F.leaseRegistration },
        ...(inp.loanType === 'hdb' && amount > 0 ? [
          { label: 'Legal fee for the HDB loan', amount: legalFee(amount) },
          { label: 'Mortgage registration fee', amount: F.mortgageRegistration },
          { label: 'Stamp duty on the Deed of Assignment', amount: Math.min(amount * F.deedOfAssignment.rate / 100, F.deedOfAssignment.max) },
        ] : [])];
      const loanWith = feeTotal => inp.loanType === 'none' ? 0
        : Math.min(loan.max, Math.max(0, due - ev.minCash - Math.max(0, usable() - feeTotal)));
      const sum = list => list.reduce((s, i) => s + i.amount, 0);
      loanAmount = loanWith(sum(fees(loanWith(0)))); // the fees depend a little on the loan: one pass is enough
      const pct = +((due - loanAmount) / price * 100).toFixed(1);
      ev.items.push({ label: inp.loanType === 'none' ? 'Balance of the price' : `Balance of the price not covered by the loan (${pct}%)`, amount: due - loanAmount });
      ev.items.push(...fees(loanAmount));
      if (inp.reno > 0) ev.items.push({ label: 'Renovation and furnishing', amount: inp.reno, cashOnly: true });
    }
    // Pay: cash-only items and the minimum cash first, then OA, then cash.
    const cashOnly = ev.items.filter(i => i.cashOnly).reduce((s, i) => s + i.amount, 0);
    const rest = ev.items.filter(i => !i.cashOnly).reduce((s, i) => s + i.amount, 0);
    const minCash = Math.min(ev.minCash ?? 0, rest);
    ev.fromOA = fromOA(rest - minCash);
    ev.fromCash = cashOnly + rest - ev.fromOA;
    cash -= ev.fromCash;
    ev.total = cashOnly + rest;
    ev.oaAfter = oa.reduce((s, b) => s + b, 0);
    ev.cashAfter = cash;
  }

  // After the keys: the monthly instalment, against monthly OA contributions then.
  const keysYear = Math.floor(keys / 12);
  const oaMonthly = inp.partners.reduce((s, p) => s + getMonthlyContribution(p.salary, ageAtMonth(p.dob, keys), keysYear).oa, 0);
  const monthly = instalment(loanAmount, loan.rate, loan.tenure);
  loan = { ...loan, amount: loanAmount, monthly, oaMonthly,
           totalInterest: monthly * Math.round(loan.tenure * 12) - loanAmount };
  if (scheme === 'deferred') warnings.push('With deferred income assessment, HDB works out the EHG and loan on your income about 3 months before completion. This plan uses today\'s income.');
  if (inp.loanType === 'hdb' && loanAmount > 0) warnings.push('HDB checks your finances again before the loan is paid out. A job change or new loan in the meantime can reduce it.');
  const short = events.find(e => e.cashAfter < -0.5);
  if (short) warnings.unshift(`Cash runs short at "${short.label}" (${short.date}) by ${dollars(-short.cashAfter)}.`);

  return {
    household: h, income, scheme, dates, events, issues, warnings,
    grant: { amount: grant, used: grantUsed, stage: grantStage },
    loan, flat, classification: cls,
    recovery: cls.subsidyRecovery ? inp.subsidyRecovery : 0,
    ballot: ballotChances(inp),
    cashNeeded: events.reduce((s, e) => s + e.fromCash, 0),
    oaUsed: events.reduce((s, e) => s + e.fromOA, 0),
  };
}
