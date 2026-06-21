/**
 * Run once: removes ALL fake demo congregational data — members,
 * departments, house fellowships, transactions, attendance, and returns —
 * so you can start entering your real church data with a clean slate.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/clear-demo-data.ts
 *
 * SAFE: does NOT touch login accounts (User table) or IncomeConfig
 * (the official RCCG remittance percentages — those aren't fake, they're
 * denomination-wide rules that apply regardless of which congregation
 * you are).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹  Clearing fake demo data…\n");

  const counts = {
    attendance:        await prisma.attendance.count(),
    sessions:           await prisma.attendanceSession.count(),
    transactions:        await prisma.transaction.count(),
    returns:             await prisma.monthlyReturn.count(),
    members:             await prisma.member.count(),
    departments:         await prisma.department.count(),
    houseFellowships:    await prisma.houseFellowship.count(),
  };

  console.log("Found:");
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log("");

  // Delete in dependency order — children before parents.
  await prisma.attendance.deleteMany();
  console.log("✓  Attendance records cleared");

  await prisma.attendanceSession.deleteMany();
  console.log("✓  Attendance sessions cleared");

  await prisma.transaction.deleteMany();
  console.log("✓  Transactions cleared");

  await prisma.monthlyReturn.deleteMany();
  console.log("✓  Monthly returns cleared");

  await prisma.member.deleteMany();
  console.log("✓  Members cleared");

  await prisma.department.deleteMany();
  console.log("✓  Departments cleared");

  await prisma.houseFellowship.deleteMany();
  console.log("✓  House fellowships cleared");

  console.log(`
╔══════════════════════════════════════════════════════╗
║              DEMO DATA FULLY CLEARED                  ║
╠══════════════════════════════════════════════════════╣
║  Untouched (kept on purpose):                          ║
║   • Your login accounts                                ║
║   • Official RCCG remittance percentages (IncomeConfig) ║
║                                                        ║
║  Next steps in the app:                                ║
║   1. Departments → Add Department (your real ones)     ║
║   2. House Fellowship → Add Fellowship (your real ones) ║
║   3. Members → Add Member (your real congregants)       ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(e => { console.error("❌ Cleanup failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
