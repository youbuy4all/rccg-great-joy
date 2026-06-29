import { NextRequest } from "next/server";
import { ok, err, withAuth } from "@/lib/api-helpers";

const EXTRACTION_PROMPT = `You are extracting church offering data from two scanned forms for RCCG Great Joy Parish, Rivers Province 12, Nigeria.

THE FIRST IMAGE is the Finance/Offering sheet — it shows monetary amounts per service row, with offering categories as columns.
THE SECOND IMAGE is the Attendance/Progress Report sheet — it shows the DATE and DAY for each service row.

Both forms cover the exact same month. Each numbered row in Image 1 corresponds to the same row in Image 2 (row 1 matches row 1, row 2 matches row 2, etc.).

TASK:
1. From Image 2, read the date (e.g. 18/2/24) and day (SUNDAY, TUESDAY, THURSDAY) for each row that has a date.
2. From Image 1, read the offering amounts for that same row.
3. Only include rows that have at least one offering amount greater than zero.
4. Skip rows that are completely empty.

SERVICE TYPE MAPPING:
- SUNDAY → "SUNDAY_SERVICE"
- TUESDAY → "TUESDAY_SERVICE"
- THURSDAY → "THURSDAY_SERVICE"

COLUMN NAME MAPPING (Image 1 headers → use these exact field names):
- "Ministers Tithes" or "Ministers Tithe" → "MINISTERS_TITHE"
- "Members Tithes" or "Congregation Tithe" or "Members Tithe" → "TITHE"
- "Thanksgiving Offering" or "Thanksgiving" → "THANKSGIVING"
- "Sunday Love Offering" → "SUNDAY_LOVE_OFFERING"
- "CRM" or "C.R.M." or "CRM Offering" → "CRM"
- "Gospel Fund" or "Workers Offering" → "GOSPEL_FUND"
- "First Fruit" or "Trust Fruit" → "TRUST_FRUIT"
- "1st Born Redemption" or "First Born Redemption" → "FIRST_BORN_REDEMPTION"
- "Sunday School Offering" or "Sunday School" → "SUNDAY_SCHOOL_OFFERING"
- "Junior Fellowship" → "JUNIOR_FELLOWSHIP"
- "Home Fellowship" → "HOME_FELLOWSHIP"
- "Church Project" or "Project Fund" → "CHURCH_PROJECT"

NUMBER FORMAT:
- Remove commas and currency symbols (e.g. ₦4,080.00 → 4080)
- Use plain numbers only (integers or decimals)
- Empty cell, dash (-), or zero → omit that field entirely

DATE FORMAT: Convert to YYYY-MM-DD (e.g. 18/2/24 → 2024-02-18, 3/3/24 → 2024-03-03)

Return ONLY a valid JSON array. No markdown code blocks, no explanation, no text before or after:
[
  {
    "date": "2024-02-18",
    "serviceType": "SUNDAY_SERVICE",
    "offerings": {
      "SUNDAY_LOVE_OFFERING": 4080,
      "SUNDAY_SCHOOL_OFFERING": 280,
      "CHURCH_PROJECT": 2800
    }
  },
  {
    "date": "2024-02-20",
    "serviceType": "TUESDAY_SERVICE",
    "offerings": {
      "CRM": 1400
    }
  }
]`;

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const { financeImage, financeImageType, attendanceImage, attendanceImageType } = body;

    if (!financeImage)    return err("Finance sheet image is required", 400);
    if (!attendanceImage) return err("Attendance sheet image is required", 400);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return err("GROQ_API_KEY not configured", 500);

    const financeMime     = financeImageType    || "image/jpeg";
    const attendanceMime  = attendanceImageType || "image/jpeg";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${financeMime};base64,${financeImage}` },
              },
              {
                type: "image_url",
                image_url: { url: `data:${attendanceMime};base64,${attendanceImage}` },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return err(`Groq API error: ${detail}`, 502);
    }

    const aiData = await response.json();
    const raw    = aiData.choices?.[0]?.message?.content ?? "";

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let extracted: any[];
    try {
      extracted = JSON.parse(clean);
      if (!Array.isArray(extracted)) throw new Error("Not an array");
    } catch {
      return err(`Could not parse AI response. Raw: ${raw.slice(0, 300)}`, 422);
    }

    // Summarise for the preview
    const summary = {
      totalRows:         extracted.length,
      totalTransactions: extracted.reduce((n, row) => n + Object.keys(row.offerings || {}).length, 0),
      totalAmount:       extracted.reduce((s, row) =>
        s + Object.values(row.offerings || {}).reduce((a: number, v: any) => a + Number(v), 0), 0),
    };

    return ok({ extracted, summary });
  }, ["PASTOR", "TREASURER", "SUPER_ADMIN"]);
}
