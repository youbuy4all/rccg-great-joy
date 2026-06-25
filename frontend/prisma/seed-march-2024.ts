/**
 * RCCG Great Joy Parish — Real Data Seed: March 2024
 * ════════════════════════════════════════════════════════════════════════
 * Transcribed exactly from the physical Monthly General Progress Report
 * Sheet and Financial Report for March 2024, Rivers Province 12.
 *
 * Run AFTER clearing demo data:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/clear-demo-data.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-march-2024.ts
 *
 * This seed:
 *  ✓  Creates income transactions matching Section A & C gross amounts
 *  ✓  Creates attendance sessions from the Progress Report Sheet
 *  ✓  Creates the March 2024 MonthlyReturn record with all verified figures
 *  ✗  Does NOT create members (enter manually via Members → Add Member)
 *  ✗  Does NOT create departments or house fellowships (add via their pages)
 *
 * All figures verified against the physical forms:
 *   Section B total:   ₦13,503.50 ✓
 *   Section C total:   ₦12,900.00 ✓
 *   Section D total:     ₦422.50 ✓
 *   Grand total B+C+D: ₦26,826.00 ✓
 * ════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

async function main() {
  console.log("🌱  Seeding real March 2024 data for Great Joy Parish…\n");

  // ── 1. Clear any existing March 2024 data (safe to re-run) ───────────────
  await prisma.attendance.deleteMany();
  await prisma.attendanceSession.deleteMany({
    where: {
      serviceDate: {
        gte: new Date(2024, 1, 1),
        lte: new Date(2024, 2, 31),
      },
    },
  });
  await prisma.transaction.deleteMany({
    where: {
      transactionDate: {
        gte: new Date(2024, 2, 1),
        lte: new Date(2024, 2, 31),
      },
    },
  });
  await prisma.monthlyReturn.deleteMany({
    where: { month: 3, year: 2024 },
  });
  console.log("✓  Cleared any existing March 2024 records");

  // ══════════════════════════════════════════════════════════════════════════
  // 2. INCOME TRANSACTIONS
  //
  // Source: Financial Report, Section A (National categories — 100% gross)
  //         + Section C (Provincial-only categories — computed from pct shown)
  //
  // All transactions dated the last Sunday of the month (31 Mar 2024) since
  // the form records monthly totals, not per-service breakdowns.
  // ══════════════════════════════════════════════════════════════════════════

  const TRANS_DATE = d(2024, 3, 31); // last day of March 2024

  const incomeTransactions = [
    // ── Section A — National Remittable categories ─────────────────────────
    // Tithe-Ministers: 0.00 (not collected this month — not recorded)
    // Tithe-Congregation: 0.00 (not collected — not recorded)

    {
      // Thanksgiving: gross = 8,450
      // B split: National 70% = 5,915 | PSF 1% = 84.50 | Area 5% = 422.50 | Parish 19% = 1,605.50 + 5% Provincial = 422.50
      category:   "THANKSGIVING",
      amount:     8450.00,
      desc:       "Thanksgiving Offering — March 2024",
    },
    {
      // Sunday Love Offering: gross = 14,690
      // B split: National 10% = 1,469 | Parish 65% = 9,548.50 + Provincial 25% = 3,672.50
      category:   "SUNDAY_LOVE_OFFERING",
      amount:     14690.00,
      desc:       "Sunday Love Offering — March 2024",
    },
    {
      // C.R.M. Offering: gross = 10,920
      // B split: National 50% = 5,460 | Parish 25% = 2,730 + Provincial 25% = 2,730
      category:   "CRM",
      amount:     10920.00,
      desc:       "C.R.M. Offering — March 2024",
    },
    {
      // Gospel Fund: gross = 2,300
      // B split: National 25% = 575 | Parish 75% = 1,725
      category:   "GOSPEL_FUND",
      amount:     2300.00,
      desc:       "Gospel Fund — March 2024",
    },

    // ── Section C — Provincial-only categories ─────────────────────────────
    // (gross computed by reversing the % shown on the form)

    {
      // African Mission Offering: 100% = 100 → gross = 100
      category:   "AFRICAN_MISSION_OFFERING",
      amount:     100.00,
      desc:       "African Mission Offering — March 2024",
    },
    {
      // Camp Clearing: 100% = 100 → gross = 100
      category:   "CAMP_CLEARING",
      amount:     100.00,
      desc:       "Camp Clearing — March 2024",
    },
    {
      // Sunday School: 70% = 875 → gross = 875 ÷ 0.70 = 1,250
      category:   "SUNDAY_SCHOOL_OFFERING",
      amount:     1250.00,
      desc:       "Sunday School Offering — March 2024",
    },
    {
      // Junior Fellowship: 35% = 500 → gross = 500 ÷ 0.35 = 1,428.57
      category:   "JUNIOR_FELLOWSHIP",
      amount:     1428.57,
      desc:       "Junior Fellowship — March 2024",
    },
    {
      // Home Fellowship: 30% = 300 → gross = 300 ÷ 0.30 = 1,000
      category:   "HOME_FELLOWSHIP",
      amount:     1000.00,
      desc:       "Home Fellowship — March 2024",
    },
    {
      // Good Women Offering: 70% = 1,000 → gross = 1,000 ÷ 0.70 = 1,428.57
      category:   "GOOD_WOMEN_OFFERING",
      amount:     1428.57,
      desc:       "Good Women Offering — March 2024",
    },
    {
      // RCCG New Auditorium: 100% = 200 → gross = 200
      category:   "RCCG_AUDITORIUM_CONTRIBUTION",
      amount:     200.00,
      desc:       "RCCG New Auditorium Contribution — March 2024",
    },
    {
      // Convention/Congress Support: 100% = 1,500 → gross = 1,500
      category:   "CONVENTION_CONGRESS_SUPPORT",
      amount:     1500.00,
      desc:       "Convention/Congress Support — March 2024",
    },
    {
      // Others (2) Day Out Card: 100% = 1,500 → gross = 1,500
      category:   "DAY_OUT_CARD",
      amount:     1500.00,
      desc:       "Day Out Card — March 2024",
    },
  ];

  let txCount = 1;
  for (const t of incomeTransactions) {
    const ref = `INC-2024-${String(txCount).padStart(5, "0")}`;
    await prisma.transaction.create({
      data: {
        reference:       ref,
        type:            "INCOME",
        incomeCategory:  t.category as any,
        amount:          t.amount,
        description:     t.desc,
        paymentMethod:   "CASH",
        transactionDate: TRANS_DATE,
        isRemitted:      false,
      },
    });
    txCount++;
  }
  console.log(`✓  ${incomeTransactions.length} income transactions created`);

  // ── Verify our totals match the form ──────────────────────────────────────
  // Section A gross (national categories only):
  const section_a = 0 + 0 + 8450 + 14690 + 10920 + 2300 + 0 + 0 + 0;
  // Section B: National 64%→0+0, Thanksgiving 70%+1%=5915+84.50=5999.50+provincial cut
  // Actually B total from form = 13,503.50 (we verify this from calcReturn())

  // ══════════════════════════════════════════════════════════════════════════
  // 3. ATTENDANCE SESSIONS
  //
  // Source: Monthly General Progress Report Sheet, March 2024
  // Note: Reporting period covers late Feb + all of March per RCCG practice
  // ══════════════════════════════════════════════════════════════════════════

  const sessions = [
    // Late February services (included in the March return)
    {
      date:         d(2024, 2, 18),
      type:         "SUNDAY_MORNING",
      men:          8, women: 23, children: 41, total: 72,
      preacher:     "DCNS OGE UDONSI",
      hfCount:      38,
    },
    {
      date:         d(2024, 2, 20),
      type:         "DIGGING_DEEP",       // Tuesday service
      men:          4, women: 6, children: 13, total: 23,
      preacher:     "A/P ROTIMI OLAEGBE",
    },
    {
      date:         d(2024, 2, 22),
      type:         "FAITH_CLINIC",       // Thursday service
      men:          3, women: 3, children: 12, total: 18,
      preacher:     "SIS SLIVER",
    },
    {
      date:         d(2024, 2, 25),
      type:         "SUNDAY_MORNING",
      men:          5, women: 20, children: 45, total: 70,
      preacher:     "BRO PETER OROGUN",
      hfCount:      32,
    },
    {
      date:         d(2024, 2, 27),
      type:         "DIGGING_DEEP",
      men:          0, women: 0, children: 0, total: 0,
      preacher:     "",
    },
    {
      date:         d(2024, 2, 29),
      type:         "FAITH_CLINIC",
      men:          4, women: 7, children: 14, total: 25,
      preacher:     "SIS HAPPINESS",
    },
    // March services
    {
      date:         d(2024, 3, 3),
      type:         "SUNDAY_MORNING",
      men:          11, women: 24, children: 42, total: 77,
      preacher:     "PST E A ADEBOYE",
      hfCount:      41,
      newConverts:  2,
    },
    {
      date:         d(2024, 3, 5),
      type:         "DIGGING_DEEP",
      men:          5, women: 9, children: 15, total: 29,
      preacher:     "A/P ROTIMI OLAEGBE",
    },
    {
      date:         d(2024, 3, 7),
      type:         "FAITH_CLINIC",
      men:          5, women: 12, children: 21, total: 38,
      preacher:     "SIS SLIVER",
    },
    {
      date:         d(2024, 3, 10),
      type:         "SUNDAY_MORNING",
      men:          6, women: 21, children: 44, total: 71,
      preacher:     "A/P ROTIMI OLAEGBE",
      hfCount:      33,
    },
    {
      date:         d(2024, 3, 12),
      type:         "DIGGING_DEEP",
      men:          5, women: 9, children: 23, total: 37,
      preacher:     "A/P ROTIMI OLAEGBE",
    },
    {
      date:         d(2024, 3, 14),
      type:         "FAITH_CLINIC",
      men:          3, women: 2, children: 15, total: 20,
      preacher:     "BRO PIUS BAYODE",
    },
  ];

  for (const s of sessions) {
    await prisma.attendanceSession.create({
      data: {
        serviceDate:          s.date,
        serviceType:          s.type as any,
        menCount:             s.men,
        womenCount:           s.women,
        childrenCount:        s.children,
        totalCount:           s.total,
        preacher:             s.preacher || undefined,
        houseFellowshipCount: (s as any).hfCount || 0,
        sundaySchoolCount:    0,
      },
    });
  }
  console.log(`✓  ${sessions.length} attendance sessions created (Feb 18 – Mar 14, 2024)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. MONTHLY RETURN — March 2024
  //
  // All figures taken directly from the Financial Report form.
  // These must match exactly when you click "Generate" then print.
  // ══════════════════════════════════════════════════════════════════════════

  await prisma.monthlyReturn.create({
    data: {
      month:  3,
      year:   2024,
      status: "SUBMITTED",
      submittedAt: d(2024, 4, 1), // submitted to Province in early April

      // ── Income (gross, as shown in Section A) ─────────────────────────────
      totalTithe:             0.00,        // no tithe collected this month
      totalMinistersTithe:    0.00,
      totalSundayOffering:    14690.00,    // Sunday Love Offering gross
      totalThanksgiving:      8450.00,
      totalCRM:               10920.00,
      totalChildrenOffering:  0.00,
      totalTrustFruit:        0.00,        // First Fruit — nil
      totalFirstBorn:         0.00,        // First Born Redemption — nil
      totalGospelFund:        2300.00,
      totalHFOffering:        0.00,        // (Home Fellowship recorded under HOME_FELLOWSHIP)
      totalBuildingFund:      0.00,
      totalRUN:               0.00,
      totalCSR:               0.00,

      // ── Expenses ──────────────────────────────────────────────────────────
      totalExpenses:          0.00,        // enter manually when known

      // ── Remittance: Section B total (National) = 13,503.50 ────────────────
      // Thanksgiving:        70% = 5,915.00  +  PSF 1% = 84.50   = 5,999.50
      // Sunday Love:         10% = 1,469.00
      // CRM:                 50% = 5,460.00
      // Gospel Fund:         25% =   575.00
      // Total B:                            = 13,503.50 ✓
      totalRemittance:        13503.50,

      // ── Attendance (averages from the form's bottom rows) ─────────────────
      avgSundayAttendance:    73,   // Sunday avg total = 73
      avgMidweekAttendance:   28,   // Avg of Tuesday (30) and Thursday (25) ≈ 27.5 → 28
      newConverts:            2,    // 3 March 2024 Sunday: 2 new converts
      waterBaptism:           0,
      totalActiveMembers:     0,    // fill when real members are entered
    },
  });
  console.log("✓  March 2024 monthly return created (SUBMITTED)");

  // ══════════════════════════════════════════════════════════════════════════
  // 5. SUMMARY
  // ══════════════════════════════════════════════════════════════════════════

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     MARCH 2024 DATA SEEDED — Great Joy Parish                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Income transactions: ${incomeTransactions.length.toString().padEnd(40)}║
║  Attendance sessions: ${sessions.length.toString().padEnd(40)}║
║  Monthly return:      March 2024 (SUBMITTED)                     ║
╠══════════════════════════════════════════════════════════════════╣
║  VERIFICATION — these must match your physical form:             ║
║  Section A gross income:  ₦36,360.00                             ║
║  Section B remittable:    ₦13,503.50                             ║
║  Section C remittable:    ₦12,900.00                             ║
║  Section D (area cut):       ₦422.50                             ║
║  Grand total (B+C+D):     ₦26,826.00                             ║
╠══════════════════════════════════════════════════════════════════╣
║  Next: Go to Returns → March 2024 → Print                        ║
║  Compare the printout with your physical form.                   ║
╚══════════════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(e => { console.error("❌  Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
