"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Printer, X, Plus, Trash2, Search, Save, Edit as EditIcon, Loader2, Download, Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

let entryMetadataRequest: Promise<any> | null = null;
const fetchEntryMetadata = () => {
  if (!entryMetadataRequest) {
    entryMetadataRequest = api.get("/entry/metadata")
      .then(({ data }) => data.success ? data.data : { nextPageNo: "1", maxSno: 0 })
      .catch(() => ({ nextPageNo: "1", maxSno: 0 }))
      .finally(() => { entryMetadataRequest = null; });
  }
  return entryMetadataRequest;
};
import { useHeader } from "@/context/HeaderContext";
import { fetchTemplate, fillTemplate } from "@/lib/template-utils";
import { handleTableCellKeyDown } from "@/lib/tableNavigation";
import { TableCellAutocomplete } from "@/components/ui/table-cell-autocomplete";
import { useCallback } from "react";

type EntryRow = {
  id?: number | string;
  sno: string;
  from: string;
  to: string;
  grNo: string;
  consignor: string;
  consignee: string;
  noOfPackages: string;
  contents: string;
  freight: string;
  deliveryReceiptNo: string;
  dateOfDelivery: string;
};

let _rowId = 1;
const uid = () => _rowId++;

const emptyRow = (sno?: string): EntryRow => ({
  id: uid(), sno: sno || "", from: "", to: "", grNo: "", consignor: "", consignee: "", noOfPackages: "", contents: "", freight: "", deliveryReceiptNo: "", dateOfDelivery: ""
});

