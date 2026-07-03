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

// ── Category validation / normalization (safety net) ──────────────────
// Mirrors the IncomeCategory enum in schema.prisma. Even though the AI scan
// route already normalizes categories before returning them to the client,
// this route can also be reached directly (e.g. future bulk-import features,
// retries, or manually edited preview payloads), so we validate again here
// rather than trusting the request body blindly.
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));

// Catches near-misses where a category doesn't exactly match the enum
// (e.g. an AI or manual edit produces "WORKERS_OFFERING" instead of the
// real enum key "GOSPEL_FUND"). Extend this if new variants show up.
const CATEGORY_ALIASES: Record<string, string> = {
  WORKERS_OFFERING:    "GOSPEL_FUND",
  WORKER_OFFERING:      "GOSPEL_FUND",
  SUNDAY_SCHOOL:         "SUNDAY_SCHOOL_OFFERING",
  SEED_FAITH:            "SEED_FAITH_HOLY_COMMUNION",
  HOLY_COMMUNION:        "SEED_FAITH_HOLY_COMMUNION",
  FIRST_FRUIT:           "TRUST_FRUIT",
  GENERAL_TITHE:         "TITHE",
  CONGREGATION_TITHE:    "TITHE",
  PASTOR_TITHE:          "MINISTERS_TITHE",
};

function normalizeCategory(raw: string): { category: string; wasFixed: boolean } {
  if (VALID_CATEGORIES.has(raw)) return { category: raw, wasFixed: false };
  if (CATEGORY_ALIASES[raw]) return { category: CATEGORY_ALIASES[raw], wasFixed: true };
  return { category: "OTHER_INCOME", wasFixed: true };
}

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

          // Validate/normalize the category before it ever touches Prisma.
          // This is what prevents "Invalid IncomeCategory" crashes when a
          // scan or manual payload contains a value that isn't a real enum key.
          const { category, wasFixed } = normalizeCategory(o.category);
          if (wasFixed) {
            results.errors.push(
              `${date}: category "${o.category}" was not recognized — saved as "${category}" instead. Please verify this transaction.`
            );
          }

          // ── Duplicate-entry safety check ────────────────────────────
          // Matches same day + same category + same exact amount. This is exactly
          // the scenario a re-scanned sheet produces, so by default we skip
          // creating it (rather than silently double-counting real church funds)
          // and clearly report why. If it's a genuine coincidence and not a
          // re-scan, the user can add it manually via "Add Transaction", which
          // offers a "save anyway" override.
          const dayStart = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate());
          const dayEnd   = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate() + 1);
          const dup = await prisma.transaction.findFirst({
            where: {
              type:            "INCOME",
              incomeCategory:  category as any,
              amount,
              transactionDate: { gte: dayStart, lt: dayEnd },
            },
          });
          if (dup) {
            results.skipped++;
            results.errors.push(
              `${date} ${category}: skipped — a matching transaction (₦${amount.toLocaleString()}) already exists for this date (ref: ${dup.reference}). Likely a duplicate scan. Add it manually with the override if this is genuinely a separate transaction.`
            );
            continue;
          }

          try {
            const count   = await prisma.transaction.count({ where: { type: "INCOME" } });
            const ref     = makeRef("INC", count);
            const remPct  = category === "CHURCH_PROJECT" ? 0 : (configMap.get(category) ?? 0);
            const remAmt  = (amount * remPct) / 100;
            const label   = CATEGORY_LABELS[category] || category;
            const method  = o.paymentMethod === "TRANSFER" ? "TRANSFER" : "CASH";

            await prisma.transaction.create({
              data: {
                reference:        ref,
                type:             "INCOME",
                incomeCategory:   category as any,
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
            results.errors.push(`${date} ${category}: ${e.message}`);
          }
        }
      }
    }

    return ok(results, 201);
  }, ["PASTOR", "TREASURER", "SECRETARY", "SUPER_ADMIN"]);
}
