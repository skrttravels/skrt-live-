"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { UserCircle, Search, X, Loader2, MessageSquare, Menu } from "lucide-react";
import { WhatsAppQRDialog } from "@/components/whatsapp/WhatsAppQRDialog";
import { useAuth } from "@/context/AuthContext";
import { HeaderProvider, useHeader } from "@/context/HeaderContext";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

// ── Search field hints shown before user types ────────────────────────────
const SEARCH_HINTS = [
  {
    emoji: "📦",
    label: "Inventory",
    color: "text-[#2388ff]",
    badgeColor: "bg-[#2388ff]/10 text-[#2388ff] border-[#2388ff]/20",
    fields: ["S.No.", "G.R. No.", "Delivery Receipt No."],
  },
  {
    emoji: "🚚",
    label: "Shipments",
    color: "text-emerald-400",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    fields: ["Consignment No.", "Vehicle", "Consignor", "Consignee"],
  },
  {
    emoji: "📋",
    label: "Challan Records",
    color: "text-blue-400",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    fields: ["Challan No.", "G.R. No.", "Driver"],
  },
  {
    emoji: "💰",
    label: "Cash Memo Records",
    color: "text-amber-400",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    fields: ["D.R. No.", "G.R. No."],
  },
  {
    emoji: "📄",
    label: "Summary",
    color: "text-violet-400",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    fields: ["No.", "Challan No.", "Driver"],
  },
  {
    emoji: "🚛",
    label: "Delivery Statement",
    color: "text-rose-400",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    fields: ["Page No.", "S.No.", "D.R. No."],
  },
];

