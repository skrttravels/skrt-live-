"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Package,
  Warehouse,
  Receipt,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Warehouse, label: "Inventory", href: "/inventory" },
  { icon: Receipt, label: "Cash Memos", href: "/cash-memos" },
  { icon: Package, label: "Shipments", href: "/shipments" },
  { icon: MapPin, label: "Live Tracking", href: "/tracking" },
  { icon: Truck, label: "Records", href: "/fleet" },
  // { icon: Users, label: "Drivers", href: "/drivers" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Expenses", href: "/expenses" },
  { icon: FileText, label: "Invoices", href: "/invoices" },
  // { icon: FileText, label: "Delivery Statement", href: "/delivery-statement" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const hrefToModule: Record<string, string> = {
  "/dashboard": "dashboard",
  "/inventory": "inventory",
  "/cash-memos": "cashMemos",
  "/shipments": "shipments",
  "/tracking": "tracking",
  "/fleet": "vehicles",
  "/drivers": "drivers",
  "/clients": "clients",
  "/expenses": "expenses",
  "/invoices": "invoices",
  "/analytics": "analytics",
  "/settings": "settings",
};

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { can, logout } = useAuth();

  const visibleItems = menuItems.filter(item => {
    const module = hrefToModule[item.href];
    if (!module) return true;
    return can(module, 'view');
  });

  return (
    <aside
      className={cn(
        "w-64 h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="p-6 flex justify-between items-center">
<a href="/" className="flex items-center gap-3">
          <img src="logobg.png" alt="logo" className="w-25 " />
        </a>
        <button
          onClick={onClose}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 min-h-0 px-4 space-y-1 mt-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group text-sm",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              onClick={() => onClose()}
            >
              <Icon className={cn(
                "w-5 h-5",
                isActive ? "text-primary-foreground" : "group-hover:text-primary transition-colors"
              )} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
