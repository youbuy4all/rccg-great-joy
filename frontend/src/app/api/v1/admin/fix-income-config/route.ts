import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

/**
 * ONE-TIME FIX ENDPOINT
 * Repairs invalid category values in income_config table that were inserted
 * before enum standardisation, and adds missing CHURCH_PROJECT config.
 *
 * Safe to call multiple times — uses raw SQL updates and upserts.
 * DELETE this file after running once.
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async () => {

    const fixes: string[] = [];

    // ── Step 1: Fix known bad category names via raw SQL ─────────────────────
    // Prisma's typed client refuses to read these rows, so we use raw SQL.
    const renames: [string, string][] = [
      ["WORKERS_OFFERING",    "GOSPEL_FUND"],
      ["SUNDAY_SCHOOL",       "SUNDAY_SCHOOL_OFFERING"],
      ["MEMBERS_TITHE",       "TITHE"],
      ["CONGREGATION_TITHE",  "TITHE"],
      ["FIRST_FRUIT",         "TRUST_FRUIT"],
      ["SEED_FAITH",          "SEED_FAITH_HOLY_COMMUNION"],
    ];

    for (const [oldVal, newVal] of renames) {
      const result = await prisma.$executeRaw`
        UPDATE income_configs
        SET category = ${newVal}::"IncomeCategory"
        WHERE category::text = ${oldVal}
      `;
      if (result > 0) fixes.push(`Renamed ${oldVal} → ${newVal} (${result} row)`);
    }

    // ── Step 2: Ensure CHURCH_PROJECT config exists ───────────────────────────
    const existing = await prisma.$queryRaw<{count:bigint}[]>`
      SELECT COUNT(*) as count FROM income_configs WHERE category::text = 'CHURCH_PROJECT'
    `;
    const cpCount = Number(existing[0]?.count ?? 0);

    if (cpCount === 0) {
      await prisma.$executeRaw`
        INSERT INTO income_configs (id, category, remittance_pct, parish_retain_pct, description, updated_at)
        VALUES (
          gen_random_uuid(),
          'CHURCH_PROJECT'::"IncomeCategory",
          0,
          100,
          'Parish project fund — stays 100% in parish',
          NOW()
        )
        ON CONFLICT (category) DO NOTHING
      `;
      fixes.push("Added CHURCH_PROJECT config (0% remittance, 100% parish)");
    } else {
      fixes.push("CHURCH_PROJECT config already exists — skipped");
    }

    // ── Step 3: Verify — list all current configs ─────────────────────────────
    const allConfigs = await prisma.$queryRaw<{category:string, remittance_pct:number}[]>`
      SELECT category::text, remittance_pct FROM income_configs ORDER BY category
    `;

    return ok({
      fixes,
      totalConfigs: allConfigs.length,
      configs: allConfigs,
    });

  }, ["SUPER_ADMIN", "PASTOR"]);
}
