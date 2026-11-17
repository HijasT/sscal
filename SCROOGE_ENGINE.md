# Scrooge Engine — v15.2.0

## Calculation (November/December 2026 comparison)

1. **Achievement and tier**: gross team sales / target, using the same configured tier ladder as Legacy and Mr. Krabs.
2. **Remove full-price Dubai It sales**: for each employee, net sales = gross sales − AED 10,000 × verified full-price package count. Team net sales = sum of employee net sales. Discounted/other package revenue remains included.
3. **Team P1/P2 pool**: net team sales × applicable tier rate, split 50/50.
4. **P1**: equal allocation of the P1 pool by roster headcount, before calendar eligibility.
5. **P2**: net personal sales / net team sales × P2 pool, before calendar eligibility. If net team sales are zero, P2 pool and allocations are zero.
6. **Pro-rating**: new joiners' P1 and P2 multiplied by eligible calendar days / days in month. Deducted P1 redistributed equally among eligible **existing** staff. Deducted P2 redistributed proportionally to those existing staff's **net** sales (not their gross sales), once only. New joiners receive no redistribution; unallocatable amounts remain with Accounting.
7. **Bonus**: only at >=80% tier achievement, add AED 500 per verified full-price Dubai It package (or configured AED amount) **after** each employee's rounded P1 and P2. Bonus is not pro-rated.
8. **Rounding**: P1 and P2 individually rounded to fils; signed Accounting Remainder recorded separately. Never arbitrarily assign residual fils.

## Difference from Mr. Krabs

Both engines already exclude full-price Dubai It from **pool revenue**. Mr. Krabs continues to weight employee P2 and P2 redistribution by **gross** sales, including Dubai It. Scrooge excludes full-price Dubai It from those **P2 weights**, too. This distinction redistributes the same shared pool among employees differently; the team pool size, tier and package bonus remain the same.

Scrooge is shown in the Bulk ranking selector after Dubai It verification and eligible-day confirmation. The ranking shows P1, P2, package count, separate bonus and bonus-inclusive total. **No official Scrooge CSV or PDF export** is enabled; Legacy exports are unchanged. Policy scope is limited to November–December 2026, as with Mr. Krabs.
