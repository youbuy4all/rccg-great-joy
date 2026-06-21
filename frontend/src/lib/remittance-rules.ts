/**
 * RCCG Rivers Province 12 — Official Remittance Rules
 * ════════════════════════════════════════════════════════════════════════
 * Transcribed verbatim from the physical "FINANCIAL REPORT" form used by
 * Rivers Province 12 (Sections A, B, C, D). Every category's tier
 * percentages sum to exactly 100% of the gross amount collected.
 *
 * This file is the single source of truth for the printed Monthly Return
 * (Financial Report page). It does NOT alter the simpler two-tier
 * remittance tracking used elsewhere in the Finance module — it exists
 * specifically to reproduce the official document Province expects to
 * receive, tier by tier, exactly as it must appear when printed.
 *
 * Tiers, in the order money flows out of the parish:
 *   NATIONAL   → RCCG National HQ
 *   PSF        → Pastor Seed Fund (a 1% cut taken from Thanksgiving only)
 *   PROVINCIAL → Rivers Province 12 office
 *   ZONE       → Zone office
 *   AREA       → Glory Chapel Area office
 *   PARISH     → Retained by Great Joy Parish
 * ════════════════════════════════════════════════════════════════════════
 */

export type RemittanceTierName = "NATIONAL" | "PSF" | "PROVINCIAL" | "ZONE" | "AREA" | "PARISH";

export interface RemittanceTier {
  tier: RemittanceTierName;
  label: string;   // exact label as printed on the form
  pct: number;     // percentage of the gross category amount
}

/** Which section of the printed Financial Report a category's primary row appears under. */
export type FormSection = "A_B" | "C" | "D";

export interface RemittanceRule {
  category: string;        // matches Prisma IncomeCategory enum value
  formLabel: string;        // exact label as printed on the official form
  section: FormSection;     // A_B = National Remittable Funds, C = Provincial Remittable, D = Zonal/Area Remittable
  tiers: RemittanceTier[];  // must sum to 100
}

// ────────────────────────────────────────────────────────────────────────
// SECTION A & B — National Remittable Funds
// (Section A on the form just restates the gross at "100% National" before
//  the Section B tier split is applied — both are derived from the same
//  rule below, so they're modeled as one entry.)
// ────────────────────────────────────────────────────────────────────────

