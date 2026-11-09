# BTO Planner

A Voyage Wealth Advisory tool for couples buying a BTO flat: what they'll pay,
when, and whether it comes from CPF, the grant, the loan or cash.

Open `index.html` in a browser. There is no install or build step, and nothing
entered leaves the browser.

## Pages

- **How BTO works** (`index.html`): the journey from HFE letter to the end of
  the minimum occupation period, explained for couples, with grants, loans,
  ballot chances and penalties.
- **Planner** (`planner.html`): enter both partners, the flat and the loan. It
  shows eligibility, the payment scheme (normal, Staggered Downpayment or
  deferred income assessment), the EHG, the loan and instalment, and a timeline
  of what's paid at booking, the Agreement for Lease, the wedding and key
  collection, with CPF OA and cash left after each. Plans can be shared as a
  link or printed.
- **Data & sources** (`data.html`): every HDB and CPF figure the app uses, with
  its source and when it was last checked. Sections not checked for 6 months are
  marked as due.

## The database

| File | What's in it |
|---|---|
| `hdb-data.js` | HDB and MAS figures: launches, income ceilings, grants, loans, payment schedules, fees, ballot rules. Each section has `source` links and a `verified` date. |
| CPF figures | CPF contribution rates and OA interest come from the CPF Forecast Calculator's `cpf-data.js` and `cpf-lookups.js`, which the pages load from its site. Update CPF figures there only: both apps pick them up. |
| `config.js` | Planning assumptions (e.g. booking 3 months after launch) and form defaults. No official figures. |

To update a figure: change it in `hdb-data.js`, update that section's
`verified` date, and check the Data & sources page. The guide, planner and data
page all read from the database, so nothing else needs to change.

## Code

- `engine.js`: all calculations (no page code), tested in `tests/`.
- `planner.js`, `guide.js`, `data.js`: one per page. `common.js`: shared helpers.
- `style.css`: the CPF Forecast Calculator's styles, with BTO additions at the end.

Run the tests (Node 18 or later). They need the CPF Forecast Calculator
cloned next to this repo (`../cpf-forecast-calculator`), or its folder set in
`CPF_DIR`:

```
node --test
```

## Accuracy and limits

This is an estimate, not advice. In particular:

- Couples (married or engaged) buying a new 2- to 5-room flat only: not singles,
  seniors, 3Gen flats, resale flats, or a non-resident spouse.
- Income is today's salary; HDB uses the 12-month average before the HFE
  application. CPF OA grows at Singapore Citizen contribution rates (no bonuses).
- Dates assume booking 3 months after the launch and the AFL 6 months later.
- CPF OA is used before the loan and before cash.
- Not included: fire insurance and Home Protection Scheme premiums, resale levy
  for second-timers, and law firm fees with a bank loan.
