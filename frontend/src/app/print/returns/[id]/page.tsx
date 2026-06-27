"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Printer, ArrowLeft, Loader2, Edit3, X, FileDown } from "lucide-react";
import api from "@/lib/api";
import { MONTHS } from "@/lib/utils";
import { PARISH_INFO } from "@/lib/parish-info";
import { useAuthStore } from "@/store/auth";

function nk(n: number) {
  return Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface PrintData {
  return: any;
  sessions: any[];
  grossByCategory: Record<string, number>;
  houseFellowshipCount: number;
  activeMemberCount: number;
  treasurerName: string;
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

function PastoralEditModal({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit } = useForm<PastoralForm>({ defaultValues: {
    numberOfBirths: initial?.numberOfBirths ?? 0, numberOfDeaths: initial?.numberOfDeaths ?? 0,
    numberOfMarriages: initial?.numberOfMarriages ?? 0, newlyBaptisedWorkers: initial?.newlyBaptisedWorkers ?? 0,
    avgVigilAttendance: initial?.avgVigilAttendance ?? 0, avgSpecialProgrammeAttendance: initial?.avgSpecialProgrammeAttendance ?? 0,
    numberOfBaptisedWorkers: initial?.numberOfBaptisedWorkers ?? 0, numberOfNewWorkers: initial?.numberOfNewWorkers ?? 0,
    numberOfDeacons: initial?.numberOfDeacons ?? 0, numberOfAssistantPastors: initial?.numberOfAssistantPastors ?? 0,
    numberOfFullPastors: initial?.numberOfFullPastors ?? 0, numberOfUnordainedMinisters: initial?.numberOfUnordainedMinisters ?? 0,
    areaRequiringPraise: initial?.areaRequiringPraise ?? "", areaRequiringPrayer: initial?.areaRequiringPrayer ?? "",
    generalWellBeing: initial?.generalWellBeing ?? "", otherRemarks: initial?.otherRemarks ?? "",
  }});
  const save = useMutation({ mutationFn: (d: PastoralForm) => api.patch(`/returns/${initial.id}/pastoral`, d), onSuccess: () => { onSaved(); onClose(); } });
  const inp = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#145C14]";
  const num = (name: keyof PastoralForm, label: string) => (
    <div><label className="block text-xs font-bold text-gray-500 mb-1">{label}</label><input {...register(name)} type="number" min="0" className={inp} /></div>
  );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-serif font-bold text-gray-900 text-lg">Edit Pastoral Report Data</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><X size={14}/></button>
        </div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {num("numberOfBirths","Births")} {num("numberOfDeaths","Deaths")} {num("numberOfMarriages","Marriages")}
            {num("newlyBaptisedWorkers","Newly Baptised Workers")} {num("avgVigilAttendance","Avg Vigil Attendance")}
            {num("avgSpecialProgrammeAttendance","Avg Special Programme")} {num("numberOfBaptisedWorkers","Baptised Workers")}
            {num("numberOfNewWorkers","New Workers")} {num("numberOfDeacons","Deacons/Deaconess")}
            {num("numberOfAssistantPastors","Asst Pastors")} {num("numberOfFullPastors","Full Pastors")} {num("numberOfUnordainedMinisters","Unordained Ministers")}
          </div>
          {[["areaRequiringPraise","Area requiring special praise"],["areaRequiringPrayer","Area requiring special prayer"],["generalWellBeing","General well-being"],["otherRemarks","Others"]].map(([name, label]) => (
            <div key={name}><label className="block text-xs font-bold text-gray-500 mb-1">{label}</label><textarea {...register(name as keyof PastoralForm)} rows={2} className={inp}/></div>
          ))}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={save.isPending} className="flex-1 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] disabled:opacity-70 flex items-center justify-center gap-2">
              {save.isPending ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StandaloneReturnPrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const [showEdit, setShowEdit] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn) router.replace("/login");
  }, [isLoggedIn, router]);

  const { data, isLoading, refetch } = useQuery<PrintData>({
    queryKey: ["return-print-data", id],
    queryFn:  () => api.get(`/returns/${id}/print-data`).then(r => r.data),
    enabled:  !!id && isLoggedIn,
  });

  // ── PDF Download ──────────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!data || !pagesRef.current) return;
    setPdfLoading(true);
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const pages = pagesRef.current.querySelectorAll<HTMLElement>(".print-page");
      const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const A4_W  = 210;
      const A4_H  = 297;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale:    2,
          useCORS:  true,
          logging:  false,
          backgroundColor: "#ffffff",
        });

        const imgW  = A4_W;
        const imgH  = (canvas.height / canvas.width) * A4_W;
        const totalPages = Math.ceil(imgH / A4_H);

        for (let p = 0; p < totalPages; p++) {
          if (i > 0 || p > 0) pdf.addPage();
          const yOffset = -(p * A4_H);
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, yOffset, imgW, imgH);
        }
      }

      const monthName = MONTHS[(data.return.month ?? 1) - 1];
      pdf.save(`RCCG-Great-Joy-${monthName}-${data.return.year}.pdf`);
    } catch (e) {
      alert("PDF generation failed. Use the Print button and choose 'Save as PDF' in the dialog.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!isLoggedIn) return null;

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#145C14]" />
      </div>
    );
  }

  const ret = data.return;
  const monthName = MONTHS[ret.month - 1];
  const sessions  = [...data.sessions].sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());

  const avgByDay = (dayIndex: number) => {
    const rows = sessions.filter(s => new Date(s.serviceDate).getDay() === dayIndex);
    if (!rows.length) return { men: 0, women: 0, children: 0, total: 0 };
    const sum = (k: string) => rows.reduce((s, r) => s + (r[k] || 0), 0);
    return {
      men:      Math.round(sum("menCount") / rows.length),
      women:    Math.round(sum("womenCount") / rows.length),
      children: Math.round(sum("childrenCount") / rows.length),
      total:    Math.round(sum("totalCount") / rows.length),
    };
  };

  return (
    <>
      <style>{`
        /* ── Screen styles ── */
        body { background: #f3f4f6; margin: 0; }

        .print-page {
          width: 210mm;
          margin: 20px auto;
          background: white;
          padding: 10mm 12mm;
          box-shadow: 0 0 12px rgba(0,0,0,0.12);
          font-family: Georgia, "Times New Roman", serif;
          color: #1a1a1a;
          font-size: 10pt;
          box-sizing: border-box;
        }

        .form-table { width: 100%; border-collapse: collapse; }
        .form-table th, .form-table td { border: 1px solid #333; padding: 3px 5px; font-size: 9pt; }
        .form-table th { background: #f0f0f0; font-weight: bold; }
        .section-header { background: #e8e8e8; font-weight: bold; font-size: 10pt; padding: 4px 6px; }

        /* ── Print / PDF styles ── */
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Kill ALL layout containers that dashboard wraps us in */
          body > * { display: block !important; height: auto !important; overflow: visible !important; }
          body > * > * { display: block !important; height: auto !important; overflow: visible !important; }

          aside, header, nav, .no-print { display: none !important; }

          main {
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            background: white !important;
            flex: none !important;
          }

          .print-page {
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: auto !important;
          }

          /* Last page — no extra blank page after it */
          .print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Allow tables to break across print pages naturally */
          .form-table { page-break-inside: auto !important; }
          .form-table thead { display: table-header-group; }
          .form-table tr { page-break-inside: avoid !important; break-inside: avoid !important; }

          /* Preserve all colors */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push("/returns")} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={15}/> Back to Returns
        </button>
        <div className="text-sm font-bold text-gray-700">{monthName} {ret.year} Return — Great Joy Parish</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
            <Edit3 size={14}/> Edit Pastoral
          </button>
          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60">
            {pdfLoading ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14}/>}
            {pdfLoading ? "Generating…" : "Save as PDF"}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition">
            <Printer size={15}/> Print
          </button>
        </div>
      </div>

      {/* ── All 3 print pages ── */}
      <div ref={pagesRef}>

        {/* ══════════════ PAGE 1 — Monthly General Progress Report ══════════════ */}
        <div className="print-page">
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"6px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:"8px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="RCCG" style={{ width:"44px", height:"44px", borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
              <div style={{ fontSize:"9pt", lineHeight:1.4 }}>
                <div style={{ fontWeight:"bold" }}>AREA: {PARISH_INFO.areaName.toUpperCase()}</div>
                <div>PARISH: {PARISH_INFO.parishName.toUpperCase()}</div>
                <div>FOR THE MONTH OF: {monthName.toUpperCase()}</div>
              </div>
            </div>
            <div style={{ textAlign:"center", flex:1, padding:"0 8px" }}>
              <div style={{ fontSize:"9pt", fontWeight:"bold" }}>{PARISH_INFO.province.toUpperCase()}</div>
              <div style={{ fontWeight:"bold", fontSize:"11pt", textTransform:"uppercase" }}>Monthly General Progress Report Sheet</div>
            </div>
            <div style={{ fontSize:"9pt", fontWeight:"bold", whiteSpace:"nowrap" }}>YEAR: {ret.year}</div>
          </div>

          {/* Attendance table */}
          <table className="form-table">
            <thead>
              <tr>
                <th rowSpan={2}>Date</th><th rowSpan={2}>Days</th>
                <th colSpan={4}>Attendance</th>
                <th rowSpan={2}>Preacher</th>
                <th rowSpan={2}>New<br/>Converts</th><th rowSpan={2}>New<br/>Guest</th>
                <th rowSpan={2}>Sunday<br/>School Attend</th><th rowSpan={2}>House<br/>Fellowship</th>
                <th rowSpan={2} colSpan={2}>MONETARY</th>
              </tr>
              <tr><th>Men</th><th>Women</th><th>Children</th><th>Total</th></tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const d = new Date(s.serviceDate);
                const isSun = d.getDay() === 0;
                return (
                  <tr key={s.id} style={isSun ? { color:"#b91c1c", fontWeight:"bold" } : undefined}>
                    <td>{d.toLocaleDateString("en-GB")}</td>
                    <td>{DAY_NAMES[d.getDay()]}</td>
                    <td style={{ textAlign:"center" }}>{s.menCount || ""}</td>
                    <td style={{ textAlign:"center" }}>{s.womenCount || ""}</td>
                    <td style={{ textAlign:"center" }}>{s.childrenCount || ""}</td>
                    <td style={{ textAlign:"center", fontWeight:"bold" }}>{s.totalCount || ""}</td>
                    <td>{s.preacher || ""}</td>
                    <td style={{ textAlign:"center" }}></td>
                    <td style={{ textAlign:"center" }}></td>
                    <td style={{ textAlign:"center" }}>{s.sundaySchoolCount || ""}</td>
                    <td style={{ textAlign:"center" }}>{s.houseFellowshipCount || ""}</td>
                    <td colSpan={2}></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight:"bold", background:"#f0f0f0" }}>
                <td colSpan={2}>Average Attendance</td>
                <td style={{ textAlign:"center" }}>Men</td><td style={{ textAlign:"center" }}>Women</td>
                <td style={{ textAlign:"center" }}>Children</td><td style={{ textAlign:"center" }}>Total</td>
                <td colSpan={6}></td>
              </tr>
              {[{ label:"TUESDAY", day:2 },{ label:"THURSDAY", day:4 },{ label:"SUNDAY", day:0 }].map(row => {
                const avg = avgByDay(row.day);
                return (
                  <tr key={row.label} style={row.label === "SUNDAY" ? { color:"#b91c1c", fontWeight:"bold" } : { fontWeight:"bold" }}>
                    <td colSpan={2}>{row.label}</td>
                    <td style={{ textAlign:"center" }}>{avg.men || ""}</td>
                    <td style={{ textAlign:"center" }}>{avg.women || ""}</td>
                    <td style={{ textAlign:"center" }}>{avg.children || ""}</td>
                    <td style={{ textAlign:"center" }}>{avg.total || ""}</td>
                    <td colSpan={6}></td>
                  </tr>
                );
              })}
            </tfoot>
          </table>

          {/* Monetary summary */}
          <table className="form-table" style={{ marginTop:"8px" }}>
            <thead><tr><th colSpan={3} style={{ textAlign:"center", background:"#d4edda" }}>MONETARY</th></tr></thead>
            <tbody>
              {data.monetaryColumn.map(item => (
                <Fragment key={item.category}>
                  <tr style={{ fontWeight:"bold", background:"#f8f8f8" }}><td colSpan={3}>{item.label}</td></tr>
                  {item.rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ width:"50%" }}></td>
                      <td style={{ textAlign:"center", width:"18%" }}>{r.label}</td>
                      <td style={{ textAlign:"right", width:"32%" }}>N&nbsp;{nk(r.amount)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr style={{ fontWeight:"bold", background:"#d4edda" }}>
                <td colSpan={2}>TOTAL AMOUNT REMITTED (NGN)</td>
                <td style={{ textAlign:"right" }}>NGN&nbsp;{nk(data.totals.totalB)}</td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"28px" }}>
            <div style={{ fontSize:"9pt" }}>
              <div style={{ borderTop:"1px solid black", paddingTop:"2px", width:"180px" }}>{data.treasurerName || "\u00A0"}</div>
              <div>DCN / TREASURER&apos;S NAME, SIGN. &amp; DATE</div>
            </div>
            <div style={{ fontSize:"9pt" }}>
              <div style={{ borderTop:"1px solid black", paddingTop:"2px", width:"180px" }}>{PARISH_INFO.pastorTitle}. {PARISH_INFO.pastorFullName}</div>
              <div>PASTOR&apos;S NAME, SIGN. &amp; DATE</div>
            </div>
          </div>
        </div>

        {/* ══════════════ PAGE 2 — Financial Report ══════════════ */}
        <div className="print-page">
          <div style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"8px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="RCCG" style={{ width:"50px", height:"50px", borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
            <div style={{ textAlign:"center", flex:1 }}>
              <div style={{ fontWeight:"bold", fontSize:"11pt" }}>THE REDEEMED CHRISTIAN CHURCH OF GOD</div>
              <div style={{ fontWeight:"bold" }}>{PARISH_INFO.province.toUpperCase()}</div>
              <div style={{ fontWeight:"bold", fontSize:"11pt", textTransform:"uppercase" }}>Financial Report for the Month of: {monthName} <span style={{ marginLeft:"16px" }}>Year: {ret.year}</span></div>
              <div style={{ fontSize:"9pt", marginTop:"2px" }}>AREA: {PARISH_INFO.areaName.toUpperCase()} AREA &nbsp;&nbsp;&nbsp;&nbsp; PARISH: {PARISH_INFO.parishName.toUpperCase()}</div>
            </div>
          </div>

          {/* Section A — National Remittable Funds */}
          <table className="form-table">
            <thead>
              <tr>
                <th style={{ width:"5%" }}>S/NO</th>
                <th>NATIONAL REMITTABLE FUNDS</th>
                <th style={{ width:"8%" }}>%</th>
                <th style={{ width:"15%" }}>N:K</th>
                <th style={{ width:"8%" }}>%</th>
                <th style={{ width:"15%" }}>N:K</th>
              </tr>
            </thead>
            <tbody>
              {data.sections.A_B.map((r, i) => (
                <tr key={r.category}>
                  <td style={{ textAlign:"center" }}>{i+1}</td>
                  <td>{r.formLabel}</td>
                  <td style={{ textAlign:"center" }}>100%</td>
                  <td style={{ textAlign:"right" }}>{nk(r.gross)}</td>
                  <td colSpan={2} style={{ textAlign:"center", color:"#aaa" }}>—</td>
                </tr>
              ))}
              <tr style={{ fontWeight:"bold", background:"#f0f0f0" }}>
                <td colSpan={2}>TOTAL NATIONAL INCOME (A)</td>
                <td></td>
                <td style={{ textAlign:"right" }}>{nk(data.totals.totalNationalIncome)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>

          {/* Section B — National Remittable breakdown */}
          <table className="form-table" style={{ marginTop:"6px" }}>
            <thead>
              <tr><th colSpan={6} className="section-header" style={{ textAlign:"left" }}>B. NATIONAL REMITTABLE</th></tr>
              <tr>
                <th style={{ width:"5%" }}>S/NO</th><th>ITEMS</th>
                <th style={{ width:"8%" }}>%</th><th style={{ width:"15%" }}>N:K</th>
                <th style={{ width:"8%" }}>Parish %</th><th style={{ width:"15%" }}>Parish N:K</th>
              </tr>
            </thead>
            <tbody>
              {data.sections.A_B.map((r, i) => {
                const nonParish = r.waterfall.filter((t: any) => t.tier !== "PARISH");
                const parish    = r.waterfall.find((t: any)  => t.tier === "PARISH");
                return nonParish.map((t: any, ti: number) => (
                  <tr key={`${r.category}-${ti}`}>
                    {ti === 0 && <td style={{ textAlign:"center" }} rowSpan={nonParish.length}>{i+1}</td>}
                    {ti === 0 && <td rowSpan={nonParish.length}>{r.formLabel}</td>}
                    <td style={{ textAlign:"center" }}>{t.pct.toFixed(1)}%{t.tier !== "NATIONAL" ? ` (${t.label})` : ""}</td>
                    <td style={{ textAlign:"right" }}>{nk(t.amount)}</td>
                    {ti === 0 && <td style={{ textAlign:"center" }} rowSpan={nonParish.length}>{parish ? `${parish.pct.toFixed(2)}%` : "—"}</td>}
                    {ti === 0 && <td style={{ textAlign:"right" }} rowSpan={nonParish.length}>{parish ? nk(parish.amount) : "—"}</td>}
                  </tr>
                ));
              })}
              <tr style={{ fontWeight:"bold", background:"#f8d7da" }}>
                <td colSpan={3}>TOTAL (B)</td>
                <td style={{ textAlign:"right" }}>{nk(data.totals.totalB)}</td>
                <td></td>
                <td style={{ textAlign:"right", background:"#d4edda" }}>{nk(data.totals.totalBParish)}</td>
              </tr>
            </tbody>
          </table>

          {/* Section C — Provincial */}
          <table className="form-table" style={{ marginTop:"6px" }}>
            <thead>
              <tr><th colSpan={6} className="section-header" style={{ textAlign:"left" }}>C. PROVINCIAL REMITTABLE</th></tr>
              <tr><th style={{ width:"5%" }}>S/NO</th><th>ITEMS</th><th style={{ width:"8%" }}>%</th><th style={{ width:"15%" }}>N:K</th><th style={{ width:"8%" }}>Parish %</th><th style={{ width:"15%" }}>Parish N:K</th></tr>
            </thead>
            <tbody>
              {data.sections.C.map((r, i) => {
                const provincial = r.waterfall.find((t: any) => t.tier === "PROVINCIAL");
                const parish     = r.waterfall.find((t: any) => t.tier === "PARISH");
                return (
                  <tr key={r.category}>
                    <td style={{ textAlign:"center" }}>{i+1}</td>
                    <td>{r.formLabel}</td>
                    <td style={{ textAlign:"center" }}>{provincial ? `${provincial.pct.toFixed(0)}%` : "—"}</td>
                    <td style={{ textAlign:"right" }}>{provincial ? nk(provincial.amount) : "0.00"}</td>
                    <td style={{ textAlign:"center" }}>{parish ? `${parish.pct.toFixed(0)}%` : "—"}</td>
                    <td style={{ textAlign:"right" }}>{parish ? nk(parish.amount) : "—"}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight:"bold", background:"#f8d7da" }}>
                <td colSpan={3}>TOTAL (C)</td>
                <td style={{ textAlign:"right" }}>{nk(data.totals.totalC)}</td>
                <td></td>
                <td style={{ textAlign:"right", background:"#d4edda" }}>{nk(data.totals.totalCParish)}</td>
              </tr>
            </tbody>
          </table>

          {/* Section D — Zonal & Area */}
          <table className="form-table" style={{ marginTop:"6px" }}>
            <thead>
              <tr><th colSpan={4} className="section-header" style={{ textAlign:"left" }}>D. ZONAL AND AREA REMITTABLE</th></tr>
              <tr><th colSpan={2}>ITEM</th><th style={{ width:"8%" }}>%</th><th style={{ width:"18%" }}>N:K</th></tr>
            </thead>
            <tbody>
              {data.sections.D.map(r => {
                const tier = r.waterfall[0];
                return (
                  <tr key={r.category}>
                    <td colSpan={2}>{r.formLabel}</td>
                    <td style={{ textAlign:"center" }}>{tier ? `${tier.pct.toFixed(0)}%` : "—"}</td>
                    <td style={{ textAlign:"right" }}>{tier ? nk(tier.amount) : "0.00"}</td>
                  </tr>
                );
              })}
              {data.sections.D_extra.map((r: any, i: number) => (
                <tr key={`extra-${i}`}>
                  <td colSpan={2}>{r.formLabel}</td>
                  <td style={{ textAlign:"center" }}>{r.pct ? `${r.pct.toFixed(0)}%` : "0%"}</td>
                  <td style={{ textAlign:"right" }}>{nk(r.amount)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight:"bold", background:"#f8d7da" }}>
                <td colSpan={3}>TOTAL (D)</td>
                <td style={{ textAlign:"right" }}>{nk(data.totals.totalD)}</td>
              </tr>
              <tr style={{ fontWeight:"bold", background:"#fff3cd" }}>
                <td colSpan={3}>TOTAL (B+C+D)</td>
                <td style={{ textAlign:"right" }}>{nk(data.totals.grandTotalRemittable)}</td>
              </tr>
            </tbody>
          </table>

          {/* Grand total row */}
          <table className="form-table" style={{ marginTop:"4px" }}>
            <tbody>
              <tr style={{ fontWeight:"bold" }}>
                <td style={{ width:"50%", textAlign:"center", background:"#fff3cd" }}>
                  TOTAL REMITTABLE (B+C+D): N&nbsp;{nk(data.totals.grandTotalRemittable)}
                </td>
                <td style={{ width:"50%", textAlign:"center", background:"#d4edda" }}>
                  PARISH BALANCE: N&nbsp;{nk(data.totals.grandTotalParishBalance)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"20px", fontSize:"9pt" }}>
            <div>Pastor in Charge of Parish&apos;s Sign &amp; Date: <span style={{ borderBottom:"1px solid black", display:"inline-block", width:"150px" }}>&nbsp;</span></div>
            <div>Checked &amp; Collected by: <span style={{ borderBottom:"1px solid black", display:"inline-block", width:"150px" }}>&nbsp;</span></div>
          </div>
        </div>

        {/* ══════════════ PAGE 3 — Pastoral Report ══════════════ */}
        <div className="print-page">
          <div style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"10px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="RCCG" style={{ width:"50px", height:"50px", borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
            <div style={{ textAlign:"center", flex:1 }}>
              <div style={{ fontWeight:"bold" }}>{PARISH_INFO.province.toUpperCase()}</div>
              <div style={{ fontWeight:"bold", fontSize:"12pt", textTransform:"uppercase" }}>Pastoral Report — {monthName} {ret.year}</div>
            </div>
          </div>

          <div style={{ fontWeight:"bold", fontSize:"11pt", marginBottom:"6px" }}>A. PASTORAL</div>
          <table style={{ width:"100%", fontSize:"10pt", borderCollapse:"collapse" }}>
            <tbody>
              {[
                ["1","Number of Birth:", ret.numberOfBirths || "NONE"],
                ["2","Number of Death:", ret.numberOfDeaths || "NONE"],
                ["3","Number of Marriages:", ret.numberOfMarriages || "NONE"],
                ["5","Number of House Fellowship Centres:", data.houseFellowshipCount],
                ["6","Number of Newly Baptised Workers During the Month:", ret.newlyBaptisedWorkers || "NONE"],
                ["7","Average Attendance at Vigil:", ret.avgVigilAttendance || ""],
                ["8","Average Attendance of Other Special Programmes:", ret.avgSpecialProgrammeAttendance || ""],
                ["9","Number of Baptised Workers:", ret.numberOfBaptisedWorkers || ""],
                ["10","Number of New Worker(s):", ret.numberOfNewWorkers || "NONE"],
                ["11","Number of Deacons/Deaconess:", ret.numberOfDeacons || ""],
                ["12","Number of Assistant Pastors:", ret.numberOfAssistantPastors || "NONE"],
                ["13","Number of Full Pastors:", ret.numberOfFullPastors || "NONE"],
                ["14","Number of Unordained Ministers:", ret.numberOfUnordainedMinisters || ""],
              ].map(([num, label, val]) => (
                <tr key={String(num)}>
                  <td style={{ width:"24px", verticalAlign:"top", paddingTop:"3px" }}>{num}</td>
                  <td style={{ paddingTop:"3px" }}>{label}</td>
                  <td style={{ textAlign:"right", fontWeight:"bold", paddingRight:"20px", paddingTop:"3px" }}>{val}</td>
                </tr>
              ))}
              <tr>
                <td style={{ verticalAlign:"top", paddingTop:"3px" }}>15</td>
                <td colSpan={2} style={{ paddingTop:"3px" }}>
                  Name of Parish (Give Detailed Address): {PARISH_INFO.fullAddress}.
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop:"8px" }}>Title &amp; Full Name of Pastor/Minister In-Charge: {PARISH_INFO.pastorTitle} {PARISH_INFO.pastorFullName}</div>
          <div style={{ marginTop:"4px" }}>Phone number of Pastor/Minister In-Charge: {PARISH_INFO.pastorPhone}</div>

          <div style={{ fontWeight:"bold", fontSize:"11pt", marginTop:"16px", marginBottom:"6px" }}>GENERAL</div>
          <div style={{ lineHeight:1.8 }}>
            <div><strong>1&nbsp;&nbsp;Any area requiring special praise to God?</strong><br/>{ret.areaRequiringPraise || "\u00A0"}</div>
            <div style={{ marginTop:"6px" }}><strong>2&nbsp;&nbsp;Any area requiring special prayer?</strong><br/>{ret.areaRequiringPrayer || "\u00A0"}</div>
            <div style={{ marginTop:"6px" }}><strong>3&nbsp;&nbsp;General well-being of congregation:</strong><br/>{ret.generalWellBeing || "\u00A0"}</div>
            <div style={{ marginTop:"6px" }}><strong>4&nbsp;&nbsp;Others:</strong> {ret.otherRemarks || "\u00A0"}</div>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"40px", fontSize:"9pt" }}>
            <div>
              <div style={{ borderTop:"1px solid black", paddingTop:"2px", width:"160px" }}>
                {ret.submittedAt ? new Date(ret.submittedAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) : "\u00A0"}
              </div>
              <div>Date</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ borderTop:"1px solid black", paddingTop:"2px", width:"160px" }}>&nbsp;</div>
              <div>Signature</div>
            </div>
          </div>

          <div style={{ marginTop:"32px", fontSize:"9pt" }}>
            <div style={{ fontWeight:"bold" }}>NOTES:</div>
            {PARISH_INFO.noteRecipients.map((n, i) => <div key={i}>{n}</div>)}
          </div>
        </div>
      </div>

      {showEdit && (
        <PastoralEditModal
          initial={ret}
          onClose={() => setShowEdit(false)}
          onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["returns"] }); }}
        />
      )}
    </>
  );
}
