// HDB DATABASE: every HDB (and MAS) figure and rule the BTO planner uses.
// Data only: no calculations here (those are in engine.js). CPF figures
// (contribution rates, OA interest) are in the CPF Forecast Calculator's
// cpf-data.js, which the pages load from its site.
//
// Each section says where its figures come from (`source`) and when they were
// last checked against that source (`verified`). The "Data & sources" page
// (data.html) shows every section, so it can be reviewed without reading code.
//
// To update: when HDB announces a change, edit the figures below, update
// `verified`, and check the page. Nothing else in the app needs to change.
// - Sales exercises: HDB announces each one, and the next, at every launch.
// - Income ceilings and grants: usually change at the National Day Rally or Budget.
// - HDB loan rate: reviewed every quarter (CPF OA rate + 0.1%).
// - Subsidy recovery rates: set per Plus/Prime project at each launch.
const HDB_DATA = {
  salesExercises: {
    title: 'Sales exercises',
    about: 'BTO launches and the date to submit all HFE letter documents by, to be sure of getting the letter in time.',
    source: [
      { label: 'HDB: November 2026 BTO launch', url: 'https://www.hdb.gov.sg/hdb-pulse/news/2026/hdb-launches-7964-flats-across-seven-projects-in-nov-2026-bto-sales-exercise' },
    ],
    verified: '2026-11-06',
    // `month` is 'YYYY-MM'. `hfeDocsBy`: HDB's recommended date to submit all
    // documents for the HFE letter.
    list: [
      { month: '2026-11', label: 'November 2026', hfeDocsBy: '2026-09-25', flats: 7964,
        towns: 'Bedok, Geylang, Sembawang, Tengah, Toa Payoh, Yishun' },
      { month: '2027-02', label: 'February 2027', hfeDocsBy: '2026-12-15', flats: 4300,
        towns: 'Bishan, Tampines, Tengah, Toa Payoh' },
    ],
  },

  eligibility: {
    title: 'Eligibility (couples and families)',
    about: 'Who can buy a new flat from HDB as a couple: fiancé/fiancée or married.',
    source: [
      { label: 'HDB: eligibility for couples and families', url: 'https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families' },
    ],
    verified: '2026-11-06',
    minAge: 21,                  // applicants; a younger fiancé(e) can only be a core occupier
    privatePropertyWaitMonths: 30, // no private home owned, or sold within this many months of the HFE application
    citizenPremium: 10000,       // first-timer household of 1 SC + SPR(s); refunded later as a Citizen Top-Up
    solemniseWithinMonths: 3,    // fiancé/fiancée couples: marry within this many months of completing the purchase
    sellExistingWithinMonths: 6, // existing HDB flat owners: sell within this many months of key collection
    moveInWithinMonths: 6,       // everyone listed must live in the flat within this many months of key collection
  },

  incomeCeilings: {
    title: 'Income ceilings',
    about: 'Highest average gross monthly household income allowed, for HFE letters applied for from the date shown. Income is averaged over the 12 months ending 2 months before the HFE application.',
    source: [
      { label: 'HDB: increase in income ceilings (22 Aug 2026)', url: 'https://www.hdb.gov.sg/hdb-pulse/news/2026/increase-in-income-ceilings-and-greater-support-for-families-with-children' },
      { label: 'HDB: housing loan from HDB', url: 'https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/housing-loan/housing-loan-from-hdb' },
    ],
    verified: '2026-11-06',
    from: '2026-08-24',
    families: 16000,          // new flat and HDB housing loan
    extendedFamilies: 24000,  // buying with extended or multi-generation family
    singles: 8000,            // singles aged 35+ (not modelled in the planner)
    previous: { families: 14000, singles: 7000 },
  },

  flatTypes: {
    title: 'Flat types',
    about: 'Flat types the planner covers, with the option fee paid at booking and the survey fee paid at key collection. Some 3-room projects have a lower income ceiling: the launch press release says which.',
    source: [
      { label: 'HDB: booking of flat (option fee)', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/booking-of-flat' },
      { label: 'HDB: key collection (survey fee)', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/key-collection' },
    ],
    verified: '2026-11-06',
    list: [
      { key: '2rf', label: '2-room Flexi (99-year lease)', optionFee: 500, surveyFee: 163.50, incomeCeiling: 8000 },
      { key: '3rm', label: '3-room', optionFee: 1000, surveyFee: 231.60, incomeCeiling: 16000, lowerCeilingInSomeProjects: 8000 },
      { key: '4rm', label: '4-room', optionFee: 2000, surveyFee: 299.75, incomeCeiling: 16000 },
      { key: '5rm', label: '5-room', optionFee: 2000, surveyFee: 354.25, incomeCeiling: 16000 },
    ],
  },

  classifications: {
    title: 'Standard, Plus and Prime',
    about: 'Every BTO project from October 2024 is classified by location. Plus and Prime flats get more subsidy, so they have a longer minimum occupation period (MOP), can never be rented out whole, and pay part of the resale price back to HDB when sold.',
    source: [
      { label: 'HDB: Standard, Plus and Prime housing framework', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/finding-a-new-flat/standard-plus-and-prime-housing-framework' },
    ],
    verified: '2026-11-06',
    list: [
      { key: 'standard', label: 'Standard', mopYears: 5, subsidyRecovery: false, rentWholeFlatAfterMop: true },
      { key: 'plus', label: 'Plus', mopYears: 10, subsidyRecovery: true, rentWholeFlatAfterMop: false },
      { key: 'prime', label: 'Prime', mopYears: 10, subsidyRecovery: true, rentWholeFlatAfterMop: false },
    ],
  },

  subsidyRecovery: {
    title: 'Subsidy recovery rates',
    about: 'Plus and Prime flats bought from HDB pay this % of the resale price or valuation (whichever is higher) to HDB when sold. Set per project at each launch.',
    source: [
      { label: 'HDB: November 2026 BTO launch', url: 'https://www.hdb.gov.sg/hdb-pulse/news/2026/hdb-launches-7964-flats-across-seven-projects-in-nov-2026-bto-sales-exercise' },
      { label: 'HDB: February 2026 BTO launch', url: 'https://www.hdb.gov.sg/hdb-pulse/news/2026/hdb-launches-9012-flats-in-february-2026-bto-and-sbf-exercises' },
    ],
    verified: '2026-11-06',
    list: [
      { exercise: 'Feb 2026', project: 'Tampines Nova', classification: 'plus', rate: 6 },
      { exercise: 'Feb 2026', project: 'Redhill Peaks', classification: 'prime', rate: 12 },
      { exercise: 'Nov 2026', project: 'Merpati Meadow', classification: 'plus', rate: 8 },
      { exercise: 'Nov 2026', project: 'Bayshore Sails / Bayshore Oasis', classification: 'plus', rate: 9 },
      { exercise: 'Nov 2026', project: 'Toa Payoh Hillside', classification: 'prime', rate: 11 },
    ],
  },

  grants: {
    title: 'Enhanced CPF Housing Grant (EHG)',
    about: 'For first-timer families. Based on average gross monthly household income over the 12 months ending 2 months before the HFE application, and needs 12 months of continuous work. Paid into the CPF Ordinary Account of the first-timer applicants. A couple of a first-timer and a second-timer gets the EHG (Singles) on half the household income, paid to the first-timer.',
    source: [
      { label: 'HDB: Enhanced CPF Housing Grant (Families)', url: 'https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families/enhanced-cpf-housing-grant' },
      { label: 'HDB: EHG amount table (PDF)', url: 'https://www.hdb.gov.sg/-/media/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families/enhanced-cpf-housing-grant/EHG-amount-Families.pdf' },
    ],
    verified: '2026-11-06',
    employmentMonths: 12,
    // If the grant is more than this share of the price, the buyer still pays
    // the rest (at least 5%) themselves; the excess goes elsewhere in CPF.
    maxShareOfPrice: 0.95,
    // `upTo`: highest income in the band.
    families: [
      { upTo: 1500, amount: 120000 }, { upTo: 2000, amount: 110000 }, { upTo: 2500, amount: 105000 },
      { upTo: 3000, amount: 95000 },  { upTo: 3500, amount: 90000 },  { upTo: 4000, amount: 80000 },
      { upTo: 4500, amount: 70000 },  { upTo: 5000, amount: 65000 },  { upTo: 5500, amount: 55000 },
      { upTo: 6000, amount: 50000 },  { upTo: 6500, amount: 40000 },  { upTo: 7000, amount: 30000 },
      { upTo: 7500, amount: 25000 },  { upTo: 8000, amount: 20000 },  { upTo: 8500, amount: 10000 },
      { upTo: 9000, amount: 5000 },
    ],
    // First-timer + second-timer couple: bands on HALF the household income.
    firstAndSecondTimer: [
      { upTo: 750, amount: 60000 },  { upTo: 1000, amount: 55000 }, { upTo: 1250, amount: 52500 },
      { upTo: 1500, amount: 47500 }, { upTo: 1750, amount: 45000 }, { upTo: 2000, amount: 40000 },
      { upTo: 2250, amount: 35000 }, { upTo: 2500, amount: 32500 }, { upTo: 2750, amount: 27500 },
      { upTo: 3000, amount: 25000 }, { upTo: 3250, amount: 20000 }, { upTo: 3500, amount: 15000 },
      { upTo: 3750, amount: 12500 }, { upTo: 4000, amount: 10000 }, { upTo: 4250, amount: 5000 },
      { upTo: 4500, amount: 2500 },
    ],
  },

  hdbLoan: {
    title: 'HDB housing loan',
    about: 'Loan from HDB at a concessionary rate. HDB checks affordability at the higher of the loan rate and an interest rate floor, and checks finances again before the loan is paid out at key collection.',
    source: [
      { label: 'HDB: housing loan from HDB', url: 'https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/housing-loan/housing-loan-from-hdb' },
      { label: 'CPF: HDB loan or bank loan?', url: 'https://www.cpf.gov.sg/member/infohub/educational-resources/3-differences-between-hdb-loan-and-bank-loan' },
    ],
    verified: '2026-11-06',
    rate: 2.6,              // % a year: CPF OA rate + 0.1%, reviewed quarterly
    assessmentFloor: 3.0,   // % a year: affordability is checked at the higher of this and `rate`
    ltv: 0.75,              // highest loan as a share of the price (lease covers youngest to 95)
    msr: 0.30,              // monthly instalment up to this share of gross monthly income
    maxTenureYears: 25,     // loan period: shortest of this, maxAge - average age, lease - leaseBuffer
    maxAge: 65,
    leaseYears: 99,
    leaseBufferYears: 20,
    oaRetention: 20000,     // each applicant may keep up to this in their OA; the rest must go to the flat
  },

  bankLoan: {
    title: 'Bank loan (financial institution)',
    about: 'MAS rules for housing loans from banks on HDB flats. The lower loan limit applies if the tenure is over 25 years or the loan runs past age 65. Affordability is checked at the higher of a medium-term interest rate floor and the loan rate, and all debts count (TDSR).',
    source: [
      { label: 'MAS: loan tenure and loan-to-value limits', url: 'https://www.mas.gov.sg/regulation/explainers/new-housing-loans/loan-tenure-and-loan-to-value-limits' },
      { label: 'MAS: calculating TDSR', url: 'https://www.mas.gov.sg/regulation/explainers/tdsr-for-property-loans/calculating-tdsr' },
      { label: 'HDB: housing loan from financial institutions', url: 'https://www.hdb.gov.sg/buying-a-flat/flat-grant-and-loan-eligibility/housing-loan/housing-loan-from-financial-institutions' },
    ],
    verified: '2026-11-06',
    ltv: 0.75,
    lowerLtv: 0.55,
    fullLtvMaxTenureYears: 25, // HDB flats: over this, the lower LTV applies
    maxAge: 65,                // loan running past this age: the lower LTV applies
    maxTenureYears: 30,        // HDB flats
    msr: 0.30,
    tdsr: 0.55,                // all monthly debt repayments up to this share of gross monthly income
    stressRate: 4.0,           // % a year: medium-term interest rate floor
  },

  paymentSchemes: {
    title: 'Downpayment schedule',
    about: 'Share of the price paid when signing the Agreement for Lease (AFL) and at key collection, and the minimum part of each that must be cash. The rest can come from CPF OA (including grants) or cash. The option fee paid at booking counts towards the AFL payment. Without a loan, the AFL payment is as for an HDB loan and the whole balance is paid at key collection.',
    source: [
      { label: 'HDB: sign Agreement for Lease', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/sign-agreement-for-lease' },
      { label: 'HDB: booking of flat (deferred income assessment)', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/booking-of-flat' },
    ],
    verified: '2026-11-06',
    schemes: [
      { key: 'normal', label: 'Normal', who: 'Everyone not on a scheme below.' },
      { key: 'staggered', label: 'Staggered Downpayment Scheme', maxAge: 30,
        who: 'First-timer couple, or first-timer + second-timer, who apply for the HFE letter on or before the younger applicant\'s 30th birthday, buying an uncompleted 5-room or smaller flat.' },
      { key: 'deferred', label: 'Deferred income assessment', maxAge: 30, withinMonths: 12,
        who: 'At least 1 applicant aged 30 or below at the HFE application, 1 a first-timer, and 1 a full-time student or NSF, or finished studies or NS within 12 months before it. The grant and HDB loan are assessed about 3 months before the flat is completed.' },
    ],
    // Shares of the price. `cash`: minimum paid in cash.
    // Loans: 'hdb' (also used with no loan), 'bank75' and 'bank55' (bank loan LTV).
    schedule: {
      normal: {
        hdb:    { afl: { total: 0.10, cash: 0 },     keys: { total: 0.15, cash: 0 } },
        bank75: { afl: { total: 0.20, cash: 0.05 },  keys: { total: 0.05, cash: 0 } },
        bank55: { afl: { total: 0.20, cash: 0.10 },  keys: { total: 0.25, cash: 0 } },
      },
      staggered: {
        hdb:    { afl: { total: 0.05, cash: 0 },     keys: { total: 0.20, cash: 0 } },
        bank75: { afl: { total: 0.10, cash: 0.05 },  keys: { total: 0.15, cash: 0 } },
        bank55: { afl: { total: 0.10, cash: 0.10 },  keys: { total: 0.35, cash: 0 } },
      },
      deferred: {
        hdb:    { afl: { total: 0.025, cash: 0 },     keys: { total: 0.225, cash: 0 } },
        bank75: { afl: { total: 0.025, cash: 0.025 }, keys: { total: 0.225, cash: 0.025 } },
        bank55: { afl: { total: 0.025, cash: 0.025 }, keys: { total: 0.425, cash: 0.075 } },
      },
    },
  },

  fees: {
    title: 'Stamp duty and legal fees',
    about: 'Paid at the AFL signing (stamp duty, legal fee for the purchase) and at key collection (survey fee, registration fees, and with an HDB loan the mortgage legal fee and stamp duty on the Deed of Assignment). All can be paid from CPF OA. Assumes HDB acts for you; with a bank loan, your law firm\'s fees are extra.',
    source: [
      { label: 'HDB: sign Agreement for Lease', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/sign-agreement-for-lease' },
      { label: 'HDB: key collection', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/key-collection' },
      { label: 'MyNiceHome: option fee paid in cash', url: 'https://www.mynicehome.gov.sg/get-started/hdb-bto-sbf-buying-guide/' },
    ],
    verified: '2026-11-06',
    applicationFee: 10,       // per application, non-refundable
    optionFeeInCash: true,
    // Buyer's stamp duty on the AFL, by tier of the price. `upTo`: top of the tier.
    stampDuty: [
      { upTo: 180000, rate: 1 }, { upTo: 360000, rate: 2 },
      { upTo: 1000000, rate: 3 }, { upTo: Infinity, rate: 4 },
    ],
    // HDB legal fee, $ per $1,000, by tier of the price (purchase) or loan
    // (mortgage). Rounded up to the next dollar, then GST added.
    legalFee: [
      { upTo: 30000, perThousand: 0.90 }, { upTo: 60000, perThousand: 0.72 },
      { upTo: Infinity, perThousand: 0.60 },
    ],
    gst: 9,                   // %
    legalFeeMin: 21.80,       // including GST
    leaseRegistration: 38.30,
    mortgageRegistration: 38.30,
    deedOfAssignment: { rate: 0.4, max: 500 }, // % of the HDB loan, capped
  },

  timeline: {
    title: 'Timeline limits',
    about: 'Time limits HDB sets between stages, and the waiting time for new projects.',
    source: [
      { label: 'HDB: application for a new flat', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/application' },
      { label: 'HDB: sign Agreement for Lease', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/sign-agreement-for-lease' },
      { label: 'HDB: November 2026 BTO launch', url: 'https://www.hdb.gov.sg/hdb-pulse/news/2026/hdb-launches-7964-flats-across-seven-projects-in-nov-2026-bto-sales-exercise' },
    ],
    verified: '2026-11-06',
    applicationDays: 8,
    ballotResultsWithinMonths: 2,
    aflWithinMonthsOfBooking: 9,
    takeKeysWithinMonths: 1,       // after HDB's notice; later means daily interest
    waitYears: 4,                  // Nov 2026: most projects under 4 years
    shorterWaitYears: 3,           // Shorter Waiting Time (SWT) projects: under 3 years
  },

  ballot: {
    title: 'Ballot chances',
    about: 'Chances in the computer ballot. FT(PMC): first-timer families with a Singapore Citizen child aged 18 or below (or expecting), or married couples aged 40 and below, who have never owned a home and had no chance to book a flat in the last 5 years. After 2 or more unsuccessful applications for Standard flats, first-timer families get 1 more chance for each further Standard application, up to a cap. A couple of a first-timer and a second-timer counts as a first-timer family.',
    source: [
      { label: 'HDB: priority schemes', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/application/priority-schemes' },
      { label: 'HDB: increase in income ceilings (22 Aug 2026)', url: 'https://www.hdb.gov.sg/hdb-pulse/news/2026/increase-in-income-ceilings-and-greater-support-for-families-with-children' },
    ],
    verified: '2026-11-06',
    chances: { ftPmc: 3, firstTimer: 2, secondTimer: 1 },
    caps: { ftPmc: 5, firstTimer: 4 },
    extraAfterUnsuccessful: 2,   // extra chances start after this many unsuccessful Standard applications
    ftPmcMaxAge: 40,
    // From this sales exercise: +1 chance per Singapore Citizen child aged 18
    // or below, for first-timer families with or expecting children.
    childChanceFrom: '2027-02',
    childMaxAge: 18,
    fppsShare: 0.40,             // up to this share of BTO public supply for FPPS families
  },

  cancellation: {
    title: 'Cancelling or not booking',
    about: 'What is lost at each stage. A non-selection count is waived if 10 or fewer BTO flats were left to choose from.',
    source: [
      { label: 'HDB: application for a new flat (cancellation)', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/application' },
      { label: 'HDB: key collection', url: 'https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/key-collection' },
    ],
    verified: '2026-11-06',
    forfeitAfterAfl: 0.05,       // share of the price lost if cancelled after signing the AFL
    waiveNonSelectionUpToFlats: 10,
    list: [
      { stage: 'During the application window', forfeit: 'Nothing', consequence: 'None.' },
      { stage: 'Invited to book but did not book', forfeit: 'Nothing',
        consequence: 'Non-selection count: first-timer families are treated as second-timers for 1 year and lose extra ballot chances built up; others cannot apply for 1 year.' },
      { stage: 'After booking, before signing the AFL', forfeit: 'Option fee',
        consequence: 'Wait 1 year before applying again; extra ballot chances reset to 0.' },
      { stage: 'After signing the AFL, before key collection', forfeit: '5% of the price',
        consequence: 'Wait 1 year. Stamp duty may be refunded by IRAS; legal fees are not.' },
      { stage: 'Not collecting the keys', forfeit: 'Option fee and 5% of the price',
        consequence: 'CPF housing grants must be returned with interest.' },
    ],
  },
};
