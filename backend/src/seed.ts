/**
 * Database Seed — RCCG Great Joy Parish
 * Run: npm run db:seed
 *
 * Creates:
 *  - Default income category remittance configs
 *  - Default chart of accounts
 *  - Default departments
 *  - Default house fellowships
 */

import { PrismaClient, IncomeCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding RCCG Great Joy Parish database...\n");

  // ── Income Category Configs (Remittance %) ──────────────
  // Based on Rivers Province 12 policy
  const incomeConfigs: {
    category: IncomeCategory;
    parishRetainPct: number;
    remittancePct: number;
    description: string;
  }[] = [
    { category: "TITHE",                  parishRetainPct: 58,  remittancePct: 42,  description: "General Tithe — 58% parish, 42% to Province" },
    { category: "MINISTERS_TITHE",        parishRetainPct: 75,  remittancePct: 25,  description: "Ministers Tithe — 75% parish, 25% to Province" },
    { category: "SUNDAY_LOVE_OFFERING",   parishRetainPct: 90,  remittancePct: 10,  description: "Sunday Love Offering — 90% parish, 10% to Province" },
    { category: "THANKSGIVING",           parishRetainPct: 89,  remittancePct: 11,  description: "Thanksgiving — 89% parish, 11% to Province" },
    { category: "CRM",                    parishRetainPct: 50,  remittancePct: 50,  description: "CRM — 50% parish, 50% to Province" },
    { category: "CHILDREN_TEENS_OFFERING",parishRetainPct: 70,  remittancePct: 30,  description: "Children/Teens Offering — 70% parish, 30% to Province" },
    { category: "TRUST_FRUIT",            parishRetainPct: 10,  remittancePct: 90,  description: "Trust Fruit — 10% parish, 90% to Province" },
    { category: "FIRST_BORN_REDEMPTION",  parishRetainPct: 0,   remittancePct: 100, description: "First Born Redemption — 100% to Province" },
    { category: "GOSPEL_FUND",            parishRetainPct: 75,  remittancePct: 25,  description: "Gospel Fund — 75% parish, 25% to Province" },
    { category: "HOUSE_FELLOWSHIP_OFFERING",parishRetainPct:100,remittancePct: 0,   description: "House Fellowship Offering — 100% parish" },
    { category: "BUILDING_FUND",          parishRetainPct: 100, remittancePct: 0,   description: "Building Fund — 100% parish" },
    { category: "WELFARE",               parishRetainPct: 100, remittancePct: 0,   description: "Welfare Fund — 100% parish" },
    { category: "SPECIAL_DONATION",      parishRetainPct: 100, remittancePct: 0,   description: "Special Donations — 100% parish" },
    { category: "PARTNERSHIP_SEED",      parishRetainPct: 100, remittancePct: 0,   description: "Partnership Seeds — 100% parish" },
    { category: "CONVENTION_LEVY",       parishRetainPct: 0,   remittancePct: 100, description: "Convention Levies — 100% to Province" },
    { category: "RUN",                   parishRetainPct: 0,   remittancePct: 100, description: "RUN — 100% to Province" },
    { category: "CSR",                   parishRetainPct: 0,   remittancePct: 100, description: "CSR — 100% to Province" },
    { category: "OTHER_INCOME",          parishRetainPct: 100, remittancePct: 0,   description: "Other Income — 100% parish" },
  ];

  for (const config of incomeConfigs) {
    await prisma.incomeConfig.upsert({
      where:  { category: config.category },
      update: { parishRetainPct: config.parishRetainPct, remittancePct: config.remittancePct },
      create: { ...config },
    });
  }
  console.log(`✅  Income configs: ${incomeConfigs.length} categories configured`);

  // ── Chart of Accounts ───────────────────────────────────
  const accounts = [
    { name: "Cash on Hand",         accountType: "cash",   bankName: null },
    { name: "GTBank Parish Account", accountType: "bank",   bankName: "GTBank" },
    { name: "UBA Account",           accountType: "bank",   bankName: "UBA" },
    { name: "Building Fund Account", accountType: "fund",   bankName: "GTBank" },
    { name: "Welfare Fund",          accountType: "fund",   bankName: null },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where:  { id: account.name.replace(/\s+/g, "-").toLowerCase() },
      update: {},
      create: { id: account.name.replace(/\s+/g, "-").toLowerCase(), ...account },
    });
  }
  console.log(`✅  Accounts: ${accounts.length} accounts created`);

  // ── Departments ─────────────────────────────────────────
  const departments = [
    "Choir",
    "Ushers",
    "Media & Technology",
    "Children's Ministry",
    "Protocol",
    "Evangelism",
    "Prayer Unit",
    "Sanctuary Keepers",
    "Teens Ministry",
    "Welfare",
  ];

  for (const name of departments) {
    await prisma.department.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅  Departments: ${departments.length} departments created`);

  // ── House Fellowships ───────────────────────────────────
  const fellowships = [
    { name: "Faith Centre",  zone: "Zone A" },
    { name: "Grace Centre",  zone: "Zone B" },
    { name: "Hope Centre",   zone: "Zone C" },
    { name: "Zion Centre",   zone: "Zone D" },
    { name: "Shiloh Centre", zone: "Zone A" },
    { name: "Bethel Centre", zone: "Zone B" },
  ];

  for (const hf of fellowships) {
    await prisma.houseFellowship.upsert({
      where:  { id: hf.name.replace(/\s+/g, "-").toLowerCase() },
      update: {},
      create: { id: hf.name.replace(/\s+/g, "-").toLowerCase(), ...hf },
    });
  }
  console.log(`✅  House Fellowships: ${fellowships.length} centres created`);

  console.log("\n🎉  Seed complete! You can now run the app.\n");
  console.log("   Next step: Create your Pastor account at POST /api/v1/auth/register\n");
}

main()
  .catch(e => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
