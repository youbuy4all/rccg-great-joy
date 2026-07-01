import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, makeRef } from "@/lib/api-helpers";

const CATEGORY_LABELS: Record<string, string> = {
  TITHE:                        "Members Tithe",
  MINISTERS_TITHE:              "Ministers Tithe",
  SUNDAY_LOVE_OFFERING:         "Sunday Love Offering",
  THANKSGIVING:                 "Thanksgiving Offering",
  CRM:                          "CRM Offering",
  CHILDREN_TEENS_OFFERING:      "Children/Teens Offering",
  TRUST_FRUIT:                  "First Fruit",
  FIRST_BORN_REDEMPTION:        "1st Born Redemption",
  GOSPEL_FUND:                  "Workers Offering",
  HOUSE_FELLOWSHIP_OFFERING:    "House Fellowship Offering",
  BUILDING_FUND:                "Building Fund",
  WELFARE:                      "Welfare Offering",
  SPECIAL_DONATION:             "Special Donation",
  PARTNERSHIP_SEED:             "Partnership Seed",
  CONVENTION_LEVY:              "Convention Levy",
  RUN:                          "RUN Offering",
  CSR:                          "CSR",
  OTHER_INCOME:                 "Other Income",
  HOLY_GHOST_CONGRESS:          "Holy Ghost Congress",
  AFRICAN_MISSION_OFFERING:     "African Mission Offering",
  CAMP_CLEARING:                "Camp Clearing",
  SUNDAY_SCHOOL_OFFERING:       "Sunday School Offering",
  JUNIOR_FELLOWSHIP:            "Junior Fellowship",
  HOME_FELLOWSHIP:              "Home Fellowship",
  GOOD_WOMEN_OFFERING:          "Good Women Offering",
  RCCG_AUDITORIUM_CONTRIBUTION: "RCCG Auditorium Contribution",
  CSR_EDUCATION:                "CSR Education",
  CONVENTION_CONGRESS_SUPPORT:  "Convention/Congress Support",
  PASTORS_WELFARE_PURSE:        "Pastors Welfare Purse",
  DAY_OUT_CARD:                 "Day Out Card",
  VICTORY_SERVICE:              "Victory Service",
  SEED_FAITH_HOLY_COMMUNION:    "Seed of Faith/Holy Communion",
  ZONE_LETS_GO_AFISHING:        "Zone: Lets Go Afishing",
  CHURCH_PROJECT:               "Church Project",
};

const SERVICE_LABELS: Record<string, string> = {
  SUNDAY_MORNING: "Sunday Service",
  TUESDAY:        "Tuesday Service",
  THURSDAY:       "Thursday Service",
};

function fmtDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || !rows.length) {
      return ok({ created: 0, sessionsCreated: 0, skipped: 0, errors: [] });
    }

    const configs = await prisma.incomeConfig.findMany();
    const configMap = new Map(configs.map(c => [c.category, Number(c.remittancePct)]));

    const results = {
      sessionsCreated: 0,
      created:         0,
      skipped:         0,
      errors:          [] as string[],
    };

    for (const row of rows) {
      const { date, serviceType, attendance, offerings } = row;
      if (!date || !serviceType) { results.skipped++; continue; }

      const serviceDate = new Date(date + "T12:00:00Z");
      const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;
      const dateLabel    = fmtDate(date);

      // ── 1. Create attendance session ───────────────────────────────
      try {
        const existing = await prisma.attendanceSession.findUnique({
          where: { serviceDate_serviceType: { serviceDate, serviceType } },
        });

        if (!existing && attendance) {
          const men      = Number(attendance.men      || 0);
          const women    = Number(attendance.women    || 0);
          const children = Number(attendance.children || 0);

          await prisma.attendanceSession.create({
            data: {
              serviceDate,
              serviceType,
              preacher:      attendance.preacher || undefined,
              menCount:      men,
              womenCount:    women,
              childrenCount: children,
              totalCount:    men + women + children,
            },
          });
          results.sessionsCreated++;
        }
      } catch (e: any) {
        results.errors.push(`Attendance ${date}: ${e.message}`);
      }

      // ── 2. Create transactions ────────────────────────────────────
      if (Array.isArray(offerings)) {
        for (const o of offerings) {
          const amount = Number(o.amount || 0);
          if (!amount || !o.category) continue;

          try {
            const count   = await prisma.transaction.count({ where: { type: "INCOME" } });
            const ref     = makeRef("INC", count);
            const remPct  = o.category === "CHURCH_PROJECT" ? 0 : (configMap.get(o.category) ?? 0);
            const remAmt  = (amount * remPct) / 100;
            const label   = CATEGORY_LABELS[o.category] || o.category;
            const method  = o.paymentMethod === "TRANSFER" ? "TRANSFER" : "CASH";

            await prisma.transaction.create({
              data: {
                reference:        ref,
                type:             "INCOME",
                incomeCategory:   o.category as any,
                amount,
                description:      `${label} — ${serviceLabel} ${dateLabel} [Scanned]`,
                paymentMethod:    method,
                transactionDate:  serviceDate,
                remittanceAmount: remAmt || undefined,
                isRemitted:       false,
                createdById:      user.userId,
              },
            });
            results.created++;
          } catch (e: any) {
            results.skipped++;
            results.errors.push(`${date} ${o.category}: ${e.message}`);
          }
        }
      }
    }

    return ok(results, 201);
  }, ["PASTOR", "TREASURER", "SECRETARY", "SUPER_ADMIN"]);
}
