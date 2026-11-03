"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, PlusSquare, Loader2, ChevronLeft, ChevronRight, Search, Download, Trash2 } from "lucide-react";
import { useHeader } from "@/context/HeaderContext";
import { ViewEditEntryDialog } from "@/components/entry/ViewEditEntryDialog";

import { toast } from "sonner";
import api from "@/lib/api";

const PER_PAGE = 30;

export default function InventoryPage() {
  const router = useRouter();
  const { searchQuery } = useHeader();
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const query = (localSearch || searchQuery).trim();

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/entry/inventory", {
        params: { page, limit: PER_PAGE, ...(query ? { q: query } : {}) }
      });
      if (data.success) {
        setAllEntries(data.data);
        setTotalCount(data.count);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch entry registers", err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  const [highlightVal, setHighlightVal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (registerId: string, entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      setDeleting(entryId);
      await api.delete(`/entry/${registerId}/entries/${entryId}`);
      toast.success("Entry deleted successfully");
      fetchEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete entry");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchEntries, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchEntries, query]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const highlightParam = params.get("highlight");
      if (highlightParam) {
        setHighlightVal(highlightParam);
      } else {
        setHighlightVal(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!highlightVal) return;
    let cancelled = false;
    api.get("/entry/inventory", { params: { all: true } }).then(({ data }) => {
      if (cancelled || !data.success) return;
      const rows = data.data;
      const index = rows.findIndex((entry: any) =>
        entry.grNo === highlightVal || entry.deliveryReceiptNo === highlightVal || entry.sno === highlightVal
      );
      if (index >= 0) setPage(Math.floor(index / PER_PAGE) + 1);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [highlightVal]);

  useEffect(() => {
    if (!highlightVal || !allEntries.some(entry =>
      entry.grNo === highlightVal || entry.deliveryReceiptNo === highlightVal || entry.sno === highlightVal
    )) return;
    const timer = setTimeout(() => {
      const elementId = `row-inventory-${highlightVal}`;
      const el = document.getElementById(elementId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("animate-row-blink");
      setTimeout(() => el.classList.remove("animate-row-blink"), 3000);
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightVal, allEntries]);

  const currentPage = Math.min(page, totalPages);
  const paginated = allEntries;

  useEffect(() => { setPage(1); }, [query]);

  const exportCSV = () => {
    const headers = ["S.No.", "From", "To", "G. R. No.", "Consignor", "Consignee", "No. of Packages", "Contents", "Freight", "Delivery Receipt No.", "Date of Delivery", "Delivery Status"];
    api.get("/entry/inventory", { params: { q: query, all: true } }).then(({ data }) => {
    const rows = data.data.map((entry: any) => [
      entry.sno || "",
      entry.from || "",
      entry.to || "",
      entry.grNo || "",
      entry.consignor || "",
      entry.consignee || "",
      entry.noOfPackages || "",
      entry.contents || "",
      entry.freight || "",
      entry.deliveryReceiptNo || "",
      entry.dateOfDelivery || "",
      entry.deliveryStatus || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inventory data exported successfully");
    }).catch(() => toast.error("Failed to export inventory data"));
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
      `}</style>
      <div className="space-y-6 h-full max-w-full">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Inventory</h2>
            <p className="text-muted-foreground">All delivery register records</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={() => router.push("/cash-memo")}
              className="h-9 px-4 rounded-lg bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700 font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" /> Cash Memo
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/entry")}
              className="h-9 px-4 rounded-lg bg-slate-800 text-slate-200 hover:bg-violet-600 hover:text-white border border-slate-700 font-medium transition-all duration-200 flex items-center gap-2"
            >
              <PlusSquare className="h-4 w-4" /> Entry
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/summary")}
              className="h-9 px-4 rounded-lg bg-slate-800 text-slate-200 hover:bg-emerald-600 hover:text-white border border-slate-700 font-medium transition-all duration-200 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Summary
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/delivery-statement")}
              className="h-9 px-4 rounded-lg bg-slate-800 text-slate-200 hover:bg-cyan-600 hover:text-white border border-slate-700 font-medium transition-all duration-200 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Delivery Statement
            </Button>
            <Button
              size="sm"
              onClick={exportCSV}
              className="h-9 px-4 rounded-lg bg-emerald-800 text-emerald-200 hover:bg-emerald-600 hover:text-white border border-emerald-700 font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </div>

        {/* Search by S.No, G.R. No., Delivery Receipt No. */}
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => { setLocalSearch(e.target.value); setPage(1); }}
              placeholder="Search by S.No, G.R. No, Delivery Receipt No..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-[#2388ff] transition-colors"
            />
          </div>
          {localSearch && (
            <button onClick={() => setLocalSearch("")} className="h-9 px-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors text-xs font-medium">
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading entries...
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {localSearch || searchQuery ? "No matching entries found." : "No entries found."}
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[1450px] rounded-xl border border-slate-800 bg-[#0b1220] shadow-xl p-4 md:p-8 relative overflow-hidden">
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {paginated.map((entry: any, idx: number) => (
                  <div
                    key={entry._id || idx}
                    id={
                      entry.grNo === highlightVal
                        ? `row-inventory-${entry.grNo}`
                        : entry.deliveryReceiptNo === highlightVal
                        ? `row-inventory-${entry.deliveryReceiptNo}`
                        : entry.sno === highlightVal
                        ? `row-inventory-${entry.sno}`
                        : undefined
                    }
                    onClick={() => { setSelectedEntry(entry); setDialogOpen(true); }}
                    className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 active:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-slate-400">#{entry.sno}</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entry.deliveryStatus === "Complete"
                            ? "bg-emerald-900/50 text-emerald-400"
                            : "bg-amber-900/50 text-amber-400"
                          }`}>
                          {entry.deliveryStatus}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry._registerId, entry._id); }}
                          disabled={deleting === entry._id}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white font-semibold mb-2">
                      <span className="truncate">{entry.from}</span>
                      <span className="text-slate-500">&rarr;</span>
                      <span className="truncate">{entry.to}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div><span className="text-slate-500">G.R. No.: </span><span className="font-mono text-white">{entry.grNo}</span></div>
                      <div><span className="text-slate-500">Packages: </span><span className="text-white">{entry.noOfPackages}</span></div>
                      <div className="truncate"><span className="text-slate-500">Consignor: </span><span className="text-white">{entry.consignor}</span></div>
                      <div className="truncate"><span className="text-slate-500">Consignee: </span><span className="text-white">{entry.consignee}</span></div>
                      <div className="truncate"><span className="text-slate-500">Contents: </span><span className="text-white">{entry.contents}</span></div>
                      <div><span className="text-slate-500">Freight: </span><span className="font-mono text-white">{entry.freight}</span></div>
                      <div className="truncate"><span className="text-slate-500">Del. Receipt: </span><span className="font-mono text-white">{entry.deliveryReceiptNo}</span></div>
                      <div><span className="text-slate-500">Del. Date: </span><span className="text-white">{entry.dateOfDelivery}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto border border-slate-700 rounded-md bg-slate-900/40">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 border-b-2 border-[#2388ff]/60">
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[4%]">S.No.</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[6%]">From</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[6%]">To</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[7%]">G. R. No.</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Consignor</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Consignee</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[7%]">No. of<br />Packages</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Contents</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[6%]">Freight</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Delivery Receipt No.</th>
                      <th className="border-r border-slate-700 text-[#2388ff] uppercase font-bold p-2 w-[10%]">Date of Delivery</th>
                      <th className="text-[#2388ff] uppercase font-bold p-2 w-[8%]">Delivery Status</th>
                      <th className="text-[#2388ff] uppercase font-bold p-2 w-[4%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((entry: any, idx: number) => (
                      <tr
                        key={entry._id || idx}
                        id={
                          entry.grNo === highlightVal
                            ? `row-inventory-${entry.grNo}`
                            : entry.deliveryReceiptNo === highlightVal
                            ? `row-inventory-${entry.deliveryReceiptNo}`
                            : entry.sno === highlightVal
                            ? `row-inventory-${entry.sno}`
                            : undefined
                        }
                        onClick={() => { setSelectedEntry(entry); setDialogOpen(true); }}
                        className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-900/40'}`}
                      >
                        <td className="border border-slate-700 text-center font-mono text-slate-400 bg-slate-900/50 p-1.5">
                          {entry.sno}
                        </td>
                        <td className="border border-slate-700 p-1.5 text-white">{entry.from}</td>
                        <td className="border border-slate-700 p-1.5 text-white">{entry.to}</td>
                        <td className="border border-slate-700 p-1.5 font-mono text-white">{entry.grNo}</td>
                        <td className="border border-slate-700 p-1.5 text-white max-w-[120px] truncate" title={entry.consignor}>{entry.consignor}</td>
                        <td className="border border-slate-700 p-1.5 text-white max-w-[120px] truncate" title={entry.consignee}>{entry.consignee}</td>
                        <td className="border border-slate-700 p-1.5 text-white text-center">{entry.noOfPackages}</td>
                        <td className="border border-slate-700 p-1.5 text-white max-w-[120px] truncate" title={entry.contents}>{entry.contents}</td>
                        <td className="border border-slate-700 p-1.5 font-mono text-white text-right">{entry.freight}</td>
                        <td className="border border-slate-700 p-1.5 font-mono text-white">{entry.deliveryReceiptNo}</td>
                        <td className="border border-slate-700 p-1.5 text-white">{entry.dateOfDelivery}</td>
                        <td className="border border-slate-700 p-1.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entry.deliveryStatus === "Complete"
                              ? "bg-emerald-900/50 text-emerald-400"
                              : "bg-amber-900/50 text-amber-400"
                            }`}>
                            {entry.deliveryStatus}
                          </span>
                        </td>
                        <td className="border border-slate-700 p-1.5 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry._registerId, entry._id); }}
                            disabled={deleting === entry._id}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
                  <span>{totalCount} total entries</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="h-7 px-2 text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-mono">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="h-7 px-2 text-slate-400 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ViewEditEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={selectedEntry}
        onEntryUpdated={fetchEntries}
      />
    </DashboardLayout>
  );
}
