import { NextRequest } from "next/server";
import { ok, err, withAuth } from "@/lib/api-helpers";

const HANDWRITTEN_PROMPT = `You are extracting church service records from a handwritten note for RCCG Great Joy Parish, Nigeria.

The note contains multiple services (Sunday, Tuesday, Thursday) listed one after another.

For each service, extract:
1. The date and service type
2. Attendance figures (M = Men, F = Females/Women, C = Children)
3. Preacher name
4. Offering amounts and categories

CRITICAL RULES:
- Tuesday and Thursday offerings are ALWAYS category "CRM" only — regardless of any label written
- If an amount is followed by "online" → paymentMethod is "TRANSFER", otherwise "CASH"
- If total attendance is not written, calculate: Men + Women + Children
- For dates without a year (e.g. "26/5"), use the same year as the most recent full date in the note
- Amounts: remove commas and symbols (e.g. 1,300 → 1300)

SERVICE TYPE — use EXACTLY one of these values for the "serviceType" field:
- Sunday service → "SUNDAY_MORNING"
- Tuesday service → "TUESDAY"
- Thursday service → "THURSDAY"
(Do not invent other values such as "SUNDAY_SERVICE" — only the three above are valid.)

CATEGORY MAPPING — use EXACTLY these field names:
"Workers Offering" / "Workers Office" / "Gospel Fund"            → "GOSPEL_FUND"
"Sun Sch Off" / "Sunday School Offering"                         → "SUNDAY_SCHOOL_OFFERING"
"Seed of faith" / "Seed Faith" / "Holy Communion"                → "SEED_FAITH_HOLY_COMMUNION"
"S.L.O" / "Sunday Love Offering"                                 → "SUNDAY_LOVE_OFFERING"
"Gen Tithe" / "General Tithe" / "Congregation Tithe"             → "TITHE"
"Ministers Tithe" / "Pastor Tithe"                               → "MINISTERS_TITHE"
"Thanksgiving" / "Thanksgiving Offering"                         → "THANKSGIVING"
"CRM" / "C.R.M" / "Offering" on Tuesday or Thursday             → "CRM"
"Church Project" / "Project Fund" / "Parish Project"             → "CHURCH_PROJECT"
"First Fruit" / "Trust Fruit"                                    → "TRUST_FRUIT"
"1st Born Redemption" / "First Born Redemption"                  → "FIRST_BORN_REDEMPTION"
"Junior Fellowship" / "Jr Fellowship"                            → "JUNIOR_FELLOWSHIP"
"Home Fellowship" / "HF Offering"                                → "HOME_FELLOWSHIP"
"House Fellowship Offering"                                      → "HOUSE_FELLOWSHIP_OFFERING"
"Good Women Offering" / "GWO"                                    → "GOOD_WOMEN_OFFERING"
"African Mission Offering" / "AMO"                               → "AFRICAN_MISSION_OFFERING"
"Camp Clearing"                                                  → "CAMP_CLEARING"
"Holy Ghost Congress" / "HGC" / "Viewing Centre"                 → "HOLY_GHOST_CONGRESS"
"RCCG Auditorium" / "New Auditorium Contribution"                → "RCCG_AUDITORIUM_CONTRIBUTION"
"CSR Education"                                                  → "CSR_EDUCATION"
"CSR"                                                            → "CSR"
"Convention Support" / "Congress Support"                        → "CONVENTION_CONGRESS_SUPPORT"
"Pastors Welfare Purse" / "PWP"                                  → "PASTORS_WELFARE_PURSE"
"Day Out Card"                                                   → "DAY_OUT_CARD"
"Victory Service"                                                → "VICTORY_SERVICE"
"Lets Go Afishing" / "Zone Afishing"                             → "ZONE_LETS_GO_AFISHING"
"Convention Levy"                                                → "CONVENTION_LEVY"
"Partnership Seed" / "Partnership"                               → "PARTNERSHIP_SEED"
"Building Fund"                                                  → "BUILDING_FUND"
"Children / Teens Offering" / "CTO"                              → "CHILDREN_TEENS_OFFERING"
"RUN" / "Redeemers University"                                   → "RUN"
"Special Donation"                                               → "SPECIAL_DONATION"
"Welfare Offering"                                               → "WELFARE"
"Other Income" / "Others" / anything not listed above            → "OTHER_INCOME"

Return ONLY a valid JSON array. No markdown, no explanation, no text before or after the array:
[
  {
    "date": "2026-05-24",
    "serviceType": "SUNDAY_MORNING",
    "attendance": {
      "men": 9,
      "women": 20,
      "children": 45,
      "total": 74,
      "preacher": "Sis Sylvia Ogbunu"
    },
    "offerings": [
      { "category": "GOSPEL_FUND",            "amount": 1300, "paymentMethod": "CASH" },
      { "category": "SUNDAY_SCHOOL_OFFERING", "amount": 700,  "paymentMethod": "CASH" },
      { "category": "SUNDAY_LOVE_OFFERING",   "amount": 6400, "paymentMethod": "CASH" },
      { "category": "TITHE",                  "amount": 3000, "paymentMethod": "CASH" }
    ]
  },
  {
    "date": "2026-05-26",
    "serviceType": "TUESDAY",
    "attendance": {
      "men": 3,
      "women": 5,
      "children": 13,
      "total": 21,
      "preacher": "A/P Rotimi Olaegbe"
    },
    "offerings": [
      { "category": "CRM", "amount": 2250, "paymentMethod": "CASH" }
    ]
  }
]`;

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const { image, imageType } = await req.json();

    if (!image) return err("Image is required", 400);

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return err("GOOGLE_API_KEY not configured", 500);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: imageType || "image/jpeg",
                  data:      image,
                },
              },
              { text: HANDWRITTEN_PROMPT },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return err(`Gemini API error: ${detail}`, 502);
    }

    const aiData = await response.json();
    const raw    = aiData.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text || "").join("") ?? "";

    const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let extracted: any[];
    try {
      extracted = JSON.parse(clean);
      if (!Array.isArray(extracted)) throw new Error("Not an array");
    } catch {
      return err(`Could not parse Gemini response. Raw: ${raw.slice(0, 400)}`, 422);
    }

    const summary = {
      totalServices:     extracted.length,
      totalTransactions: extracted.reduce((n, r) => n + (r.offerings?.length ?? 0), 0),
      totalAmount:       extracted.reduce((s, r) =>
        s + (r.offerings ?? []).reduce((a: number, o: any) => a + Number(o.amount || 0), 0), 0),
    };

    return ok({ extracted, summary });
  }, ["PASTOR", "TREASURER", "SECRETARY", "SUPER_ADMIN"]);
}
