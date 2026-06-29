import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, makeRef, writeAuditLog } from "@/lib/api-helpers";

// Labels used in transaction descriptions
const CATEGORY_LABELS: Record<string, string> = {
  MINISTERS_TITHE:          "Ministers Tithe",
  TITHE:                    "Members Tithe",
  THANKSGIVING:             "Thanksgiving Offering",
  SUNDAY_LOVE_OFFERING:     "Sunday Love Offering",
  CRM:                      "CRM Offering",
  GOSPEL_FUND:              "Workers Offering",
  TRUST_FRUIT:              "First Fruit",
  FIRST_BORN_REDEMPTION:    "1st Born Redemption",
  SUNDAY_SCHOOL_OFFERING:   "Sunday School Offering",
  JUNIOR_FELLOWSHIP:        "Junior Fellowship",
  HOME_FELLOWSHIP:          "Home Fellowship",
  CHURCH_PROJECT:           "Church Project",
};

const SERVICE_LABELS: Record<string, string> = {
  SUNDAY_SERVICE:   "Sunday Service",
  TUESDAY_SERVICE:  "Tuesday Service",
  THURSDAY_SERVICE: "Thursday Service",
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return err("No rows to import", 400);
    }

    // Pre-load all income configs for remittance calculation
    const configs = await prisma.incomeConfig.findMany();
    const configMap = new Map(configs.map(c => [c.category, Number(c.remittancePct)]));

    const results = {
      created: 0,
      skipped: 0,
      errors:  [] as string[],
    };

    for (const row of rows) {
      const { date, serviceType, offerings } = row;

      if (!date || !offerings || typeof offerings !== "object") {
        results.skipped++;
        results.errors.push(`Invalid row: ${JSON.stringify(row)}`);
        continue;
      }

      const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;
      const dateLabel    = formatDateLabel(date);

      for (const [category, rawAmount] of Object.entries(offerings)) {
        const amount = Number(rawAmount);
        if (!amount || amount <= 0) continue;

        try {
          const count     = await prisma.transaction.count({ where: { type: "INCOME" } });
          const reference = makeRef("INC", count);

          // CHURCH_PROJECT has 0% remittance — stays fully in parish
          const remittancePct    = category === "CHURCH_PROJECT" ? 0 : (configMap.get(category as any) ?? 0);
          const remittanceAmount = (amount * remittancePct) / 100;

          const label = CATEGORY_LABELS[category] || category;
          const description = `${label} — ${serviceLabel} ${dateLabel} [Scanned]`;

          await prisma.transaction.create({
            data: {
              reference,
              type:            "INCOME",
              incomeCategory:  category as any,
              amount,
              description,
              paymentMethod:   "CASH",
              transactionDate: new Date(date + "T12:00:00Z"),
              remittanceAmount: remittanceAmount || undefined,
              isRemitted:      false,
              createdById:     user.userId,
            },
          });

          await writeAuditLog({
            userId:    user.userId,
            action:    "CREATE_TRANSACTION",
            entity:    "Transaction",
            entityId:  reference,
            newValues: { reference, type: "INCOME", category, amount, remittanceAmount, source: "SCAN" },
            req,
          });

          results.created++;
        } catch (e: any) {
          results.skipped++;
          results.errors.push(`${date} ${category}: ${e.message}`);
        }
      }
    }

    return ok(results, results.created > 0 ? 201 : 200);
  }, ["PASTOR", "TREASURER", "SUPER_ADMIN"]);
}
