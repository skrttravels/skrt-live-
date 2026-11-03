"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, IndianRupee, Truck, AlertCircle,
  Loader2, BarChart3, Users, FileText
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
  })
};

const fmt = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
};

const statusColors: Record<string, string> = {
  "Booked": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "In Transit": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Delivered": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Cancelled": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Pending": "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await api.get("/analytics/analysis");
        if (res.success) setData(res.data);
      } catch (err) {
        console.error("Failed to fetch analysis", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpi = data?.kpi || {
    totalRevenue: 0, totalExpenses: 0, netProfit: 0,
    activeShipments: 0
  };

  const kpiCards = [
    {
      title: "Total Revenue",
      value: fmt(kpi.totalRevenue),
      icon: IndianRupee,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      glow: "shadow-emerald-500/20"
    },
    {
      title: "Total Expenses",
      value: fmt(kpi.totalExpenses),
      icon: TrendingDown,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      glow: "shadow-rose-500/20"
    },
    {
      title: "Net Profit",
      value: fmt(kpi.netProfit),
      icon: TrendingUp,
      color: kpi.netProfit >= 0 ? "text-emerald-400" : "text-rose-400",
      bg: kpi.netProfit >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
      glow: kpi.netProfit >= 0 ? "shadow-emerald-500/20" : "shadow-rose-500/20"
    },
    {
      title: "Active Shipments",
      value: String(kpi.activeShipments),
      icon: Truck,
      color: "text-[#2388ff]",
      bg: "bg-[#2388ff]/10",
      glow: "shadow-[#2388ff]/20"
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-[#2388ff]" />
              Business Analysis
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Financial overview, route performance, and client insights.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-[#2388ff]" />
            <p className="text-xs uppercase tracking-wider font-semibold">Loading analysis data...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {kpiCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                  >
                    <Card className={cn(
                      "border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300",
                      `hover:shadow-lg ${card.glow}`
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", card.bg)}>
                            <Icon className={cn("w-4.5 h-4.5", card.color)} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.title}</span>
                        </div>
                        <div className={cn("text-2xl font-black tracking-tight", card.color)}>
                          {card.value}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Revenue vs Expenses Area Chart */}
            <motion.div custom={6} initial="hidden" animate="visible" variants={fadeIn}>
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#2388ff]">Revenue vs Expenses (12 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.revenueExpenseData || []}>
                        <defs>
                          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, ""]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gradRevenue)" strokeWidth={2.5} name="Revenue" />
                        <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#gradExpenses)" strokeWidth={2.5} name="Expenses" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-400">Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-xs text-slate-400">Expenses</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Routes */}
            <motion.div custom={7} initial="hidden" animate="visible" variants={fadeIn}>
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#2388ff]">Top Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.topRoutes || []} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={100} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                          formatter={(value: any, name: any) => [name === "revenue" ? `₹${Number(value).toLocaleString()}` : value, name === "revenue" ? "Revenue" : "Shipments"]}
                        />
                        <Bar dataKey="count" fill="#2388ff" radius={[0, 4, 4, 0]} name="count" />
                        <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Clients */}
            <motion.div custom={9} initial="hidden" animate="visible" variants={fadeIn}>
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#2388ff]">Top Clients by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.topClients || []} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={120} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                          formatter={(value: any, name: any) => [name === "revenue" ? `₹${Number(value).toLocaleString()}` : value, name === "revenue" ? "Revenue" : "Shipments"]}
                        />
                        <Bar dataKey="revenue" fill="#a855f7" radius={[0, 4, 4, 0]} name="revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Shipments Table */}
            <motion.div custom={10} initial="hidden" animate="visible" variants={fadeIn}>
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#2388ff]">Recent Shipments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Mobile card view */}
                  <div className="md:hidden p-3 space-y-2.5">
                    {(data?.recentShipments || []).map((s: any) => (
                      <div key={s._id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[#2388ff] font-bold text-xs">{s.consignmentNumber}</span>
                          <Badge variant="outline" className={cn("text-[10px] font-bold capitalize", statusColors[s.status] || "")}>
                            {s.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-lg font-bold text-white font-mono">₹{(s.totalPayable || 0).toLocaleString()}</span>
                          <span className="text-slate-500 text-xs font-mono">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 text-xs">
                          <div className="truncate"><span className="text-slate-500">Route: </span><span className="text-white">{s.toBranch || "—"}</span></div>
                          <div className="truncate"><span className="text-slate-500">Consignor: </span><span className="text-slate-300">{s.consignor?.name || "—"}</span></div>
                        </div>
                      </div>
                    ))}
                    {(!data?.recentShipments || data.recentShipments.length === 0) && (
                      <div className="px-6 py-10 text-center text-slate-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No recent shipments
                      </div>
                    )}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left text-slate-400 font-bold px-6 py-3 text-xs uppercase tracking-wider">Consignment</th>
                          <th className="text-left text-slate-400 font-bold px-6 py-3 text-xs uppercase tracking-wider">Route</th>
                          <th className="text-left text-slate-400 font-bold px-6 py-3 text-xs uppercase tracking-wider">Consignor</th>
                          <th className="text-right text-slate-400 font-bold px-6 py-3 text-xs uppercase tracking-wider">Amount</th>
                          <th className="text-center text-slate-400 font-bold px-6 py-3 text-xs uppercase tracking-wider">Status</th>
                          <th className="text-right text-slate-400 font-bold px-6 py-3 text-xs uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.recentShipments || []).map((s: any) => (
                          <tr key={s._id} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                            <td className="px-6 py-3 font-mono text-[#2388ff] font-bold text-xs">{s.consignmentNumber}</td>
                            <td className="px-6 py-3 text-white text-xs">{s.toBranch}</td>
                            <td className="px-6 py-3 text-slate-300 text-xs">{s.consignor?.name || "—"}</td>
                            <td className="px-6 py-3 text-right font-bold text-white text-xs font-mono">₹{(s.totalPayable || 0).toLocaleString()}</td>
                            <td className="px-6 py-3 text-center">
                              <Badge variant="outline" className={cn("text-[10px] font-bold capitalize", statusColors[s.status] || "")}>
                                {s.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-3 text-right text-slate-500 text-xs font-mono">
                              {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                        {(!data?.recentShipments || data.recentShipments.length === 0) && (
                          <tr>
                            <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              No recent shipments
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
