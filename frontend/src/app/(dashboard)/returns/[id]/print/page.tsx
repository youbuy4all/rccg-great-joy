"use client";

import { useState, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Printer, ArrowLeft, Loader2, Edit3, X } from "lucide-react";
import api from "@/lib/api";
import { MONTHS } from "@/lib/utils";
import { PARISH_INFO } from "@/lib/parish-info";

// ─── N:K formatter — exactly as printed on the official forms (no currency symbol) ──
function nk(n: number): string {
  return Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface PrintData {
  return: any;
  sessions: any[];
  grossByCategory: Record<string, number>;
  houseFellowshipCount: number;
  activeMemberCount: number;
  sections: { A_B: any[]; C: any[]; D: any[]; D_extra: any[] };
  totals: {
    totalNationalIncome: number;
    totalB: number; totalBParish: number;
    totalC: number; totalCParish: number;
    totalD: number;
    grandTotalRemittable: number;
    grandTotalParishBalance: number;
  };
  monetaryColumn: { label: string; category: string; gross: number; rows: { label: string; pct: number; amount: number }[] }[];
}

interface PastoralForm {
  numberOfBirths: number; numberOfDeaths: number; numberOfMarriages: number;
  newlyBaptisedWorkers: number; avgVigilAttendance: number; avgSpecialProgrammeAttendance: number;
  numberOfBaptisedWorkers: number; numberOfNewWorkers: number; numberOfDeacons: number;
  numberOfAssistantPastors: number; numberOfFullPastors: number; numberOfUnordainedMinisters: number;
  areaRequiringPraise: string; areaRequiringPrayer: string; generalWellBeing: string; otherRemarks: string;
}

// ─── Pastoral edit modal — hidden from print, fills the manual fields ──
function PastoralEditModal({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit } = useForm<PastoralForm>({
    defaultValues: {
      numberOfBirths: initial?.numberOfBirths ?? 0,
      numberOfDeaths: initial?.numberOfDeaths ?? 0,
      numberOfMarriages: initial?.numberOfMarriages ?? 0,
      newlyBaptisedWorkers: initial?.newlyBaptisedWorkers ?? 0,
      avgVigilAttendance: initial?.avgVigilAttendance ?? 0,
      avgSpecialProgrammeAttendance: initial?.avgSpecialProgrammeAttendance ?? 0,
      numberOfBaptisedWorkers: initial?.numberOfBaptisedWorkers ?? 0,
      numberOfNewWorkers: initial?.numberOfNewWorkers ?? 0,
      numberOfDeacons: initial?.numberOfDeacons ?? 0,
      numberOfAssistantPastors: initial?.numberOfAssistantPastors ?? 0,
      numberOfFullPastors: initial?.numberOfFullPastors ?? 0,
      numberOfUnordainedMinisters: initial?.numberOfUnordainedMinisters ?? 0,
      areaRequiringPraise: initial?.areaRequiringPraise ?? "",
      areaRequiringPrayer: initial?.areaRequiringPrayer ?? "",
      generalWellBeing: initial?.generalWellBeing ?? "",
      otherRemarks: initial?.otherRemarks ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (d: PastoralForm) => api.patch(`/returns/${initial.id}/pastoral`, d),
    onSuccess:  () => { onSaved(); onClose(); },
  });

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#145C14]";
  const numField = (name: keyof PastoralForm, label: string) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      <input {...register(name)} type="number" min="0" className={inp} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-serif font-bold text-gray-900 text-lg">Edit Pastoral Report Data</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {numField("numberOfBirths", "Number of Births")}
            {numField("numberOfDeaths", "Number of Deaths")}
            {numField("numberOfMarriages", "Number of Marriages")}
            {numField("newlyBaptisedWorkers", "Newly Baptised Workers")}
            {numField("avgVigilAttendance", "Avg Vigil Attendance")}
            {numField("avgSpecialProgrammeAttendance", "Avg Special Programme")}
            {numField("numberOfBaptisedWorkers", "Number of Baptised Workers")}
            {numField("numberOfNewWorkers", "Number of New Worker(s)")}
            {numField("numberOfDeacons", "Number of Deacons/Deaconess")}
            {numField("numberOfAssistantPastors", "Number of Assistant Pastors")}
            {numField("numberOfFullPastors", "Number of Full Pastors")}
            {numField("numberOfUnordainedMinisters", "Number of Unordained Ministers")}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Any area requiring special praise to God?</label>
            <textarea {...register("areaRequiringPraise")} rows={2} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Any area requiring special prayer?</label>
            <textarea {...register("areaRequiringPrayer")} rows={2} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">General well-being (Physical/Spiritual/Financial)</label>
            <textarea {...register("generalWellBeing")} rows={2} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Others</label>
            <textarea {...register("otherRemarks")} rows={2} className={inp} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={save.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] disabled:opacity-70 flex items-center justify-center gap-2">
              {save.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReturnPrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data, isLoading, refetch } = useQuery<PrintData>({
    queryKey: ["return-print-data", id],
    queryFn:  () => api.get(`/returns/${id}/print-data`).then(r => r.data),
  });

  if (isLoading || !data) {
    return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-gray-300" /></div>;
  }

  const ret = data.return;
  const monthName = MONTHS[ret.month - 1];
  const sessionsByDate = [...data.sessions].sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());

  // Average attendance by weekday grouping (matches the form's Tuesday/Thursday/Sunday average row)
  const avgByDay = (dayIndex: number) => {
    const rows = sessionsByDate.filter(s => new Date(s.serviceDate).getDay() === dayIndex);
    if (rows.length === 0) return { men: 0, women: 0, children: 0, total: 0 };
    const sum = (k: string) => rows.reduce((s, r) => s + (r[k] || 0), 0);
    return {
      men:      Math.round(sum("menCount") / rows.length),
      women:    Math.round(sum("womenCount") / rows.length),
      children: Math.round(sum("childrenCount") / rows.length),
      total:    Math.round(sum("totalCount") / rows.length),
    };
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push("/returns")} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Back to Returns
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
            <Edit3 size={14} /> Edit Pastoral Data
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A]">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; }
          body { background: white !important; }
        }
        .print-page { width: 210mm; min-height: 297mm; margin: 20px auto; background: white; padding: 12mm; box-shadow: 0 0 8px rgba(0,0,0,0.1); font-family: Georgia, serif; color: #1a1a1a; }
        .form-table, .form-table th, .form-table td { border: 1px solid #333; border-collapse: collapse; }
        .form-table th, .form-table td { padding: 3px 6px; font-size: 10px; }
        .form-title { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .section-title { font-weight: bold; font-size: 12px; background: #e8e8e8; padding: 4px 8px; }
      `}</style>

      {/* ════════════════════ PAGE 1 — Monthly General Progress Report Sheet ════════════════════ */}
      <div className="print-page">
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs leading-tight">
            <div className="font-bold">AREA: {PARISH_INFO.areaName.toUpperCase()}</div>
            <div>PARISH: {PARISH_INFO.parishName.toUpperCase()}</div>
            <div>FOR THE MONTH OF: {monthName.toUpperCase()}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-[11px] font-bold">{PARISH_INFO.province.toUpperCase()}</div>
            <div className="form-title">Monthly General Progress Report Sheet</div>
          </div>
          <div className="text-xs font-bold">YEAR: {ret.year}</div>
        </div>

        <table className="form-table w-full">
          <thead>
            <tr>
              <th rowSpan={2}>Date</th>
              <th rowSpan={2}>Days</th>
              <th colSpan={4}>Attendance</th>
              <th rowSpan={2}>Preacher</th>
              <th rowSpan={2}>New<br/>Converts</th>
              <th rowSpan={2}>New<br/>Guest</th>
              <th rowSpan={2}>Sunday<br/>School</th>
              <th rowSpan={2}>House<br/>Fellowship</th>
            </tr>
            <tr>
              <th>Men</th><th>Women</th><th>Children</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sessionsByDate.map(s => {
              const d = new Date(s.serviceDate);
              const isSunday = d.getDay() === 0;
              return (
                <tr key={s.id} className={isSunday ? "font-bold" : ""} style={isSunday ? { color: "#b91c1c" } : undefined}>
                  <td>{d.toLocaleDateString("en-GB")}</td>
                  <td>{DAY_NAMES[d.getDay()]}</td>
                  <td className="text-center">{s.menCount || ""}</td>
                  <td className="text-center">{s.womenCount || ""}</td>
                  <td className="text-center">{s.childrenCount || ""}</td>
                  <td className="text-center font-bold">{s.totalCount || ""}</td>
                  <td>{s.preacher || ""}</td>
                  <td className="text-center"></td>
                  <td className="text-center"></td>
                  <td className="text-center">{s.sundaySchoolCount || ""}</td>
                  <td className="text-center">{s.houseFellowshipCount || ""}</td>
                </tr>
              );
            })}
            {sessionsByDate.length === 0 && (
              <tr><td colSpan={11} className="text-center py-4 text-gray-400">No sessions logged for {monthName} {ret.year}</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={2}>Average Attendance</td>
              <td className="text-center">Men</td><td className="text-center">Women</td><td className="text-center">Children</td><td className="text-center">Total</td>
              <td colSpan={5}></td>
            </tr>
            {[{ label: "Tuesday", day: 2 }, { label: "Thursday", day: 4 }, { label: "Sunday", day: 0 }].map(row => {
              const avg = avgByDay(row.day);
              return (
                <tr key={row.label} className={row.label === "Sunday" ? "font-bold" : ""} style={row.label === "Sunday" ? { color: "#b91c1c" } : undefined}>
                  <td colSpan={2}>{row.label}</td>
                  <td className="text-center">{avg.men}</td>
                  <td className="text-center">{avg.women}</td>
                  <td className="text-center">{avg.children}</td>
                  <td className="text-center">{avg.total}</td>
                  <td colSpan={5}></td>
                </tr>
              );
            })}
          </tfoot>
        </table>

        {/* Monetary summary box */}
        <table className="form-table w-full mt-3">
          <thead><tr><th colSpan={3} className="text-center">Monetary</th></tr></thead>
          <tbody>
            {data.monetaryColumn.map(item => (
              <Fragment key={item.category}>
                <tr className="font-bold bg-gray-50">
                  <td colSpan={3}>{item.label}</td>
                </tr>
                {item.rows.map((r, i) => (
                  <tr key={`${item.category}-${i}`}>
                    <td className="w-1/2"></td>
                    <td className="text-center w-1/6">{r.label}</td>
                    <td className="text-right w-1/3">N {nk(r.amount)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="font-bold" style={{ background: "#d4edda" }}>
              <td colSpan={2}>TOTAL AMOUNT REMITTED (NGN)</td>
              <td className="text-right">N {nk(data.totals.totalB)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between mt-8 pt-4">
          <div className="text-xs">
            <div className="border-t border-black w-48 pt-1">BRO PETER OROGUN</div>
            <div>TREASURER&apos;S NAME, SIGN. &amp; DATE</div>
          </div>
          <div className="text-xs">
            <div className="border-t border-black w-48 pt-1">{PARISH_INFO.pastorTitle}. {PARISH_INFO.pastorFullName}</div>
            <div>PASTOR&apos;S NAME, SIGN. &amp; DATE</div>
          </div>
        </div>
      </div>

      {/* ════════════════════ PAGE 2 — Financial Report ════════════════════ */}
      <div className="print-page">
        <div className="text-center mb-3">
          <div className="font-bold text-sm">THE REDEEMED CHRISTIAN CHURCH OF GOD</div>
          <div className="font-bold text-sm">{PARISH_INFO.province.toUpperCase()}</div>
          <div className="form-title mt-1">Financial Report for the Month of: {monthName.toUpperCase()} <span className="ml-4">Year: {ret.year}</span></div>
          <div className="text-xs mt-1">AREA: {PARISH_INFO.areaName.toUpperCase()} AREA &nbsp;&nbsp;&nbsp; PARISH: {PARISH_INFO.parishName.toUpperCase()}</div>
        </div>

        {/* Section A */}
        <table className="form-table w-full">
          <thead>
            <tr>
              <th>S/NO</th><th>ITEMS</th><th colSpan={2}>National</th><th colSpan={2}>Parish</th>
            </tr>
            <tr><th></th><th>NATIONAL REMITTABLE FUNDS</th><th>%</th><th>N:K</th><th>%</th><th>N:K</th></tr>
          </thead>
          <tbody>
            {data.sections.A_B.map((r, i) => (
              <tr key={r.category}>
                <td className="text-center">{i + 1}</td>
                <td>{r.formLabel}</td>
                <td className="text-center">100%</td>
                <td className="text-right">{nk(r.gross)}</td>
                <td colSpan={2} className="text-center text-gray-300">—</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan={2}>TOTAL NATIONAL INCOME (A)</td>
              <td></td>
              <td className="text-right">{nk(data.totals.totalNationalIncome)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>

        {/* Section B */}
        <table className="form-table w-full mt-2">
          <thead>
            <tr><th colSpan={6} className="section-title">B. NATIONAL REMITTABLE</th></tr>
            <tr><th>S/NO</th><th>ITEMS</th><th>%</th><th>N:K</th><th>Parish %</th><th>Parish N:K</th></tr>
          </thead>
          <tbody>
            {data.sections.A_B.map((r, i) => {
              const nonParish = r.waterfall.filter((t: any) => t.tier !== "PARISH");
              const parish    = r.waterfall.find((t: any) => t.tier === "PARISH");
              return nonParish.map((t: any, ti: number) => (
                <tr key={`${r.category}-${ti}`}>
                  {ti === 0 && <td className="text-center" rowSpan={nonParish.length}>{i + 1}</td>}
                  {ti === 0 && <td rowSpan={nonParish.length}>{r.formLabel}</td>}
                  <td className="text-center">{t.pct.toFixed(1)}%{t.tier !== "NATIONAL" ? ` (${t.label})` : ""}</td>
                  <td className="text-right">{nk(t.amount)}</td>
                  {ti === 0 && <td className="text-center" rowSpan={nonParish.length}>{parish ? `${parish.pct.toFixed(2)}%` : "—"}</td>}
                  {ti === 0 && <td className="text-right" rowSpan={nonParish.length}>{parish ? nk(parish.amount) : "—"}</td>}
                </tr>
              ));
            })}
            <tr className="font-bold" style={{ background: "#f8d7da" }}>
              <td colSpan={3}>TOTAL (B)</td>
              <td className="text-right">{nk(data.totals.totalB)}</td>
              <td></td>
              <td className="text-right" style={{ background: "#d4edda" }}>{nk(data.totals.totalBParish)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section C */}
        <table className="form-table w-full mt-2">
          <thead>
            <tr><th colSpan={4} className="section-title">C. PROVINCIAL REMITTABLE</th></tr>
            <tr><th>S/NO</th><th>ITEMS</th><th>%</th><th>N:K</th></tr>
          </thead>
          <tbody>
            {data.sections.C.map((r, i) => {
              const provincial = r.waterfall.find((t: any) => t.tier === "PROVINCIAL");
              return (
                <tr key={r.category}>
                  <td className="text-center">{i + 1}</td>
                  <td>{r.formLabel}</td>
                  <td className="text-center">{provincial ? `${provincial.pct.toFixed(0)}%` : "—"}</td>
                  <td className="text-right">{provincial ? nk(provincial.amount) : "0.00"}</td>
                </tr>
              );
            })}
            <tr className="font-bold" style={{ background: "#f8d7da" }}>
              <td colSpan={3}>TOTAL (C)</td>
              <td className="text-right">{nk(data.totals.totalC)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section D */}
        <table className="form-table w-full mt-2">
          <thead>
            <tr><th colSpan={4} className="section-title">D. ZONAL AND AREA REMITTABLE</th></tr>
            <tr><th colSpan={2}>ITEM</th><th>%</th><th>N:K</th></tr>
          </thead>
          <tbody>
            {data.sections.D.map(r => {
              const tier = r.waterfall[0];
              return (
                <tr key={r.category}>
                  <td colSpan={2}>{r.formLabel}</td>
                  <td className="text-center">{tier ? `${tier.pct.toFixed(0)}%` : "—"}</td>
                  <td className="text-right">{tier ? nk(tier.amount) : "0.00"}</td>
                </tr>
              );
            })}
            {data.sections.D_extra.map((r: any, i: number) => (
              <tr key={`extra-${i}`}>
                <td colSpan={2}>{r.formLabel}</td>
                <td className="text-center">{r.pct ? `${r.pct.toFixed(0)}%` : "0.0%"}</td>
                <td className="text-right">{nk(r.amount)}</td>
              </tr>
            ))}
            <tr className="font-bold" style={{ background: "#f8d7da" }}>
              <td colSpan={3}>TOTAL (D)</td>
              <td className="text-right">{nk(data.totals.totalD)}</td>
            </tr>
            <tr className="font-bold" style={{ background: "#fff3cd" }}>
              <td colSpan={3}>TOTAL (B+C+D)</td>
              <td className="text-right">{nk(data.totals.grandTotalRemittable)}</td>
            </tr>
          </tbody>
        </table>

        {/* Grand totals summary — National Remittable vs Parish Balance, matching the form's bottom row */}
        <table className="form-table w-full mt-2">
          <tbody>
            <tr className="font-bold">
              <td className="w-1/2 text-center" style={{ background: "#fff3cd" }}>
                TOTAL REMITTABLE (B+C+D): N {nk(data.totals.grandTotalRemittable)}
              </td>
              <td className="w-1/2 text-center" style={{ background: "#d4edda" }}>
                PARISH BALANCE: N {nk(data.totals.grandTotalParishBalance)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between mt-8 pt-4 text-xs">
          <div>
            <div>Pastor in Charge of Parish&apos;s Sign &amp; Date: <span className="border-b border-black inline-block w-40">&nbsp;</span></div>
          </div>
          <div>
            <div>Checked &amp; Collected by: Name <span className="border-b border-black inline-block w-40">&nbsp;</span></div>
          </div>
        </div>
      </div>

      {/* ════════════════════ PAGE 3 — Pastoral Report ════════════════════ */}
      <div className="print-page text-sm">
        <div className="text-center mb-4">
          <div className="font-bold">{PARISH_INFO.province.toUpperCase()}</div>
          <div className="form-title">Pastoral Report — {monthName} {ret.year}</div>
        </div>

        <div className="font-bold text-base mb-2">A. PASTORAL</div>
        <table className="w-full text-sm">
          <tbody>
            {[
              ["1", "Number of Birth:", ret.numberOfBirths || "NONE"],
              ["2", "Number of Death:", ret.numberOfDeaths || "NONE"],
              ["3", "Number of Marriages:", ret.numberOfMarriages || "NONE"],
              ["5", "Number of House Fellowship Centres:", data.houseFellowshipCount],
              ["6", "Number of Newly Baptised Workers During the Month:", ret.newlyBaptisedWorkers || "NONE"],
              ["7", "Average Attendance at Vigil:", ret.avgVigilAttendance || ""],
              ["8", "Average Attendance of Other Special Programmes:", ret.avgSpecialProgrammeAttendance || ""],
              ["9", "Number of Baptised Workers:", ret.numberOfBaptisedWorkers || ""],
              ["10", "Number of New Worker(s):", ret.numberOfNewWorkers || "NONE"],
              ["11", "Number of Deacons/Deaconess:", ret.numberOfDeacons || ""],
              ["12", "Number of Assistant Pastors:", ret.numberOfAssistantPastors || "NONE"],
              ["13", "Number of Full Pastors:", ret.numberOfFullPastors || "NONE"],
              ["14", "Number of Unordained Ministers:", ret.numberOfUnordainedMinisters || ""],
            ].map(([num, label, val]) => (
              <tr key={num}>
                <td className="w-6 align-top py-1">{num}</td>
                <td className="py-1">{label}</td>
                <td className="text-right font-bold py-1 pr-4">{val}</td>
              </tr>
            ))}
            <tr>
              <td className="w-6 align-top py-1">15</td>
              <td colSpan={2} className="py-1">
                Name of Parish (Give Detailed Address of the Parish): {PARISH_INFO.fullAddress}.
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3">Title &amp; Full Name of Pastor/Minister In-Charge (Surname First): {PARISH_INFO.pastorTitle} {PARISH_INFO.pastorFullName}</div>
        <div className="mt-1">Phone number of Pastor/Minister In-Charge of Parish: {PARISH_INFO.pastorPhone}</div>

        <div className="font-bold text-base mt-5 mb-2">GENERAL</div>
        <div className="space-y-3">
          <div><span className="font-semibold">1&nbsp;&nbsp;Any area requiring special praise to God?:</span> {ret.areaRequiringPraise || ""}</div>
          <div><span className="font-semibold">2&nbsp;&nbsp;Any area requiring special prayer?:</span> {ret.areaRequiringPrayer || ""}</div>
          <div>
            <span className="font-semibold">3&nbsp;&nbsp;General well-being of congregation: (Physical (Health), Spiritual (revival needed))? Financial etc.:</span>
            <div className="mt-1">{ret.generalWellBeing || ""}</div>
          </div>
          <div><span className="font-semibold italic">4&nbsp;&nbsp;Others</span> {ret.otherRemarks || ""}</div>
        </div>

        <div className="flex justify-between mt-12 pt-4 text-xs">
          <div>
            <div className="border-t border-black w-48 pt-1">{ret.submittedAt ? new Date(ret.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "____________"}</div>
            <div>Date</div>
          </div>
          <div className="text-right">
            <div className="border-t border-black w-48 pt-1">&nbsp;</div>
            <div>Signature</div>
          </div>
        </div>

        <div className="mt-10 text-xs">
          <div className="font-bold">NOTES:</div>
          {PARISH_INFO.noteRecipients.map((n, i) => <div key={i}>{n}</div>)}
        </div>
      </div>

      {showEdit && (
        <PastoralEditModal
          initial={ret}
          onClose={() => setShowEdit(false)}
          onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["returns"] }); }}
        />
      )}
    </div>
  );
}
