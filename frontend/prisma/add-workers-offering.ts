/**
 * Run once to add WORKERS_OFFERING to the IncomeConfig table.
 * npx tsx prisma/add-workers-offering.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.incomeConfig.findUnique({
    where: { category: "WORKERS_OFFERING" as any },
  });

  if (existing) {
    console.log("✓ WORKERS_OFFERING already exists in IncomeConfig — no action needed.");
    return;
  }

  await prisma.incomeConfig.create({
    data: {
      category:       "WORKERS_OFFERING" as any,
      remittancePct:  0,    // 100% kept by parish — adjust in Settings if needed
      parishRetainPct: 100,
      description:    "Workers Offering — collected every Sunday from workers",
    },
  });

  console.log("✓ WORKERS_OFFERING added to IncomeConfig (0% national, 100% parish).");
  console.log("  You can adjust the remittance % in the Settings page.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
