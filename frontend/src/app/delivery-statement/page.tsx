"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Printer, X, Plus, Trash2, Save, Edit as EditIcon, Loader2, Download, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useHeader } from "@/context/HeaderContext";
import { fetchTemplate, fillTemplate } from "@/lib/template-utils";
import { generateAndSendPDF } from "@/lib/whatsapp";

type DsRow = {
  id?: number | string;
  sno: string;
  drNo: string;
  freight: string;
  labour: string;
  receiptCh: string;
  dCom: string;
  demurage: string;
};

const emptyRow = (id: number, sno?: string): DsRow => ({
  id, sno: sno || "", drNo: "",
  freight: "", labour: "", receiptCh: "5", dCom: "", demurage: "5"
});

const val = (s: string) => parseFloat(s) || 0;

export default function DeliveryStatementPage() {
  const router = useRouter();
  const { searchQuery } = useHeader();
  const [rows, setRows] = useState<DsRow[]>([]);

  const [pageNo, setPageNo] = useState("");
  const [dateSearch] = useState(() => new Date().toISOString().slice(0, 10));

  const [matchCount, setMatchCount] = useState(0);
  const [waPhone, setWaPhone] = useState("");
  const [sendingWa, setSendingWa] = useState(false);

  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const getMetadata = async (): Promise<{ maxPage: number; maxSno: number }> => {
    try {
      const { data } = await api.get("/delivery-statement/metadata");
      return data.success ? data.data : { maxPage: 0, maxSno: 0 };
    } catch { return { maxPage: 0, maxSno: 0 }; }
  };

  const autoFillSnoFrom = (index: number, rows: DsRow[]): DsRow[] => {
    const newRows = [...rows];
    const startNum = parseInt(newRows[index].sno, 10);
    if (isNaN(startNum)) return newRows;
    for (let i = index + 1; i < newRows.length; i++) {
      newRows[i] = { ...newRows[i], sno: String(startNum + (i - index)) };
    }
    return newRows;
  };

  useEffect(() => {
    (async () => {
      const { maxPage, maxSno } = await getMetadata();
      setPageNo(String(maxPage + 1));

      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data } = await api.get(`/delivery-statement/date/${todayStr}`);
        if (data.success && data.data) {
          const reg = data.data;
          setPageNo(reg.pageNo || String(maxPage + 1));
          if (reg.entries && reg.entries.length > 0) {
            setRows(reg.entries.map((e: any, i: number) => ({
              id: e._id || Date.now() + i,
              sno: e.sno || String(i + 1),
              drNo: e.drNo || "",
              freight: e.freight || "",
              labour: e.labour || "",
              receiptCh: e.receiptCh || "",
              dCom: e.dCom || "",
              demurage: e.demurage || "",
            })));
            setInitialized(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load today's statement, falling back to empty/new rows", err);
      }

      setRows(Array.from({ length: 5 }, (_, i) => emptyRow(Date.now() + i, String(maxSno + i + 1))));
      setInitialized(true);
    })();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setMatchCount(0); return; }
    const lowerQ = searchQuery.toLowerCase();
    let count = 0;
    rows.forEach(r => { if (Object.values(r).some(v => String(v).toLowerCase().includes(lowerQ))) count++; });
    setMatchCount(count);
  }, [searchQuery, rows]);

  const updateRow = (index: number, field: keyof DsRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    if (field === 'sno') { setRows(autoFillSnoFrom(index, newRows)); }
    else { setRows(newRows); }
  };

  const addRow = () => {
    const lastSno = rows.length > 0 ? parseInt(rows[rows.length - 1].sno, 10) : 0;
    const nextSno = !isNaN(lastSno) ? String(lastSno + 1) : String(rows.length + 1);
    setRows([...rows, emptyRow(Date.now(), nextSno)]);
  };

  const deleteRow = (index: number) => setRows(rows.filter((_, i) => i !== index));
  const deleteLastRow = () => { if (rows.length === 0) return; setRows(rows.slice(0, -1)); };

  const handleDrBlur = async (idx: number, drNo: string) => {
    if (!drNo.trim()) return;
    try {
      const { data } = await api.get(`/cash-memo/drno/${encodeURIComponent(drNo.trim())}`);
      if (data.success && data.data) {
        const cm = data.data;
        setRows((prev) => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            freight: String(((parseFloat(cm.freight) || 0) + ((parseFloat(cm.freightPaise) || 0) / 100)).toFixed(2)),
            labour: String(((parseFloat(cm.labour) || 0) + ((parseFloat(cm.labourPaise) || 0) / 100)).toFixed(2)),
            receiptCh: String(((parseFloat(cm.stationery) || 0) + ((parseFloat(cm.stationeryPaise) || 0) / 100)).toFixed(2)),
            dCom: String(((parseFloat(cm.commission) || 0) + ((parseFloat(cm.commissionPaise) || 0) / 100)).toFixed(2)),
            demurage: String(((parseFloat(cm.aoc) || 0) + ((parseFloat(cm.aocPaise) || 0) / 100)).toFixed(2)),
          };
          return updated;
        });
      }
    } catch {
      // Cash memo not found for this DR No. — ignore
    }
  };

  const clearAll = async () => {
    if (confirm("Clear all entries?")) {
      const { maxPage, maxSno } = await getMetadata();
      setPageNo(String(maxPage + 1));
      setRows(Array.from({ length: 5 }, (_, i) => emptyRow(Date.now() + i, String(maxSno + i + 1))));
    }
  };

  const total = (r: DsRow) => val(r.freight) + val(r.labour) + val(r.receiptCh) + val(r.dCom) + val(r.demurage);

  const getColumnTotals = () => {
    const filledRows = rows.filter(r => r.drNo || r.freight || r.labour);
    const totals = filledRows.reduce(
      (acc, r) => ({
        freight: acc.freight + val(r.freight),
        labour: acc.labour + val(r.labour),
        receiptCh: acc.receiptCh + val(r.receiptCh),
        dCom: acc.dCom + val(r.dCom),
        demurage: acc.demurage + val(r.demurage),
        total: acc.total + total(r),
      }),
      { freight: 0, labour: 0, receiptCh: 0, dCom: 0, demurage: 0, total: 0 }
    );
    return totals;
  };

  const buildDsHtml = async (): Promise<string> => {
    const t = getColumnTotals();
    const tableRows = rows.map((r, idx) => `
      <tr>
        <td class="tc">${r.sno || idx + 1}</td>
        <td>${r.drNo}</td>
        <td class="tr">${r.freight}</td>
        <td class="tr">${r.labour}</td>
        <td class="tr">${r.receiptCh}</td>
        <td class="tr">${r.dCom}</td>
        <td class="tr">${r.demurage}</td>
        <td class="tr">${total(r)}</td>
      </tr>`).join("");

    let totalsRow = "";
    if (t.total > 0) {
      totalsRow = `
      <tr style="font-weight:bold;background:#e8ecf0;">
        <td class="tc">Total</td>
        <td></td>
        <td class="tr">${t.freight}</td>
        <td class="tr">${t.labour}</td>
        <td class="tr">${t.receiptCh}</td>
        <td class="tr">${t.dCom}</td>
        <td class="tr">${t.demurage}</td>
        <td class="tr">${t.total}</td>
      </tr>`;
    }

    const template = await fetchTemplate("delivery_statement");
    return fillTemplate(template, {
      DATE: dateSearch || "—",
      PAGE_NO: pageNo || "—",
      TABLE_ROWS: tableRows,
      TOTALS_ROW: totalsRow,
    });
  };

  const buildDsPdfContent = () => {
    const t = getColumnTotals();
    const tableRows = rows.map((r, idx) => `
      <tr>
        <td class="tc">${r.sno || idx + 1}</td>
        <td>${r.drNo}</td>
        <td class="tr">${r.freight}</td>
        <td class="tr">${r.labour}</td>
        <td class="tr">${r.receiptCh}</td>
        <td class="tr">${r.dCom}</td>
        <td class="tr">${r.demurage}</td>
        <td class="tr">${total(r)}</td>
      </tr>`).join("");
    const footerRow = t.total > 0 ? `
      <tr style="font-weight:bold;">
        <td class="tc" colspan="2">Total</td>
        <td class="tr">${t.freight}</td>
        <td class="tr">${t.labour}</td>
        <td class="tr">${t.receiptCh}</td>
        <td class="tr">${t.dCom}</td>
        <td class="tr">${t.demurage}</td>
        <td class="tr">${t.total}</td>
      </tr>` : "";
    return `
      <div style="font-family:Arial,sans-serif;background:white;padding:15px;width:1200px;">
        <style>
          table { width:100%; border-collapse:collapse; }
          th, td { border:1px solid black; font-size:10px; padding:4px 6px; }
          th { text-transform:uppercase; font-weight:bold; background:#e8ecf0; }
          .tc { text-align:center; }
          .tr { text-align:right; }
        </style>
        <div style="text-align:center;margin-bottom:8px;">
          <div style="font-size:24px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Sant Kanwar Ram</div>
          <div style="font-size:18px;font-weight:600;text-transform:uppercase;">Transport Corporation</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;">Bhilwara (Raj.)</div>
          <div style="font-size:16px;font-weight:bold;text-transform:uppercase;margin-top:4px;">Delivery Statement</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:8px;padding:0 4px;">
          <span>Date: ${dateSearch || "—"}</span>
          <span>Page: ${pageNo || "—"}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:4%">S.</th>
              <th style="width:10%">D.R. No.</th>
              <th style="width:13%">Freight</th>
              <th style="width:13%">Labour</th>
              <th style="width:15%">Stationery</th>
              <th style="width:15%">Commission</th>
              <th style="width:15%">A.O.C</th>
              <th style="width:15%">Total</th>
            </tr>
          </thead>
          <tbody>${tableRows}${footerRow}</tbody>
        </table>
      </div>`;
  };

  const handleShareWhatsApp = async () => {
    if (!waPhone.trim()) { toast.error("Enter a WhatsApp number"); return; }
    setSendingWa(true);
    try {
      const html = await buildDsHtml();
      await generateAndSendPDF(waPhone, html, `delivery-statement-${dateSearch}.pdf`, "landscape");
    } catch {
      // error handled by generateAndSendPDF
    } finally {
      setSendingWa(false);
    }
  };

  const handlePrint = async () => {
    const html = await buildDsHtml();
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(html);
    pw.document.close();
  };

  const handleDownloadPDF = async () => {
    const html = await buildDsHtml();
    const pw = window.open("", "_blank");
    if (!pw) return;
    const pdfHtml = html.replace("</body>", `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<script>window.onload=function(){html2pdf().set({margin:10,filename:'delivery-statement.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,letterRendering:true},jsPDF:{unit:'mm',format:'a4',orientation:'landscape'}}).from(document.body).save();};<\/script></body>`);
    pw.document.write(pdfHtml);
    pw.document.close();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const filledRows = rows.filter(r => r.drNo || r.freight || r.labour);
      const entriesForApi = filledRows.map(({ id, ...rest }) => rest);
      const totals = getColumnTotals();
      const payloadAll = { pageNo, dateSearch, entries: entriesForApi, totals };
      await api.post("/delivery-statement", payloadAll);
      toast.success("Delivery Statement saved successfully.");
      const { maxPage, maxSno } = await getMetadata();
      setPageNo(String(maxPage + 1));
      setRows(Array.from({ length: 5 }, (_, i) => emptyRow(Date.now() + i, String(maxSno + i + 1))));
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPrint = async () => {
    const success = await handleSave();
    if (success) {
      handlePrint();
    }
  };

  const isMatch = (row: DsRow) => {
    if (!searchQuery.trim()) return false;
    const lowerQ = searchQuery.toLowerCase();
    return Object.values(row).some(v => String(v).toLowerCase().includes(lowerQ));
  };

  return (
    <DashboardLayout>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body > * { display: none !important; }
          #ds-printable { display: block !important; }
          #ds-action-bar { display: none !important; }
          .sidebar-layout, nav, header, footer { display: none !important; }
          #ds-printable .ds-wrapper { box-shadow: none !important; border: 2px solid #333 !important; background: #fff !important; max-width: 100% !important; margin: 0 !important; color: #000 !important; padding: 10px !important; }
          #ds-printable .del-btn { display: none !important; }
          #ds-printable .print-hide { display: none !important; }
          #ds-printable input { background: transparent !important; color: #000 !important; border: 0 !important; }
          #ds-printable th { background: #e8ecf0 !important; border-bottom: 2px solid #333 !important; color: #111 !important; border: 1px solid #999; }
          #ds-printable td { border: 1px solid #999 !important; color: #111 !important; }
          #ds-printable .text-[#2388ff], #ds-printable .text-rose-500 { color: #000 !important; text-shadow: none !important; }
          #ds-printable .bg-[#0b1220] { background: transparent !important; }
        }
      `}</style>

      <div className="space-y-6 px-4 md:px-8 py-4 md:py-8 h-full max-w-full">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Delivery Statement</h2>
              <p className="text-muted-foreground flex items-center gap-2">
                Delivery statement register
                {searchQuery.trim() && <span className="text-xs font-mono text-[#2388ff]">{matchCount} match{matchCount !== 1 ? "es" : ""}</span>}
              </p>
            </div>
          </div>

          <div id="ds-action-bar" className="flex flex-wrap items-center gap-2.5">
            {searchQuery.trim() && (
              <span className="text-xs font-mono text-[#2388ff] bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700 mr-2">
                {matchCount} match{matchCount !== 1 ? "es" : ""}
              </span>
            )}

            <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg font-medium transition-all bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>

            <Button size="sm" onClick={deleteLastRow} className="h-9 px-3 rounded-lg bg-slate-800 text-slate-200 hover:bg-orange-600 hover:text-white border border-slate-700 font-medium transition-all">
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete Last
            </Button>
            <Button size="sm" onClick={clearAll} className="h-9 px-3 rounded-lg bg-slate-800 text-slate-200 hover:bg-red-600 hover:text-white border border-slate-700 font-medium transition-all">
              <X className="h-4 w-4 mr-1.5" /> Clear All
            </Button>
            <Button size="sm" onClick={handlePrint} className="h-9 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-semibold transition-all">
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold transition-all">
              <Download className="h-4 w-4 mr-1.5" /> Download PDF
            </Button>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="Phone"
                className="h-9 w-28 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs text-white outline-none placeholder:text-slate-500"
              />
              <Button size="sm" onClick={handleShareWhatsApp} disabled={sendingWa || !waPhone.trim()} className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all">
                {sendingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div id="ds-printable" className="w-full flex justify-center mt-6">
          <div className="ds-wrapper w-full max-w-[1200px] rounded-xl border border-slate-800 bg-[#0b1220] shadow-xl p-8 relative overflow-hidden">

            <div className="text-center border-b border-slate-700/60 pb-5 mb-6 relative">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-[#2388ff] drop-shadow-md">
                Sant <span className="text-rose-500">Kanwar Ram</span> Transport Corporation
              </h1>
              <div className="text-xs uppercase tracking-[4px] text-slate-400 mt-2 font-medium">Transport Nagar · Bhilwara (Raj.)</div>
              <div className="text-sm font-bold uppercase tracking-[4px] text-[#2388ff] mt-4 border-2 border-slate-800 px-6 py-2 inline-block rounded/50 bg-slate-900/50">
                ◈ Delivery Statement ◈
              </div>

              <div className="absolute right-0 bottom-4 text-xs font-mono text-slate-400 flex flex-col md:flex-row items-end md:items-center gap-4">
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500">Page no.</span>
                      <input type="text" value={pageNo} onChange={(e) => setPageNo(e.target.value)} placeholder="—" className="w-16 bg-transparent border-0 border-b-2 border-rose-500/50 text-rose-500 font-bold text-center outline-none focus:border-rose-500" />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 pl-3 pr-3 py-1 rounded-md">
                      <span className="font-bold text-[#2388ff]">DATE :</span>
                      <span className="text-white text-sm font-mono">{dateSearch}</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-700 rounded-md bg-slate-900/40">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 border-b-2 border-[#2388ff]/60">
                    <th className="border-r border-slate-700 text-[#2388ff] font-bold p-2 w-[6%]">S.No</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">D.R. No.</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[14%]">Freight</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[14%]">Labour</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[14%]">Stationery</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[14%]">Commission</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[14%]">A.O.C</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[14%]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(searchQuery.trim() ? rows.filter(r => isMatch(r)) : rows).map((row, idx) => (
                    <tr key={row.id} className="bg-[#2388ff]/30 transition-colors group">
                      <td className="border border-slate-700 p-0 w-[4%]">
                        <input type="text" value={row.sno} onChange={(e) => updateRow(idx, 'sno', e.target.value)} className="w-full h-full p-1.5 bg-transparent border-0 text-center font-mono text-slate-400 outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.drNo} onBlur={() => handleDrBlur(idx, row.drNo)} onChange={(e) => updateRow(idx, 'drNo', e.target.value)} className="w-full h-full p-1.5 bg-transparent border-0 text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.freight} onChange={(e) => updateRow(idx, 'freight', e.target.value)} className="w-full h-full p-1.5 bg-transparent border-0 text-right text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.labour} onChange={(e) => updateRow(idx, 'labour', e.target.value)} className="w-full h-full p-1.5 bg-transparent border-0 text-right text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.receiptCh} onChange={(e) => updateRow(idx, 'receiptCh', e.target.value)} className="w-full h-full p-1.5 bg-transparent border-0 text-right text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.dCom} onChange={(e) => updateRow(idx, 'dCom', e.target.value)} className="w-full h-full p-1.5 bg-transparent border-0 text-right text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.demurage} onChange={(e) => updateRow(idx, 'demurage', e.target.value)} className="w-full h-full p-1.5 bg-transparent border-0 text-right text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0 relative text-right font-bold text-white px-1.5">
                        {total(row)}
                        <button onClick={() => deleteRow(idx)} className="del-btn print-hide absolute right-0.5 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 rounded p-[2px]" title="Remove">
                          <X className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(() => {
                    const t = getColumnTotals();
                    const hasData = t.total > 0;
                    if (!hasData) return null;
                    return (
                      <tr className="bg-slate-800/80 border-t-2 border-[#2388ff]/60 font-bold">
                        <td className="border border-slate-700 p-1.5 text-center text-[#2388ff]">Total</td>
                        <td className="border border-slate-700 p-1.5"></td>
                        <td className="border border-slate-700 p-1.5 text-right text-amber-400">{t.freight}</td>
                        <td className="border border-slate-700 p-1.5 text-right text-amber-400">{t.labour}</td>
                        <td className="border border-slate-700 p-1.5 text-right text-amber-400">{t.receiptCh}</td>
                        <td className="border border-slate-700 p-1.5 text-right text-amber-400">{t.dCom}</td>
                        <td className="border border-slate-700 p-1.5 text-right text-amber-400">{t.demurage}</td>
                        <td className="border border-slate-700 p-1.5 text-right text-amber-400">{t.total}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-4 print-hide">
              <Button size="sm" onClick={addRow} className="h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all">
                <Plus className="h-4 w-4 mr-1.5" /> Add Row
              </Button>
            </div>

          </div>
        </div>

        {/* Save & Print */}
        <div className="flex justify-center">
          <Button size="sm" onClick={handleSaveAndPrint} disabled={saving} className="h-9 px-4 rounded-lg font-semibold transition-all bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-600">
            <Save className="h-4 w-4 mr-2" /> Save & Print
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
