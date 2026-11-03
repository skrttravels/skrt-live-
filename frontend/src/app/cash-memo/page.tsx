"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Download, Save, Plus, CheckCircle2, ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fetchCashMemoTemplate, fillCashMemoTemplate } from "@/lib/cash-memo-template";
import { generateAndSendPDF } from "@/lib/whatsapp";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const initialForm = {
  drNo: "",
  grNo: "",
  date: today(),
  receivedOn: "",
  from: "",
  consignee: "",
  through: "",
  freight: "",
  freightPaise: "",
  labour: "",
  labourPaise: "",
  stationery: "5",
  stationeryPaise: "",
  commission: "",
  commissionPaise: "",
  aoc: "5",
  aocPaise: "",
};

export default function CashMemoPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [sendingWa, setSendingWa] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const totalRs = (
    (parseFloat(form.freight) || 0) +
    (parseFloat(form.freightPaise) || 0) / 100 +
    (parseFloat(form.labour) || 0) +
    (parseFloat(form.labourPaise) || 0) / 100 +
    (parseFloat(form.stationery) || 0) +
    (parseFloat(form.stationeryPaise) || 0) / 100 +
    (parseFloat(form.commission) || 0) +
    (parseFloat(form.commissionPaise) || 0) / 100 +
    (parseFloat(form.aoc) || 0) +
    (parseFloat(form.aocPaise) || 0) / 100
  ).toFixed(2);
  const totalWhole = Math.floor(parseFloat(totalRs));
  const totalPaise = Math.round((parseFloat(totalRs) - totalWhole) * 100);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const [fetchingGr, setFetchingGr] = useState(false);
  const [grNoExists, setGrNoExists] = useState<string | null>(null);
  const [fetchingSno, setFetchingSno] = useState(false);

  const getNextDrNo = async () => {
    try {
      const { data } = await api.get("/cash-memo/next-dr-no");
      if (data.success && data.data?.nextDrNo) return data.data.nextDrNo;
    } catch {
      // ignore
    }
    return "DR-001";
  };

  useEffect(() => {
    (async () => {
      const next = await getNextDrNo();
      setForm((prev) => ({ ...prev, drNo: next }));
    })();
  }, []);

  useEffect(() => {
    if (!form.grNo.trim()) { setGrNoExists(null); return; }
    const timer = setTimeout(async () => {
      setFetchingGr(true);
      try {
        const { data } = await api.get(`/entry/grno/${encodeURIComponent(form.grNo.trim())}`);
        if (data.success) {
          const e = data.data;
          setForm(prev => ({
            ...prev,
            from: e.from || prev.from,
            receivedOn: e.sno,
            consignee: e.consignee || prev.consignee,
            freight: e.freight || prev.freight,
          }));
          toast.success("Entry data loaded for G.R. No.");
        }
      } catch {
        // not found – ignore
      }
      try {
        const { data } = await api.get(`/cash-memo/grno/${encodeURIComponent(form.grNo.trim())}`);
        if (data.success) {
          setGrNoExists(data.data.drNo || "a cash memo");
        }
      } catch {
        setGrNoExists(null);
      } finally {
        setFetchingGr(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.grNo]);

  useEffect(() => {
    if (!form.receivedOn?.trim()) return;
    const timer = setTimeout(async () => {
      setFetchingSno(true);
      try {
        const { data } = await api.get(`/entry/sno/${encodeURIComponent(form.receivedOn.trim())}`);
        if (data.success) {
          const e = data.data;
          setForm(prev => ({
            ...prev,
            grNo: e.grNo || prev.grNo,
            from: e.from || prev.from,
            consignee: e.consignee || prev.consignee,
            freight: e.freight || prev.freight,
          }));
          toast.success("Entry data loaded for Received On (S.No.)");
        }
      } catch {
        // not found – ignore
      } finally {
        setFetchingSno(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.receivedOn]);

  const handleSave = async () => {
    if (!form.drNo.trim()) { toast.error("D.R. No. is required"); return false; }
    if (!form.date) { toast.error("Date is required"); return false; }
    if (grNoExists) {
      toast.error(`Cash memo (${grNoExists}) already exists for G.R. No ${form.grNo.trim()}. No new cash memo can be created for the same G.R. No.`);
      return false;
    }
    setSaving(true);
    try {
      await api.post("/cash-memo", {
        ...form,
        freight: parseFloat(form.freight) || 0,
        freightPaise: parseFloat(form.freightPaise) || 0,
        labour: parseFloat(form.labour) || 0,
        labourPaise: parseFloat(form.labourPaise) || 0,
        stationery: parseFloat(form.stationery) || 0,
        stationeryPaise: parseFloat(form.stationeryPaise) || 0,
        commission: parseFloat(form.commission) || 0,
        commissionPaise: parseFloat(form.commissionPaise) || 0,
        aoc: parseFloat(form.aoc) || 0,
        aocPaise: parseFloat(form.aocPaise) || 0,
        totalAmount: parseFloat(totalRs),
      });
      toast.success("Cash memo saved successfully!");

      // Update entry's delivery info
      if (form.grNo.trim()) {
        try {
          const grRes = await api.get(`/entry/grno/${form.grNo.trim()}`);
          if (grRes.data.success && grRes.data.data) {
            const entryData = grRes.data.data;
            const regId = entryData.registerId;
            const regRes = await api.get(`/entry/${regId}`);
            if (regRes.data.success && regRes.data.data) {
              const reg = regRes.data.data;
              const updatedEntries = (reg.entries || []).map((e: any) => {
                if (e.grNo === form.grNo.trim()) {
                  return { ...e, deliveryReceiptNo: form.drNo, dateOfDelivery: form.date };
                }
                return e;
              });
              await api.put(`/entry/${regId}`, { ...reg, entries: updatedEntries });
            }
          }
        } catch (grErr: any) {
          if (grErr.response?.status !== 404) {
            console.error("Failed to update entry delivery info", grErr);
          }
        }
      }

      const next = await getNextDrNo();
      setForm({ ...initialForm, drNo: next, date: today() });
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save cash memo");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const buildCashMemoHtml = async (): Promise<string> => {
    const template = await fetchCashMemoTemplate();
    const fmtDate = (ds: string) => {
      if (!ds) return "";
      const p = ds.split("T")[0].split("-");
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
    };
    return fillCashMemoTemplate(template, {
      drNo: form.drNo,
      grNo: form.grNo,
      date: fmtDate(form.date),
      receivedOn: form.receivedOn,
      from: form.from,
      consignee: form.consignee,
      through: form.through,
      freight: form.freight || "",
      freightP: form.freightPaise || "",
      labour: form.labour || "",
      labourP: form.labourPaise || "",
      stationery: form.stationery || "5",
      stationeryP: form.stationeryPaise || "00",
      commission: form.commission || "",
      commissionP: form.commissionPaise || "",
      aoc: form.aoc || "5",
      aocP: form.aocPaise || "00",
      total: String(totalWhole),
      totalP: String(totalPaise).padStart(2, "0"),
    });
  };

  const handlePrint = async () => {
    const html = await buildCashMemoHtml();
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(html);
    pw.document.close();
  };

  const handleDownloadPDF = async () => {
    const html = await buildCashMemoHtml();
    const pw = window.open("", "_blank");
    if (!pw) return;
    const pdfHtml = html.replace("</body>", `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<script>window.onload=function(){html2pdf().set({margin:10,filename:'cash-memo.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,letterRendering:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(document.body).save();};<\/script></body>`);
    pw.document.write(pdfHtml);
    pw.document.close();
  };

  const handleSaveAndPrint = async () => {
    const pw = window.open("", "_blank");
    const success = await handleSave();
    if (success && pw) {
      const html = await buildCashMemoHtml();
      pw.document.write(html);
      pw.document.close();
    }
  };

  const handleWhatsApp = async () => {
    if (!waPhone.trim()) { toast.error("Enter a WhatsApp number"); return; }
    setSendingWa(true);
    try {
      const html = await buildCashMemoHtml();
      await generateAndSendPDF(waPhone, html, `cash-memo-${form.drNo}.pdf`);
    } catch {
      // handled by generateAndSendPDF
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <DashboardLayout>
      <style>{`
        @media print {
          @page { size: A5; margin: 8mm; }
          body > * { display: none !important; }
          #cash-memo-printable { display: block !important; }
          #cash-memo-action-bar { display: none !important; }
          .sidebar-layout, nav, header, footer { display: none !important; }
          #cash-memo-printable .receipt {
            box-shadow: none !important;
            border: 2px solid #111 !important;
            background: #fff !important;
            max-width: 100% !important;
          }
          #cash-memo-printable .receipt-inner { border-color: #555 !important; }
          #cash-memo-printable .memo-title,
          #cash-memo-printable .company-name,
          #cash-memo-printable .serial-number { color: #111 !important; text-shadow: none !important; }
          #cash-memo-printable .field-label,
          #cash-memo-printable .lbl,
          #cash-memo-printable .total-lbl,
          #cash-memo-printable .phones,
          #cash-memo-printable .dr-block { color: #1a4a8a !important; }
          #cash-memo-printable input { background: transparent !important; color: #111 !important; border-color: #555 !important; }
          #cash-memo-printable .total-row td { background: #fff8e1 !important; }
        }
      `}</style>

      <div className="space-y-6 px-4 md:px-8 py-4 md:py-8">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Cash Memo</h2>
              <p className="text-muted-foreground">Manage and generate transport cash memo</p>
            </div>
          </div>

          {/* Action bar */}
          <div id="cash-memo-action-bar" className="flex flex-wrap items-center gap-3 justify-end">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 transition-all"
            >
              {saving ? <><Save className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save</>}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 transition-all"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              className="h-9 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold flex items-center gap-2 transition-all"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="Phone"
                className="h-9 w-28 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs text-white outline-none placeholder:text-slate-500"
              />
              <Button
                size="sm"
                onClick={handleWhatsApp}
                disabled={sendingWa || !waPhone.trim()}
                className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-all"
              >
                {sendingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Receipt card container */}
        <div className="flex justify-center w-full">
          <div id="cash-memo-printable" ref={receiptRef} className="receipt w-full max-w-[1100px] rounded-xl border border-slate-800 bg-[#0b1220] shadow-xl font-mono mb-8">
            <div className="receipt-inner border border-slate-700 m-2 p-6 rounded-lg relative overflow-hidden">

              {/* Top strip */}
              <div className="flex items-start justify-between border-b border-slate-700 pb-3 mb-4 gap-2">
                <div className="text-sm font-bold text-[#2388ff] whitespace-nowrap">
                  D.R.&nbsp;No.&nbsp;
                  <input
                    value={form.drNo}
                    onChange={(e) => set("drNo", e.target.value)}
                    maxLength={10}
                    className="w-24 border-0 border-b border-[#2388ff] bg-transparent text-white font-bold text-center text-sm outline-none"
                  />
                </div>
                <div className="flex-1 text-center leading-tight">
                  <div className="text-2xl font-black text-rose-500 tracking-widest uppercase">
                    CASH MEMO
                  </div>
                </div>
                <div className="font-size:11px; font-weight:bold; text-align: right; color:#000000; line-height: 1.4; padding-right: 10px; white-space: nowrap;">
                  <span>Mob.: 96809-92567</span><br/>
                  <span>Mob.: 86196-06627</span>
                </div>
              </div>

              {/* Company header */}
              <div className="text-center mb-2">
                <div className="company-name text-lg font-black uppercase tracking-wide text-[#2388ff]">
                  Sant Kanwar Ram Transport Corp. (BHL)
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  123-124, Transport Nagar, BHILWARA – 311001 (Raj.)
                </div>
              </div>
              <hr className="border-slate-700 my-4" />

              {/* Body */}
              <div className="flex gap-0 items-start">

                {/* Left: Form fields */}
                <div className="flex-1 pr-6 space-y-4">
                  <div className="grid grid-cols-2 gap-x-6">
                    <div className="flex flex-col">
                      <div className="flex items-end gap-2">
                        <span className={`text-sm font-bold whitespace-nowrap min-w-[70px] ${grNoExists ? "text-rose-400" : "text-[#2388ff]"}`}>G.R. No.</span>
                        <input value={form.grNo} onChange={(e) => set("grNo", e.target.value)} placeholder="GR-4521" className={`flex-1 border-0 border-b bg-transparent text-sm outline-none px-1 py-1 min-w-0 placeholder:text-slate-500 placeholder:italic ${grNoExists ? "border-rose-500 text-rose-400" : "border-blue-800 text-white"}`} />
                      </div>
                      {grNoExists && (
                        <p className="text-[10px] text-rose-400 mt-1">Cash memo ({grNoExists}) already exists for this G.R. No - cannot create another.</p>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-sm font-bold text-[#2388ff] whitespace-nowrap min-w-[30px]">Dt</span>
                      <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="flex-1 border-0 border-b border-blue-800 bg-transparent text-sm text-white outline-none px-1 py-1 min-w-0" style={{ colorScheme: "dark" }} />
                    </div>
                  </div>
                  {[
                    { key: "receivedOn", label: "Serial no", placeholder: "Truck / Vehicle No." },
                    { key: "from", label: "From", placeholder: "Origin city / station" },
                    { key: "consignee", label: "Consignee", placeholder: "Recipient name & address" },
                    { key: "through", label: "Through", placeholder: "Via / Agent name" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="flex items-end gap-2">
                      <span className="text-sm font-bold text-[#2388ff] whitespace-nowrap min-w-[90px]">{label}</span>
                      <input
                        value={(form as any)[key]}
                        onChange={(e) => set(key, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 border-0 border-b border-blue-800 bg-transparent text-sm text-white outline-none px-1 py-1 min-w-0 placeholder:text-slate-500 placeholder:italic"
                      />
                    </div>
                  ))}

                </div>

                {/* Right: Amount table */}
                <div className="flex-shrink-0 w-[240px]">
                  <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
                    <caption className="text-xs font-bold text-center text-white border border-slate-700 border-b-0 bg-slate-800 py-1.5 px-2">Amount</caption>
                    <thead>
                      <tr>
                        <th className="border border-slate-700 bg-slate-800 text-[#2388ff] font-extrabold text-left text-xs px-2 py-1.5 w-[48%]">Head</th>
                        <th className="border border-slate-700 bg-slate-800 text-[#2388ff] font-extrabold text-center text-xs px-2 py-1.5 w-[30%]">Rs.</th>
                        <th className="border border-slate-700 bg-slate-800 text-[#2388ff] font-extrabold text-center text-xs px-2 py-1.5 w-[22%]">P.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: "freight", label: "Freight" },
                        { key: "labour", label: "Labour" },
                        { key: "stationery", label: "Stationery" },
                        { key: "commission", label: "Commission" },
                        { key: "aoc", label: "A.O.C." },
                      ].map(({ key, label }) => (
                        <tr key={key}>
                          <td className="lbl border border-slate-700 px-2 py-1 font-semibold text-slate-300 text-left">{label}</td>
                          <td className="border border-slate-700 px-1 py-1 bg-slate-900/50">
                            <input
                              type="number"
                              min="0"
                              value={(form as any)[key]}
                              onChange={(e) => set(key, e.target.value)}
                              placeholder="0"
                              className="w-full border-0 bg-transparent text-right text-sm text-white outline-none placeholder:text-slate-600"
                            />
                          </td>
                          <td className="border border-slate-700 px-1 py-1 bg-slate-900/50">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={(form as any)[`${key}Paise`]}
                              onChange={(e) => set(`${key}Paise`, e.target.value)}
                              placeholder="00"
                              className="w-full border-0 bg-transparent text-right text-sm text-white outline-none placeholder:text-slate-600"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td className="total-lbl border border-slate-700 px-2 py-1.5 bg-slate-800 font-black text-white">Total</td>
                        <td className="border border-slate-700 px-2 py-1.5 bg-slate-800 text-right font-black text-[#2388ff]">{totalWhole}</td>
                        <td className="border border-slate-700 px-2 py-1.5 bg-slate-800 text-right font-black text-[#2388ff]">{String(totalPaise).padStart(2, "0")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom row */}
              <div className="flex justify-end items-end mt-8 pt-4 border-t border-blue-900/50">
                <div className="text-sm font-bold text-slate-400 text-center">
                  <span className="block border-t border-slate-600 mt-6 pt-1">D. Clerk</span>
                </div>
              </div>

              {/* Watermark */}
              <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden" aria-hidden>
                <span className="text-[52px] font-black tracking-[6px] uppercase select-none" style={{ color: "rgba(0,180,255,.04)" }}>Transport</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save & Print */}
        <div className="flex justify-center">
          <Button
            size="sm"
            onClick={handleSaveAndPrint}
            disabled={saving}
            className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 transition-all"
          >
            <Save className="h-4 w-4" /> Save & Print
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