function DashboardHeader({ setWaQRDialogOpen, sidebarOpen, setSidebarOpen }: { setWaQRDialogOpen: (v: boolean) => void; sidebarOpen: boolean; setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void }) {
  const { user } = useAuth();
  const { headerCenter, searchQuery, setSearchQuery } = useHeader();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchInput.trim().length >= 2) {
        setIsSearching(true);
        setShowDropdown(true);
        try {
          const { data } = await api.get(`/search?q=${encodeURIComponent(searchInput)}`);
          if (data.success) {
            setSearchResults(data.data);
          }
        } catch {
          setSearchResults(null);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null);
        // Keep dropdown open (showing hints) if still focused
        if (searchInput.trim().length === 0) {
          setShowDropdown(isFocused);
        }
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, isFocused]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setShowDropdown(false);
    setIsFocused(false);
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchQuery("");
    setSearchResults(null);
    setShowDropdown(false);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  const handleResultClick = (path: string, val: string) => {
    setSearchInput(val);
    setSearchQuery(val);
    setShowDropdown(false);
    setIsFocused(false);
    router.push(`${path}?highlight=${encodeURIComponent(val)}`);
  };

  const handleRecordResultClick = (type: string, val: string) => {
    setSearchInput(val);
    setSearchQuery(val);
    setShowDropdown(false);
    setIsFocused(false);
    router.push(`/fleet?tab=${type}&highlight=${encodeURIComponent(val)}`);
  };

  const hasResults = searchResults && (
    searchResults.inventory?.length > 0 ||
    searchResults.shipments?.length > 0 ||
    searchResults.challans?.length > 0 ||
    searchResults.cashMemos?.length > 0 ||
    searchResults.summaries?.length > 0 ||
    searchResults.deliveryStatements?.length > 0
  );

  // Show the hints panel when focused + nothing meaningful typed yet
  const showHints = showDropdown && searchInput.trim().length < 2 && !isSearching;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">SKRT CORP</h2>
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center px-8">
        {headerCenter}
      </div>
      <div className="flex items-center gap-3 md:gap-6">
        <div className="hidden md:flex items-center gap-1 relative" ref={dropdownRef}>
          <Input
            type="text"
            placeholder="Quick search…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className="bg-secondary border-border w-[260px] text-sm h-9"
          />
          <button
            onClick={handleSearch}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary transition-colors"
            title="Search current page"
          >
            <Search className="h-4 w-4" />
          </button>
          {searchQuery && (
            <button
              onClick={handleClear}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showDropdown && (
            <div className="absolute top-full right-0 md:right-auto md:left-0 mt-2 w-[calc(100vw-2rem)] max-w-[480px] md:w-[480px] bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-[80vh] flex flex-col">

              {/* ════════════════════════════════════════
                  HINTS PANEL — shown when nothing typed
                  ════════════════════════════════════════ */}
              {showHints && (
                <div className="p-3">
                  {/* Header row */}
                  <div className="flex items-center gap-2 px-1 pb-2 mb-1 border-b border-zinc-800">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-[3px] text-slate-500">
                      Quick Search — All Modules
                    </span>
                  </div>

                  {/* Module rows */}
                  <div className="mt-2 space-y-0.5">
                    {SEARCH_HINTS.map((mod) => (
                      <div
                        key={mod.label}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
                      >
                        {/* Emoji + module name */}
                        <div className="flex items-center gap-1.5 w-[160px] shrink-0">
                          <span className="text-sm leading-none">{mod.emoji}</span>
                          <span className={`text-[11px] font-bold ${mod.color} whitespace-nowrap`}>
                            {mod.label}
                          </span>
                        </div>

                        {/* Field badges */}
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {mod.fields.map((field) => (
                            <span
                              key={field}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold border ${mod.badgeColor} whitespace-nowrap`}
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer tip */}
                  <div className="mt-3 pt-2 border-t border-zinc-800 px-1 flex items-center gap-2">
                    <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-mono text-zinc-400">
                      ↵ Enter
                    </kbd>
                    <span className="text-[10px] text-slate-600">
                      Type 2+ characters to search all modules simultaneously
                    </span>
                  </div>
                </div>
              )}

              {/* ════════════════════════════
                  LOADING SPINNER
                  ════════════════════════════ */}
              {!showHints && isSearching && (
                <div className="flex items-center justify-center p-6 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching all modules...
                </div>
              )}

              {!showHints && !isSearching && searchResults && (
                <div className="overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-border/60 space-y-4 max-h-[60vh]">
                  {/* Module 1: Inventory */}
                  <div className="border-b border-zinc-800/60 pb-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#2388ff] mb-1.5 px-2 flex items-center justify-between">
                      <span>📦 Inventory</span>
                      <span className="text-[9px] text-zinc-500 normal-case tracking-normal">S.No · G.R. No · Delivery Receipt No</span>
                    </h4>
                    {searchResults.inventory?.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.inventory.map((i: any) => (
                          <button key={i._id} onClick={() => handleResultClick('/inventory', i.searchVal || i.lrNo)} className="w-full text-left p-2 hover:bg-zinc-800/50 rounded-lg transition-colors block">
                            <p className="text-xs font-semibold text-white">{i.title || i.lrNo}</p>
                            {i.subtitle && <p className="text-[10px] text-zinc-500">{i.subtitle}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic px-2">No matching records found</p>
                    )}
                  </div>

                  {/* Module 2: Shipments */}
                  <div className="border-b border-zinc-800/60 pb-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5 px-2 flex items-center justify-between">
                      <span>🚚 Shipments</span>
                      <span className="text-[9px] text-zinc-500 normal-case tracking-normal">Consignment No · Vehicle · Consignor · Consignee</span>
                    </h4>
                    {searchResults.shipments?.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.shipments.map((s: any) => (
                          <button key={s._id} onClick={() => handleResultClick('/shipments', s.searchVal || s.consignmentNumber)} className="w-full text-left p-2 hover:bg-zinc-800/50 rounded-lg transition-colors block">
                            <p className="text-xs font-semibold text-white">{s.title || s.consignmentNumber}</p>
                            {s.subtitle && <p className="text-[10px] text-zinc-500">{s.subtitle}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic px-2">No matching records found</p>
                    )}
                  </div>

                  {/* Module 3: Challan Records */}
                  <div className="border-b border-zinc-800/60 pb-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-1.5 px-2 flex items-center justify-between">
                      <span>📋 Challan Records</span>
                      <span className="text-[9px] text-zinc-500 normal-case tracking-normal">Challan No · G.R. No · Driver</span>
                    </h4>
                    {searchResults.challans?.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.challans.map((r: any) => (
                          <button key={r._id} onClick={() => handleRecordResultClick('challan', r.searchVal)} className="w-full text-left p-2 hover:bg-zinc-800/50 rounded-lg transition-colors block">
                            <p className="text-xs font-semibold text-white">{r.title}</p>
                            {r.subtitle && <p className="text-[10px] text-zinc-500">{r.subtitle}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic px-2">No matching records found</p>
                    )}
                  </div>

                  {/* Module 4: Cash Memo Records */}
                  <div className="border-b border-zinc-800/60 pb-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mb-1.5 px-2 flex items-center justify-between">
                      <span>💰 Cash Memo Records</span>
                      <span className="text-[9px] text-zinc-500 normal-case tracking-normal">D.R. No · G.R. No</span>
                    </h4>
                    {searchResults.cashMemos?.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.cashMemos.map((r: any) => (
                          <button key={r._id} onClick={() => handleRecordResultClick('cash-memo', r.searchVal)} className="w-full text-left p-2 hover:bg-zinc-800/50 rounded-lg transition-colors block">
                            <p className="text-xs font-semibold text-white">{r.title}</p>
                            {r.subtitle && <p className="text-[10px] text-zinc-500">{r.subtitle}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic px-2">No matching records found</p>
                    )}
                  </div>

                  {/* Module 5: Summary */}
                  <div className="border-b border-zinc-800/60 pb-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-1.5 px-2 flex items-center justify-between">
                      <span>📄 Summary</span>
                      <span className="text-[9px] text-zinc-500 normal-case tracking-normal">No. · Challan No · Driver</span>
                    </h4>
                    {searchResults.summaries?.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.summaries.map((r: any) => (
                          <button key={r._id} onClick={() => handleRecordResultClick('summary', r.searchVal)} className="w-full text-left p-2 hover:bg-zinc-800/50 rounded-lg transition-colors block">
                            <p className="text-xs font-semibold text-white">{r.title}</p>
                            {r.subtitle && <p className="text-[10px] text-zinc-500">{r.subtitle}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic px-2">No matching records found</p>
                    )}
                  </div>

                  {/* Module 6: Delivery Statement */}
                  <div className="pb-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-rose-400 mb-1.5 px-2 flex items-center justify-between">
                      <span>🚛 Delivery Statement</span>
                      <span className="text-[9px] text-zinc-500 normal-case tracking-normal">Page No · S.No · D.R. No</span>
                    </h4>
                    {searchResults.deliveryStatements?.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.deliveryStatements.map((r: any) => (
                          <button key={r._id} onClick={() => handleRecordResultClick('delivery-statement', r.searchVal)} className="w-full text-left p-2 hover:bg-zinc-800/50 rounded-lg transition-colors block">
                            <p className="text-xs font-semibold text-white">{r.title}</p>
                            {r.subtitle && <p className="text-[10px] text-zinc-500">{r.subtitle}</p>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic px-2">No matching records found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <NotificationBell />
        <button
          onClick={() => setWaQRDialogOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors"
          title="WhatsApp Connection"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold">{user?.name || "Administrator"}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{user?.role || "Manager"}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <UserCircle className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [waQRDialogOpen, setWaQRDialogOpen] = useState(false);

  return (
    <ProtectedRoute>
      <HeaderProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 md:ml-64 flex flex-col">
            <DashboardHeader setWaQRDialogOpen={setWaQRDialogOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="flex-1 p-4 md:p-8">
              <div className="max-w-[1600px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
        <WhatsAppQRDialog open={waQRDialogOpen} onOpenChange={setWaQRDialogOpen} />
      </HeaderProvider>
    </ProtectedRoute>
  );
}
