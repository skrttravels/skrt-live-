"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MapPin,
  Truck,
  Navigation,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Phone,
  Package,
  Box,
  Scale,
  IndianRupee,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Download,
  AlertCircle,
  WifiOff,
  PauseCircle,
  Check,
  Plus,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

// Mapping for status badge colors
const statusColors: any = {
  'active': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'in-transit': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'idle': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'offline': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Loaded': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'Dispatched': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'In Transit': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  'Arrived at Branch': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  'Out for Delivery': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  'Delivered': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Cancelled': 'bg-red-500/10 text-red-500 border-red-500/20',
};

// Premium dark map SVG component
const RouteMapPreview = ({ origin, destination, isDelivered }: { origin: string, destination: string, isDelivered: boolean }) => {
  return (
    <div className="relative w-full h-full min-h-[220px] bg-[#0b1329]/90 rounded-2xl overflow-hidden border border-border/50 shadow-inner flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative w-full max-w-md h-36 flex items-center justify-between px-8">
        <div className="flex flex-col items-center relative z-10">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-xs font-semibold bg-background/80 px-2 py-1 rounded border border-border/60 shadow text-emerald-400 whitespace-nowrap">
            {origin}
          </span>
        </div>

        <div className="flex-1 relative mx-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <svg width="100%" height="40" className="overflow-visible">
              <path
                d="M 0 20 Q 50% -20 100% 20"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray="6 6"
                className={isDelivered ? "" : "animate-[dash_3s_linear_infinite]"}
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-col items-center relative z-10">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-2">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-xs font-semibold bg-background/80 px-2 py-1 rounded border border-border/60 shadow text-blue-400 whitespace-nowrap">
            {destination}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function LiveTrackingPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ name: "", vehicleNumber: "", phone: "" });
  const [savingDriver, setSavingDriver] = useState(false);

  const fetchLock = React.useRef(false);
  const socketRef = useRef<Socket | null>(null);

  // Socket.io real-time connection
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Live tracking connected");
    });

    socket.on("tracking_updated", () => {
      fetchTrackingData(true);
    });

    socket.on("disconnect", () => {
      console.log("Live tracking disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchTrackingData = useCallback(async (isSilent = false) => {
    if (fetchLock.current) return;
    if (!isSilent) setLoading(true);
    fetchLock.current = true;
    try {
      const { data } = await api.get('/tracking');
      if (data.success) {
        setVehicles(data.data);
        if (data.data.length > 0 && !selectedVehicle) {
          setSelectedVehicle(data.data[0]);
        } else if (selectedVehicle) {
          // Keep selection synced
          const updated = data.data.find((v: any) => v._id === selectedVehicle._id);
          // Only update if actually different to prevent unnecessary re-renders
          if (updated && JSON.stringify(updated) !== JSON.stringify(selectedVehicle)) {
            setSelectedVehicle(updated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch tracking data', error);
      // Only toast on manual refresh
      if (!isSilent) toast.error("Failed to refresh tracking data");
    } finally {
      if (!isSilent) setLoading(false);
      fetchLock.current = false;
    }
  }, [selectedVehicle]);

  useEffect(() => {
    fetchTrackingData();
    const interval = setInterval(() => fetchTrackingData(true), 10000);
    return () => clearInterval(interval);
  }, []); // Only run once on mount

  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      active: vehicles.filter(v => v.status === 'active').length,
      idle: vehicles.filter(v => v.status === 'idle').length,
      offline: vehicles.filter(v => v.status === 'offline').length
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.consignmentNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' ||
        v.status.toLowerCase() === statusFilter.toLowerCase() ||
        v.statusLabel.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const exportCSV = () => {
    const headers = ["Consignment No", "Vehicle No", "Status", "From", "To", "Driver", "Total Freight"];
    const rows = filteredVehicles.map(v => [
      v.consignmentNumber,
      v.vehicleNumber,
      v.statusLabel,
      v.shipment.origin,
      v.shipment.destination,
      v.driverName,
      v.shipment.value
    ]);

    const csvContent = "data:text/csv;charset=utf-8," +
      [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tracking_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported successfully");
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDriver(true);
    try {
      await api.post("/drivers/entry", driverForm);
      toast.success("Driver added successfully!");
      setShowDriverForm(false);
      setDriverForm({ name: "", vehicleNumber: "", phone: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add driver");
    } finally {
      setSavingDriver(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1700px] mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Header Stats */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <Card className="p-4 bg-card/40 border-border/40 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Total Vehicles</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
            </Card>

            <Card className="p-4 bg-card/40 border-border/40 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Active Vehicles</p>
                <h3 className="text-2xl font-bold text-emerald-500">{stats.active}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Navigation className="w-5 h-5" />
              </div>
            </Card>

            <Card className="p-4 bg-card/40 border-border/40 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Idle Vehicles</p>
                <h3 className="text-2xl font-bold text-amber-500">{stats.idle}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <PauseCircle className="w-5 h-5" />
              </div>
            </Card>


          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto relative">
            <div className="flex items-center gap-2 px-3 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-card/40 border-border/40 gap-2 h-11 px-4 text-xs font-semibold"
              onClick={() => fetchTrackingData()}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 px-6 text-xs font-bold shadow-lg shadow-primary/20"
              onClick={exportCSV}
            >
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card/40 border-border/40 gap-2 h-11 px-4 text-xs font-semibold relative"
              onClick={() => setShowDriverForm(!showDriverForm)}
            >
              <Plus className="w-4 h-4" />
              Add Driver
            </Button>

            {showDriverForm && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDriverForm(false)} />
                <div className="absolute top-full right-0 mt-2 z-50 w-80 bg-card border border-border/50 rounded-xl shadow-2xl p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm">Add Driver</h4>
                    <button onClick={() => setShowDriverForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleAddDriver} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Driver Name</label>
                      <Input
                        required
                        placeholder="Enter driver name"
                        value={driverForm.name}
                        onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                        className="bg-background/40 border-border/40 h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Number</label>
                      <Input
                        required
                        placeholder="Enter vehicle number"
                        value={driverForm.vehicleNumber}
                        onChange={(e) => setDriverForm({ ...driverForm, vehicleNumber: e.target.value })}
                        className="bg-background/40 border-border/40 h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                      <Input
                        required
                        placeholder="Enter phone number"
                        value={driverForm.phone}
                        onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                        className="bg-background/40 border-border/40 h-10 text-sm"
                      />
                    </div>
                    <Button type="submit" size="sm" className="w-full h-10 text-xs font-bold" disabled={savingDriver}>
                      {savingDriver ? "Saving..." : "Save Driver"}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Browser Like Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-0 md:min-h-[800px]">

          {/* SEARCH & LIST */}
          <Card className="lg:col-span-4 p-5 bg-card/60 backdrop-blur-xl border-border/50 h-[500px] md:h-[800px] flex flex-col gap-5 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by vehicle number..."
                className="pl-9 bg-background/40 border-border/40 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border/60">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-secondary/20 animate-pulse border border-border/20" />
                ))
              ) : filteredVehicles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4 opacity-60">
                  <AlertCircle className="w-12 h-12" />
                  <div className="space-y-1">
                    <p className="font-bold">No vehicles found</p>
                    <p className="text-xs">Create shipment with Vehicle Number and Outgoing Status to start tracking.</p>
                  </div>
                </div>
              ) : (
                filteredVehicles.map((v) => {
                  const isSelected = selectedVehicle?._id === v._id;
                  return (
                    <motion.div
                      key={v._id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedVehicle(v)}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer relative group",
                        isSelected
                          ? "bg-primary/10 border-primary shadow-md"
                          : "bg-secondary/10 border-border/40 hover:border-border/80"
                      )}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-card border border-border/40"
                          )}>
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm tracking-tight">{v.vehicleNumber}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">SHP: {v.consignmentNumber}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-[10px] font-bold h-6 border uppercase", statusColors[v.statusLabel] || statusColors[v.status])}>
                          {v.statusLabel}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3 h-3" /> {v.driverName}
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3 h-3" /> {v.driverPhone}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-3 border-t border-border/30">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          <span className="truncate max-w-[150px]">{v.currentLocation.address}</span>
                        </div>
                        <span className="text-muted-foreground/60">{new Date(v.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </Card>

          {/* VEHICLE DETAILS PANEL */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedVehicle ? (
              <Card className="h-[800px] flex flex-col items-center justify-center text-muted-foreground p-10 bg-card/40 border-dashed border-2 border-border/60">
                <Box className="w-16 h-16 opacity-30 mb-4" />
                <p className="font-semibold text-lg">Select a vehicle to see detailed tracking</p>
              </Card>
            ) : (
              <>
                {/* Header & Map Row */}
                <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/50 shadow-xl overflow-hidden">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                          <Truck className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter">{selectedVehicle.vehicleNumber}</h2>
                            <Badge className={cn("text-xs font-bold px-3 py-1 border uppercase", statusColors[selectedVehicle.statusLabel] || statusColors[selectedVehicle.status])}>
                              {selectedVehicle.statusLabel}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {selectedVehicle.driverName} • {selectedVehicle.driverPhone}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-2">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Shipment / LR No</p>
                          <p className="text-sm font-bold">{selectedVehicle.consignmentNumber}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">From</p>
                          <p className="text-sm font-bold">{selectedVehicle.shipment.origin}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">To</p>
                          <p className="text-sm font-bold">{selectedVehicle.shipment.destination}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Vehicle Type</p>
                          <p className="text-sm font-bold">{selectedVehicle.type}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Current Location</p>
                          <p className="text-sm font-bold text-emerald-400">{selectedVehicle.currentLocation.address}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Last Updated</p>
                          <div className="flex items-center gap-1.5 text-sm font-bold">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {new Date(selectedVehicle.lastUpdate).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-[240px] xl:h-auto overflow-hidden rounded-xl">
                      <RouteMapPreview
                        origin={selectedVehicle.shipment.origin}
                        destination={selectedVehicle.shipment.destination}
                        isDelivered={selectedVehicle.statusLabel === 'Delivered'}
                      />
                    </div>
                  </div>
                </Card>

                {/* Timeline Section */}
                <Card className="p-8 bg-card/60 backdrop-blur-xl border-border/50 shadow-xl">
                  <div className="flex justify-between items-center mb-10 pb-4 border-b border-border/30">
                    <h3 className="text-xl font-bold tracking-tight uppercase">Tracking Timeline</h3>
                    <Badge variant="outline" className="text-xs font-bold text-primary bg-primary/10 border-primary/20">
                      Current Status: {selectedVehicle.statusLabel}
                    </Badge>
                  </div>

                  <div className="relative pl-12 space-y-10">
                    <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-border/40" />

                    {selectedVehicle.trackingHistory.map((step: any, index: number) => {
                      const isCompleted = step.status === 'completed';
                      const isActive = step.status === 'active';
                      return (
                        <div key={index} className="relative group">
                          <div className={cn(
                            "absolute -left-[54px] w-12 h-12 rounded-full border-2 bg-background z-10 flex items-center justify-center transition-all duration-500 shadow-xl",
                            isCompleted ? "border-emerald-500 bg-emerald-500/10 scale-110" : "border-primary bg-primary/20 scale-125 ring-8 ring-primary/10"
                          )}>
                            {isCompleted ? <Check className="w-6 h-6 text-emerald-500" /> : <Navigation className="w-6 h-6 text-primary animate-pulse" />}
                          </div>
                          <div className="flex justify-between items-center bg-secondary/5 group-hover:bg-secondary/10 p-4 rounded-2xl transition-colors border border-transparent group-hover:border-border/30">
                            <div>
                              <h4 className={cn("font-bold text-base", isCompleted ? "text-emerald-400" : "text-primary")}>
                                {step.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">{step.location}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">{step.time}</p>
                              <Badge variant="outline" className={cn("text-[10px] px-2 h-5 flex-shrink-0 font-bold", isCompleted ? "border-emerald-500/30 text-emerald-500" : "border-primary/30 text-primary")}>
                                {step.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Cargo Summary Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card className="p-4 bg-card/60 border-border/40 text-center hover:bg-card/80 transition-colors">
                    <Box className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Cargo Type</p>
                    <p className="text-xs font-bold mt-1 text-foreground">{selectedVehicle.shipment.cargoType}</p>
                  </Card>
                  <Card className="p-4 bg-card/60 border-border/40 text-center hover:bg-card/80 transition-colors">
                    <Package className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Packages</p>
                    <p className="text-xs font-bold mt-1 text-foreground">{selectedVehicle.shipment.packages}</p>
                  </Card>
                  <Card className="p-4 bg-card/60 border-border/40 text-center hover:bg-card/80 transition-colors">
                    <Scale className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Weight</p>
                    <p className="text-xs font-bold mt-1 text-foreground">{selectedVehicle.shipment.weight}</p>
                  </Card>
                  <Card className="p-4 bg-card/60 border-border/40 text-center hover:bg-card/80 transition-colors">
                    <IndianRupee className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Value</p>
                    <p className="text-xs font-bold mt-1 text-foreground text-emerald-400">{selectedVehicle.shipment.value}</p>
                  </Card>
                  <Card className="p-4 bg-card/60 border-border/40 text-center hover:bg-card/80 transition-colors">
                    <FileText className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Challan No</p>
                    <p className="text-xs font-bold mt-1 text-foreground">{selectedVehicle.shipment.challanNo}</p>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
