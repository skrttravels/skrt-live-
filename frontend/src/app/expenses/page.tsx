"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Fuel, Wrench, CreditCard, Users, Receipt, Plus, Filter, X,
  Download, Search, IndianRupee, ChevronDown, ArrowUpDown, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";

const CATEGORIES = ["Fuel", "Maintenance", "Toll", "Driver Payment", "Other"];

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; gradient: string; lightBg: string }> = {
  Fuel: {
    icon: <Fuel className="w-5 h-5" />,
    gradient: "from-orange-500/20 to-amber-600/10",
    lightBg: "bg-orange-500/10"
  },
  Maintenance: {
    icon: <Wrench className="w-5 h-5" />,
    gradient: "from-blue-500/20 to-cyan-600/10",
    lightBg: "bg-blue-500/10"
  },
  Toll: {
    icon: <CreditCard className="w-5 h-5" />,
    gradient: "from-violet-500/20 to-purple-600/10",
    lightBg: "bg-violet-500/10"
  },
  "Driver Payment": {
    icon: <Users className="w-5 h-5" />,
    gradient: "from-emerald-500/20 to-green-600/10",
    lightBg: "bg-emerald-500/10"
  },
  Other: {
    icon: <Receipt className="w-5 h-5" />,
    gradient: "from-slate-500/20 to-gray-600/10",
    lightBg: "bg-slate-500/10"
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 24, delay: i * 0.05 }
  })
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.03, type: "spring" as const, stiffness: 300, damping: 28 }
  })
};

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

