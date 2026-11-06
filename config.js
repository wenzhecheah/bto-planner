// App settings: no HDB or CPF figures here (those are in hdb-data.js and cpf-data.js).
const BTO_CONFIG = {
  // Planning assumptions (not HDB rules): when each stage is expected to happen.
  assumptions: {
    // HFE letter applied for this many months before the launch, when the
    // launch isn't in HDB_DATA.salesExercises (which gives HDB's own date).
    hfeMonthsBeforeLaunch: 2,
    // Booking this many months after the launch (ballot results come within 2).
    bookingMonthsAfterLaunch: 3,
    // AFL signed this many months after booking (HDB's limit is 9).
    aflMonthsAfterBooking: 6,
  },

  // Form defaults: the form lets the user change all of these.
  flatType: '4rm',
  classification: 'standard',
  subsidyRecovery: 0,   // %, for Plus and Prime: from the launch press release
  waitYears: 4,
  loanType: 'hdb',      // 'hdb', 'bank' or 'none'
  bankRate: 2.6,        // % a year: the bank's quoted rate
  bankTenure: 25,       // years
  keepOA: false,        // keep up to the OA retention amount in each OA
  status: 'married',    // 'married' or 'fiance'
  children: 0,          // Singapore Citizen children aged 18 or below
  expecting: false,
  student: false,       // one of you is a student or NSF, or finished within 12 months
  worked12: true,       // at least one of you has worked continuously for 12 months
  privateProperty: false,
  unsuccessful: 0,      // earlier unsuccessful applications for Standard flats
  otherDebts: 0,        // monthly repayments on other loans
  cashMonthly: 0,       // cash saved each month
};
