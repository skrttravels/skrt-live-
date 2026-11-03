"use client";

import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ViewInventoryDialog({ 
  open, 
  onOpenChange, 
  item 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: any; 
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1400px] lg:min-w-[1000px] h-[85vh] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl flex flex-col box-border">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 border-b border-border/50 px-8 py-6">
          <div>
            <DialogTitle className="text-3xl font-bold text-foreground">Inventory Details</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Complete status and cargo information for record #{item.inventoryId}
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-6">
            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Inventory ID</span>
              <p className="font-mono font-bold text-lg text-foreground">{item.inventoryId}</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">LR No / Consignment No</span>
              <p className="font-mono font-bold text-lg text-foreground">{item.lrNo}</p>
            </div>

            <div className="md:col-span-2 p-4 bg-primary/5 rounded-xl space-y-1 border border-primary/10">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Cargo / Item Name</span>
              <p className="font-bold text-lg text-foreground">{item.cargoName}</p>
            </div>

            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sender</span>
              <p className="font-bold text-foreground">{item.senderName}</p>
              <p className="text-xs text-muted-foreground">{item.senderPhone}</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Receiver</span>
              <p className="font-bold text-foreground">{item.receiverName}</p>
              <p className="text-xs text-muted-foreground">{item.receiverPhone}</p>
            </div>

            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Origin</span>
              <p className="font-bold text-foreground">{item.origin}</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Destination</span>
              <p className="font-bold text-foreground">{item.destination}</p>
            </div>

            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Packages</span>
              <p className="font-bold text-foreground">{item.packages} unit(s)</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Weight</span>
              <p className="font-bold text-foreground">{item.weight} kg</p>
            </div>

            <div className="p-4 bg-primary/10 rounded-xl space-y-1 border border-primary/20">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Total Freight</span>
              <p className="font-bold text-xl text-primary">₹{item.totalFreight?.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Rate: ₹{item.rate}/kg</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Payment Mode</span>
              <p className="font-bold text-foreground">{item.paymentMode}</p>
            </div>

            <div className="md:col-span-2 p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Warehouse Location</span>
              <p className="font-bold text-foreground">{item.warehouseLocation || "N/A"}</p>
            </div>

            <div className="p-4 bg-blue-500/10 rounded-xl space-y-1 border border-blue-500/20">
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Incoming Status</span>
              <p className="font-bold text-blue-500">{item.incomingStatus || "N/A"}</p>
            </div>

            {item.remarks && (
              <div className="xl:col-span-4 p-4 bg-secondary/10 rounded-xl space-y-1 border border-border/50">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Remarks</span>
                <p className="text-sm italic text-foreground">{item.remarks}</p>
              </div>
            )}

            <div className="xl:col-span-4 p-4 bg-secondary/5 rounded-xl space-y-1 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Audit Log</span>
              <p className="text-[10px] text-muted-foreground">Record created on {new Date(item.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-8 py-5 border-t border-border/50 bg-secondary/5 flex justify-end gap-3">
          <Button onClick={() => onOpenChange(false)} className="h-11 px-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all active:scale-95">
            Close Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