export default function ExpensesPage() {
  const { can } = useAuth();
  const [expenseList, setExpenseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [detailExpense, setDetailExpense] = useState<any>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategories.length > 0) params.set("category", selectedCategories.join(","));
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedVehicle && selectedVehicle !== "all") params.set("vehicle", selectedVehicle);
      if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
      if (debouncedSearchQuery.trim()) params.set("search", debouncedSearchQuery.trim());

      const qs = params.toString();
      const { data } = await api.get(`/expenses${qs ? `?${qs}` : ""}`);
      if (data.success) {
        setExpenseList(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategories, startDate, endDate, selectedVehicle, selectedStatus, debouncedSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const fetchVehicles = async () => {
    try {
      const { data } = await api.get("/vehicles");
      if (data.success) setVehicles(data.data);
    } catch { /* ignore */ }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setStartDate("");
    setEndDate("");
    setSelectedVehicle("all");
    setSelectedStatus("all");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedCategories.length > 0 || startDate || endDate || selectedVehicle !== "all" || selectedStatus !== "all" || searchQuery.trim();

  const stats = useMemo(() => {
    const map: Record<string, number> = {};
    expenseList.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    const categories = CATEGORIES.map(cat => ({
      category: cat,
      total: map[cat] || 0,
      count: expenseList.filter(e => e.category === cat).length
    }));
    const grandTotal = categories.reduce((s, c) => s + c.total, 0);
    return { categories, grandTotal };
  }, [expenseList]);

  return (
    <DashboardLayout>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-loading {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Expense Tracking</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor and manage all operational expenses
              {hasActiveFilters && (
                <span className="text-primary ml-2">
                  · {expenseList.length} result{expenseList.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </Button>
            {can('expenses', 'create') && <AddExpenseDialog onExpenseAdded={fetchExpenses} />}
          </div>
        </motion.div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-secondary/20 border border-border/50 rounded-xl p-5 space-y-4">
                {/* Category chips */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Category
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => {
                      const active = selectedCategories.includes(cat);
                      const cfg = CATEGORY_CONFIG[cat];
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                            active
                              ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                              : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
                          )}
                        >
                          {cfg.icon}
                          {cat}
                          {active && <X className="w-3 h-3 ml-0.5" onClick={(e) => { e.stopPropagation(); toggleCategory(cat); }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date range + Vehicle + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">From</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full h-9 pl-8 pr-3 rounded-lg bg-secondary/30 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">To</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full h-9 pl-8 pr-3 rounded-lg bg-secondary/30 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Vehicle</Label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Vehicles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vehicles</SelectItem>
                        {vehicles.map(v => (
                          <SelectItem key={v._id} value={v._id}>{v.vehicleNo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search + clear */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search description..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 rounded-lg bg-secondary/30 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground shrink-0">
                      <X className="w-3.5 h-3.5 mr-1" /> Clear
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          {/* Total Card */}
          <motion.div custom={0} variants={cardVariants} className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative rounded-2xl border border-primary/20 p-4 backdrop-blur-sm bg-background/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                  <IndianRupee className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-foreground tabular-nums">
                ₹<AnimatedNumber value={stats.grandTotal} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {expenseList.length} expense{expenseList.length !== 1 ? "s" : ""}
              </p>
            </div>
          </motion.div>

          {/* Category Cards */}
          {stats.categories.map((cat, i) => {
            const cfg = CATEGORY_CONFIG[cat.category];
            const pct = stats.grandTotal > 0 ? (cat.total / stats.grandTotal * 100) : 0;
            return (
              <motion.div key={cat.category} custom={i + 1} variants={cardVariants} className="relative group">
                <div className={cn(
                  "absolute inset-0 rounded-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-300",
                  `bg-gradient-to-br ${cfg.gradient}`
                )} />
                <div className="relative rounded-2xl border border-border/50 p-4 backdrop-blur-sm bg-background/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.category}</span>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", cfg.lightBg)}>
                      {cfg.icon}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    ₹<AnimatedNumber value={cat.total} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">{cat.count} entry{cat.count !== 1 ? "ies" : "y"}</p>
                    <span className="text-[10px] font-semibold text-muted-foreground/70">{pct.toFixed(0)}%</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-2 h-1 rounded-full bg-secondary/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        cat.category === "Fuel" && "bg-orange-500",
                        cat.category === "Maintenance" && "bg-blue-500",
                        cat.category === "Toll" && "bg-violet-500",
                        cat.category === "Driver Payment" && "bg-emerald-500",
                        cat.category === "Other" && "bg-slate-500"
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Expense Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="border border-border/50 rounded-xl overflow-hidden bg-secondary/5"
        >
          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Expense Records</span>
              <Badge variant="secondary" className="ml-1 text-[10px] font-mono">{expenseList.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {}}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden px-3 py-2 space-y-2.5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg shimmer-loading" />
              ))
            ) : expenseList.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-base font-medium text-muted-foreground">No expenses found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {hasActiveFilters ? "Try adjusting your filters." : "Add your first expense to get started."}
                </p>
              </div>
            ) : (
              expenseList.map((expense, i) => {
                const cfg = CATEGORY_CONFIG[expense.category];
                return (
                  <div
                    key={expense._id}
                    onClick={() => setDetailExpense(expense)}
                    className="rounded-lg border border-border/40 bg-secondary/10 p-3 active:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0", cfg?.lightBg || "bg-slate-500/10")}>
                          {cfg?.icon || <Receipt className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{expense.category}</span>
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ml-2",
                        expense.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      )}>
                        {expense.status || "paid"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg font-bold text-foreground tabular-nums">₹{expense.amount.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 text-xs">
                      <div className="truncate"><span className="text-muted-foreground">Vehicle: </span><span className="font-mono text-foreground/80">{expense.vehicle?.vehicleNo || "—"}</span></div>
                      <div className="truncate"><span className="text-muted-foreground">Desc: </span><span className="text-foreground/80">{expense.description || "—"}</span></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Table body (desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3 w-[40px]">#</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 hidden md:table-cell">Description</th>
                  <th className="px-5 py-3 text-center w-[80px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="h-10 rounded-lg shimmer-loading" />
                      </td>
                    </tr>
                  ))
                ) : expenseList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-base font-medium text-muted-foreground">No expenses found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {hasActiveFilters ? "Try adjusting your filters." : "Add your first expense to get started."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {expenseList.map((expense, i) => {
                      const cfg = CATEGORY_CONFIG[expense.category];
                      return (
                        <motion.tr
                          key={expense._id}
                          custom={i}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
                          layout
                          className="group border-b border-border/20 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-xs text-muted-foreground/50 font-mono">{i + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs", cfg?.lightBg || "bg-slate-500/10")}>
                                {cfg?.icon || <Receipt className="w-3.5 h-3.5" />}
                              </div>
                              <span
                                className="text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setDetailExpense(expense)}
                              >
                                {expense.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-muted-foreground font-mono">
                              {expense.vehicle?.vehicleNo || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="text-base font-bold text-foreground tabular-nums">
                              ₹{expense.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className="text-sm text-muted-foreground/80 max-w-[200px] truncate block" title={expense.description}>
                              {expense.description || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                              expense.status === "paid"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            )}>
                              {expense.status || "paid"}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {expenseList.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 text-xs text-muted-foreground">
              <span>{expenseList.length} record{expenseList.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold tabular-nums">
                Total: ₹{expenseList.reduce((s, e) => s + e.amount, 0).toLocaleString()}
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail Dialog for Other category */}
      <Dialog open={!!detailExpense} onOpenChange={(o) => { if (!o) setDetailExpense(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {detailExpense && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Category</span>
                <p className="font-medium">{detailExpense.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Amount</span>
                <p className="font-bold text-lg">₹{detailExpense.amount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Description</span>
                <p className="text-muted-foreground">{detailExpense.description || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Date</span>
                <p>{new Date(detailExpense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
              {detailExpense.vehicle && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Vehicle</span>
                  <p>{detailExpense.vehicle.vehicleNo}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Status</span>
                <p className={detailExpense.status === "paid" ? "text-emerald-400" : "text-amber-400"}>{detailExpense.status}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
