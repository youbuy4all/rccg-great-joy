import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

/** Days until next birthday occurrence — 0 = today, using UTC throughout */
function daysUntil(dob: Date): number {
  const birthMonth = dob.getUTCMonth(); // 0-indexed
  const birthDay   = dob.getUTCDate();

  const now      = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  let next = Date.UTC(now.getUTCFullYear(), birthMonth, birthDay);

  // If it already passed this year, roll over to next year
  if (next < todayUTC) {
    next = Date.UTC(now.getUTCFullYear() + 1, birthMonth, birthDay);
  }

  return Math.round((next - todayUTC) / 86_400_000);
}

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    // Include ACTIVE + VISITOR — only exclude members who have left
    const members = await prisma.member.findMany({
      where: {
        dateOfBirth: { not: null },
        status:      { not: "INACTIVE" },
      },
      select: {
        id:           true,
        firstName:    true,
        lastName:     true,
        phone:        true,
        dateOfBirth:  true,
        profilePhoto: true,
      },
    });

    const WINDOW = 30; // show next 30 days

    const upcoming = members
      .map(m => {
        const days = daysUntil(m.dateOfBirth!);
        return {
          id:            m.id,
          firstName:     m.firstName,
          lastName:      m.lastName,
          phone:         m.phone,
          profilePhoto:  m.profilePhoto,
          birthdayMonth: m.dateOfBirth!.getUTCMonth() + 1,
          birthdayDay:   m.dateOfBirth!.getUTCDate(),
          daysUntil:     days,
          isToday:       days === 0,
          isThisWeek:    days <= 7,
        };
      })
      .filter(m => m.daysUntil <= WINDOW)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return ok(upcoming);
  });
}
