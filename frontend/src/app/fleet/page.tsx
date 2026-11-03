"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Receipt, 
  ClipboardList, 
  Truck, 
  Loader2, 
  X, 
  Search,
  Filter,
  Calendar,
  Download,
  Eye,
  Printer,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useHeader } from "@/context/HeaderContext";
import { toast } from "sonner";
import { generateAndSendPDF } from "@/lib/whatsapp";
import { fetchCashMemoTemplate, fillCashMemoTemplate } from "@/lib/cash-memo-template";
import { buildSummaryPrintHtml } from "@/lib/summary-html";
import { fetchTemplate, fillTemplate } from "@/lib/template-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ModuleKey = "challan" | "cash-memo" | "summary" | "delivery-statement" | "entry";

const modules: { key: ModuleKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "challan", label: "Challan", icon: <ClipboardList className="w-7 h-7" />, color: "from-blue-600/20 to-blue-900/10" },
  { key: "cash-memo", label: "Cash Memo", icon: <Receipt className="w-7 h-7" />, color: "from-emerald-600/20 to-emerald-900/10" },
  { key: "summary", label: "Summary", icon: <FileSpreadsheet className="w-7 h-7" />, color: "from-amber-600/20 to-amber-900/10" },
  { key: "delivery-statement", label: "Delivery Statement", icon: <Truck className="w-7 h-7" />, color: "from-rose-600/20 to-rose-900/10" },
  { key: "entry", label: "Entry", icon: <FileSpreadsheet className="w-7 h-7" />, color: "from-violet-600/20 to-violet-900/10" },
];

const moduleEndpoints: Record<ModuleKey, string> = {
  challan: "/challan",
  "cash-memo": "/cash-memo",
  summary: "/summary",
  "delivery-statement": "/delivery-statement",
  entry: "/entry",
};

const moduleSearchHints: Record<ModuleKey, string> = {
  challan: "Search Challan No, G.R. No, or Driver…",
  "cash-memo": "Search D.R. No or G.R. No…",
  summary: "Search No., Challan No, or Driver…",
  "delivery-statement": "Search Page No, S.No, or D.R. No…",
  entry: "Search Page No, Challan No, or Driver…",
};