export default function EntryRegisterPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [pageNo, setPageNo] = useState("");
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [dateSearch, setDateSearch] = useState(today());
  const [userChangedDate, setUserChangedDate] = useState(false);
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [challanNo, setChallanNo] = useState("");
  const [fromField, setFromField] = useState("");
  const [toField, setToField] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");

  const { searchQuery } = useHeader();
  const [matchCount, setMatchCount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialMaxSno, setInitialMaxSno] = useState<number | null>(null);
  const [dupGrNos, setDupGrNos] = useState<Set<string>>(new Set());

  const fetchBranches = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/branches?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchParties = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/parties?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchCargo = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/cargo?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchVehicleNos = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/vehicle-nos?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchDrivers = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/drivers?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);

  // Upload state (Excel/CSV)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDateSearch, setUploadDateSearch] = useState("");
  const [uploadVehicleNo, setUploadVehicleNo] = useState("");
  const [uploadDriverName, setUploadDriverName] = useState("");
  const [uploadPageNo, setUploadPageNo] = useState("");
  const [uploadChallanNo, setUploadChallanNo] = useState("");

  const getEntryMetadata = async () => {
    return fetchEntryMetadata();
  };

  const autoGeneratePageNo = async () => setPageNo((await getEntryMetadata()).nextPageNo);
  const getMaxSno = async (): Promise<number> => (await getEntryMetadata()).maxSno;

  const autoFillSnoFrom = (index: number, rows: EntryRow[]): EntryRow[] => {
    const newRows = [...rows];
    const startNum = parseInt(newRows[index].sno, 10);
    if (isNaN(startNum)) return newRows;
    for (let i = index + 1; i < newRows.length; i++) {
      newRows[i] = { ...newRows[i], sno: String(startNum + (i - index)) };
    }
    return newRows;
  };

  // Auto-generate page no & init sno on mount
  useEffect(() => {
    (async () => {
      const metadata = await getEntryMetadata();
      setPageNo(metadata.nextPageNo);
      const maxSno = metadata.maxSno;
      setInitialMaxSno(maxSno);
      setRows(Array.from({ length: 5 }, (_, i) => emptyRow(String(maxSno + i + 1))));
      setInitialized(true);
    })();
  }, []);

  // Fetch from Backend by Date (only when user explicitly picks a date)
  useEffect(() => {
    if (!userChangedDate) return;
    let active = true;
    const fetchEntries = async () => {
      if (!dateSearch) {
        if (active) {
          setRegisterId(null);
          const maxSno = await getMaxSno();
          setInitialMaxSno(maxSno);
          setRows(Array.from({ length: 5 }, (_, i) => emptyRow(String(maxSno + i + 1))));
          setChallanNo("");
          setFromField("");
          setToField("");
          setVehicleNo("");
        }
        return;
      }

      try {
        setLoading(true);
        await refreshFromDate(dateSearch);
        if (!active) return;
        autoGeneratePageNo();
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEntries();
    return () => { active = false };
  }, [dateSearch, userChangedDate]);

  // Local Text Search Highlighting logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchCount(0);
      return;
    }
    const lowerQ = searchQuery.toLowerCase();
    let count = 0;
    rows.forEach(r => {
      const match = Object.values(r).some(val =>
        String(val).toLowerCase().includes(lowerQ)
      );
      if (match) count++;
    });
    setMatchCount(count);
  }, [searchQuery, rows]);

  const updateRow = (index: number, field: keyof EntryRow, value: string) => {
    const newRows = [...rows];
    if (field === 'grNo') {
      setDupGrNos((prev) => {
        const next = new Set(prev);
        next.delete(newRows[index].grNo.trim().toUpperCase());
        next.delete(value.trim().toUpperCase());
        return next;
      });
    }
    newRows[index] = { ...newRows[index], [field]: value };
    if (field === 'sno') {
      setRows(autoFillSnoFrom(index, newRows));
    } else {
      setRows(newRows);
    }
  };

  const checkGrNo = async (grNo: string) => {
    const n = grNo.trim().toUpperCase();
    setDupGrNos((prev) => {
      const next = new Set(prev);
      next.delete(n);
      return next;
    });
    if (!n) return;
    const inSheet = rows.filter((r) => r.grNo.trim().toUpperCase() === n).length > 1;
    if (inSheet) {
      setDupGrNos((prev) => new Set(prev).add(n));
      return;
    }
    try {
      const res = await api.get(`/entry/grno/${encodeURIComponent(grNo)}`);
      if (res.data.success && res.data.data && String(res.data.data.registerId) !== String(registerId)) {
        setDupGrNos((prev) => new Set(prev).add(n));
      }
    } catch {
      // 404 = not found, not a duplicate
    }
  };

  const addRow = () => {
    const lastSno = rows.length > 0 ? parseInt(rows[rows.length - 1].sno, 10) : 0;
    const nextSno = !isNaN(lastSno) ? String(lastSno + 1) : String(rows.length + 1);
    setRows([...rows, emptyRow(nextSno)]);
  };

  const handleEntryCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    handleTableCellKeyDown(e, rowIdx, colIdx, addRow);
  };

  const deleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  const deleteLastRow = () => {
    if (rows.length === 0) return;
    setRows(rows.slice(0, -1));
  };

  const clearAll = async () => {
    if (confirm("Clear all entries? This will clear the table rows visually.")) {
      const maxSno = await getMaxSno();
      setDupGrNos(new Set());
      setRows(Array.from({ length: 5 }, (_, i) => emptyRow(String(maxSno + i + 1))));
      setRegisterId(null);
      setPageNo("");
      setDateSearch("");
      setChallanNo("");
      setFromField("");
      setToField("");
      setVehicleNo("");
    }
  };

  const buildEntryHtml = async (): Promise<string> => {
    const tableRows = rows.map((r, idx) => `
      <tr>
        <td class="text-center">${r.sno || idx + 1}</td>
        <td>${r.from}</td>
        <td>${r.to}</td>
        <td>${r.grNo}</td>
        <td>${r.consignor}</td>
        <td>${r.consignee}</td>
        <td class="text-center">${r.noOfPackages}</td>
        <td>${r.contents}</td>
        <td class="text-right">${r.freight}</td>
        <td>${r.deliveryReceiptNo}</td>
        <td>${r.dateOfDelivery}</td>
      </tr>
    `).join("");

    const template = await fetchTemplate("delivery_register");
    return fillTemplate(template, {
      CHALLAN_NO: challanNo || "—",
      FROM: fromField || "—",
      TO: toField || "—",
      VEHICLE_NO: vehicleNo || "—",
      DATE: dateSearch || "—",
      PAGE_NO: pageNo || "—",
      TABLE_ROWS: tableRows,
    });
  };

  const handlePrint = async () => {
    const html = await buildEntryHtml();
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(html);
    pw.document.close();
  };

  const handleDownloadPDF = async () => {
    const html = await buildEntryHtml();
    const pw = window.open("", "_blank");
    if (!pw) return;
    const pdfHtml = html.replace("</body>", `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<script>window.onload=function(){html2pdf().set({margin:5,filename:'delivery-register.pdf'}).from(document.body).save();};<\/script></body>`);
    pw.document.write(pdfHtml);
    pw.document.close();
  };

  const parseColumns = (row: any) => ({
    sno: row["S.NO"] || row["SNO"] || row["S_NO"] || row["S No"] || row["S.No"] || "",
    from: row["FROM"] || row["From"] || "",
    to: row["TO"] || row["To"] || "",
    grNo: row["G.R.NO"] || row["GR NO"] || row["GR_NO"] || row["GR No"] || row["G.R. No."] || row["G.R.NO"] || "",
    consignor: row["CONSIGNOR"] || row["Consignor"] || "",
    consignee: row["CONSIGNEE"] || row["Consignee"] || "",
    noOfPackages: row["NO.OF.PACKAGES"] || row["NO OF PACKAGES"] || row["No. of Packages"] || row["NO_OF_PACKAGES"] || row["No. of Pkgs"] || "",
    contents: row["CONTENTS"] || row["Contents"] || "",
    freight: row["FREIGHT"] || row["Freight"] || "",
    deliveryReceiptNo: row["DELIVERY RECEIPT NO"] || row["Delivery Receipt No"] || row["DELIVERY_RECEIPT_NO"] || row["Delivery Receipt"] || "",
    dateOfDelivery: row["DATE OF DELIVERY"] || row["Date of Delivery"] || row["DATE_OF_DELIVERY"] || "",
  });

  const parseRegisterFields = (row: any) => ({
    dateSearch: row["DATE"] || row["Date"] || row["date"] || "",
    vehicleNo: row["Vehicle No"] || row["Vehicle No."] || row["VEHICLE NO"] || row["VEHICLE_NO"] || "",
    driverName: row["Driver name"] || row["Driver Name"] || row["DRIVER NAME"] || row["DRIVER_NAME"] || "",
    pageNo: row["page no"] || row["Page No"] || row["PAGE NO"] || row["PAGE_NO"] || row["page no."] || "",
    challanNo: row["challen no"] || row["Challan No"] || row["CHALLAN NO"] || row["CHALLAN_NO"] || row["challan no"] || "",
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    try {
      let json: any[] = [];
      let ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv") {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const dataLines = lines.slice(1);
        json = dataLines.map(line => {
          const values: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
            current += ch;
          }
          values.push(current.trim());
          const row: any = {};
          headers.forEach((h, i) => { row[h] = values[i] || ""; });
          return row;
        }).filter((r: any) => Object.values(r).some(v => v));
      } else {
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        // Use first sheet that has data, fallback to first sheet
        const targetName = workbook.SheetNames.find(n => n.toLowerCase().includes("sheet"))
          || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetName];
        json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        console.log("Parsed xlsx rows:", json.length);
      }

      if (json.length === 0) {
        toast.error("No data found in the file.");
        setPreviewRows([]);
        return;
      }

      // Normalize headers: trim whitespace from keys
      json = json.map((row: any) => {
        const normalized: any = {};
        for (const key of Object.keys(row)) {
          const trimmed = key.trim();
          normalized[trimmed] = typeof row[key] === "string" ? row[key].trim() : row[key];
        }
        return normalized;
      });

      const first = json[0];
      if (first) {
        setUploadDateSearch(parseRegisterFields(first).dateSearch || dateSearch);
        setUploadVehicleNo(parseRegisterFields(first).vehicleNo || "");
        setUploadDriverName(parseRegisterFields(first).driverName || "");
        setUploadPageNo(parseRegisterFields(first).pageNo || "");
        setUploadChallanNo(parseRegisterFields(first).challanNo || "");
      }

      const mapped = json.map((row: any) => parseColumns(row));
      const filtered = mapped.filter((row: any) => {
        const grNo = String(row.grNo || "").trim();
        if (!grNo) return false;
        return true;
      });
      if (filtered.length === 0) {
        toast.error("No valid rows found. Check that the file has a header row matching the expected format.");
      }
      setPreviewRows(filtered);
    } catch (err) {
      console.error("File parse error:", err);
      toast.error("Failed to parse file. Make sure it's a valid .csv or .xlsx file.");
      setPreviewRows([]);
    }
  };

  const refreshFromDate = async (date: string) => {
    try {
      const res = await api.get(`/entry/date/${date}`);
      if (res.data.success && res.data.data) {
        const reg = res.data.data;
        setRegisterId(reg._id);
        setPageNo(reg.pageNo || "");
        setChallanNo(reg.challanNo || "");
        setFromField(reg.fromData || "");
        setToField(reg.toData || "");
        setVehicleNo(reg.vehicleNo || "");
        setDriverName(reg.driverName || "");
        const existing = (reg.entries || []).filter((e: any) => e.sno);
        const maxSno = existing.reduce((max: number, e: any) => {
          const n = parseInt(e.sno, 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        setRows(Array.from({ length: 5 }, (_, i) => emptyRow(String(maxSno + i + 1))));
      }
    } catch {
      setRegisterId(null);
    }
  };

  const handleUploadConfirm = async () => {
    if (!dateSearch) { toast.error("Please select a date first"); return; }
    if (previewRows.length === 0) { toast.error("No data to upload"); return; }
    setUploading(true);
    try {
      const registerFields: any = { dateSearch, entries: previewRows };
      if (uploadPageNo) registerFields.pageNo = uploadPageNo;
      if (uploadChallanNo) registerFields.challanNo = uploadChallanNo;
      if (uploadVehicleNo) registerFields.vehicleNo = uploadVehicleNo;
      if (uploadDriverName) registerFields.driverName = uploadDriverName;
      const res = await api.post("/entry/upload", registerFields);
      if (res.data.success) {
        toast.success(`${res.data.count} entries uploaded successfully!`);
        setUploadOpen(false);
        setUploadFile(null);
        setPreviewRows([]);
        setUploadDateSearch("");
        setUploadVehicleNo("");
        setUploadDriverName("");
        setUploadPageNo("");
        setUploadChallanNo("");
        await refreshFromDate(dateSearch);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload entries");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const flagged = [...dupGrNos].filter((n) => rows.some((r) => r.grNo.trim().toUpperCase() === n));
    if (flagged.length > 0) {
      const labels = [...new Set(rows.filter((r) => flagged.includes(r.grNo.trim().toUpperCase())).map((r) => r.grNo))];
      toast.error(`G.R. No "${labels.join('", "')}" already exists. Please fix before saving.`);
      return;
    }
    setSaving(true);
    try {
      const localEntries = rows
        .map(({ id, ...rest }) => rest)
        .filter(e => e.from || e.to || e.grNo || e.consignor || e.consignee || e.noOfPackages || e.contents || e.freight || e.deliveryReceiptNo || e.dateOfDelivery);

      if (registerId) {
        const currentRes = await api.get(`/entry/${registerId}`);
        const serverEntries: any[] = currentRes.data.data?.entries || [];
        const mergedBySno = new Map<string, any>();
        for (const e of serverEntries) {
          if (e.sno) mergedBySno.set(e.sno, e);
        }
        for (const e of localEntries) {
          if (e.sno) mergedBySno.set(e.sno, e);
        }
        const payloadAll = { pageNo, dateSearch, challanNo, fromData: fromField, toData: toField, vehicleNo, driverName, entries: [...mergedBySno.values()] };
        await api.put(`/entry/${registerId}`, payloadAll);
        toast.success("Delivery Register updated successfully.");
      } else {
        const payloadAll = { pageNo, dateSearch, challanNo, fromData: fromField, toData: toField, vehicleNo, driverName, entries: localEntries };
        const res = await api.post(`/entry`, payloadAll);
        if (res.data.success) {
          toast.success("Delivery Register saved successfully.");
        }
      }
      setRegisterId(null);
      setChallanNo("");
      setFromField("");
      setToField("");
      setVehicleNo("");
      setDriverName("");
      setPageNo("");
      const metadata = await getEntryMetadata();
      setPageNo(metadata.nextPageNo);
      const maxSno = metadata.maxSno;
      setDupGrNos(new Set());
      setRows(Array.from({ length: 5 }, (_, i) => emptyRow(String(maxSno + i + 1))));
      toast.success("Ready for new entry.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save the register.");
    } finally {
      setSaving(false);
    }
  };

  const isMatch = (row: EntryRow) => {
    if (!searchQuery.trim()) return false;
    const lowerQ = searchQuery.toLowerCase();
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(lowerQ)
    );
  };

  const previewGrDups = new Set<string>();
  {
    const seen = new Set();
    for (const r of previewRows) {
      const n = String(r.grNo || "").trim().toUpperCase();
      if (!n) continue;
      if (seen.has(n)) previewGrDups.add(n);
      seen.add(n);
    }
  }

  return (
    <DashboardLayout>
      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 10mm; }
          body > * { display: none !important; }
          #entry-printable { display: block !important; }
          #entry-action-bar { display: none !important; }
          .sidebar-layout, nav, header, footer { display: none !important; }
          #entry-printable .entry-wrapper {
            box-shadow: none !important;
            border: 2px solid #333 !important;
            background: #fff !important;
            max-width: 100% !important;
            margin: 0 !important;
            color: #000 !important;
            padding: 10px !important;
          }
          #entry-printable .del-btn { display: none !important; }
          #entry-printable .print-hide { display: none !important; }
          #entry-printable input { background: transparent !important; color: #000 !important; border: 0 !important; }
          #entry-printable th { background: #e8ecf0 !important; border-bottom: 2px solid #333 !important; color: #111 !important; border: 1px solid #999; }
          #entry-printable td { border: 1px solid #999 !important; color: #111 !important; }
          #entry-printable .sno-cell { background: #f0f0f0 !important; border-right: 2px solid #333 !important; }
          #entry-printable .text-[#2388ff], #entry-printable .text-rose-500 { color: #000 !important; text-shadow: none !important; }
          #entry-printable .bg-[#0b1220] { background: transparent !important; }
          #entry-printable .highlight { background: transparent !important; }
        }
      `}</style>

      <div className="space-y-6 px-4 md:px-8 py-4 md:py-8 h-full max-w-full">
        {/* Page header & Actions */}
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
              <h2 className="text-3xl font-bold tracking-tight">Entry</h2>
              <p className="text-muted-foreground flex items-center gap-2">
                Delivery register entry management
                {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              </p>
            </div>
          </div>

          <div id="entry-action-bar" className="flex flex-wrap items-center gap-2.5">
            {searchQuery.trim() && matchCount > 0 && (
              <span className="text-xs font-mono text-[#2388ff] bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700">
                {matchCount} match{matchCount > 1 ? "es" : ""}
              </span>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 rounded-lg font-medium transition-all bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>

            <Button
              size="sm"
              onClick={deleteLastRow}
              className="h-9 px-3 rounded-lg bg-slate-800 text-slate-200 hover:bg-orange-600 hover:text-white border border-slate-700 font-medium transition-all"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete Last
            </Button>
            <Button
              size="sm"
              onClick={clearAll}
              className="h-9 px-3 rounded-lg bg-slate-800 text-slate-200 hover:bg-red-600 hover:text-white border border-slate-700 font-medium transition-all"
            >
              <X className="h-4 w-4 mr-1.5" /> Clear All
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-9 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-semibold transition-all"
            >
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold transition-all"
            >
              <Download className="h-4 w-4 mr-1.5" /> Download PDF
            </Button>
            <Button
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="h-9 px-3 rounded-lg bg-violet-700 hover:bg-violet-600 text-white font-semibold transition-all"
            >
              <Upload className="h-4 w-4 mr-1.5" /> Upload Data
            </Button>
          </div>
        </div>

        {/* Upload Dialog (Excel/CSV) */}
        {uploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[#0b1220] border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Upload Data</h3>
                <button onClick={() => { setUploadOpen(false); setUploadFile(null); setPreviewRows([]); setUploadDateSearch(""); setUploadVehicleNo(""); setUploadDriverName(""); setUploadPageNo(""); setUploadChallanNo(""); }} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
              </div>
              {!dateSearch && (
                <div className="bg-amber-900/30 border border-amber-700 text-amber-300 px-4 py-2 rounded mb-4 text-sm">
                  Please select a date first before uploading.
                </div>
              )}
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-slate-300">Select file (.csv or .xlsx)</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-700 file:text-white hover:file:bg-violet-600 cursor-pointer"
                />
              </div>
              {previewRows.length > 0 && (
                <>
                  <p className="text-sm text-slate-400 mb-2">{previewRows.length} rows parsed</p>
                  {previewGrDups.size > 0 && (
                    <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800 rounded px-3 py-2 mb-3">
                      Duplicate G.R. No detected in file: {[...previewGrDups].join(", ")} - upload will be rejected.
                    </p>
                  )}
                  {(uploadPageNo || uploadChallanNo || uploadVehicleNo || uploadDriverName || uploadDateSearch) && (
                    <div className="flex flex-wrap gap-4 mb-3 p-3 bg-slate-900/50 border border-slate-700 rounded text-xs text-slate-300">
                      {uploadDateSearch && <span><strong className="text-[#2388ff]">Date:</strong> {uploadDateSearch}</span>}
                      {uploadPageNo && <span><strong className="text-[#2388ff]">Page No:</strong> {uploadPageNo}</span>}
                      {uploadChallanNo && <span><strong className="text-[#2388ff]">Challan No:</strong> {uploadChallanNo}</span>}
                      {uploadVehicleNo && <span><strong className="text-[#2388ff]">Vehicle No:</strong> {uploadVehicleNo}</span>}
                      {uploadDriverName && <span><strong className="text-[#2388ff]">Driver:</strong> {uploadDriverName}</span>}
                    </div>
                  )}
                  <div className="overflow-x-auto border border-slate-700 rounded-md max-h-80 overflow-y-auto mb-4">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-[#2388ff] uppercase font-bold">
                          <th className="p-2 border-r border-slate-700">S.No</th>
                          <th className="p-2 border-r border-slate-700">From</th>
                          <th className="p-2 border-r border-slate-700">To</th>
                          <th className="p-2 border-r border-slate-700">G.R. No</th>
                          <th className="p-2 border-r border-slate-700">Consignor</th>
                          <th className="p-2 border-r border-slate-700">Consignee</th>
                          <th className="p-2 border-r border-slate-700">No. of Pkg</th>
                          <th className="p-2 border-r border-slate-700">Contents</th>
                          <th className="p-2 border-r border-slate-700">Freight</th>
                          <th className="p-2 border-r border-slate-700">Del. Receipt No</th>
                          <th className="p-2">Date of Del.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-slate-900/40" : ""}>
                            <td className="p-2 border border-slate-700 text-center text-slate-300">{row.sno || i + 1}</td>
                            <td className="p-2 border border-slate-700 text-white">{row.from}</td>
                            <td className="p-2 border border-slate-700 text-white">{row.to}</td>
                            <td className={`p-2 border border-slate-700 ${previewGrDups.has(String(row.grNo || "").trim().toUpperCase()) ? "text-rose-400 font-bold" : "text-white"}`}>{row.grNo}</td>
                            <td className="p-2 border border-slate-700 text-white max-w-[100px] truncate">{row.consignor}</td>
                            <td className="p-2 border border-slate-700 text-white max-w-[100px] truncate">{row.consignee}</td>
                            <td className="p-2 border border-slate-700 text-white text-center">{row.noOfPackages}</td>
                            <td className="p-2 border border-slate-700 text-white max-w-[100px] truncate">{row.contents}</td>
                            <td className="p-2 border border-slate-700 text-white text-right">{row.freight}</td>
                            <td className="p-2 border border-slate-700 text-white">{row.deliveryReceiptNo}</td>
                            <td className="p-2 border border-slate-700 text-white">{row.dateOfDelivery}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button size="sm" onClick={() => { setUploadOpen(false); setUploadFile(null); setPreviewRows([]); setUploadDateSearch(""); setUploadVehicleNo(""); setUploadDriverName(""); setUploadPageNo(""); setUploadChallanNo(""); }} className="bg-slate-700 hover:bg-slate-600 text-white">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleUploadConfirm} disabled={uploading || !dateSearch} className="bg-violet-700 hover:bg-violet-600 text-white">
                      {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                      Upload {previewRows.length} Entries
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Register Sheet */}
        <div id="entry-printable" className="w-full flex justify-center mt-6">
          <div className="entry-wrapper w-full max-w-[1450px] rounded-xl border border-slate-800 bg-[#0b1220] shadow-xl p-8 relative overflow-hidden">

            {/* Header Titles */}
            <div className="text-center border-b border-slate-700/60 pb-5 mb-6 relative">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-[#2388ff] drop-shadow-md">
                Sant <span className="text-rose-500">Kanwar Ram</span> Transport Corporation
              </h1>
              <div className="text-xs uppercase tracking-[4px] text-slate-400 mt-2 font-medium">
                Transport Nagar · Bhilwara (Raj.)
              </div>
              <div className="text-sm font-bold uppercase tracking-[4px] text-[#2388ff] mt-4 border-2 border-slate-800 px-6 py-2 inline-block rounded/50 bg-slate-900/50">
                ◈ Delivery Register ◈
              </div>

              {/* Challan No + From / To */}
              <div className="absolute left-0 bottom-4 flex flex-col gap-1.5 print-hide">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#2388ff]">From:</span>
                    <TableCellAutocomplete
                      value={fromField}
                      onChange={setFromField}
                      onSelect={setFromField}
                      fetchSuggestions={fetchBranches}
                      placeholder="—"
                      className="w-32 font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#2388ff]">To:</span>
                    <TableCellAutocomplete
                      value={toField}
                      onChange={setToField}
                      onSelect={setToField}
                      fetchSuggestions={fetchBranches}
                      placeholder="—"
                      className="w-32 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2388ff] uppercase tracking-wider">Challan No:</span>
                  <input type="text" value={challanNo} onChange={(e) => setChallanNo(e.target.value)} placeholder="—" className="w-48 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* Page Number & Date Search */}
              <div className="absolute right-0 bottom-4 text-xs font-mono text-slate-400 flex flex-col md:flex-row items-end md:items-center gap-4">
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2388ff]">Vehicle No.</span>
                    <TableCellAutocomplete
                      value={vehicleNo}
                      onChange={setVehicleNo}
                      onSelect={setVehicleNo}
                      fetchSuggestions={fetchVehicleNos}
                      placeholder="—"
                      className="w-28 font-bold text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2388ff]">Driver</span>
                    <TableCellAutocomplete
                      value={driverName}
                      onChange={setDriverName}
                      onSelect={setDriverName}
                      fetchSuggestions={fetchDrivers}
                      placeholder="—"
                      className="w-28 font-bold text-center"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500">Page no.</span>
                      <input type="text" value={pageNo} onChange={(e) => setPageNo(e.target.value)} placeholder="—" className="w-16 bg-transparent border-0 border-b-2 border-rose-500/50 text-rose-500 font-bold text-center outline-none focus:border-rose-500" />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 pl-3 pr-1 py-1 rounded-md print-hide">
                      <span className="font-bold text-[#2388ff]">DATE :</span>
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          value={dateSearch}
                          onChange={(e) => { setDateSearch(e.target.value); setUserChangedDate(true); }}
                          className="bg-transparent text-white outline-none border-0 text-sm font-mono focus:ring-0"
                          style={{ colorScheme: "dark" }}
                        />
                        {dateSearch && (
                          <button
                            onClick={() => { setDateSearch(""); setUserChangedDate(false); setChallanNo(""); setFromField(""); setToField(""); setVehicleNo(""); setDriverName(""); setRegisterId(null); }}
                            className="bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-full p-1 ml-1 transition-colors"
                            title="Clear Date"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>{/* end: text-center header div */}

            {/* Table wrapper */}
            <div className="overflow-x-auto border border-slate-700 rounded-md bg-slate-900/40">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 border-b-2 border-[#2388ff]/60">
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[4%]">S.No.</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[6%]">From</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[6%]">To</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[7%]">G. R. No.</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Consignor</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Consignee</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[6%]">No. of<br />Packages</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Contents</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[6%]">Freight</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Delivery Receipt<br />No.</th>
                    <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Date of Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {(searchQuery.trim() ? rows.filter(r => isMatch(r)) : rows).map((row, idx) => (
                    <tr
                      key={row.id}
                      className="bg-[#2388ff]/30 transition-colors group"
                    >
                      <td className="border border-slate-700 p-0 w-[4%]">
                        <input type="text" value={row.sno} onChange={(e) => updateRow(idx, 'sno', e.target.value)} data-row={idx} data-col={0} onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 0)} className="w-full h-full p-1.5 bg-transparent border-0 text-center font-mono text-slate-400 outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <TableCellAutocomplete
                          value={row.from}
                          onChange={(v) => updateRow(idx, 'from', v)}
                          onSelect={(v) => updateRow(idx, 'from', v)}
                          fetchSuggestions={fetchBranches}
                          onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 1)}
                          data-row={idx}
                          data-col={1}
                          className="w-full h-full p-1.5"
                        />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <TableCellAutocomplete
                          value={row.to}
                          onChange={(v) => updateRow(idx, 'to', v)}
                          onSelect={(v) => updateRow(idx, 'to', v)}
                          fetchSuggestions={fetchBranches}
                          onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 2)}
                          data-row={idx}
                          data-col={2}
                          className="w-full h-full p-1.5"
                        />
                      </td>
                      <td className="border border-slate-700 p-0 relative">
                        <input type="text" value={row.grNo} onChange={(e) => updateRow(idx, 'grNo', e.target.value)} onBlur={() => checkGrNo(row.grNo)} data-row={idx} data-col={3} onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 3)} className={`w-full h-full p-1.5 bg-transparent border-0 outline-none focus:bg-[#2388ff]/10 ${dupGrNos.has(row.grNo.trim().toUpperCase()) ? "text-rose-400" : "text-white"}`} />
                        {dupGrNos.has(row.grNo.trim().toUpperCase()) && (
                          <span className="absolute top-full left-0 z-20 mt-0.5 bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">Already exists</span>
                        )}
                      </td>
                      <td className="border border-slate-700 p-0">
                        <TableCellAutocomplete
                          value={row.consignor}
                          onChange={(v) => updateRow(idx, 'consignor', v)}
                          onSelect={(v) => updateRow(idx, 'consignor', v)}
                          fetchSuggestions={fetchParties}
                          onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 4)}
                          data-row={idx}
                          data-col={4}
                          className="w-full h-full p-1.5"
                        />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <TableCellAutocomplete
                          value={row.consignee}
                          onChange={(v) => updateRow(idx, 'consignee', v)}
                          onSelect={(v) => updateRow(idx, 'consignee', v)}
                          fetchSuggestions={fetchParties}
                          onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 5)}
                          data-row={idx}
                          data-col={5}
                          className="w-full h-full p-1.5"
                        />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.noOfPackages} onChange={(e) => updateRow(idx, 'noOfPackages', e.target.value)} data-row={idx} data-col={6} onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 6)} className="w-full h-full p-1.5 bg-transparent border-0 text-white text-center outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <TableCellAutocomplete
                          value={row.contents}
                          onChange={(v) => updateRow(idx, 'contents', v)}
                          onSelect={(v) => updateRow(idx, 'contents', v)}
                          fetchSuggestions={fetchCargo}
                          onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 7)}
                          data-row={idx}
                          data-col={7}
                          className="w-full h-full p-1.5"
                        />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.freight} onChange={(e) => updateRow(idx, 'freight', e.target.value)} data-row={idx} data-col={8} onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 8)} className="w-full h-full p-1.5 bg-transparent border-0 text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0">
                        <input type="text" value={row.deliveryReceiptNo} onChange={(e) => updateRow(idx, 'deliveryReceiptNo', e.target.value)} data-row={idx} data-col={9} onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 9)} className="w-full h-full p-1.5 bg-transparent border-0 text-white outline-none focus:bg-[#2388ff]/10" />
                      </td>
                      <td className="border border-slate-700 p-0 relative">
                        <input type="text" value={row.dateOfDelivery} onChange={(e) => updateRow(idx, 'dateOfDelivery', e.target.value)} data-row={idx} data-col={10} onKeyDown={(e) => handleEntryCellKeyDown(e, idx, 10)} className="w-full h-full p-1.5 bg-transparent border-0 text-white outline-none focus:bg-[#2388ff]/10" />
                        <button
                          onClick={() => deleteRow(idx)}
                          className="del-btn print-hide absolute right-1 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 rounded p-[2px]"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row below table */}
            <div className="flex justify-center mt-4 print-hide">
              <Button
                size="sm"
                onClick={addRow}
                className="h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add Row
              </Button>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
