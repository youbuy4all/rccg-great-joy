import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";
import { getWaterfall, getRulesBySection, REMITTANCE_RULES } from "@/lib/remittance-rules";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    const { id } = await params;

    const ret = await prisma.monthlyReturn.findUnique({ where: { id } });
    if (!ret) return err("Return not found", 404);

    const { month, year } = ret;
    const rangeStart = new Date(year, month - 1, 1);
    const rangeEnd   = new Date(year, month, 0, 23, 59, 59);

    // ── 0. Live counts for the Pastoral report (Section A, items 5 & related) ──
    const [houseFellowshipCount, activeMemberCount] = await Promise.all([
      prisma.houseFellowship.count({ where: { isActive: true } }),
      prisma.member.count({ where: { status: "ACTIVE" } }),
    ]);

    // ── 1. Weekly attendance + service log (for the Monthly General Progress Report Sheet) ──
    const sessions = await prisma.attendanceSession.findMany({
      where: { serviceDate: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { serviceDate: "asc" },
    });

    // ── 2. Gross income totals by category, freshly aggregated from Transaction ──
    const incomeTx = await prisma.transaction.groupBy({
      by: ["incomeCategory"],
      where: { type: "INCOME", transactionDate: { gte: rangeStart, lte: rangeEnd } },
      _sum: { amount: true },
    });

    const grossByCategory: Record<string, number> = {};
    for (const row of incomeTx) {
      if (row.incomeCategory) grossByCategory[row.incomeCategory] = Number(row._sum.amount ?? 0);
    }

    // ── 3. Build the full remittance waterfall per category, per form section ──
    const sectionAB = getRulesBySection("A_B").map(rule => {
      const gross = grossByCategory[rule.category] ?? 0;
      return { ...rule, gross, waterfall: getWaterfall(rule.category, gross) };
    });

    // Section C on the official form opens with the Provincial-tier cuts of
    // Thanksgiving, Sunday Love Offering, and C.R.M. — the same collections
    // already split in Section B, not separate income categories — followed
    // by the standalone Provincial-only categories.
    const sharedProvincialCuts = ["THANKSGIVING", "SUNDAY_LOVE_OFFERING", "CRM"]
      .map(cat => {
        const rule = sectionAB.find(r => r.category === cat);
        if (!rule) return null;
        const provincial = rule.waterfall.find((t: any) => t.tier === "PROVINCIAL");
        if (!provincial) return null;
        return { category: cat, formLabel: rule.formLabel, gross: rule.gross, waterfall: [provincial] };
      })
      .filter(Boolean) as { category: string; formLabel: string; gross: number; waterfall: any[] }[];

    const sectionCStandalone = getRulesBySection("C").map(rule => {
      const gross = grossByCategory[rule.category] ?? 0;
      return { ...rule, gross, waterfall: getWaterfall(rule.category, gross) };
    });
    const sectionC = [...sharedProvincialCuts, ...sectionCStandalone];

    const sectionD = getRulesBySection("D").map(rule => {
      const gross = grossByCategory[rule.category] ?? 0;
      return { ...rule, gross, waterfall: getWaterfall(rule.category, gross) };
    });

    // Section D also includes the Zone/Area cuts that are already embedded inside
    // Thanksgiving's own waterfall (AREA tier) and Tithe's (none currently at Zone tier).
    // Surface them explicitly here so the printed Section D table matches the form.
    const thanksgivingGross = grossByCategory["THANKSGIVING"] ?? 0;
    const thanksgivingWaterfall = getWaterfall("THANKSGIVING", thanksgivingGross);
    const areaThanksgiving = thanksgivingWaterfall.find(t => t.tier === "AREA");

    const sectionDExtra = [
      {
        formLabel: "Zone: Tithe - Congregation",
        gross: 0,
        pct: 0,
        amount: 0,
      },
      ...(areaThanksgiving
        ? [{ formLabel: "Area: Thanksgiving Offering", gross: thanksgivingGross, pct: areaThanksgiving.pct, amount: areaThanksgiving.amount }]
        : []),
    ];

    // ── 4. Grand totals ──
    const totalNationalIncome = sectionAB.reduce((s, r) => s + r.gross, 0);

    const totalB = sectionAB.reduce(
      (s, r) => s + r.waterfall.filter(t => t.tier !== "PARISH").reduce((a, t) => a + t.amount, 0),
      0
    );
    const totalBParish = sectionAB.reduce(
      (s, r) => s + (r.waterfall.find(t => t.tier === "PARISH")?.amount ?? 0),
      0
    );

    const totalC = sectionC.reduce(
      (s, r) => s + r.waterfall.filter(t => t.tier !== "PARISH").reduce((a, t) => a + t.amount, 0),
      0
    );
    const totalCParish = sectionC.reduce(
      (s, r) => s + (r.waterfall.find(t => t.tier === "PARISH")?.amount ?? 0),
      0
    );

    const totalD =
      sectionD.reduce((s, r) => s + r.waterfall.reduce((a, t) => a + t.amount, 0), 0) +
      sectionDExtra.reduce((s, r) => s + r.amount, 0);

    const grandTotalRemittable = totalB + totalC + totalD;
    const grandTotalParishBalance = totalBParish + totalCParish;

    // ── 5. Income breakdown for the Monthly Progress Report's "Monetary" column ──
    const monetaryColumn = [
      { label: "MINISTER'S TITHES", category: "MINISTERS_TITHE" },
      { label: "MEMBERS TITHES",    category: "TITHE" },
      { label: "THANKSGIVING",      category: "THANKSGIVING" },
      { label: "SUNDAY LOVE OFFERING", category: "SUNDAY_LOVE_OFFERING" },
      { label: "CRM OFFERING",      category: "CRM" },
      { label: "GOSPEL FUND",       category: "GOSPEL_FUND" },
      { label: "FIRST FRUIT",       category: "TRUST_FRUIT" },
      { label: "1ST BORN REDEMPTION", category: "FIRST_BORN_REDEMPTION" },
    ].map(item => {
      const gross = grossByCategory[item.category] ?? 0;
      const waterfall = getWaterfall(item.category, gross);
      return {
        ...item,
        gross,
        rows: waterfall.filter(t => t.tier !== "PSF" && t.tier !== "AREA" && t.tier !== "PROVINCIAL").map(t => ({
          label: t.tier === "NATIONAL" ? "100%" : `${t.pct.toFixed(0)}%`,
          pct: t.tier === "NATIONAL" ? 100 : t.pct,
          amount: t.tier === "NATIONAL" ? gross : t.amount,
        })),
      };
    });

    return ok({
      return: ret,
      sessions,
      grossByCategory,
      houseFellowshipCount,
      activeMemberCount,
      sections: { A_B: sectionAB, C: sectionC, D: sectionD, D_extra: sectionDExtra },
      totals: {
        totalNationalIncome,
        totalB, totalBParish,
        totalC, totalCParish,
        totalD,
        grandTotalRemittable,
        grandTotalParishBalance,
      },
      monetaryColumn,
    });
  }, ["PASTOR", "TREASURER", "AUDITOR", "SUPER_ADMIN"]);
}
