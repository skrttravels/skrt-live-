"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Loader2,
  Calculator,
  TrendingUp
} from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchTemplate, fillTemplate } from "@/lib/template-utils";

const getLocalDateString = (d: Date = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getFirstDayOfMonthString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function InvoicesPage() {
  const [activeCard, setActiveCard] = useState<'summary' | 'delivery-statement'>('summary');

  const [dateMode, setDateMode] = useState<'today' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(getFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  const [summaries, setSummaries] = useState<any[]>([]);
  const [deliveryStatements, setDeliveryStatements] = useState<any[]>([]);
  const [aggLoading, setAggLoading] = useState(false);

  const fetchAggregationData = useCallback(async () => {
    try {
      setAggLoading(true);
      const params = { startDate, endDate };
      const [sumRes, dsRes] = await Promise.all([
        api.get("/summary", { params }),
        api.get("/delivery-statement", { params })
      ]);
      if (sumRes.data.success) setSummaries(sumRes.data.data || []);
      if (dsRes.data.success) setDeliveryStatements(dsRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch aggregation data", error);
      toast.error("Failed to fetch ledger data for calculation");
    } finally {
      setAggLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAggregationData();
  }, [fetchAggregationData]);

  useEffect(() => {
    if (dateMode === 'today') {
      const today = getLocalDateString();
      setStartDate(today);
      setEndDate(today);
    } else if (dateMode === 'month') {
      setStartDate(getFirstDayOfMonthString());
      setEndDate(getLocalDateString());
    }
  }, [dateMode]);

  const aggregatedValues = useMemo(() => {
    const filteredSummaries = summaries.filter(reg => {
      const dateStr = (reg.date || "").split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });

    let summaryCredit = 0;
    let summaryDebit = 0;

    filteredSummaries.forEach(reg => {
      (reg.entries || []).forEach((e: any) => {
        summaryCredit += parseFloat(e.credit) || 0;
        summaryDebit += parseFloat(e.debit) || 0;
      });
    });

    const filteredDS = deliveryStatements.filter(reg => {
      const dateStr = (reg.dateSearch || "").split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });

    let dsFreight = 0;
    let dsLabour = 0;
    let dsStationery = 0;
    let dsCommission = 0;
    let dsDemurrage = 0;

    filteredDS.forEach(reg => {
      (reg.entries || []).forEach((e: any) => {
        dsFreight += parseFloat(e.freight) || 0;
        dsLabour += parseFloat(e.labour) || 0;
        dsStationery += parseFloat(e.receiptCh) || 0;
        dsCommission += parseFloat(e.dCom) || 0;
        dsDemurrage += parseFloat(e.demurage) || 0;
      });
    });

    const dsTotalDebit = dsLabour + dsStationery + dsCommission + dsDemurrage;
    const summaryNet = summaryCredit - summaryDebit;
    const dsNet = dsFreight - dsTotalDebit;

    return {
      summaryCredit,
      summaryDebit,
      summaryNet,
      dsFreight,
      dsLabour,
      dsStationery,
      dsCommission,
      dsDemurrage,
      dsTotalDebit,
      dsNet,
      summariesCount: filteredSummaries.length,
      dsCount: filteredDS.length
    };
  }, [summaries, deliveryStatements, startDate, endDate]);

  const dsTableRows = useMemo(() => {
    const filteredDS = deliveryStatements.filter(reg => {
      const dateStr = (reg.dateSearch || "").split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });

    const rows: { sno: string; date: string; credit: number; debit: number }[] = [];
    filteredDS.forEach(reg => {
      const dateStr = reg.dateSearch?.split('T')[0] || "";
      (reg.entries || []).forEach((e: any) => {
        const credit = parseFloat(e.freight) || 0;
        const debit = (parseFloat(e.labour) || 0) + (parseFloat(e.receiptCh) || 0) + (parseFloat(e.dCom) || 0) + (parseFloat(e.demurage) || 0);
        rows.push({ sno: e.sno || "", date: dateStr, credit, debit });
      });
    });
    return rows;
  }, [deliveryStatements, startDate, endDate]);

  const summaryTableRows = useMemo(() => {
    const filteredSummaries = summaries.filter(reg => {
      const dateStr = (reg.date || "").split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });

    const rows: { sno: string; date: string; from: string; to: string; truckNo: string; driverName: string; credit: number; debit: number }[] = [];
    filteredSummaries.forEach(reg => {
      const dateStr = (reg.date || "").split('T')[0];
      (reg.entries || []).forEach((e: any) => {
        rows.push({
          sno: e.sno || "",
          date: dateStr,
          from: e.from || "",
          to: e.to || "",
          truckNo: e.truckNo || "",
          driverName: e.driverName || "",
          credit: parseFloat(e.credit) || 0,
          debit: parseFloat(e.debit) || 0,
        });
      });
    });
    return rows;
  }, [summaries, startDate, endDate]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const p = dateStr.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dateStr;
  };

  const getPrintStatementHTML = async () => {
    const values = aggregatedValues;
    if (activeCard === 'summary') {
      const template = await fetchTemplate("invoice_reconciliation");
      return fillTemplate(template, {
        START_DATE: formatDateDisplay(startDate),
        END_DATE: formatDateDisplay(endDate),
        REPORT_DATE: new Date().toLocaleString(),
        SUMMARY_COUNT: String(values.summariesCount),
        DS_COUNT: "0",
        SUMMARY_CREDIT: values.summaryCredit.toFixed(2),
        SUMMARY_DEBIT: values.summaryDebit.toFixed(2),
        DS_FREIGHT: "0.00",
        DS_LABOUR: "0.00",
        DS_STATIONERY: "0.00",
        DS_COMMISSION: "0.00",
        DS_AOC: "0.00",
        TOTAL_CREDITS: values.summaryCredit.toFixed(2),
        TOTAL_DEBITS: values.summaryDebit.toFixed(2),
        NET_RECEIVABLE: values.summaryNet.toFixed(2),
      });
    } else {
      const template = await fetchTemplate("invoice_reconciliation");
      return fillTemplate(template, {
        START_DATE: formatDateDisplay(startDate),
        END_DATE: formatDateDisplay(endDate),
        REPORT_DATE: new Date().toLocaleString(),
        SUMMARY_COUNT: "0",
        DS_COUNT: String(values.dsCount),
        SUMMARY_CREDIT: "0.00",
        SUMMARY_DEBIT: "0.00",
        DS_FREIGHT: values.dsFreight.toFixed(2),
        DS_LABOUR: values.dsLabour.toFixed(2),
        DS_STATIONERY: values.dsStationery.toFixed(2),
        DS_COMMISSION: values.dsCommission.toFixed(2),
        DS_AOC: values.dsDemurrage.toFixed(2),
        TOTAL_CREDITS: values.dsFreight.toFixed(2),
        TOTAL_DEBITS: values.dsTotalDebit.toFixed(2),
        NET_RECEIVABLE: values.dsNet.toFixed(2),
      });
    }
  };

  const handlePrintStatement = async () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(await getPrintStatementHTML());
    pw.document.close();
  };

  const handleDownloadPDFStatement = async () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const html = (await getPrintStatementHTML()).replace("</body>", `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<script>window.onload=function(){html2pdf().set({margin:5,filename:'reconciliation-statement.pdf'}).from(document.body).save();};<\/script></body>`);
    pw.document.write(html);
    pw.document.close();
  };

  const creditAmount = activeCard === 'summary' ? aggregatedValues.summaryCredit : aggregatedValues.dsFreight;
  const debitAmount = activeCard === 'summary' ? aggregatedValues.summaryDebit : aggregatedValues.dsTotalDebit;
  const netAmount = activeCard === 'summary' ? aggregatedValues.summaryNet : aggregatedValues.dsNet;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Calculator className="w-8 h-8 text-[#2388ff]" />
              Billing & Invoices
            </h2>
            <p className="text-muted-foreground text-sm mt-1">View delivery statement and summary reconciliation data.</p>
          </div>
        </div>

        {/* Toggle Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className={cn(
              "border-2 cursor-pointer transition-all duration-200 hover:shadow-xl",
              activeCard === 'delivery-statement'
                ? "border-[#2388ff] bg-slate-900/60 shadow-[#2388ff]/10"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
            onClick={() => setActiveCard('delivery-statement')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  activeCard === 'delivery-statement' ? "bg-[#2388ff]/20" : "bg-slate-800"
                )}>
                  <FileText className={cn(
                    "w-6 h-6",
                    activeCard === 'delivery-statement' ? "text-[#2388ff]" : "text-slate-500"
                  )} />
                </div>
                <div>
                  <h3 className={cn(
                    "text-lg font-bold",
                    activeCard === 'delivery-statement' ? "text-white" : "text-slate-400"
                  )}>Delivery Statement</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Freight credits & expense debits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-2 cursor-pointer transition-all duration-200 hover:shadow-xl",
              activeCard === 'summary'
                ? "border-[#2388ff] bg-slate-900/60 shadow-[#2388ff]/10"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
            onClick={() => setActiveCard('summary')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  activeCard === 'summary' ? "bg-[#2388ff]/20" : "bg-slate-800"
                )}>
                  <TrendingUp className={cn(
                    "w-6 h-6",
                    activeCard === 'summary' ? "text-[#2388ff]" : "text-slate-500"
                  )} />
                </div>
                <div>
                  <h3 className={cn(
                    "text-lg font-bold",
                    activeCard === 'summary' ? "text-white" : "text-slate-400"
                  )}>Summary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Credit & debit adjustments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Detail Card */}
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md overflow-hidden relative shadow-2xl">
          <CardHeader className="bg-slate-900/60 border-b border-slate-800 py-4 px-6 flex flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#2388ff] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {activeCard === 'summary' ? 'Summary Credits & Debits' : 'Delivery Statement Credits & Debits'}
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value as 'today' | 'month' | 'custom')}
                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="today" className="bg-slate-900">Today</option>
                <option value="month" className="bg-slate-900">Month</option>
                <option value="custom" className="bg-slate-900">Custom</option>
              </select>

              {dateMode === 'custom' ? (
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-[#2388ff]" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-white border-0 outline-none w-28 text-center"
                    style={{ colorScheme: "dark" }}
                  />
                  <span className="text-slate-500 font-bold px-1">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-white border-0 outline-none w-28 text-center"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-[#2388ff]" />
                  <span className="font-mono text-xs">{startDate}</span>
                  <span className="text-slate-500 font-bold px-1">to</span>
                  <span className="font-mono text-xs">{endDate}</span>
                </div>
              )}

              <Button
                size="sm"
                onClick={fetchAggregationData}
                disabled={aggLoading}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 h-8"
              >
                {aggLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
              </Button>

              <Button
                size="sm"
                onClick={handlePrintStatement}
                className="bg-[#2388ff] hover:bg-[#2388ff]/90 text-white font-semibold h-8"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Print
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadPDFStatement}
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 h-8"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {aggLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#2388ff]" />
                <p className="text-xs uppercase tracking-wider font-semibold">Loading data...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-12 gap-6 items-stretch">
                {/* Credits column */}
                <div className="md:col-span-5 bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-emerald-400 tracking-widest border-b border-slate-800 pb-2">Credits (Revenue)</h4>
                  <div className="space-y-3 text-sm">
                    {activeCard === 'summary' ? (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Summary Credit:</span>
                        <span className="text-white font-mono font-semibold">₹ {aggregatedValues.summaryCredit.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">DS Freight:</span>
                        <span className="text-white font-mono font-semibold">₹ {aggregatedValues.dsFreight.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="h-px bg-slate-900 my-2" />
                    <div className="flex justify-between items-center text-emerald-400 font-extrabold">
                      <span>Total Credit:</span>
                      <span className="font-mono text-base">₹ {creditAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Minus sign */}
                <div className="md:col-span-2 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-slate-400">
                    &minus;
                  </div>
                </div>

                {/* Debits column */}
                <div className="md:col-span-5 bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-rose-400 tracking-widest border-b border-slate-800 pb-2">Debits (Expenses Breakdown)</h4>
                  <div className="space-y-3 text-sm">
                    {activeCard === 'summary' ? (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Summary Debit:</span>
                        <span className="text-white font-mono font-semibold">₹ {aggregatedValues.summaryDebit.toLocaleString()}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Labour (Dr):</span>
                          <span className="text-white font-mono font-semibold">₹ {aggregatedValues.dsLabour.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Stationery (Dr):</span>
                          <span className="text-white font-mono font-semibold">₹ {aggregatedValues.dsStationery.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Commission (Dr):</span>
                          <span className="text-white font-mono font-semibold">₹ {aggregatedValues.dsCommission.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">A.O.C. (Dr):</span>
                          <span className="text-white font-mono font-semibold">₹ {aggregatedValues.dsDemurrage.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className="h-px bg-slate-900 my-2" />
                    <div className="flex justify-between items-center text-rose-400 font-extrabold">
                      <span>Total Debit:</span>
                      <span className="font-mono text-base">₹ {debitAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Payable */}
                <div className="col-span-12 bg-gradient-to-r from-[#2388ff]/10 via-blue-900/10 to-transparent border border-[#2388ff]/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2388ff]/20 text-[#2388ff] flex items-center justify-center shrink-0">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Net Reconciled Amount</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                        {activeCard === 'summary' ? 'Summary Credit - Debit' : 'Freight - (Labour + Stationery + Commission + A.O.C.)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-2">Net Total</span>
                    <span className={cn(
                      "text-2xl font-black tracking-wide font-mono",
                      netAmount >= 0 ? "text-emerald-400" : "text-rose-500"
                    )}>
                      ₹ {netAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {!aggLoading && (
            <div className="border-t border-slate-800 px-6 pb-6">
              {activeCard === 'delivery-statement' ? (
                <>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-4">Delivery Statement Entries</h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-400 font-bold w-[8%]">Sr</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[20%]">Date</TableHead>
                        <TableHead className="text-slate-400 font-bold text-right w-[36%]">Credit (₹)</TableHead>
                        <TableHead className="text-slate-400 font-bold text-right w-[36%]">Debit (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dsTableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                            No entries found in selected date range
                          </TableCell>
                        </TableRow>
                      ) : (
                        dsTableRows.map((row, idx) => (
                          <TableRow key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                            <TableCell className="text-slate-400 font-mono text-sm">{row.sno || idx + 1}</TableCell>
                            <TableCell className="text-white font-mono text-sm">{row.date}</TableCell>
                            <TableCell className="text-emerald-400 font-mono text-sm text-right font-semibold">
                              {row.credit > 0 ? `₹${row.credit.toLocaleString()}` : "—"}
                            </TableCell>
                            <TableCell className="text-rose-400 font-mono text-sm text-right font-semibold">
                              {row.debit > 0 ? `₹${row.debit.toLocaleString()}` : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {dsTableRows.length > 0 && (
                        <TableRow className="bg-slate-800/60">
                          <TableCell colSpan={2} className="font-bold text-white text-sm">Total</TableCell>
                          <TableCell className="font-bold text-emerald-400 font-mono text-sm text-right">
                            ₹{dsTableRows.reduce((s, r) => s + r.credit, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-bold text-rose-400 font-mono text-sm text-right">
                            ₹{dsTableRows.reduce((s, r) => s + r.debit, 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-4">Summary Entries</h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-400 font-bold w-[6%]">Sr</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[10%]">Date</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[12%]">Vehicle</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[14%]">Driver</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[12%]">From</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[12%]">To</TableHead>
                        <TableHead className="text-slate-400 font-bold text-right w-[14%]">Credit (₹)</TableHead>
                        <TableHead className="text-slate-400 font-bold text-right w-[14%]">Debit (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryTableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-slate-500">
                            No entries found in selected date range
                          </TableCell>
                        </TableRow>
                      ) : (
                        summaryTableRows.map((row, idx) => (
                          <TableRow key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                            <TableCell className="text-slate-400 font-mono text-sm">{row.sno || idx + 1}</TableCell>
                            <TableCell className="text-white font-mono text-sm">{row.date}</TableCell>
                            <TableCell className="text-slate-300 text-sm">{row.truckNo || "—"}</TableCell>
                            <TableCell className="text-slate-300 text-sm">{row.driverName || "—"}</TableCell>
                            <TableCell className="text-slate-300 text-sm">{row.from || "—"}</TableCell>
                            <TableCell className="text-slate-300 text-sm">{row.to || "—"}</TableCell>
                            <TableCell className="text-emerald-400 font-mono text-sm text-right font-semibold">
                              {row.credit > 0 ? `₹${row.credit.toLocaleString()}` : "—"}
                            </TableCell>
                            <TableCell className="text-rose-400 font-mono text-sm text-right font-semibold">
                              {row.debit > 0 ? `₹${row.debit.toLocaleString()}` : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {summaryTableRows.length > 0 && (
                        <TableRow className="bg-slate-800/60">
                          <TableCell colSpan={6} className="font-bold text-white text-sm">Total</TableCell>
                          <TableCell className="font-bold text-emerald-400 font-mono text-sm text-right">
                            ₹{summaryTableRows.reduce((s, r) => s + r.credit, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-bold text-rose-400 font-mono text-sm text-right">
                            ₹{summaryTableRows.reduce((s, r) => s + r.debit, 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