const getLocalDateString = (d: Date = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function FleetPage() {
  const { searchQuery } = useHeader();
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<ModuleKey, number>>({} as any);
  const [localSearch, setLocalSearch] = useState("");
  const [highlightVal, setHighlightVal] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Date Filtering states
  const [dateFilterType, setDateFilterType] = useState<"all" | "today" | "selected" | "range">("all");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  // Preview Dialog states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewModule, setPreviewModule] = useState<ModuleKey | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEntryIndex, setPreviewEntryIndex] = useState<number | null>(null);
  const [waPhone, setWaPhone] = useState("");
  const [sendingWa, setSendingWa] = useState(false);
  const getRecordDate = (module: ModuleKey, reg: any) => {
    let dateVal = "";
    if (module === "challan") dateVal = reg.date || reg.dateSearch || reg._regDate || "";
    else if (module === "cash-memo") dateVal = reg.date ? new Date(reg.date).toISOString().split('T')[0] : "";
    else if (module === "summary") dateVal = reg.date || reg._regDate || "";
    else if (module === "delivery-statement") dateVal = reg.dateSearch || reg._regDate || "";
    else if (module === "entry") dateVal = reg.dateSearch || reg._regDate || "";
    return dateVal.split('T')[0];
  };

  const matchesDateFilter = (recDate: string) => {
    if (dateFilterType === "all") return true;
    if (!recDate) return false;
    
    if (dateFilterType === "today") {
      const todayStr = getLocalDateString();
      return recDate === todayStr;
    }
    if (dateFilterType === "selected") {
      return recDate === selectedDate;
    }
    if (dateFilterType === "range") {
      return recDate >= startDate && recDate <= endDate;
    }
    return true;
  };

  const getFilteredRegisters = useCallback(() => {
    if (!activeModule) return [];
    return records.filter(reg => {
      const recDate = getRecordDate(activeModule, reg);
      return matchesDateFilter(recDate);
    });
  }, [records, activeModule, dateFilterType, selectedDate, startDate, endDate]);

  const fetchAllCounts = useCallback(async () => {
    const results: Record<string, number> = {};
    for (const [key, endpoint] of Object.entries(moduleEndpoints)) {
      try {
        const { data } = await api.get(endpoint);
        if (data.success) {
          results[key] = data.data?.length || data.count || 0;
        }
      } catch {
        results[key] = 0;
      }
    }
    setCounts(results as Record<ModuleKey, number>);
  }, []);

  useEffect(() => {
    fetchAllCounts();
  }, [fetchAllCounts]);

  const fetchRecords = useCallback(async (module: ModuleKey) => {
    setLoading(true);
    try {
      const { data } = await api.get(moduleEndpoints[module]);
      if (data.success) {
        setRecords(data.data || []);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRowClick = async (module: ModuleKey, regId: string, entryIndex?: number, openPreview: boolean = true) => {
    setPreviewLoading(true);
    if (openPreview) setPreviewOpen(true);
    setPreviewModule(module);
    setPreviewData(null);
    setPreviewEntryIndex(entryIndex ?? null);
    try {
      const endpoint = moduleEndpoints[module];
      const { data } = await api.get(`${endpoint}/${regId}`);
      if (data.success) {
        setPreviewData(data.data);
      } else {
        toast.error("Failed to load record details");
        if (openPreview) setPreviewOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch record details");
      if (openPreview) setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const highlightParam = params.get("highlight");
      if (highlightParam) {
        setHighlightVal(highlightParam);
      } else {
        setHighlightVal(null);
      }
      if (tabParam) {
        const validModules: ModuleKey[] = ["challan", "cash-memo", "summary", "delivery-statement", "entry"];
        if (validModules.includes(tabParam as ModuleKey)) {
          setActiveModule(tabParam as ModuleKey);
          fetchRecords(tabParam as ModuleKey);
        }
      }
    }
  }, [fetchRecords]);

  // Hook scroll highlight blinking row + Auto-open preview modal
  useEffect(() => {
    if (highlightVal && records.length > 0 && activeModule) {
      const lowerHighlight = highlightVal.toLowerCase();
      let matchedRegId = "";
      let elementId = "";

      if (activeModule === "challan") {
        const matched = records.find(reg => 
          String(reg.challanNo || "").toLowerCase() === lowerHighlight ||
          (reg.entries || []).some((e: any) => String(e.grNo || "").toLowerCase() === lowerHighlight)
        );
        if (matched) {
          matchedRegId = matched._id;
          elementId = `row-challan-${matched.challanNo}`;
        }
      } else if (activeModule === "cash-memo") {
        const matched = records.find(reg => 
          String(reg.drNo || "").toLowerCase() === lowerHighlight ||
          String(reg.grNo || "").toLowerCase() === lowerHighlight
        );
        if (matched) {
          matchedRegId = matched._id;
          elementId = `row-cash-memo-${matched.drNo}`;
        }
      } else if (activeModule === "summary") {
        const matched = records.find(reg => 
          (reg.entries || []).some((e: any) => 
            String(e.sno || "").toLowerCase() === lowerHighlight ||
            String(e.challanNo || "").toLowerCase() === lowerHighlight
          )
        );
        if (matched) {
          matchedRegId = matched._id;
          const matchedEntry = matched.entries.find((e: any) => String(e.sno || "").toLowerCase() === lowerHighlight || String(e.challanNo || "").toLowerCase() === lowerHighlight);
          elementId = `row-summary-${matchedEntry?.sno || matched.entries[0]?.sno}`;
        }
      } else if (activeModule === "delivery-statement") {
        const matched = records.find(reg => 
          String(reg.pageNo || "").toLowerCase() === lowerHighlight ||
          (reg.entries || []).some((e: any) => String(e.sno || "").toLowerCase() === lowerHighlight)
        );
        if (matched) {
          matchedRegId = matched._id;
          elementId = `row-delivery-statement-${matched.pageNo}`;
        }
      } else if (activeModule === "entry") {
        const matched = records.find(reg => 
          String(reg.pageNo || "").toLowerCase() === lowerHighlight ||
          String(reg.challanNo || "").toLowerCase() === lowerHighlight ||
          (reg.entries || []).some((e: any) => String(e.sno || "").toLowerCase() === lowerHighlight)
        );
        if (matched) {
          matchedRegId = matched._id;
          elementId = `row-entry-${matched.pageNo}`;
        }
      }

      if (matchedRegId) {
        handleRowClick(activeModule, matchedRegId);
        
        const timer = setTimeout(() => {
          const el = document.getElementById(elementId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("animate-row-blink");
            setTimeout(() => {
              el.classList.remove("animate-row-blink");
            }, 3000);
          }
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightVal, records, activeModule]);

  const handleCardClick = (key: ModuleKey) => {
    if (activeModule === key) {
      setActiveModule(null);
      setRecords([]);
      setLocalSearch("");
      setSelectedIds(new Set());
      return;
    }
    setActiveModule(key);
    setLocalSearch("");
    setSelectedIds(new Set());
    fetchRecords(key);
  };

  const getRowKey = (regId: string, entryIdx?: number) => {
    return entryIdx !== undefined ? `${regId}-${entryIdx}` : regId;
  };

  const toggleRowSelection = (key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllRows = (keys: string[]) => {
    setSelectedIds(prev => {
      const allSelected = keys.every(k => prev.has(k));
      if (allSelected) return new Set();
      return new Set(keys);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected record(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const regIds = new Set<string>();
      const filteredRegs = getFilteredRegisters();
      for (const reg of filteredRegs) {
        if (activeModule === "cash-memo") {
          if (selectedIds.has(reg._id)) regIds.add(reg._id);
        } else {
          (reg.entries || []).forEach((_: any, idx: number) => {
            if (selectedIds.has(getRowKey(reg._id, idx))) regIds.add(reg._id);
          });
        }
      }
      const endpoint = activeModule ? moduleEndpoints[activeModule] : "";
      let deleted = 0;
      for (const id of regIds) {
        try {
          await api.delete(`${endpoint}/${id}`);
          deleted++;
        } catch {}
      }
      toast.success(`${deleted} record(s) deleted successfully`);
      setSelectedIds(new Set());
      if (activeModule) fetchRecords(activeModule);
    } catch (error: any) {
      toast.error("Failed to delete records");
    } finally {
      setBulkDeleting(false);
    }
  };

  const effectiveQuery = (localSearch || searchQuery).trim().toLowerCase();

  const isChallanMatch = (row: any, q: string) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return false;
    return (
      String(row.challanNo || "").toLowerCase().includes(lower) ||
      String(row.grNo || "").toLowerCase().includes(lower) ||
      String(row.driverName || "").toLowerCase().includes(lower)
    );
  };

  const isCashMemoMatch = (row: any, q: string) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return false;
    return (
      String(row.drNo || "").toLowerCase().includes(lower) ||
      String(row.grNo || "").toLowerCase().includes(lower)
    );
  };

  const isSummaryMatch = (row: any, q: string) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return false;
    return (
      String(row.sno || "").toLowerCase().includes(lower) ||
      String(row.challanNo || "").toLowerCase().includes(lower) ||
      String(row.driverName || "").toLowerCase().includes(lower)
    );
  };

  const isDeliveryStatementMatch = (row: any, q: string) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return false;
    return (
      String(row.pageNo || "").toLowerCase().includes(lower) ||
      String(row.sno || "").toLowerCase().includes(lower) ||
      String(row.drNo || "").toLowerCase().includes(lower)
    );
  };

  const isEntryMatch = (row: any, q: string) => {
    const lower = q.toLowerCase().trim();
    if (!lower) return false;
    return (
      String(row.pageNo || "").toLowerCase().includes(lower) ||
      String(row.challanNo || "").toLowerCase().includes(lower) ||
      String(row.driverName || "").toLowerCase().includes(lower) ||
      String(row.vehicleNo || "").toLowerCase().includes(lower) ||
      String(row.grNo || "").toLowerCase().includes(lower) ||
      String(row.consignor || "").toLowerCase().includes(lower) ||
      String(row.consignee || "").toLowerCase().includes(lower) ||
      String(row.deliveryReceiptNo || "").toLowerCase().includes(lower)
    );
  };

  const renderNoData = (isSearchResult: boolean) => (
    <div className="text-center py-16 text-slate-500">
      <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="text-lg font-medium">{isSearchResult ? "No matches found" : "No records found"}</p>
      <p className="text-sm mt-1">
        {isSearchResult ? "Try a different search term." : "The database has no records for this module."}
      </p>
    </div>
  );

  const flattenRow = (reg: any, entry: any, entryIdx: number = 0) => {
    return { 
      _regId: reg._id, 
      _entryIdx: entryIdx,
      ...entry, 
      ...(reg.date ? { _regDate: reg.date } : {}), 
      ...(reg.dateSearch ? { _regDate: reg.dateSearch } : {}), 
      ...(reg.challanNo ? { challanNo: reg.challanNo } : {}), 
      ...(reg.vehicleNo ? { vehicleNo: reg.vehicleNo } : {}), 
      ...(reg.driverName ? { driverName: reg.driverName } : {}), 
      ...(reg.pageNo ? { pageNo: reg.pageNo } : {}), 
      ...(reg.from ? { _regFrom: reg.from } : {}),
      ...(reg.fromData ? { fromData: reg.fromData } : {}),
      ...(reg.toData ? { toData: reg.toData } : {})
    };
  };

  const handleDownload = () => {
    if (!activeModule) return;
    const filteredRegs = getFilteredRegisters();
    
    let headers: string[] = [];
    let csvRows: any[][] = [];
    
    if (activeModule === "challan") {
      headers = ["Date", "Challan No", "Vehicle", "Driver", "G.R. No", "Pkg", "Dest.", "Content", "Consignor", "Consignee", "Total", "Wt"];
      const flat = filteredRegs.flatMap((reg: any) =>
        (reg.entries || []).map((e: any) => flattenRow(reg, e))
      );
      csvRows = flat.map((r: any) => [
        r._regDate || "",
        r.challanNo || "",
        r.vehicleNo || "",
        r.driverName || "",
        r.grNo || "",
        r.pkg || "",
        r.dest || "",
        r.content || "",
        r.consignor || "",
        r.consignee || "",
        r.total || "",
        r.wt || ""
      ]);
    } else if (activeModule === "cash-memo") {
      headers = ["D.R. No", "G.R. No", "Date", "From", "Consignee", "Freight", "Labour", "Stationery", "Commission", "A.O.C.", "Total"];
      csvRows = filteredRegs.map((memo: any) => [
        memo.drNo || "",
        memo.grNo || "",
        memo.date ? new Date(memo.date).toLocaleDateString() : "",
        memo.from || "",
        memo.consignee || "",
        (memo.freight || 0) + (memo.freightPaise || 0) / 100,
        (memo.labour || 0) + (memo.labourPaise || 0) / 100,
        (memo.stationery || 0) + (memo.stationeryPaise || 0) / 100,
        (memo.commission || 0) + (memo.commissionPaise || 0) / 100,
        (memo.aoc || 0) + (memo.aocPaise || 0) / 100,
        memo.totalAmount || 0
      ]);
    } else if (activeModule === "summary") {
      headers = ["Date", "S.No", "Truck No", "Driver", "From", "To", "Transport", "Challan No", "Fare Del.", "Crossing", "Cross Fare", "Labor", "Del. Comm.", "Credit", "Debit", "Grand Total", "Note", "Note 2"];
      const flat = filteredRegs.flatMap((reg: any) =>
        (reg.entries || []).map((e: any) => flattenRow(reg, e))
      );
      csvRows = flat.map((r: any) => [
        r._regDate || "",
        r.sno || "",
        r.truckNo || "",
        r.driverName || "",
        r.from || "",
        r.to || "",
        r.transportName || "",
        r.challanNo || "",
        r.fareDelivery || "",
        r.crossing || "",
        r.crossingFare || "",
        r.labor || "",
        r.deliveryCommission || "",
        r.credit || "",
        r.debit || "",
        r.grandTotal || "",
        r.note || "",
        r.note2 || ""
      ]);
    } else if (activeModule === "delivery-statement") {
      headers = ["Date", "Page No", "S.No", "D.R. No", "Freight", "Labour", "Stationery", "Commission", "A.O.C", "Total"];
      const flat = filteredRegs.flatMap((reg: any) =>
        (reg.entries || []).map((e: any) => flattenRow(reg, e))
      );
      csvRows = flat.map((r: any) => {
        const total = (parseFloat(r.freight) || 0) + (parseFloat(r.labour) || 0) + (parseFloat(r.receiptCh) || 0) + (parseFloat(r.dCom) || 0) + (parseFloat(r.demurage) || 0);
        return [
          r._regDate || "",
          r.pageNo || "",
          r.sno || "",
          r.drNo || "",
          r.freight || "",
          r.labour || "",
          r.receiptCh || "",
          r.dCom || "",
          r.demurage || "",
          total.toFixed(2)
        ];
      });
    } else if (activeModule === "entry") {
      headers = ["Date", "Page No", "Challan No", "Vehicle", "Driver", "S.No", "From", "To", "G.R. No", "Consignor", "Consignee", "No of Packages", "Contents", "Freight", "Delivery Receipt No", "Date of Delivery", "Status"];
      const flat = filteredRegs.flatMap((reg: any) =>
        (reg.entries || []).map((e: any) => flattenRow(reg, e))
      );
      csvRows = flat.map((r: any) => [
        r._regDate || "",
        r.pageNo || "",
        r.challanNo || "",
        r.vehicleNo || "",
        r.driverName || "",
        r.sno || "",
        r.from || "",
        r.to || "",
        r.grNo || "",
        r.consignor || "",
        r.consignee || "",
        r.noOfPackages || "",
        r.contents || "",
        r.freight || "",
        r.deliveryReceiptNo || "",
        r.dateOfDelivery || "",
        r.deliveryStatus || ""
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      [headers, ...csvRows].map(e => e.map(val => '"' + String(val ?? '').replace(/"/g, '""') + '"').join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateSuffix = dateFilterType === "today" ? "_today" : dateFilterType === "selected" ? `_${selectedDate}` : dateFilterType === "range" ? `_range_${startDate}_to_${endDate}` : "_all";
    link.setAttribute("download", `${activeModule}_records${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${modules.find(m => m.key === activeModule)?.label} data downloaded successfully`);
  };

  const renderChallanTable = (filteredRegs: any[]) => {
    const flatRows = filteredRegs.flatMap((reg: any) =>
      (reg.entries || []).map((e: any, entryIdx: number) => flattenRow(reg, e, entryIdx))
    );
    const lower = effectiveQuery;
    const filtered = lower ? flatRows.filter(r => isChallanMatch(r, lower)) : flatRows;
    const allRowKeys = filtered.map((row: any, i: number) => getRowKey(row._regId, row._entryIdx));
    const allSelected = allRowKeys.length > 0 && allRowKeys.every(k => selectedIds.has(k));
    
    if (flatRows.length === 0) return renderNoData(false);
    if (filtered.length === 0) return renderNoData(true);
    return (
      <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((row: any, i: number) => {
          const rk = getRowKey(row._regId, row._entryIdx);
          return (
          <div
            key={i}
            id={`row-challan-${row.challanNo}`}
            onClick={() => handleRowClick("challan", row._regId, row._entryIdx)}
            className={cn("rounded-lg border p-3 transition-colors cursor-pointer", selectedIds.has(rk) ? "border-rose-500/60 bg-rose-500/10" : isChallanMatch(row, searchQuery) ? "border-[#2388ff]/60 bg-[#2388ff]/10" : "border-slate-700 bg-slate-900/40 active:bg-slate-800/50")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.has(rk)} onClick={(e) => e.stopPropagation()} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                <span className="text-sm font-bold text-white">Challan {row.challanNo || "—"}</span>
              </div>
              <span className="text-xs text-slate-400">{row._regDate || "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div><span className="text-slate-500">Vehicle: </span><span className="text-white">{row.vehicleNo || "—"}</span></div>
              <div><span className="text-slate-500">Driver: </span><span className="text-white">{row.driverName || "—"}</span></div>
              <div><span className="text-slate-500">G.R. No: </span><span className="text-white">{row.grNo || "—"}</span></div>
              <div><span className="text-slate-500">Pkg: </span><span className="text-white">{row.pkg || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Dest: </span><span className="text-white">{row.dest || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Content: </span><span className="text-white">{row.content || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Consignor: </span><span className="text-white">{row.consignor || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Consignee: </span><span className="text-white">{row.consignee || "—"}</span></div>
              <div><span className="text-slate-500">Wt: </span><span className="text-white">{row.wt || "—"}</span></div>
              <div><span className="text-slate-500">Total: </span><span className="text-white font-bold">{row.total || "—"}</span></div>
            </div>
          </div>
          );
        })}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto border border-slate-700 rounded-lg">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900/80">
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">No.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Date</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Challan No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Vehicle</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Driver</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">G.R. No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Pkg</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Dest.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Content</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Consignor</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Consignee</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Total</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Wt</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row: any, i: number) => {
              const rk = getRowKey(row._regId, row._entryIdx);
              return (
              <tr 
                key={i} 
                id={`row-challan-${row.challanNo}`} 
                onClick={() => handleRowClick("challan", row._regId, row._entryIdx)}
                className={cn("transition-colors cursor-pointer", selectedIds.has(rk) ? "bg-rose-500/10" : isChallanMatch(row, searchQuery) ? "bg-[#2388ff]/10" : "hover:bg-slate-800/40")}
              >
                <td className="border border-slate-700 p-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(rk)} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                </td>
                <td className="border border-slate-700 p-2 text-center text-slate-400 max-w-[20px]">{i + 1}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row._regDate || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white font-medium">{row.challanNo || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.vehicleNo || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.driverName || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.grNo || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.pkg || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.dest || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.content || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white max-w-[100px] truncate">{row.consignor || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white max-w-[100px] truncate">{row.consignee || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white font-bold">{row.total || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{row.wt || "—"}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
    );
  };

  const renderCashMemoTable = (filteredRegs: any[]) => {
    if (filteredRegs.length === 0) return renderNoData(false);
    const lower = effectiveQuery;
    const filtered = lower ? filteredRegs.filter(r => isCashMemoMatch(r, lower)) : filteredRegs;
    const allRowKeys = filtered.map((memo: any) => memo._id);
    const allSelected = allRowKeys.length > 0 && allRowKeys.every(k => selectedIds.has(k));
    
    if (filtered.length === 0) return renderNoData(true);
    return (
      <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((memo: any, i: number) => (
          <div
            key={i}
            id={`row-cash-memo-${memo.drNo}`}
            onClick={() => handleRowClick("cash-memo", memo._id)}
            className={cn("rounded-lg border p-3 transition-colors cursor-pointer", selectedIds.has(memo._id) ? "border-rose-500/60 bg-rose-500/10" : isCashMemoMatch(memo, searchQuery) ? "border-[#2388ff]/60 bg-[#2388ff]/10" : "border-slate-700 bg-slate-900/40 active:bg-slate-800/50")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.has(memo._id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleRowSelection(memo._id)} className="accent-rose-500 w-4 h-4" />
                <span className="text-sm font-bold text-white">D.R. {memo.drNo || "—"}</span>
              </div>
              <span className="text-base font-bold text-amber-400">{memo.totalAmount || 0}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div><span className="text-slate-500">G.R. No: </span><span className="text-white">{memo.grNo || "—"}</span></div>
              <div><span className="text-slate-500">Date: </span><span className="text-white">{memo.date ? new Date(memo.date).toLocaleDateString() : "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">From: </span><span className="text-white">{memo.from || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Consignee: </span><span className="text-white">{memo.consignee || "—"}</span></div>
              <div><span className="text-slate-500">Freight: </span><span className="text-white">{(memo.freight || 0) + (memo.freightPaise || 0) / 100}</span></div>
              <div><span className="text-slate-500">Labour: </span><span className="text-white">{(memo.labour || 0) + (memo.labourPaise || 0) / 100}</span></div>
              <div><span className="text-slate-500">Stationery: </span><span className="text-white">{(memo.stationery || 0) + (memo.stationeryPaise || 0) / 100}</span></div>
              <div><span className="text-slate-500">Commission: </span><span className="text-white">{(memo.commission || 0) + (memo.commissionPaise || 0) / 100}</span></div>
              <div><span className="text-slate-500">A.O.C.: </span><span className="text-white">{(memo.aoc || 0) + (memo.aocPaise || 0) / 100}</span></div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto border border-slate-700 rounded-lg">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900/80">
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8">
                <input type="checkbox" checked={allSelected} onChange={() => toggleAllRows(allRowKeys)} className="accent-rose-500 w-4 h-4" />
              </th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">No.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">D.R. No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">G.R. No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Date</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">From</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Consignee</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Freight</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Labour</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Stationery</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Commission</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">A.O.C.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Total</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((memo: any, i: number) => (
              <tr 
                key={i} 
                id={`row-cash-memo-${memo.drNo}`} 
                onClick={() => handleRowClick("cash-memo", memo._id)}
                className={cn("transition-colors cursor-pointer", selectedIds.has(memo._id) ? "bg-rose-500/10" : isCashMemoMatch(memo, searchQuery) ? "bg-[#2388ff]/10" : "hover:bg-slate-800/40")}
              >
                <td className="border border-slate-700 p-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(memo._id)} onChange={() => toggleRowSelection(memo._id)} className="accent-rose-500 w-4 h-4" />
                </td>
                <td className="border border-slate-700 p-2 text-center text-slate-400 max-w-[20px]">{i + 1}</td>
                <td className="border border-slate-700 p-2 text-center text-white font-medium">{memo.drNo || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{memo.grNo || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{memo.date ? new Date(memo.date).toLocaleDateString() : "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{memo.from || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{memo.consignee || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{(memo.freight || 0) + (memo.freightPaise || 0) / 100}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{(memo.labour || 0) + (memo.labourPaise || 0) / 100}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{(memo.stationery || 0) + (memo.stationeryPaise || 0) / 100}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{(memo.commission || 0) + (memo.commissionPaise || 0) / 100}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{(memo.aoc || 0) + (memo.aocPaise || 0) / 100}</td>
                <td className="border border-slate-700 p-2 text-right text-white font-bold text-amber-400">{memo.totalAmount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
    );
  };

  const renderSummaryTable = (filteredRegs: any[]) => {
    const flatRows = filteredRegs.flatMap((reg: any) =>
      (reg.entries || []).map((e: any, entryIdx: number) => flattenRow(reg, e, entryIdx))
    );
    const lower = effectiveQuery;
    const filtered = lower ? flatRows.filter(r => isSummaryMatch(r, lower)) : flatRows;
    const allRowKeys = filtered.map((row: any) => getRowKey(row._regId, row._entryIdx));
    const allSelected = allRowKeys.length > 0 && allRowKeys.every(k => selectedIds.has(k));
    
    if (flatRows.length === 0) return renderNoData(false);
    if (filtered.length === 0) return renderNoData(true);
    return (
      <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((row: any, i: number) => {
          const rk = getRowKey(row._regId, row._entryIdx);
          return (
          <div
            key={i}
            id={`row-summary-${row.sno}`}
            onClick={() => handleRowClick("summary", row._regId, row._entryIdx)}
            className={cn("rounded-lg border p-3 transition-colors cursor-pointer", selectedIds.has(rk) ? "border-rose-500/60 bg-rose-500/10" : isSummaryMatch(row, searchQuery) ? "border-[#2388ff]/60 bg-[#2388ff]/10" : "border-slate-700 bg-slate-900/40 active:bg-slate-800/50")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.has(rk)} onClick={(e) => e.stopPropagation()} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                <span className="text-sm font-bold text-white">Challan {row.challanNo || "—"}</span>
              </div>
              <span className="text-base font-bold text-amber-400">{row.grandTotal || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white font-semibold mb-2">
              <span className="truncate">{row.from || "—"}</span>
              <span className="text-slate-500">&rarr;</span>
              <span className="truncate">{row.to || "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div><span className="text-slate-500">Date: </span><span className="text-white">{row._regDate || "—"}</span></div>
              <div><span className="text-slate-500">Truck: </span><span className="text-white">{row.truckNo || "—"}</span></div>
              <div><span className="text-slate-500">Driver: </span><span className="text-white">{row.driverName || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Transport: </span><span className="text-white">{row.transportName || "—"}</span></div>
              <div><span className="text-slate-500">Fare Del.: </span><span className="text-white">{row.fareDelivery || "—"}</span></div>
              <div><span className="text-slate-500">Crossing: </span><span className="text-white">{row.crossing || "—"}</span></div>
              <div><span className="text-slate-500">Cross Fare: </span><span className="text-white">{row.crossingFare || "—"}</span></div>
              <div><span className="text-slate-500">Labor: </span><span className="text-white">{row.labor || "—"}</span></div>
              <div><span className="text-slate-500">Del. Comm.: </span><span className="text-white">{row.deliveryCommission || "—"}</span></div>
              <div><span className="text-slate-500">Credit: </span><span className="text-emerald-400">{row.credit || "—"}</span></div>
              <div><span className="text-slate-500">Debit: </span><span className="text-rose-400">{row.debit || "—"}</span></div>
            </div>
            {(row.note || row.note2) && (
              <div className="mt-2 pt-2 border-t border-slate-700/60 text-xs text-slate-300 space-y-0.5">
                {row.note && <div className="truncate"><span className="text-slate-500">Note: </span>{row.note}</div>}
                {row.note2 && <div className="truncate"><span className="text-slate-500">Note 2: </span>{row.note2}</div>}
              </div>
            )}
          </div>
          );
        })}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto border border-slate-700 rounded-lg">
        <table className="w-[50%]  border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900/80">
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8">
                <input type="checkbox" checked={allSelected} onChange={() => toggleAllRows(allRowKeys)} className="accent-rose-500 w-4 h-4" />
              </th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">No.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Date</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Truck No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Driver</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">From</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">To</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Transport</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Challan No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Fare Del.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Crossing</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Cross Fare</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Labor</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Del. Comm.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Credit</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Debit</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Grand Total</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Note</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Note 2</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row: any, i: number) => {
              const rk = getRowKey(row._regId, row._entryIdx);
              return (
              <tr 
                key={i} 
                id={`row-summary-${row.sno}`} 
                onClick={() => handleRowClick("summary", row._regId, row._entryIdx)}
                className={cn("transition-colors cursor-pointer", selectedIds.has(rk) ? "bg-rose-500/10" : isSummaryMatch(row, searchQuery) ? "bg-[#2388ff]/10" : "hover:bg-slate-800/40")}
              >
                <td className="border border-slate-700 p-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(rk)} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                </td>
                <td className="border border-slate-700 p-2 text-center text-slate-400 font-mono text-xs">{row.sno || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row._regDate || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.truckNo || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.driverName || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.from || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.to || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.transportName || "—"}</td>
                <td className="border border-slate-700 p-2 text-center text-white">{row.challanNo || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{row.fareDelivery || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{row.crossing || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{row.crossingFare || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{row.labor || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-white">{row.deliveryCommission || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-emerald-400">{row.credit || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-rose-400">{row.debit || "—"}</td>
                <td className="border border-slate-700 p-2 text-right text-amber-400 font-bold">{row.grandTotal || "—"}</td>
                <td className="border border-slate-700 p-2 text-left text-slate-300 max-w-[150px] truncate" title={row.note}>{row.note || "—"}</td>
                <td className="border border-slate-700 p-2 text-left text-slate-300 max-w-[150px] truncate" title={row.note2}>{row.note2 || "—"}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
    );
  };

  const renderDeliveryStatementTable = (filteredRegs: any[]) => {
    const flatRows = filteredRegs.flatMap((reg: any) =>
      (reg.entries || []).map((e: any, entryIdx: number) => flattenRow(reg, e, entryIdx))
    ).sort((a: any, b: any) => (parseInt(b.sno) || 0) - (parseInt(a.sno) || 0));
    const lower = effectiveQuery;
    const filtered = lower ? flatRows.filter(r => isDeliveryStatementMatch(r, lower)) : flatRows;
    const allRowKeys = filtered.map((row: any) => getRowKey(row._regId, row._entryIdx));
    const allSelected = allRowKeys.length > 0 && allRowKeys.every(k => selectedIds.has(k));
    
    if (flatRows.length === 0) return renderNoData(false);
    if (filtered.length === 0) return renderNoData(true);
    return (
      <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((row: any, i: number) => {
          const total = (parseFloat(row.freight) || 0) + (parseFloat(row.labour) || 0) + (parseFloat(row.receiptCh) || 0) + (parseFloat(row.dCom) || 0) + (parseFloat(row.demurage) || 0);
          const rk = getRowKey(row._regId, row._entryIdx);
          return (
            <div
              key={i}
              id={`row-delivery-statement-${row.pageNo}`}
              onClick={() => handleRowClick("delivery-statement", row._regId, row._entryIdx)}
              className={cn("rounded-lg border p-3 transition-colors cursor-pointer", selectedIds.has(rk) ? "border-rose-500/60 bg-rose-500/10" : isDeliveryStatementMatch(row, searchQuery) ? "border-[#2388ff]/60 bg-[#2388ff]/10" : "border-slate-700 bg-slate-900/40 active:bg-slate-800/50")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedIds.has(rk)} onClick={(e) => e.stopPropagation()} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                  <span className="text-sm font-bold text-white">D.R. {row.drNo || "—"}</span>
                </div>
                <span className="text-base font-bold text-amber-400">{total.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div><span className="text-slate-500">Date: </span><span className="text-white">{row._regDate || "—"}</span></div>
                <div><span className="text-slate-500">Page No: </span><span className="text-white">{row.pageNo || "—"}</span></div>
                <div><span className="text-slate-500">S.No: </span><span className="text-slate-400">{row.sno || "—"}</span></div>
                <div><span className="text-slate-500">Freight: </span><span className="text-white">{row.freight || "—"}</span></div>
                <div><span className="text-slate-500">Labour: </span><span className="text-white">{row.labour || "—"}</span></div>
                <div><span className="text-slate-500">Stationery: </span><span className="text-white">{row.receiptCh || "—"}</span></div>
                <div><span className="text-slate-500">Commission: </span><span className="text-white">{row.dCom || "—"}</span></div>
                <div><span className="text-slate-500">A.O.C: </span><span className="text-white">{row.demurage || "—"}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto border border-slate-700 rounded-lg">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900/80">
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8">
                <input type="checkbox" checked={allSelected} onChange={() => toggleAllRows(allRowKeys)} className="accent-rose-500 w-4 h-4" />
              </th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">No.</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Date</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Page No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">S.No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">D.R. No</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Freight</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Labour</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Stationery</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Commission</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">A.O.C</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold">Total</th>
              <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row: any, i: number) => {
              const total = (parseFloat(row.freight) || 0) + (parseFloat(row.labour) || 0) + (parseFloat(row.receiptCh) || 0) + (parseFloat(row.dCom) || 0) + (parseFloat(row.demurage) || 0);
              const rk = getRowKey(row._regId, row._entryIdx);
              return (
                <tr 
                  key={i} 
                  id={`row-delivery-statement-${row.pageNo}`} 
                  onClick={() => handleRowClick("delivery-statement", row._regId, row._entryIdx)}
                  className={cn("transition-colors cursor-pointer", selectedIds.has(rk) ? "bg-rose-500/10" : isDeliveryStatementMatch(row, searchQuery) ? "bg-[#2388ff]/10" : "hover:bg-slate-800/40")}
                >
                  <td className="border border-slate-700 p-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(rk)} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                  </td>
                  <td className="border border-slate-700 p-2 text-center text-slate-400 max-w-[20px]">{i + 1}</td>
                  <td className="border border-slate-700 p-2 text-center text-white">{row._regDate || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white">{row.pageNo || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-slate-400">{row.sno || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white">{row.drNo || "—"}</td>
                  <td className="border border-slate-700 p-2 text-right text-white">{row.freight || "—"}</td>
                  <td className="border border-slate-700 p-2 text-right text-white">{row.labour || "—"}</td>
                  <td className="border border-slate-700 p-2 text-right text-white">{row.receiptCh || "—"}</td>
                  <td className="border border-slate-700 p-2 text-right text-white">{row.dCom || "—"}</td>
                  <td className="border border-slate-700 p-2 text-right text-white">{row.demurage || "—"}</td>
                  <td className="border border-slate-700 p-2 text-right text-white font-bold text-amber-400">{total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
    );
  };

  const renderEntryTable = (filteredRegs: any[]) => {
    const flatRows = filteredRegs.flatMap((reg: any) =>
      (reg.entries || []).map((e: any, entryIdx: number) => flattenRow(reg, e, entryIdx))
    );
    const lower = effectiveQuery;
    const filtered = lower ? flatRows.filter(r => isEntryMatch(r, lower)) : flatRows;
    const allRowKeys = filtered.map((row: any) => getRowKey(row._regId, row._entryIdx));
    const allSelected = allRowKeys.length > 0 && allRowKeys.every(k => selectedIds.has(k));
    
    if (flatRows.length === 0) return renderNoData(false);
    if (filtered.length === 0) return renderNoData(true);
    return (
      <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((row: any, i: number) => {
          const rk = getRowKey(row._regId, row._entryIdx);
          return (
          <div
            key={i}
            id={`row-entry-${row.pageNo}`}
            onClick={() => handleRowClick("entry", row._regId, row._entryIdx)}
            className={cn("rounded-lg border p-3 transition-colors cursor-pointer", selectedIds.has(rk) ? "border-rose-500/60 bg-rose-500/10" : isEntryMatch(row, searchQuery) ? "border-[#2388ff]/60 bg-[#2388ff]/10" : "border-slate-700 bg-slate-900/40 active:bg-slate-800/50")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.has(rk)} onClick={(e) => e.stopPropagation()} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                <span className="text-sm font-bold text-white">G.R. {row.grNo || "—"}</span>
              </div>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                row.deliveryStatus === "Complete" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              )}>
                {row.deliveryStatus || "Pending"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white font-semibold mb-2">
              <span className="truncate">{row.from || "—"}</span>
              <span className="text-slate-500">&rarr;</span>
              <span className="truncate">{row.to || "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div><span className="text-slate-500">Date: </span><span className="text-white">{row._regDate || "—"}</span></div>
              <div><span className="text-slate-500">Page No: </span><span className="text-white">{row.pageNo || "—"}</span></div>
              <div><span className="text-slate-500">Challan: </span><span className="text-white">{row.challanNo || "—"}</span></div>
              <div><span className="text-slate-500">Vehicle: </span><span className="text-white">{row.vehicleNo || "—"}</span></div>
              <div><span className="text-slate-500">Driver: </span><span className="text-white">{row.driverName || "—"}</span></div>
              <div><span className="text-slate-500">S.No.: </span><span className="text-slate-400">{row.sno || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Consignor: </span><span className="text-white">{row.consignor || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Consignee: </span><span className="text-white">{row.consignee || "—"}</span></div>
              <div><span className="text-slate-500">Pkg: </span><span className="text-white">{row.noOfPackages || "—"}</span></div>
              <div className="truncate"><span className="text-slate-500">Contents: </span><span className="text-white">{row.contents || "—"}</span></div>
              <div><span className="text-slate-500">Freight: </span><span className="text-white">{row.freight || "—"}</span></div>
              <div><span className="text-slate-500">Receipt No: </span><span className="text-white">{row.deliveryReceiptNo || "—"}</span></div>
              <div><span className="text-slate-500">Del. Date: </span><span className="text-white">{row.dateOfDelivery || "—"}</span></div>
            </div>
          </div>
          );
        })}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto border border-slate-700 rounded-lg">
        <div className="w-full overflow-hidden">
          <table className="w-full border-collapse text-[10px] table-fixed">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8">
                  <input type="checkbox" checked={allSelected} onChange={() => toggleAllRows(allRowKeys)} className="accent-rose-500 w-4 h-4" />
                </th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[10px]">No.</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[25px]">Date</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[12px]">Page No</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[50px] truncate" title="Challan No">Challan No</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[40px] truncate" title="Vehicle">Vehicle</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[40px] truncate" title="Driver">Driver</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[20px]">S.No.</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[30px] truncate" title="From">From</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[30px] truncate" title="To">To</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[30px] truncate" title="G.R. No">G.R. No</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[30px] truncate" title="Consignor">Consignor</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[30px] truncate" title="Consignee">Consignee</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[15px]">Pkg</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[25px] truncate" title="Contents">Contents</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[30px]">Freight</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[30px] truncate" title="Receipt No">Receipt No</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[20px]">Del. Date</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold max-w-[15px]">Status</th>
                <th className="border border-slate-700 p-2 text-[#2388ff] font-bold w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row: any, i: number) => {
                const rk = getRowKey(row._regId, row._entryIdx);
                return (
                <tr
                  key={i}
                  id={`row-entry-${row.pageNo}`}
                  onClick={() => handleRowClick("entry", row._regId, row._entryIdx)}
                  className={cn("transition-colors cursor-pointer", selectedIds.has(rk) ? "bg-rose-500/10" : isEntryMatch(row, searchQuery) ? "bg-[#2388ff]/10" : "hover:bg-slate-800/40")}
                >
                  <td className="border border-slate-700 p-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(rk)} onChange={() => toggleRowSelection(rk)} className="accent-rose-500 w-4 h-4" />
                  </td>
                  <td className="border border-slate-700 p-2 text-center text-slate-400 max-w-[10px]">{i + 1}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[25px]">{row._regDate || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[20px]">{row.pageNo || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white font-medium max-w-[40px] truncate" title={row.challanNo}>{row.challanNo || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[40px] truncate" title={row.vehicleNo}>{row.vehicleNo || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[40px] truncate" title={row.driverName}>{row.driverName || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-slate-400 max-w-[20px]">{row.sno || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[35px] truncate" title={row.from}>{row.from || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[35px] truncate" title={row.to}>{row.to || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[25px] truncate" title={row.grNo}>{row.grNo || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[35px] truncate" title={row.consignor}>{row.consignor || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[35px] truncate" title={row.consignee}>{row.consignee || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[15px]">{row.noOfPackages || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[35px] truncate" title={row.contents}>{row.contents || "—"}</td>
                  <td className="border border-slate-700 p-2 text-right text-white max-w-[20px]">{row.freight || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[25px] truncate" title={row.deliveryReceiptNo}>{row.deliveryReceiptNo || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center text-white max-w-[20px]">{row.dateOfDelivery || "—"}</td>
                  <td className="border border-slate-700 p-2 text-center max-w-[20px]">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                      row.deliveryStatus === "Complete" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    )}>
                      {row.deliveryStatus || "Pending"}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
    );
  };

  const renderActiveModuleData = () => {
    if (!activeModule) return null;

    const filteredRegs = getFilteredRegisters();

    const tables: Record<ModuleKey, (data: any[]) => React.ReactNode> = {
      challan: renderChallanTable,
      "cash-memo": renderCashMemoTable,
      summary: renderSummaryTable,
      "delivery-statement": renderDeliveryStatementTable,
      entry: renderEntryTable,
    };

    const flatRowsCount = filteredRegs.flatMap((reg: any) =>
      (reg.entries || []).length > 0 ? reg.entries : [reg]
    ).length;

    return (
      <div className="mt-8 space-y-4">
        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-900/40 border border-slate-700/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2388ff]" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Filter</span>
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            {(["all", "today", "selected", "range"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDateFilterType(type)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wider transition-all",
                  dateFilterType === type
                    ? "bg-[#2388ff] text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {type === "all" ? "All Time" : type === "selected" ? "Single Date" : type}
              </button>
            ))}
          </div>

          {dateFilterType === "selected" && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#2388ff]"
                style={{ colorScheme: "dark" }}
              />
            </div>
          )}

          {dateFilterType === "range" && (
            <div className="flex items-center gap-2 animate-fadeIn border-l border-slate-800 pl-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#2388ff]"
                style={{ colorScheme: "dark" }}
              />
              <span className="text-xs text-slate-500 font-bold uppercase mx-1">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#2388ff]"
                style={{ colorScheme: "dark" }}
              />
            </div>
          )}

          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-1.5 h-8"
            >
              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={loading || filteredRegs.length === 0}
            className="ml-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-1.5 h-8"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>

        {/* Table Title and local search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {modules.find((m) => m.key === activeModule)?.icon}
            {modules.find((m) => m.key === activeModule)?.label} Records
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[#2388ff]" />}
            {!loading && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                {flatRowsCount} row{flatRowsCount !== 1 ? "s" : ""} across {filteredRegs.length} register{filteredRegs.length !== 1 ? "s" : ""}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={activeModule ? moduleSearchHints[activeModule] : "Search records…"}
                className="h-9 pl-9 pr-3 w-[280px] rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-[#2388ff] transition-colors"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setActiveModule(null); setRecords([]); setLocalSearch(""); }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
          </div>
        </div>
        
        {tables[activeModule](filteredRegs)}
      </div>
    );
  };

  const renderPreviewContent = () => {
    if (!previewModule || !previewData) return null;

    // ─── CHALLAN PREVIEW ───────────────────────────────────────────────
    if (previewModule === "challan") {
      return (
        <div className="bg-slate-900/40 border border-[#2388ff]/30 rounded-xl p-4 md:p-6 w-full shadow-2xl relative">
          <div className="text-center border-b border-blue-900/50 pb-4 mb-4">
            <div className="text-[10px] tracking-widest text-[#2388ff] mb-2 uppercase font-bold">
              Subject to BHILWARA Jurisdiction
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="text-2xl font-black tracking-wide text-rose-500 uppercase">
                Sant Kanwar Ram Transport Corp. (BHL.)
              </div>
            </div>
            <div className="text-xs text-[#2388ff] mt-1">
              123-124, Transport Nagar, BHILWARA - 311001 (RAJ.) · Mob.: 96809-92567, 86196-06627
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-[#2388ff]">From Bhilwara To:</span>
              <span className="text-white font-semibold">{previewData.from || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-[#2388ff]">Date:</span>
              <span className="text-white font-mono">{previewData.date || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-[#2388ff]">Challan No:</span>
              <span className="text-rose-500 font-extrabold text-lg">{previewData.challanNo || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-[#2388ff]">Vehicle No:</span>
              <span className="text-white font-semibold">{previewData.vehicleNo || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-[#2388ff]">Owner's Name:</span>
              <span className="text-white font-semibold">{previewData.ownerName || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5 md:col-span-2">
              <span className="font-bold text-[#2388ff]">Driver's Name:</span>
              <span className="text-white font-semibold">{previewData.driverName || "—"}</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-[#2388ff]">
                  <th className="p-2 border border-slate-800 text-center w-[50px]">S.No.</th>
                  <th className="p-2 border border-slate-800 text-center w-[90px]">G.R. No.</th>
                  <th className="p-2 border border-slate-800 text-center w-[80px]">Packages</th>
                  <th className="p-2 border border-slate-800 text-right w-[90px]">Weight (Q.)</th>
                  <th className="p-2 border border-slate-800 min-w-[120px]">Destination</th>
                  <th className="p-2 border border-slate-800 min-w-[120px]">Content</th>
                  <th className="p-2 border border-slate-800 min-w-[140px]">Consignor</th>
                  <th className="p-2 border border-slate-800 min-w-[140px]">Consignee</th>
                  <th className="p-2 border border-slate-800 text-right w-[100px]">Freight (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {(previewData.entries || []).map((e: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="p-2 border border-slate-800 text-center text-slate-400">{e.sno || idx + 1}</td>
                    <td className="p-2 border border-slate-800 text-center text-white">{e.grNo || "—"}</td>
                    <td className="p-2 border border-slate-800 text-center text-white">{e.pkg || "—"}</td>
                    <td className="p-2 border border-slate-800 text-right text-white">{e.wt || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white">{e.dest || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white">{e.content || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white whitespace-nowrap">{e.consignor || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white whitespace-nowrap">{e.consignee || "—"}</td>
                    <td className="p-2 border border-slate-800 text-right text-amber-400 font-bold">{e.total || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-end mt-8 pt-4 border-t border-slate-800 text-xs">
            <div className="text-slate-500 font-medium">Driver Signature</div>
            <div className="text-right text-[#2388ff] font-bold">
              For Sant Kanwar Ram Transport Corp. (BHL.)
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 print-hide">
            <input
              type="tel"
              placeholder="Phone number"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              className="flex-1 max-w-[180px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#2388ff]"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={sendingWa || !waPhone.trim()}
              onClick={async () => {
                if (!waPhone.trim()) { toast.error("Enter a phone number"); return; }
                setSendingWa(true);
                try {
                  const template = await fetchTemplate("challan");
                  const entries = previewData.entries || [];
                  const r = (v: any) => v || "";
                  const formatDate = (ds: string) => {
                    if (!ds) return "";
                    const p = ds.split("T")[0].split("-");
                    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
                  };
                  const tableRows = entries.map((e: any, idx: number) =>
                    `<tr><td style="text-align:center;">${idx + 1}</td><td style="text-align:center;">${r(e.grNo)}</td><td style="text-align:center;">${r(e.pkg)}</td><td>${r(e.dest)}</td><td>${r(e.content)}</td><td>${r(e.consignor)}</td><td>${r(e.consignee)}</td><td style="text-align:right;">${r(e.total)}</td><td style="text-align:right;">${r(e.wt)}</td></tr>`
                  ).join("");
                  const totalPkg = entries.reduce((s: number, e: any) => s + (parseInt(e.pkg) || 0), 0);
                  const totalWt = entries.reduce((s: number, e: any) => s + (parseFloat(e.wt) || 0), 0);
                  const rowsTotal = entries.reduce((s: number, e: any) => s + (parseFloat(e.total) || 0), 0);
                  const c = previewData.charges || previewData;
                  const chargeFields = ['commission','labour','gr','crossing','truckFreight','advance','tfCredit','totalToPay','otherCharge','lcdc','crossing2','balanceFreight'];
                  const totalDeductions = chargeFields.reduce((sum: number, f: string) => sum + (parseFloat((c as any)[f]) || 0), 0);
                  const doorDelivery = parseFloat(c.doorDelivery) || 0;
                  const grandTotal = rowsTotal - totalDeductions + doorDelivery;
                  const html = fillTemplate(template, {
                    CHALLAN_NO: r(previewData.challanNo),
                    DATE: formatDate(previewData.date),
                    FROM: r(previewData.from),
                    VEHICLE_NO: r(previewData.vehicleNo),
                    OWNER_NAME: r(previewData.ownerName),
                    DRIVER_NAME: r(previewData.driverName),
                    TABLE_ROWS: tableRows,
                    TOTAL_PKG: String(totalPkg),
                    TOTAL_WT: totalWt.toFixed(1),
                    GRAND_TOTAL: grandTotal.toFixed(2),
                    TRUCK_FREIGHT: r(c.truckFreight),
                    ADVANCE: r(c.advance),
                    TF_CREDIT: r(c.tfCredit),
                    TOTAL_TO_PAY: r(c.totalToPay),
                    OTHER_CHARGE: r(c.otherCharge),
                    LCDC: r(c.lcdc),
                    CROSSING: r(c.crossing2),
                    DOOR_DELIVERY: r(c.doorDelivery),
                    BALANCE_FREIGHT: r(c.balanceFreight),
                    CHARGES_NOTE: r(c.note),
                  });
                  await generateAndSendPDF(waPhone, html, `challan-${previewData.challanNo || "doc"}.pdf`, "portrait");
                } catch {}
                setSendingWa(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-semibold"
            >
              {sendingWa ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : (
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              )}
              WhatsApp
            </Button>
          </div>
        </div>
      );
    }

    if (previewModule === "cash-memo") {
      const freightRs = parseFloat(previewData.freight) || 0;
      const freightP = parseFloat(previewData.freightPaise) || 0;
      const labourRs = parseFloat(previewData.labour) || 0;
      const labourP = parseFloat(previewData.labourPaise) || 0;
      const stationeryRs = parseFloat(previewData.stationery) || 0;
      const stationeryP = parseFloat(previewData.stationeryPaise) || 0;
      const commissionRs = parseFloat(previewData.commission) || 0;
      const commissionP = parseFloat(previewData.commissionPaise) || 0;
      const aocRs = parseFloat(previewData.aoc) || 0;
      const aocP = parseFloat(previewData.aocPaise) || 0;
      const totalRs = freightRs + labourRs + stationeryRs + commissionRs + aocRs;
      const totalWhole = Math.floor(totalRs);
      const totalPaise = Math.round((totalRs - totalWhole) * 100) + freightP + labourP + stationeryP + commissionP + aocP;
      return (
        <div className="bg-slate-900/40 border border-[#2388ff]/30 rounded-xl p-6 md:p-8 w-full shadow-2xl relative">
          <div className="border-b border-blue-900/50 pb-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold text-white">D.R. No. <span className="text-rose-500">{previewData.drNo || "—"}</span></div>
              <div className="font-bold text-[#2388ff] text-lg">CASH MEMO</div>
              <div className="text-sm font-bold text-white text-right leading-tight">
                <span>Mob.: 96809-92567</span><br/>
                <span>Mob.: 86196-06627</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black tracking-wide text-rose-500 uppercase">Sant Kanwar Ram Transport Corp. (BHL.)</div>
              <div className="text-xs text-[#2388ff] mt-0.5">123-124, Transport Nagar, BHILWARA - 311001 (Raj.)</div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-[#2388ff] text-sm w-[80px]">G.R. No.</span>
              <span className="flex-1 border-b border-dashed border-slate-700 pb-0.5 text-white">{previewData.grNo || "—"}</span>
              <span className="font-bold text-[#2388ff] text-sm whitespace-nowrap px-2">Serial no</span>
              <span className="w-[200px] border-b border-dashed border-slate-700 pb-0.5 text-white text-right">{previewData.receivedOn || "—"}</span>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-[#2388ff] text-sm w-[80px]">From</span>
              <span className="flex-1 border-b border-dashed border-slate-700 pb-0.5 text-white">{previewData.from || "—"}</span>
              <span className="font-bold text-[#2388ff] text-sm whitespace-nowrap px-2">Dt.</span>
              <span className="w-[200px] border-b border-dashed border-slate-700 pb-0.5 text-white text-right">{previewData.date ? (() => { const p = previewData.date.split("T")[0].split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : previewData.date; })() : "—"}</span>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-[#2388ff] text-sm w-[80px]">Consignee</span>
              <span className="flex-1 border-b border-dashed border-slate-700 pb-0.5 text-white">{previewData.consignee || "—"}</span>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-[#2388ff] text-sm w-[80px]">Through</span>
              <span className="flex-1 border-b border-dashed border-slate-700 pb-0.5 text-white">{previewData.through || "—"}</span>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800">
                  <th className="p-2 border-b border-slate-700 text-slate-300 w-[70%]"></th>
                  <th className="p-2 border-b border-slate-700 text-[#2388ff] text-center w-[15%]">Rs.</th>
                  <th className="p-2 border-b border-slate-700 text-[#2388ff] text-center w-[15%]">P.</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800"><td className="p-2 text-slate-300">Freight</td><td className="p-2 text-center text-white border-l border-slate-800">{freightRs || "—"}</td><td className="p-2 text-center text-white border-l border-slate-800">{freightP || "—"}</td></tr>
                <tr className="border-b border-slate-800"><td className="p-2 text-slate-300">Labour</td><td className="p-2 text-center text-white border-l border-slate-800">{labourRs || "—"}</td><td className="p-2 text-center text-white border-l border-slate-800">{labourP || "—"}</td></tr>
                <tr className="border-b border-slate-800"><td className="p-2 text-slate-300">Stationery</td><td className="p-2 text-center text-white border-l border-slate-800">{stationeryRs || "5"}</td><td className="p-2 text-center text-white border-l border-slate-800">{stationeryP || "00"}</td></tr>
                <tr className="border-b border-slate-800"><td className="p-2 text-slate-300">Commission</td><td className="p-2 text-center text-white border-l border-slate-800">{commissionRs || "—"}</td><td className="p-2 text-center text-white border-l border-slate-800">{commissionP || "—"}</td></tr>
                <tr className="border-b border-slate-800"><td className="p-2 text-slate-300">A.O.C.</td><td className="p-2 text-center text-white border-l border-slate-800">{aocRs || "5"}</td><td className="p-2 text-center text-white border-l border-slate-800">{aocP || "—"}</td></tr>
                <tr><td className="p-2 font-bold text-emerald-400">Total</td><td className="p-2 text-center font-bold text-emerald-400 border-l border-slate-800">{totalWhole}</td><td className="p-2 text-center font-bold text-emerald-400 border-l border-slate-800">{String(totalPaise).padStart(2, "0")}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="text-right mt-6 text-sm text-slate-400 font-bold">D. Clerk</div>
          <div className="mt-4 flex justify-end print-hide">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const phone = window.prompt("Enter phone number to send via WhatsApp:");
                if (!phone) return;
                try {
                  const template = await fetchCashMemoTemplate();
                  const totalRs = freightRs + labourRs + stationeryRs + commissionRs + aocRs;
                  const totalWhole = Math.floor(totalRs);
                  const totalPaiseVal = Math.round((totalRs - totalWhole) * 100) + freightP + labourP + stationeryP + commissionP + aocP;
                  const html = fillCashMemoTemplate(template, {
                    drNo: previewData.drNo,
                    grNo: previewData.grNo,
                    date: previewData.date ? (() => { const p = previewData.date.split("T")[0].split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : previewData.date; })() : "",
                    receivedOn: previewData.receivedOn,
                    from: previewData.from,
                    consignee: previewData.consignee,
                    through: previewData.through,
                    freight: String(freightRs),
                    freightP: String(freightP),
                    labour: String(labourRs),
                    labourP: String(labourP),
                    stationery: String(stationeryRs || 5),
                    stationeryP: String(stationeryP || "00"),
                    commission: String(commissionRs),
                    commissionP: String(commissionP),
                    aoc: String(aocRs || 5),
                    aocP: String(aocP),
                    total: String(totalWhole),
                    totalP: String(totalPaiseVal).padStart(2, "0"),
                  });
                  await generateAndSendPDF(phone, html, `cash-memo-${previewData.drNo || "memo"}.pdf`);
                } catch {}
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-semibold"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </Button>
          </div>
        </div>
      );
    }

    if (previewModule === "summary") {
      const summaryEntries = previewEntryIndex !== null && previewData.entries ? [previewData.entries[previewEntryIndex]] : previewData.entries || [];
      return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-4">
          {summaryEntries.map((e: any, idx: number) => {
            const fareDelivery = parseFloat(e.fareDelivery) || 0;
            const crossingFare = parseFloat(e.crossingFare) || 0;
            const deliveryCommission = parseFloat(e.deliveryCommission) || 0;
            const crossing = parseFloat(e.crossing) || 0;
            const labor = parseFloat(e.labor) || 0;
            const credit = parseFloat(e.credit) || 0;
            const debit = parseFloat(e.debit) || 0;
            const total = fareDelivery + crossingFare + deliveryCommission - crossing - labor;
            
            return (
              <div 
                key={idx} 
                className="border-2 border-[#ffaec1]/45 rounded-xl overflow-hidden shadow-2xl max-w-xl mx-auto animate-fadeIn"
                style={{ background: "linear-gradient(145deg, #1b0c10 0%, #0c0406 100%)" }}
              >
                <div className="p-6">
                  <div className="flex flex-col items-end text-[9px] text-[#ffaec1]/60 font-semibold mb-1 uppercase tracking-wide">
                    <span>Mob. 96809-92567</span><br/>
                    <span>Mob. 86196-06627</span>
                  </div>
                  <div className="text-center text-[9px] text-slate-500/80 mb-3 italic tracking-wide">
                    All disputes subject to Bhilwara jurisdiction
                  </div>

                  <div className="text-center mb-1">
                    <h2 className="text-lg font-black uppercase text-[#ffaec1] tracking-wide leading-tight">
                      Sant Kanwar Ram Transport Corp. (BHL.)
                    </h2>
                    <p className="text-[10px] text-slate-500 tracking-wider">Bhilwara - 311001 (Raj.)</p>
                  </div>

                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-[#ffaec1]/30" />
                    <span className="text-[11px] font-black uppercase tracking-[4px] text-[#ffaec1]">Summary</span>
                    <div className="flex-1 h-px bg-[#ffaec1]/30" />
                  </div>

                  <div className="flex justify-between items-center mb-4 text-xs font-mono">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#ffaec1]">No:</span>
                      <span className="text-rose-400 font-extrabold text-base">{e.sno || idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#ffaec1]">Date:</span>
                      <span className="text-white">{previewData.date || "—"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
                    <div className="border-b border-[#ffaec1]/10 pb-1"><span className="text-slate-500">Truck No:</span> <strong className="text-white float-right">{e.truckNo || "—"}</strong></div>
                    <div className="border-b border-[#ffaec1]/10 pb-1"><span className="text-slate-500">Driver Name:</span> <strong className="text-white float-right">{e.driverName || "—"}</strong></div>
                    <div className="border-b border-[#ffaec1]/10 pb-1"><span className="text-slate-500">From:</span> <strong className="text-white float-right">{e.from || "—"}</strong></div>
                    <div className="border-b border-[#ffaec1]/10 pb-1"><span className="text-slate-500">To:</span> <strong className="text-white float-right">{e.to || "—"}</strong></div>
                    <div className="border-b border-[#ffaec1]/10 pb-1"><span className="text-slate-500">Transport:</span> <strong className="text-white float-right">{e.transportName || "—"}</strong></div>
                    <div className="border-b border-[#ffaec1]/10 pb-1"><span className="text-slate-500">Challan No:</span> <strong className="text-white float-right">{e.challanNo || "—"}</strong></div>
                    <div className="border-b border-[#ffaec1]/10 pb-1 col-span-2"><span className="text-slate-500">Total Count:</span> <strong className="text-white float-right">{e.totalCount || "—"}</strong></div>
                  </div>

                  <div className="bg-[#ffaec1]/5 p-3.5 rounded-lg border border-[#ffaec1]/15 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400"><span>Fare Delivery:</span> <span className="text-white font-mono">₹ {e.fareDelivery || "0"}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Crossing:</span> <span className="text-white font-mono">₹ {e.crossing || "0"}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Crossing Fare:</span> <span className="text-white font-mono">₹ {e.crossingFare || "0"}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Labor:</span> <span className="text-white font-mono">₹ {e.labor || "0"}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Del. Commission:</span> <span className="text-white font-mono">₹ {e.deliveryCommission || "0"}</span></div>
                    {e.note && <div className="text-[10.5px] italic text-[#ffaec1]/85 mt-1 border-t border-[#ffaec1]/10 pt-1">Note: {e.note}</div>}
                    
                    <div className="flex items-center gap-1.5 py-1.5">
                      <div className="flex-1 h-px bg-[#ffaec1]/15" />
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">Adjustments</span>
                      <div className="flex-1 h-px bg-[#ffaec1]/15" />
                    </div>

                    <div className="grid grid-cols-2 gap-x-4">
                      <div className="flex justify-between text-emerald-400"><span>Credit:</span> <span className="font-mono">₹ {e.credit || "0"}</span></div>
                      <div className="flex justify-between text-rose-400"><span>Debit:</span> <span className="font-mono">₹ {e.debit || "0"}</span></div>
                    </div>
                    
                    {e.note2 && <div className="text-[10.5px] italic text-[#ffaec1]/85 mt-1 border-t border-[#ffaec1]/10 pt-1">Note: {e.note2}</div>}
                    
                    <div className="h-px bg-[#ffaec1]/20 my-2" />
                    <div className="flex justify-between items-center text-[#ffaec1] font-extrabold text-base">
                      <span>GRAND TOTAL:</span>
                      <span className="text-rose-400">₹ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end print-hide">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const phone = window.prompt("Enter phone number to send via WhatsApp:");
                if (!phone) return;
                try {
                  const entriesToUse = previewEntryIndex !== null && previewData.entries ? [previewData.entries[previewEntryIndex]] : previewData.entries || [];
                  const html = buildSummaryPrintHtml(entriesToUse, previewData.date || "");
                  await generateAndSendPDF(phone, html, `summary-${previewData.date || "register"}.pdf`);
                } catch {}
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-semibold"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </Button>
          </div>
        </div>
      );
    }

    if (previewModule === "delivery-statement") {
      return (
        <div className="bg-slate-900/40 border border-rose-500/30 rounded-xl p-6 md:p-8 w-full mx-auto shadow-2xl">
          <div className="text-center border-b border-rose-900/50 pb-4 mb-4">
            <h2 className="text-2xl font-black text-rose-400 uppercase tracking-widest">DELIVERY STATEMENT</h2>
            <div className="text-xs text-slate-500 tracking-wider mt-1 uppercase font-bold">Sant Kanwar Ram Transport Corp. (BHL.)</div>
          </div>

          <div className="flex justify-between text-sm mb-4">
            <div><span className="text-slate-400">Page No:</span> <strong className="text-rose-400 font-extrabold text-lg ml-1">{previewData.pageNo || "—"}</strong></div>
            <div><span className="text-slate-400">Date:</span> <strong className="text-white font-mono ml-1">{previewData.dateSearch || "—"}</strong></div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-rose-400">
                  <th className="p-2 border border-slate-800 text-center">S.No.</th>
                  <th className="p-2 border border-slate-800 text-center">D.R. No.</th>
                  <th className="p-2 border border-slate-800 text-right">Freight (Cr)</th>
                  <th className="p-2 border border-slate-800 text-right">Labour (Dr)</th>
                  <th className="p-2 border border-slate-800 text-right">Stationery (Dr)</th>
                  <th className="p-2 border border-slate-800 text-right">Commission (Dr)</th>
                  <th className="p-2 border border-slate-800 text-right">A.O.C. (Dr)</th>
                  <th className="p-2 border border-slate-800 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(previewData.entries || []).map((e: any, idx: number) => {
                  const total = (parseFloat(e.freight) || 0) + (parseFloat(e.labour) || 0) + (parseFloat(e.receiptCh) || 0) + (parseFloat(e.dCom) || 0) + (parseFloat(e.demurage) || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-2 border border-slate-800 text-center text-slate-400">{e.sno || idx + 1}</td>
                      <td className="p-2 border border-slate-800 text-center text-white">{e.drNo || "—"}</td>
                      <td className="p-2 border border-slate-800 text-right text-emerald-400">₹ {e.freight || "—"}</td>
                      <td className="p-2 border border-slate-800 text-right text-white">₹ {e.labour || "—"}</td>
                      <td className="p-2 border border-slate-800 text-right text-white">₹ {e.receiptCh || "—"}</td>
                      <td className="p-2 border border-slate-800 text-right text-white">₹ {e.dCom || "—"}</td>
                      <td className="p-2 border border-slate-800 text-right text-white">₹ {e.demurage || "—"}</td>
                      <td className="p-2 border border-slate-800 text-right text-amber-400 font-bold">₹ {total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-slate-950 p-4 rounded-lg border border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono text-center">
            <div className="border-r border-slate-800"><p className="text-slate-500 uppercase">Tot Freight</p><p className="text-emerald-400 font-extrabold text-sm mt-0.5">₹ {previewData.totals?.freight || 0}</p></div>
            <div className="border-r border-slate-800"><p className="text-slate-500 uppercase">Tot Labour</p><p className="text-white font-extrabold text-sm mt-0.5">₹ {previewData.totals?.labour || 0}</p></div>
            <div className="border-r border-slate-800"><p className="text-slate-500 uppercase">Tot Stationery</p><p className="text-white font-extrabold text-sm mt-0.5">₹ {previewData.totals?.receiptCh || 0}</p></div>
            <div className="border-r border-slate-800"><p className="text-slate-500 uppercase">Tot Comm</p><p className="text-white font-extrabold text-sm mt-0.5">₹ {previewData.totals?.dCom || 0}</p></div>
            <div><p className="text-slate-500 uppercase">Tot Demurage</p><p className="text-white font-extrabold text-sm mt-0.5">₹ {previewData.totals?.demurage || 0}</p></div>
          </div>
          <div className="mt-4 text-right"><span className="text-xs font-bold text-rose-400 uppercase tracking-widest">DS Total: </span><span className="text-rose-500 font-black text-xl ml-2">₹ {previewData.totals?.total || 0}</span></div>
          <div className="mt-4 flex items-center gap-2 print-hide">
            <input
              type="tel"
              placeholder="Phone number"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              className="flex-1 max-w-[180px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={sendingWa || !waPhone.trim()}
              onClick={async () => {
                if (!waPhone.trim()) { toast.error("Enter a phone number"); return; }
                setSendingWa(true);
                try {
                  const template = await fetchTemplate("delivery_statement");
                  const entries = previewData.entries || [];
                  const r = (v: any) => v || "";
                  const tableRows = entries.map((e: any, idx: number) => {
                    const total = (parseFloat(e.freight) || 0) + (parseFloat(e.labour) || 0) + (parseFloat(e.receiptCh) || 0) + (parseFloat(e.dCom) || 0) + (parseFloat(e.demurage) || 0);
                    return `<tr><td class="tc">${e.sno || idx + 1}</td><td class="tc">${r(e.drNo)}</td><td class="tr">${r(e.freight)}</td><td class="tr">${r(e.labour)}</td><td class="tr">${r(e.receiptCh)}</td><td class="tr">${r(e.dCom)}</td><td class="tr">${r(e.demurage)}</td><td class="tr"><strong>${total.toFixed(2)}</strong></td></tr>`;
                  }).join("");
                  const totFreight = previewData.totals?.freight || 0;
                  const totLabour = previewData.totals?.labour || 0;
                  const totReceipt = previewData.totals?.receiptCh || 0;
                  const totDCom = previewData.totals?.dCom || 0;
                  const totDemurage = previewData.totals?.demurage || 0;
                  const totAll = previewData.totals?.total || 0;
                  const totalsRow = `<tr style="font-weight:bold;background:#e8ecf0;"><td class="tc">Total</td><td></td><td class="tr">${totFreight}</td><td class="tr">${totLabour}</td><td class="tr">${totReceipt}</td><td class="tr">${totDCom}</td><td class="tr">${totDemurage}</td><td class="tr">${totAll}</td></tr>`;
                  const html = fillTemplate(template, {
                    DATE: r(previewData.dateSearch),
                    PAGE_NO: r(previewData.pageNo),
                    TABLE_ROWS: tableRows,
                    TOTALS_ROW: totalsRow,
                  });
                  await generateAndSendPDF(waPhone, html, `delivery-statement-${previewData.pageNo || "doc"}.pdf`, "landscape");
                } catch {}
                setSendingWa(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-semibold"
            >
              {sendingWa ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : (
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              )}
              WhatsApp
            </Button>
          </div>
        </div>
      );
    }

    if (previewModule === "entry") {
      return (
        <div className="bg-slate-900/40 border border-violet-500/30 rounded-xl p-6 md:p-8 w-full mx-auto shadow-2xl">
          <div className="text-center border-b border-violet-900/50 pb-4 mb-4">
            <h2 className="text-2xl font-black text-violet-400 uppercase tracking-widest">DELIVERY REGISTER</h2>
            <div className="text-xs text-slate-500 tracking-wider mt-1 uppercase font-bold">Sant Kanwar Ram Transport Corp. (BHL.)</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6 font-mono">
            <div className="border-b border-slate-800 pb-1.5"><span className="text-slate-500 font-bold uppercase">Page No:</span> <strong className="text-violet-400 float-right text-sm">{previewData.pageNo || "—"}</strong></div>
            <div className="border-b border-slate-800 pb-1.5"><span className="text-slate-500 font-bold uppercase">Date:</span> <strong className="text-white float-right text-sm">{previewData.dateSearch || "—"}</strong></div>
            <div className="border-b border-slate-800 pb-1.5"><span className="text-slate-500 font-bold uppercase">Challan No:</span> <strong className="text-white float-right text-sm">{previewData.challanNo || "—"}</strong></div>
            <div className="border-b border-slate-800 pb-1.5"><span className="text-slate-500 font-bold uppercase">Vehicle No:</span> <strong className="text-white float-right text-sm">{previewData.vehicleNo || "—"}</strong></div>
            <div className="border-b border-slate-800 pb-1.5"><span className="text-slate-500 font-bold uppercase">Driver:</span> <strong className="text-white float-right text-sm">{previewData.driverName || "—"}</strong></div>
            <div className="border-b border-slate-800 pb-1.5"><span className="text-slate-500 font-bold uppercase">From:</span> <strong className="text-white float-right text-sm">{previewData.fromData || "—"}</strong></div>
            <div className="border-b border-slate-800 pb-1.5 col-span-2"><span className="text-slate-500 font-bold uppercase">To:</span> <strong className="text-white float-right text-sm">{previewData.toData || "—"}</strong></div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="min-w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-violet-400">
                  <th className="p-2 border border-slate-800 text-center">S.No.</th>
                  <th className="p-2 border border-slate-800">From</th>
                  <th className="p-2 border border-slate-800">To</th>
                  <th className="p-2 border border-slate-800 text-center">G.R. No.</th>
                  <th className="p-2 border border-slate-800">Consignor</th>
                  <th className="p-2 border border-slate-800">Consignee</th>
                  <th className="p-2 border border-slate-800 text-center">Pkgs</th>
                  <th className="p-2 border border-slate-800">Contents</th>
                  <th className="p-2 border border-slate-800 text-right">Freight</th>
                  <th className="p-2 border border-slate-800 text-center">Receipt No</th>
                  <th className="p-2 border border-slate-800 text-center">Del. Date</th>
                  <th className="p-2 border border-slate-800 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {(previewData.entries || []).map((e: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30 w-[40%]">
                    <td className="p-2 border border-slate-800 text-center text-slate-400">{e.sno || idx + 1}</td>
                    <td className="p-2 border border-slate-800 text-white">{e.from || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white">{e.to || "—"}</td>
                    <td className="p-2 border border-slate-800 text-center text-white font-medium">{e.grNo || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white max-w-[80px] truncate" title={e.consignor}>{e.consignor || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white max-w-[80px] truncate" title={e.consignee}>{e.consignee || "—"}</td>
                    <td className="p-2 border border-slate-800 text-center text-white">{e.noOfPackages || "—"}</td>
                    <td className="p-2 border border-slate-800 text-white" title={e.contents}>{e.contents || "—"}</td>
                    <td className="p-2 border border-slate-800 text-right text-white font-mono">₹ {e.freight || "0"}</td>
                    <td className="p-2 border border-slate-800 text-center text-white font-mono">{e.deliveryReceiptNo || "—"}</td>
                    <td className="p-2 border border-slate-800 text-center text-white font-mono">{e.dateOfDelivery || "—"}</td>
                    <td className="p-2 border border-slate-800 text-center">
                      <span className={cn(
                        "px-1 py-0.5 rounded text-[8px] font-bold uppercase",
                        e.deliveryStatus === "Complete" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      )}>
                        {e.deliveryStatus || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 print-hide">
            <input
              type="tel"
              placeholder="Phone number"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              className="flex-1 max-w-[180px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={sendingWa || !waPhone.trim()}
              onClick={async () => {
                if (!waPhone.trim()) { toast.error("Enter a phone number"); return; }
                setSendingWa(true);
                try {
                  const template = await fetchTemplate("delivery_register");
                  const entries = previewData.entries || [];
                  const tableRows = entries.map((e: any, idx: number) =>
                    `<tr><td class="text-center">${e.sno || idx + 1}</td><td>${e.from || ""}</td><td>${e.to || ""}</td><td>${e.grNo || ""}</td><td>${e.consignor || ""}</td><td>${e.consignee || ""}</td><td class="text-center">${e.noOfPackages || ""}</td><td>${e.contents || ""}</td><td class="text-right">${e.freight || ""}</td><td>${e.deliveryReceiptNo || ""}</td><td>${e.dateOfDelivery || ""}</td></tr>`
                  ).join("");
                  const html = fillTemplate(template, {
                    CHALLAN_NO: previewData.challanNo || "—",
                    FROM: previewData.fromData || "—",
                    TO: previewData.toData || "—",
                    VEHICLE_NO: previewData.vehicleNo || "—",
                    DATE: previewData.dateSearch || "—",
                    PAGE_NO: previewData.pageNo || "—",
                    TABLE_ROWS: tableRows,
                  });
                  await generateAndSendPDF(waPhone, html, `delivery-register-${previewData.challanNo || "doc"}.pdf`, "landscape");
                } catch {}
                setSendingWa(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-semibold"
            >
              {sendingWa ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : (
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              )}
              WhatsApp
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const getPrintHTML = () => {
    if (!previewModule || !previewData) return "";

    let content = "";
    if (previewModule === "challan") {
      const entriesForPrint = previewData.entries || [];
      const r = (v: any) => v || "";
      const formatDate = (ds: string) => {
        if (!ds) return "";
        const p = ds.split("-");
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
      };
      const totalPkg = entriesForPrint.reduce((s: number, e: any) => s + (parseInt(e.pkg) || 0), 0);
      const totalWt = entriesForPrint.reduce((s: number, e: any) => s + (parseFloat(e.wt) || 0), 0);
      const rowsTotal = entriesForPrint.reduce((s: number, e: any) => s + (parseFloat(e.total) || 0), 0);
      const c = previewData.charges || previewData;
      const chargeFields = ['commission','labour','gr','crossing','truckFreight','advance','tfCredit','totalToPay','otherCharge','lcdc','crossing2','balanceFreight'];
      const totalDeductions = chargeFields.reduce((sum, f) => sum + (parseFloat((c as any)[f]) || 0), 0);
      const doorDelivery = parseFloat(c.doorDelivery) || 0;
      const grandTotal = rowsTotal - totalDeductions + doorDelivery;
      const tableRows = entriesForPrint.map((e: any, idx: number) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:center;">${r(e.grNo)}</td>
          <td style="text-align:center;">${r(e.pkg)}</td>
          <td>${r(e.dest)}</td>
          <td>${r(e.content)}</td>
          <td>${r(e.consignor)}</td>
          <td>${r(e.consignee)}</td>
          <td style="text-align:right;">${r(e.total)}</td>
          <td style="text-align:right;">${r(e.wt)}</td>
        </tr>
      `).join("");

      content = `<!DOCTYPE html>
<html>
<head>
<style>
    body { font-family: Arial, sans-serif; margin:0; padding:20px; background:#f3f4f6; }
    .challan { border: 2px solid #000; width: 190mm; padding: 5mm; margin: 10mm auto; position: relative; background:white; font-size: 12px; box-sizing:border-box; }
    .header-top { display: flex; justify-content: space-between; align-items: start; width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
    .jurisdiction { text-align: center; font-size: 11px; font-weight: bold; color: #000080; margin-bottom: 5px; }
    .title { text-align: center; font-size: 22px; font-weight: bold; color: #000080; }
    .subtitle { text-align: center; font-size: 14px; color: #000080; margin-bottom: 15px; }
    .fields { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
    .field-group { display: flex; align-items: center; flex: 1; min-width: 200px; }
    .field-label { font-weight: bold; white-space: nowrap; margin-right: 6px; }
    .field-value { border-bottom: 1px solid black; flex: 1; padding: 2px 4px; }
    .notice { font-size: 11px; padding: 6px; border-left: 3px solid #000080; margin-bottom: 15px; font-style: italic; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid black; padding: 6px; font-size: 10px; }
    th { background: #f0f0f0; font-weight: bold; text-align: center; text-transform: uppercase; }
    .totals-box { display: flex; justify-content: space-between; border: 2px solid #333; padding: 12px; margin: 15px 0; }
    .totals-item { text-align: center; flex: 1; }
    .totals-item .num { font-size: 22px; font-weight: bold; color: #8b0000; }
    .footer-row { display: flex; justify-content: space-between; align-items: end; margin-top: 20px; font-size: 12px; }
    .signature-line { border-top: 1px solid black; padding-top: 4px; text-align: center; }
    @page { size: A4 portrait; margin: 8mm; }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .challan { margin: 0 auto; border: 2px solid #000; }
    }
</style>
</head>
<body>
<div class="challan">
    <div class="jurisdiction">Subject to BHILWARA  Jurisdiction</div>
    <div class="header-top">
        <div style="font-size:12px; font-weight:bold; color:#111; line-height: 1.5; text-align: left;">
            <div style="font-size:14px; font-weight:900; color: #000;">Challan No. ${r(previewData.challanNo)}</div>
            <div style="margin-top: 4px;">Date: ${formatDate(previewData.date)}</div>
        </div>
        <div style="text-align: center; padding: 0 10px;">
            <div class="title">Sant Kanwar Ram Transport Corp. (BHL.)</div>
            <div style="font-size: 11px; font-weight: bold; color: #555; margin-top: 3px;">123-124, Transport Nagar, BHILWARA - 311001 (Raj.)</div>
        </div>
        <div style="font-size:11px; font-weight:bold; text-align: right; color:#000080; line-height: 1.4; padding-right: 10px; white-space: nowrap;">
            <span>Mob.: 96809-92567</span><br/>
            <span>Mob.: 86196-06627</span>
        </div>
    </div>
    <div class="fields" style="margin-top: 15px;">
        <div class="field-group"><span class="field-label">From BHILWARA to</span><span class="field-value">${r(previewData.from)}</span></div>
        <div class="field-group"><span class="field-label">Vehicle No.</span><span class="field-value">${r(previewData.vehicleNo)}</span></div>
        <div class="field-group"><span class="field-label">Owner's Name</span><span class="field-value">${r(previewData.ownerName)}</span></div>
        <div class="field-group" style="flex: 2; min-width: 200px;"><span class="field-label">Driver's Name</span><span class="field-value">${r(previewData.driverName)}</span></div>
    </div>
    <div class="notice">Driver of this vehicle is responsible for goods which is loaded in this truck for safe &amp; sound delivery as per conditions mentioned overleaf.</div>
    <table>
        <thead>
            <tr>
          <th style="width:4%;">S. No.</th>
          <th style="width:9%;">G.R. No.</th>
          <th style="width:7%;">Pkg.</th>
          <th style="width:14%;">Destination</th>
          <th style="width:14%;">Content</th>
          <th style="width:16%;">Consignor</th>
          <th style="width:16%;">Consignee</th>
          <th style="width:8%;">Total (Rs.)</th>
          <th style="width:7%;">Wt.</th>
            </tr>
        </thead>
        <tbody>${tableRows}</tbody>
    </table>
    <div class="totals-box">
        <div class="totals-item"><div>Total Packages</div><div class="num">${totalPkg}</div></div>
        <div class="totals-item"><div>Total Weight</div><div class="num">${totalWt.toFixed(1)}</div></div>
        <div class="totals-item"><div>Grand Total (Rs.)</div><div class="num">${grandTotal.toFixed(2)}</div></div>
    </div>
    <div style="font-size:11px;margin-bottom:12px;padding:8px 12px;border:1px solid #ccc;border-radius:4px;">
        <div style="padding:3px 0;"><strong>Commission :</strong> ${r(c.commission)}</div>
        <div style="padding:3px 0;"><strong>Truck Freight:</strong> ${r(c.truckFreight)}</div>
        <div style="padding:3px 0;"><strong>Advance:</strong> ${r(c.advance)}</div>
        <div style="padding:3px 0;"><strong>T.F Credit:</strong> ${r(c.tfCredit)}</div>
        <div style="padding:3px 0;"><strong>Total To Pay:</strong> ${r(c.totalToPay)}</div>
        <div style="padding:3px 0;"><strong>Other Charge:</strong> ${r(c.otherCharge)}</div>
        <div style="padding:3px 0;"><strong>LC/DC:</strong> ${r(c.lcdc)}</div>
        <div style="padding:3px 0;"><strong>Crossing:</strong> ${r(c.crossing2)}</div>
        <div style="padding:3px 0;"><strong>Door Delivery:</strong> ${r(c.doorDelivery)}</div>
        <div style="padding:3px 0;"><strong>Balance Freight:</strong> ${r(c.balanceFreight)}</div>
        <div style="padding:3px 0;"><strong>Note:</strong> ${r(c.note)}</div>
    </div>
    <div style="font-size:11px;margin-bottom:15px;">Quantity &amp; Goods of this memo received in safe and sound condition</div>
    <div class="footer-row">
        <div>GST No. : <strong>08AAHPN5613K1ZH</strong></div>
        <div>
            <div style="text-align:right;font-weight:bold;">FOR : Sant Kanwar Ram Transport Corp. (BHL.)</div>
            <div class="signature-line" style="width:200px;margin-left:auto;margin-top:8px;">Owner or Driver's Signature</div>
        </div>
    </div>
</div>
</body>
</html>`;
    } else if (previewModule === "cash-memo") {
      const r2 = (v: any) => v || "";
      const fmtDt = (ds: string) => {
        if (!ds) return "";
        const p = ds.split("T")[0].split("-");
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
      };
      const freightRs = parseFloat(previewData.freight) || 0;
      const freightP = parseFloat(previewData.freightPaise) || 0;
      const labourRs = parseFloat(previewData.labour) || 0;
      const labourP = parseFloat(previewData.labourPaise) || 0;
      const stationeryRs = parseFloat(previewData.stationery) || 0;
      const stationeryP = parseFloat(previewData.stationeryPaise) || 0;
      const commissionRs = parseFloat(previewData.commission) || 0;
      const commissionP = parseFloat(previewData.commissionPaise) || 0;
      const aocRs = parseFloat(previewData.aoc) || 0;
      const aocP = parseFloat(previewData.aocPaise) || 0;
      const totalRsSum = freightRs + labourRs + stationeryRs + commissionRs + aocRs;
      const totalWhole = Math.floor(totalRsSum);
      const totalPaise = Math.round((totalRsSum - totalWhole) * 100) + freightP + labourP + stationeryP + commissionP + aocP;
      content = `<!DOCTYPE html>
<html>
<head>
<style>
    @page { size: A4 portrait; margin: 8mm; }
    body { font-family: Arial, sans-serif; margin:0; padding:10px; background:#f3f4f6; }
    .page { border: 2px solid #000; width: 100%; max-width: 700px; padding: 15px; margin: 10px auto; position: relative; background:white; box-sizing:border-box; }
    .header-top { display: flex; justify-content: space-between; align-items: center; }
    .dr-no { font-size: 18px; font-weight: bold; color: #333; }
    .contact { font-size: 14px; font-weight: bold; }
    .title { text-align: center; font-size: 24px; font-weight: bold; color: #000080; margin-top: 10px; }
    .subtitle { text-align: center; font-size: 16px; color: #000080; margin-bottom: 20px; }
    .form-line { display: flex; margin-bottom: 10px; align-items: center; }
    .label { font-weight: bold; width: 80px; font-size: 13px; }
    .input-line { border-bottom: 1px solid black; flex-grow: 1; height: 1.2em; }
    .table-container { border: 1px solid black; margin-top: 20px; width: 100%; }
    .table-container table { width: 100%; border-collapse: collapse; }
    .table-container th, .table-container td { text-align: left; padding: 6px; }
    .table-container th { border-bottom: 1px solid black; font-size: 16px; text-align: center; }
    .table-container tr { height: 28px; }
    .signature { text-align: right; margin-top: 30px; font-weight: bold; }
    @media print { body { background: #fff; padding: 0; } .page { max-width: 100%; margin: 0; border: none; } }
</style>
</head>
<body>
<div class="page">
    <div class="header-top">
        <div class="dr-no">D.R. No. <span style="color:red;">${r2(previewData.drNo)}</span></div>
        <div class="header-title"><span style="font-weight:bold;font-size:18px;">CASH MEMO</span></div>
        <div class="contact">Mob.: 96809-92567<br>86196-06627</div>
    </div>
    <div class="title">Sant Kanwar Ram Transport Corp. (BHL.)</div>
    <div class="subtitle">123-124, Transport Nagar, BHILWARA - 311001 (Raj.)</div>
    <div class="form-line">
        <div class="label">G.R. No.</div>
        <div class="input-line">${r2(previewData.grNo)}</div>
        <div style="width:110px;text-align:right;font-weight:bold;white-space:nowrap;padding-right:6px;">Serial no</div>
        <div class="input-line" style="width:200px;flex-shrink:0;">${r2(previewData.receivedOn)}</div>
    </div>
    <div class="form-line">
        <div class="label">From</div>
        <div class="input-line">${r2(previewData.from)}</div>
        <div style="width:110px;text-align:right;font-weight:bold;white-space:nowrap;padding-right:6px;">Dt.</div>
        <div class="input-line" style="width:200px;flex-shrink:0;">${fmtDt(previewData.date)}</div>
    </div>
    <div class="form-line">
        <div class="label">Consignee</div>
        <div class="input-line">${r2(previewData.consignee)}</div>
    </div>
    <div class="form-line">
        <div class="label">Through</div>
        <div class="input-line">${r2(previewData.through)}</div>
    </div>
    <div class="table-container">
        <table>
            <thead><tr><th style="width:70%;"></th><th style="width:15%;">Rs.</th><th style="width:15%;">P.</th></tr></thead>
            <tbody>
                <tr><td>Freight</td><td style="border-left:1px solid black;">${r2(previewData.freight)}</td><td style="border-left:1px solid black;">${r2(previewData.freightPaise)}</td></tr>
                <tr><td>Labour</td><td style="border-left:1px solid black;">${r2(previewData.labour)}</td><td style="border-left:1px solid black;">${r2(previewData.labourPaise)}</td></tr>
                <tr><td>Stationery</td><td style="border-left:1px solid black;">${r2(previewData.stationery) || "5"}</td><td style="border-left:1px solid black;">${r2(previewData.stationeryPaise) || "00"}</td></tr>
                <tr><td>Commission</td><td style="border-left:1px solid black;">${r2(previewData.commission)}</td><td style="border-left:1px solid black;">${r2(previewData.commissionPaise)}</td></tr>
                <tr><td>A.O.C.</td><td style="border-left:1px solid black;">${r2(previewData.aoc) || "5"}</td><td style="border-left:1px solid black;">${r2(previewData.aocPaise) || "0"}</td></tr>
                <tr style="border-top:1px solid black;">
                    <td style="font-weight:bold;">Total</td>
                    <td style="border-left:1px solid black;">${totalWhole}</td>
                    <td style="border-left:1px solid black;">${String(totalPaise).padStart(2, "0")}</td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="signature">D. Clerk</div>
</div>
</body>
</html>`;
    } else if (previewModule === "summary") {
      const summaryPrintEntries = previewEntryIndex !== null && previewData.entries ? [previewData.entries[previewEntryIndex]] : previewData.entries || [];
      const formatDate = (ds: string) => {
        if (!ds) return "";
        const p = ds.split("T")[0].split("-");
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
      };
      const getSlipTotal = (r: any) => {
        const fd = parseFloat(r.fareDelivery) || 0;
        const cf = parseFloat(r.crossingFare) || 0;
        const dc = parseFloat(r.deliveryCommission) || 0;
        const c = parseFloat(r.crossing) || 0;
        const l = parseFloat(r.labor) || 0;
        return fd + cf + dc - c - l;
      };
      const filledRows = summaryPrintEntries.filter((r: any) =>
        r.truckNo || r.driverName || r.from || r.to ||
        r.transportName || r.challanNo || r.totalCount ||
        r.fareDelivery || r.crossing || r.crossingFare ||
        r.labor || r.deliveryCommission || r.credit || r.debit || r.note || r.note2
      );
      const slipsHtml = filledRows.map((r: any, idx: number) => {
        const total = getSlipTotal(r);
        return `
      <div class="slip-paper">
        <div class="slip-contacts">
          <span>Mob. 96809-92567</span><br/>
          <span class="mob-right">Mob. 86196-06627</span>
        </div>
        <div class="slip-tagline">All disputes subject to Bhilwara jurisdiction</div>
        <div class="slip-headers">
          <h2 class="company-title-en">SANT KANWAR RAM TRANSPORT CORP. (BHL.)</h2>
          <p class="company-address">Bhilwara - 311001 (Raj.)</p>
        </div>
        <div class="slip-subtitle-container">
          <div class="subtitle-line"></div>
          <span class="slip-subtitle">SUMMARY</span>
          <div class="subtitle-line"></div>
        </div>
        <div class="slip-metadata">
          <div class="meta-item serial">
            <span class="label">No.</span>
            <span class="colon">:</span>
            <span class="value stamped-num">${r.sno || idx + 1}</span>
          </div>
          <div class="meta-item date">
            <span class="label">Date</span>
            <span class="dotted-spacer-inline"></span>
            <span class="value written-text">${formatDate(previewData.date)}</span>
          </div>
        </div>
        <div class="slip-fields-grid">
          <div class="field-row double">
            <div class="field-col">
              <span class="field-label">Truck No.</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text">${r.truckNo || ""}</span>
            </div>
            <div class="field-col">
              <span class="field-label">Driver Name</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text">${r.driverName || ""}</span>
            </div>
          </div>
          <div class="field-row double">
            <div class="field-col">
              <span class="field-label">From</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text">${r.from || ""}</span>
            </div>
            <div class="field-col">
              <span class="field-label">To</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text">${r.to || ""}</span>
            </div>
          </div>
          <div class="field-row double">
            <div class="field-col">
              <span class="field-label">Transport Name</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text">${r.transportName || ""}</span>
            </div>
            <div class="field-col">
              <span class="field-label">Challan No.</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text">${r.challanNo || ""}</span>
            </div>
          </div>
          <div class="field-row single">
            <div class="field-col">
              <span class="field-label">Total Count</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text">${r.totalCount || ""}</span>
            </div>
          </div>
          <div class="field-row double">
            <div class="field-col">
              <span class="field-label">Fare Delivery</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text currency">${r.fareDelivery || ""}</span>
            </div>
            <div class="field-col">
              <span class="field-label">Crossing</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text currency">${r.crossing || ""}</span>
            </div>
          </div>
          <div class="field-row double">
            <div class="field-col">
              <span class="field-label">Crossing Fare</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text currency">${r.crossingFare || ""}</span>
            </div>
            <div class="field-col">
              <span class="field-label">Labor</span>
              <span class="dotted-underlines-spacer"></span>
              <span class="field-value written-text currency">${r.labor || ""}</span>
            </div>
          </div>
          <!-- DELIVERY COMMISSION -->
<div style="padding:4px 0;width:100%;">
  <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
    <span style="white-space:nowrap;">Delivery Commission</span>
    <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
      <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">₹ ${r.deliveryCommission || "—"}</span>
    </div>
  </div>
</div>
<!-- NOTE -->
<div style="padding:4px 0;width:100%;">
  <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
    <span style="white-space:nowrap;">Note</span>
    <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
      <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.note || '—'}</span>
    </div>
  </div>
</div>
<!-- ADJUSTMENTS separator -->
<div style="display:flex;align-items:center;gap:8px;padding:6px 0 2px 0;">
  <div style="flex:1;height:1px;background:rgba(0,0,0,0.15);"></div>
  <span style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;opacity:0.5;">Adjustments</span>
  <div style="flex:1;height:1px;background:rgba(0,0,0,0.15);"></div>
</div>
<!-- CREDIT -->
<div style="padding:4px 0;width:100%;">
  <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
    <span style="white-space:nowrap;">Credit</span>
    <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
      <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.credit ? '₹ ' + r.credit : '—'}</span>
    </div>
  </div>
</div>
<!-- DEBIT -->
<div style="padding:4px 0;width:100%;">
  <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
    <span style="white-space:nowrap;">Debit</span>
    <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
      <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.debit ? '₹ ' + r.debit : '—'}</span>
    </div>
  </div>
</div>
<!-- NOTE 2 -->
<div style="padding:4px 0;width:100%;">
  <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
    <span style="white-space:nowrap;">Note</span>
    <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
      <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.note2 || '—'}</span>
    </div>
  </div>
</div>
<!-- GRAND TOTAL -->
<div style="padding:8px 0;width:100%;border-top:1.5px solid var(--slip-ink-print);margin-top:10px;">
  <div style="display:flex;align-items:center;width:100%;justify-content:space-between;font-size:16px;font-weight:900;">
    <span style="text-transform:uppercase;letter-spacing:1px;">Grand Total</span>
    <span>${total > 0 ? '₹ ' + total.toFixed(2) : '—'}</span>
  </div>
</div>
        </div>
        <div class="slip-footer">
          <div class="signature-driver">Driver Signature</div>
          <div class="signature-company">For Sant Kanwar Ram Transport Corp. (BHL.)</div>
        </div>
      </div>`;
      }).join("");

      content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Summary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind:wght@400;500;700&family=Kalam:wght@700&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --slip-paper-bg: #ffaec1;
      --slip-paper-gradient: linear-gradient(135deg, #ffb8c8 0%, #ffa3b7 100%);
      --slip-ink-print: #111e54;
      --slip-ink-write-blue: #0b22a2;
      --slip-ink-stamp: #d32f2f;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif; background: #f3f4f6; padding: 20px; }
    .slip-paper {
      width: 600px; height: auto; min-height: 820px;
      background: var(--slip-paper-bg);
      background-image: var(--slip-paper-gradient);
      color: var(--slip-ink-print);
      border-radius: 2px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.4), 0 5px 15px rgba(0,0,0,0.2);
      position: relative;
      padding: 30px 40px;
      display: flex;
      flex-direction: column;
      margin: 0 auto 60px;
      page-break-after: always;
    }
    .slip-contacts { font-size: 13px; font-weight: 500; margin-bottom: 4px; letter-spacing: 0.5px; text-align: right; }
    .slip-tagline { text-align: center; font-size: 11px; font-family: 'Hind', sans-serif; font-weight: 500; margin-bottom: 6px; }
    .slip-headers { text-align: center; display: flex; flex-direction: column; gap: 4px; }
    .company-title-en { font-family: 'Poppins', sans-serif; font-size: 18.5px; font-weight: 800; letter-spacing: 0.3px; }
    .company-address { font-family: 'Hind', sans-serif; font-size: 13.5px; font-weight: 500; }
    .slip-subtitle-container { display: flex; align-items: center; justify-content: center; margin: 12px 0 16px 0; }
    .subtitle-line { flex-grow: 1; height: 1.5px; background-color: var(--slip-ink-print); }
    .slip-subtitle { font-family: 'Hind', sans-serif; font-size: 17px; font-weight: 700; padding: 0 16px; letter-spacing: 1px; }
    .slip-metadata { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; font-size: 14px; }
    .meta-item { display: flex; align-items: flex-end; position: relative; }
    .meta-item.serial { font-family: 'Hind', sans-serif; font-weight: 700; }
    .meta-item.serial .colon { margin: 0 15px; font-weight: 400; }
    .meta-item.date { font-family: 'Hind', sans-serif; font-weight: 700; flex-grow: 1; max-width: 250px; justify-content: flex-end; }
    .dotted-spacer-inline { flex-grow: 1; border-bottom: 1.5px dotted var(--slip-ink-print); height: 1px; margin: 0 10px 4px 10px; opacity: 0.7; }
    .stamped-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: var(--slip-ink-stamp); letter-spacing: 1px; display: inline-block; transform: rotate(-3deg) scale(1.05); margin-left: 2px; text-shadow: 0.5px 0.5px 0px rgba(0,0,0,0.1); }
    .slip-fields-grid { display: flex; flex-direction: column; gap: 16px; flex-grow: 1; }
    .field-row { display: flex; gap: 24px; width: 100%; }
    .field-row.double .field-col { width: 50%; }
    .field-row.single .field-col { width: 100%; }
    .field-col { display: flex; position: relative; align-items: center; flex-grow: 1; gap: 8px; }
    .field-label { font-family: 'Hind', sans-serif; font-weight: 700; font-size: 14.5px; white-space: nowrap; min-width: 65px; }
    .dotted-underlines-spacer { flex-grow: 1; border-bottom: 1.5px dotted var(--slip-ink-print); height: 1px; margin-top: 10px; }
    .written-text { position: absolute; left: 120px; bottom: 2px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; color: #000; background: transparent; padding: 0 4px; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .written-text.currency:not(:empty)::before { content: "₹ "; font-size: 15px; font-family: 'Poppins', sans-serif; font-weight: 500; }
    .slip-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; margin-bottom: 10px; font-family: 'Hind', sans-serif; font-weight: 700; font-size: 14px; }
    @media print {
      body { background: #fff; padding: 0; }
      .slip-paper { box-shadow: none; border: none; margin: 0 auto; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .slip-paper:last-child { page-break-after: auto; }
      .stamped-num { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .written-text { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${slipsHtml}
</body>
</html>`;
    } else if (previewModule === "delivery-statement") {
      const rowsHtml = (previewData.entries || []).map((e: any, idx: number) => {
        const total = (parseFloat(e.freight) || 0) + (parseFloat(e.labour) || 0) + (parseFloat(e.receiptCh) || 0) + (parseFloat(e.dCom) || 0) + (parseFloat(e.demurage) || 0);
        return `
          <tr>
            <td style="text-align:center;">${e.sno || idx + 1}</td>
            <td style="text-align:center;">${e.drNo || ""}</td>
            <td style="text-align:right;">₹ ${e.freight || "0"}</td>
            <td style="text-align:right;">₹ ${e.labour || "0"}</td>
            <td style="text-align:right;">₹ ${e.receiptCh || "0"}</td>
            <td style="text-align:right;">₹ ${e.dCom || "0"}</td>
            <td style="text-align:right;">₹ ${e.demurage || "0"}</td>
            <td style="text-align:right;font-weight:bold;">₹ ${total.toFixed(2)}</td>
          </tr>
        `;
      }).join("");

      content = `
        <div style="border: 2px solid #000; padding: 20px; font-family: Arial, sans-serif; max-width: 850px; margin: 0 auto; background: #fff; color: #000;">
          <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <h2 style="margin:0; text-transform:uppercase; font-size:24px;">DELIVERY STATEMENT</h2>
            <div style="font-size:11px; font-weight:bold;">SANT KANWAR RAM TRANSPORT CORP. (BHL.)</div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:13px;">
            <div>Page No: <strong>${previewData.pageNo || "—"}</strong></div>
            <div>Date: <strong>${previewData.dateSearch || "—"}</strong></div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:12px;" border="1">
            <thead>
              <tr style="background:#f0f0f0;">
                <th style="padding:6px;">S.No.</th>
                <th style="padding:6px;">D.R. No.</th>
                <th style="padding:6px; text-align:right;">Freight (Cr)</th>
                <th style="padding:6px; text-align:right;">Labour (Dr)</th>
                <th style="padding:6px; text-align:right;">Stationery (Dr)</th>
                <th style="padding:6px; text-align:right;">Commission (Dr)</th>
                <th style="padding:6px; text-align:right;">A.O.C. (Dr)</th>
                <th style="padding:6px; text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div style="margin-top:20px; text-align:right; font-size:15px; font-weight:bold;">
            Statement Total: <span style="font-size:18px; color:#d32f2f;">₹ ${previewData.totals?.total || 0}</span>
          </div>
        </div>
      `;
    } else if (previewModule === "entry") {
      const rowsHtml = (previewData.entries || []).map((e: any, idx: number) => `
        <tr>
          <td style="text-align:center;">${e.sno || idx + 1}</td>
          <td>${e.from || ""}</td>
          <td>${e.to || ""}</td>
          <td style="text-align:center;">${e.grNo || ""}</td>
          <td>${e.consignor || ""}</td>
          <td>${e.consignee || ""}</td>
          <td style="text-align:center;">${e.noOfPackages || ""}</td>
          <td>${e.contents || ""}</td>
          <td style="text-align:right;">${e.freight || "0"}</td>
          <td>${e.deliveryReceiptNo || ""}</td>
          <td>${e.dateOfDelivery || ""}</td>
        </tr>
      `).join("");

      content = `
        <div style="border: 2px solid #000; padding: 15px; font-family: Arial, sans-serif; max-width: 1100px; margin: 0 auto; background: #fff; color: #000;">
          <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <h1 style="font-size: 24px; font-weight:bold; uppercase; margin:0;">Sant Kanwar Ram Transport Corporation(BHL.)</h1>
            <div style="font-size: 11px; text-transform:uppercase;">Bhilwara (Raj.) · Delivery Register</div>
          </div>
          <table style="width:100%; margin-bottom:15px; font-size:12px; border-collapse:collapse;">
            <tr>
              <td><strong>Page No:</strong> ${previewData.pageNo || "—"}</td>
              <td><strong>Date:</strong> ${previewData.dateSearch || "—"}</td>
              <td><strong>Challan No:</strong> ${previewData.challanNo || "—"}</td>
              <td><strong>Vehicle No:</strong> ${previewData.vehicleNo || "—"}</td>
              <td><strong>Driver:</strong> ${previewData.driverName || "—"}</td>
            </tr>
          </table>
          <table style="width:100%; border-collapse:collapse; font-size:9.5px;" border="1">
            <thead>
              <tr style="background:#f0f0f0;">
                <th style="padding:4px;">S.No.</th>
                <th style="padding:4px;">From</th>
                <th style="padding:4px;">To</th>
                <th style="padding:4px;">G.R. No.</th>
                <th style="padding:4px;">Consignor</th>
                <th style="padding:4px;">Consignee</th>
                <th style="padding:4px;">Pkgs</th>
                <th style="padding:4px;">Contents</th>
                <th style="padding:4px; text-align:right;">Freight</th>
                <th style="padding:4px;">Receipt No</th>
                <th style="padding:4px;">Del. Date</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Slip</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body onload="window.print();">
        ${content}
      </body>
      </html>
    `;
  };

  const buildPreviewPdfHtml = () => {
    const html = getPrintHTML();
    return html.replace('onload="window.print();"', '');
  };

  return (
    <DashboardLayout>
      <style>{`
        @keyframes row-blink {
          0%, 100% { background-color: transparent; }
          25%, 75% { background-color: rgba(35, 136, 255, 0.4); }
          50% { background-color: rgba(35, 136, 255, 0.15); }
        }
        .animate-row-blink {
          animation: row-blink 1.2s ease-in-out 2 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>
      <div className="space-y-6 min-w-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Observation</h2>
          <p className="text-muted-foreground">View all records across modules — Challan, Cash Memo, Summary, Delivery Statement, and Entry.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {modules.map(({ key, label, icon, color }) => {
            const isActive = activeModule === key;
            return (
              <button
                key={key}
                onClick={() => handleCardClick(key)}
                className={cn(
                  "relative group text-left rounded-xl border transition-all duration-200 p-5 cursor-pointer",
                  isActive
                    ? "border-[#2388ff] bg-slate-900/90 shadow-lg shadow-blue-500/10"
                    : "border-slate-700/50 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60"
                )}
              >
                <div className={cn(
                  "absolute inset-0 rounded-xl opacity-10 transition-opacity duration-200",
                  isActive && "opacity-20",
                  `bg-gradient-to-br ${color}`
                )} />
                <div className="relative z-10">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-colors",
                    isActive ? "bg-[#2388ff]/20 text-[#2388ff]" : "bg-slate-800 text-slate-400 group-hover:text-slate-300"
                  )}>
                    {icon}
                  </div>
                  <h3 className={cn(
                    "text-base font-bold transition-colors",
                    isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                  )}>
                    {label}
                  </h3>
                  <p className={cn(
                    "text-xs mt-1 transition-colors",
                    isActive ? "text-[#2388ff]" : "text-slate-500"
                  )}>
                    {counts[key] !== undefined ? `${counts[key]} records` : "—"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {activeModule && renderActiveModuleData()}

        {!activeModule && (
          <div className="text-center py-20 border border-dashed border-slate-700/50 rounded-xl bg-slate-900/20">
            <Search className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-400">Select a Module</h3>
            <p className="text-slate-600 mt-1 max-w-md mx-auto">
              Click on any card above to view all its records from the database.
            </p>
          </div>
        )}
      </div>

      {/* Record Preview Dialog Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPreviewEntryIndex(null); }}>
        <DialogContent className="!max-w-[95vw] lg:!max-w-[90vw] max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-850 text-white p-6 rounded-xl box-border">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-3">
            <DialogTitle className="text-lg font-bold text-[#2388ff] flex items-center gap-2 uppercase tracking-wider">
              <Eye className="w-5 h-5" />
              {previewModule ? `${previewModule.replace('-', ' ')} Preview` : "Record Details"}
            </DialogTitle>
            <div className="flex gap-2 mr-6 print-hide">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const pw = window.open("", "_blank");
                  if (!pw) return;
                  pw.document.write(getPrintHTML());
                  pw.document.close();
                }}
                className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-white font-semibold"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print / Save PDF
              </Button>
            </div>
          </DialogHeader>
          
          {previewLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#2388ff]" />
              <p className="text-sm font-semibold uppercase tracking-widest">Fetching prefilled slip data...</p>
            </div>
          )}

          {!previewLoading && !previewData && (
            <div className="text-center py-10 text-slate-500">
              No record data available.
            </div>
          )}

          {!previewLoading && previewData && (
            <div className="py-4 w-full box-border">
              {renderPreviewContent()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}