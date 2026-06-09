// ./src/app/api/v1/returns/utils.ts
import prisma from "@/lib/prisma";

export async function calcReturn(month: number, year: number) {
  const start = new Date(year, month - 1, 1), end = new Date(year, month, 0);
  const [byCategory, expenses, attnSummary, active, newConverts, baptism, trainees, foundation] = await Promise.all([
    prisma.transaction.groupBy({ by: ["incomeCategory"], where: { type: "INCOME", transactionDate: { gte: start, lte: end } }, _sum: { amount: true, remittanceAmount: true } }),
    prisma.transaction.aggregate({ where: { type: "EXPENSE", transactionDate: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.attendanceSession.groupBy({ by: ["serviceType"], where: { serviceDate: { gte: start, lte: end } }, _avg: { totalCount: true } }),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { isNewConvert: true, convertDate: { gte: start, lte: end } } }),
    prisma.member.count({ where: { baptismStatus: "BAPTISED", baptismDate: { gte: start, lte: end } } }),
    prisma.member.count({ where: { workerStatus: "WORKER_IN_TRAINING" } }),
    prisma.member.count({ where: { foundationSchool: true } }),
  ]);
  
  const inc: Record<string, number> = {}, rem: Record<string, number> = {};
  for (const r of byCategory) { inc[r.incomeCategory!] = Number(r._sum.amount || 0); rem[r.incomeCategory!] = Number(r._sum.remittanceAmount || 0); }
  const avgByType: Record<string, number> = {};
  for (const r of attnSummary) avgByType[r.serviceType] = Math.round(r._avg.totalCount || 0);
  
  const totalRemittance = Object.values(rem).reduce((s, v) => s + v, 0);
  
  return {
    totalTithe: inc["TITHE"] || 0, totalMinistersTithe: inc["MINISTERS_TITHE"] || 0, totalSundayOffering: inc["SUNDAY_LOVE_OFFERING"] || 0,
    totalThanksgiving: inc["THANKSGIVING"] || 0, totalCRM: inc["CRM"] || 0, totalChildrenOffering: inc["CHILDREN_TEENS_OFFERING"] || 0,
    totalTrustFruit: inc["TRUST_FRUIT"] || 0, totalFirstBorn: inc["FIRST_BORN_REDEMPTION"] || 0, totalGospelFund: inc["GOSPEL_FUND"] || 0,
    totalHFOffering: inc["HOUSE_FELLOWSHIP_OFFERING"] || 0, totalBuildingFund: inc["BUILDING_FUND"] || 0, totalRUN: inc["RUN"] || 0, totalCSR: inc["CSR"] || 0,
    totalExpenses: Number(expenses._sum.amount || 0), totalRemittance,
    avgSundayAttendance: avgByType["SUNDAY_MORNING"] || 0, avgMidweekAttendance: avgByType["DIGGING_DEEP"] || avgByType["TUESDAY"] || 0,
    avgFaithClinic: avgByType["FAITH_CLINIC"] || 0, avgYouthService: avgByType["YOUTH_SERVICE"] || 0, avgHouseFellowship: avgByType["HOUSE_FELLOWSHIP"] || 0,
    newConverts, waterBaptism: baptism, workersInTraining: trainees, foundationSchool: foundation, totalActiveMembers: active,
  };
}