"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Printer, Receipt, RefreshCw, Search } from "lucide-react";
import api from "@/lib/api";
import { fetchCashMemoTemplate, fillCashMemoTemplate } from "@/lib/cash-memo-template";
import { toast } from "sonner";

type CashMemo = {
  _id: string;
  drNo: string;
  grNo?: string;
  date?: string;
  receivedOn?: string;
  from?: string;
  consignee?: string;
  through?: string;
  freight?: number;
  freightPaise?: number;
  labour?: number;
  labourPaise?: number;
  stationery?: number;
  stationeryPaise?: number;
  commission?: number;
  commissionPaise?: number;
  aoc?: number;
  aocPaise?: number;
  totalAmount?: number;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
};

const amountPart = (value?: number) => (value ? String(value) : "");
const paisePart = (value?: number) => (value ? String(value).padStart(2, "0") : "");

export default function CashMemosPage() {
  const [memos, setMemos] = useState<CashMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchMemos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/cash-memo");
      if (data.success) setMemos(data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load cash memos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  const filteredMemos = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return memos;
    return memos.filter((memo) =>
      [memo.drNo, memo.grNo, memo.consignee, memo.from, memo.receivedOn]
        .some((value) => String(value || "").toLowerCase().includes(search))
    );
  }, [memos, query]);

  const handleReprint = async (memo: CashMemo) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Allow pop-ups to print a cash memo copy");
      return;
    }

    setPrintingId(memo._id);
    try {
      const template = await fetchCashMemoTemplate();
      const total = Number(memo.totalAmount) || 0;
      const whole = Math.floor(total);
      const paise = String(Math.round((total - whole) * 100)).padStart(2, "0");
      const memoDate = memo.date ? new Date(memo.date).toISOString().split("T")[0] : "";
      const [year, month, day] = memoDate.split("-");
      const html = fillCashMemoTemplate(template, {
        drNo: memo.drNo,
        grNo: memo.grNo,
        date: year && month && day ? `${day}/${month}/${year}` : "",
        receivedOn: memo.receivedOn,
        from: memo.from,
        consignee: memo.consignee,
        through: memo.through,
        freight: amountPart(memo.freight),
        freightP: paisePart(memo.freightPaise),
        labour: amountPart(memo.labour),
        labourP: paisePart(memo.labourPaise),
        stationery: amountPart(memo.stationery),
        stationeryP: paisePart(memo.stationeryPaise),
        commission: amountPart(memo.commission),
        commissionP: paisePart(memo.commissionPaise),
        aoc: amountPart(memo.aoc),
        aocP: paisePart(memo.aocPaise),
        total: String(whole),
        totalP: paise,
      });
      printWindow.onload = () => printWindow.print();
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    } catch {
      printWindow.close();
      toast.error("Failed to prepare cash memo for printing");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 py-4 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <Receipt className="h-7 w-7 text-primary" /> Cash Memos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Find previously created memos and print a replacement copy.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchMemos} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button asChild>
              <Link href="/cash-memo"><Plus className="mr-2 h-4 w-4" /> Create Cash Memo</Link>
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search D.R. No., G.R. No., or consignee..."
            className="pl-9"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>D.R. No.</TableHead>
                  <TableHead>G.R. No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Consignee</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                ) : filteredMemos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{memos.length ? "No cash memos match your search." : "No cash memos have been created yet."}</TableCell></TableRow>
                ) : filteredMemos.map((memo) => (
                  <TableRow key={memo._id}>
                    <TableCell className="font-mono font-semibold text-primary">{memo.drNo || "—"}</TableCell>
                    <TableCell className="font-mono">{memo.grNo || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(memo.date)}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{memo.consignee || "—"}</TableCell>
                    <TableCell>{memo.from || "—"}</TableCell>
                    <TableCell className="text-right font-medium">₹{(Number(memo.totalAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleReprint(memo)} disabled={printingId === memo._id}>
                        {printingId === memo._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Print copy
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