const NATIONAL_REMITTABLE: RemittanceRule[] = [
  {
    category: "MINISTERS_TITHE",
    formLabel: "Tithe - Ministers",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL", label: "National",      pct: 64.0 },
      { tier: "PARISH",   label: "Parish Balance", pct: 36.0 },
    ],
  },
  {
    category: "TITHE",
    formLabel: "Tithe - Congregation",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL", label: "National",      pct: 64.0 },
      { tier: "PARISH",   label: "Parish Balance", pct: 36.0 },
    ],
  },
  {
    category: "THANKSGIVING",
    formLabel: "Thanksgiving Offering",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL",   label: "National",      pct: 70.0 },
      { tier: "PSF",        label: "Pastor Seed",    pct: 1.0  },
      { tier: "PROVINCIAL", label: "Provincial",     pct: 5.0  },
      { tier: "AREA",       label: "Area",           pct: 5.0  },
      { tier: "PARISH",     label: "Parish Balance", pct: 19.0 },
    ],
  },
  {
    category: "SUNDAY_LOVE_OFFERING",
    formLabel: "Sunday Love Offering",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL",   label: "National",      pct: 10.0 },
      { tier: "PROVINCIAL", label: "Provincial",     pct: 25.0 },
      { tier: "PARISH",     label: "Parish Balance", pct: 65.0 },
    ],
  },
  {
    category: "CRM",
    formLabel: "C.R.M. Offering",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL",   label: "National",      pct: 50.0 },
      { tier: "PROVINCIAL", label: "Provincial",     pct: 25.0 },
      { tier: "PARISH",     label: "Parish Balance", pct: 25.0 },
    ],
  },
  {
    category: "GOSPEL_FUND",
    formLabel: "Gospel Fund",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL", label: "National",      pct: 25.0 },
      { tier: "PARISH",   label: "Parish Balance", pct: 75.0 },
    ],
  },
  {
    category: "TRUST_FRUIT",
    formLabel: "First Fruit",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL", label: "National",      pct: 90.0 },
      { tier: "PARISH",   label: "Parish Balance", pct: 10.0 },
    ],
  },
  {
    category: "FIRST_BORN_REDEMPTION",
    formLabel: "First Born Redemption",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL", label: "National", pct: 100.0 },
    ],
  },
  {
    category: "HOLY_GHOST_CONGRESS",
    formLabel: "Holy Ghost Congress (Viewing Centre)",
    section: "A_B",
    tiers: [
      { tier: "NATIONAL", label: "National", pct: 100.0 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────
// SECTION C — Provincial Remittable
// ────────────────────────────────────────────────────────────────────────

const PROVINCIAL_REMITTABLE: RemittanceRule[] = [
  {
    category: "AFRICAN_MISSION_OFFERING",
    formLabel: "African Mission Offering",
    section: "C",
    tiers: [{ tier: "PROVINCIAL", label: "Provincial", pct: 100.0 }],
  },
  {
    category: "CAMP_CLEARING",
    formLabel: "Camp Clearing",
    section: "C",
    tiers: [{ tier: "PROVINCIAL", label: "Provincial", pct: 100.0 }],
  },
  {
    category: "SUNDAY_SCHOOL_OFFERING",
    formLabel: "Sunday School Offering",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 70.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 30.0 },
    ],
  },
  {
    category: "JUNIOR_FELLOWSHIP",
    formLabel: "Junior Fellowship",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 35.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 65.0 },
    ],
  },
  {
    category: "HOME_FELLOWSHIP",
    formLabel: "Home Fellowship",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 30.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 70.0 },
    ],
  },
  {
    category: "GOOD_WOMEN_OFFERING",
    formLabel: "Good Women Offering",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 70.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 30.0 },
    ],
  },
  {
    category: "CSR",
    formLabel: "CSR",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 100.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 0.0 },
    ],
  },
  {
    category: "RCCG_AUDITORIUM_CONTRIBUTION",
    formLabel: "RCCG New Auditorium Contribution",
    section: "C",
    tiers: [{ tier: "PROVINCIAL", label: "Provincial", pct: 100.0 }],
  },
  {
    category: "CSR_EDUCATION",
    formLabel: "CSR Education",
    section: "C",
    tiers: [{ tier: "PROVINCIAL", label: "Provincial", pct: 100.0 }],
  },
  {
    category: "CONVENTION_CONGRESS_SUPPORT",
    formLabel: "Convention/Congress Support",
    section: "C",
    tiers: [{ tier: "PROVINCIAL", label: "Provincial", pct: 100.0 }],
  },
  {
    category: "PASTORS_WELFARE_PURSE",
    formLabel: "Others (1) Pastors Welfare Purse",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 100.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 0.0 },
    ],
  },
  {
    category: "DAY_OUT_CARD",
    formLabel: "Others (2) Day Out Card",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 100.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 0.0 },
    ],
  },
  {
    category: "VICTORY_SERVICE",
    formLabel: "Victory Service",
    section: "C",
    tiers: [
      { tier: "PROVINCIAL", label: "Provincial",     pct: 50.0 },
      { tier: "PARISH",     label: "Parish Balance",  pct: 50.0 },
    ],
  },
  {
    category: "SEED_FAITH_HOLY_COMMUNION",
    formLabel: "Seed faith, holy communion etc",
    section: "C",
    tiers: [
      { tier: "PARISH", label: "Parish Balance", pct: 100.0 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────
// SECTION D — Zonal and Area Remittable
// (Zone Tithe-Congregation and Area Thanksgiving are cuts taken from the
//  same Tithe/Thanksgiving pools — already accounted for in their primary
//  rules above. Only genuinely separate Zone-level collections go here.)
// ────────────────────────────────────────────────────────────────────────

const ZONAL_AREA_REMITTABLE: RemittanceRule[] = [
  {
    category: "ZONE_LETS_GO_AFISHING",
    formLabel: "Zone: Let's Go Afishing",
    section: "D",
    tiers: [{ tier: "ZONE", label: "Zone", pct: 100.0 }],
  },
];

export const REMITTANCE_RULES: RemittanceRule[] = [
  ...NATIONAL_REMITTABLE,
  ...PROVINCIAL_REMITTABLE,
  ...ZONAL_AREA_REMITTABLE,
];

export const REMITTANCE_RULES_BY_CATEGORY: Record<string, RemittanceRule> =
  Object.fromEntries(REMITTANCE_RULES.map(r => [r.category, r]));

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

export interface TierBreakdown {
  tier: RemittanceTierName;
  label: string;
  pct: number;
  amount: number;
}

/** Splits a gross category amount into its tier breakdown per the official rules. */
export function getWaterfall(category: string, grossAmount: number): TierBreakdown[] {
  const rule = REMITTANCE_RULES_BY_CATEGORY[category];
  if (!rule) return [{ tier: "PARISH", label: "Parish Balance", pct: 100, amount: grossAmount }];
  return rule.tiers.map(t => ({
    tier:   t.tier,
    label:  t.label,
    pct:    t.pct,
    amount: round2((grossAmount * t.pct) / 100),
  }));
}

/** Sum of all non-PARISH tiers — the total amount that must leave the parish account. */
export function getTotalRemittable(category: string, grossAmount: number): number {
  return round2(
    getWaterfall(category, grossAmount)
      .filter(t => t.tier !== "PARISH")
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

/** Amount the parish retains for a given category. */
export function getParishRetained(category: string, grossAmount: number): number {
  return round2(grossAmount - getTotalRemittable(category, grossAmount));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** All rules belonging to a given printed form section, in form order. */
export function getRulesBySection(section: FormSection): RemittanceRule[] {
  return REMITTANCE_RULES.filter(r => r.section === section);
}
